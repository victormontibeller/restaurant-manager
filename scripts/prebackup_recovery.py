"""Provas locais com dados pré-snapshot e perda real da resposta HTTP.

Todos os escritores e alterações pertencem ao clone 55433 do ensaio. Nenhum
segredo sai dos arquivos privados; e-mail usa exclusivamente CapturaEmail local.
"""
import base64
import hashlib
import http.client
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import ssl
import subprocess
import threading
import time
import urllib.error
import urllib.request
import uuid

from database_recovery import identifier, inventory, validate_snapshot
from release_support import atomic_json


POOL_PROBE_SOURCE = '''import com.sun.tools.attach.VirtualMachine;
import java.nio.file.*;
import javax.management.*;
import javax.management.remote.*;

class PoolProbe {
    public static void main(String[] args) throws Exception {
        VirtualMachine vm = VirtualMachine.attach(args[0]);
        String address;
        try { address = vm.startLocalManagementAgent(); }
        finally { vm.detach(); }
        try (var connection = JMXConnectorFactory.connect(new JMXServiceURL(address))) {
            var server = connection.getMBeanServerConnection();
            var pool = new ObjectName("com.zaxxer.hikari:type=Pool (LocalRehearsal)");
            var config = new ObjectName("com.zaxxer.hikari:type=PoolConfig (LocalRehearsal)");
            long deadline = System.nanoTime() + 180_000_000_000L;
            while (!Files.exists(Path.of(args[1])) && System.nanoTime() < deadline) {
                System.out.printf("%d,%s,%s,%s,%s,%s%n", System.currentTimeMillis(),
                    server.getAttribute(pool,"ActiveConnections"),
                    server.getAttribute(pool,"IdleConnections"),
                    server.getAttribute(pool,"TotalConnections"),
                    server.getAttribute(pool,"ThreadsAwaitingConnection"),
                    server.getAttribute(config,"MaximumPoolSize"));
                System.out.flush();
                Thread.sleep(100);
            }
        }
    }
}
'''


def summarize_pool(text):
    samples = []
    for row in text.splitlines():
        values = row.split(',')
        require(len(values)==6 and all(re.fullmatch('[0-9]+', v) for v in values),
                'Amostra JMX inválida.')
        samples.append(dict(zip(('epoch_ms','active','idle','total','awaiting','maximum'), map(int,values))))
    require(len(samples)>=2 and all(s['maximum']==4 for s in samples), 'Medição Hikari incompleta ou pool divergente.')
    return dict(source='Hikari MXBean via Attach API local do PID próprio', interval_ms=100,
        samples=len(samples), maximum_connections=4, peak_active=max(s['active'] for s in samples),
        peak_idle=max(s['idle'] for s in samples), peak_total=max(s['total'] for s in samples),
        peak_threads_awaiting=max(s['awaiting'] for s in samples),
        samples_with_waiters=sum(s['awaiting']>0 for s in samples),
        acquisition_latency_measured=False, public_endpoint=False)


class PoolProbe:
    """Processo JDK próprio; não abre endpoint HTTP nem recebe PID do chamador."""
    def __init__(self, exercise):
        self.exercise = exercise
        self.process = None
        self.stream = None

    def __enter__(self):
        exercise = self.exercise
        require(exercise.process is not None and exercise.process.poll() is None, 'Runtime próprio ausente.')
        source = exercise.root/'PoolProbe.java'
        source.write_text(POOL_PROBE_SOURCE)
        source.chmod(0o600)
        self.stop = exercise.root/'pool-probe.stop'
        self.output = exercise.root/'pool-samples.csv'
        require(not self.stop.exists() and not self.output.exists(), 'Medição anterior preservada.')
        self.stream = self.output.open('xb')
        self.process = subprocess.Popen([str(exercise.java/'java'), '--add-modules', 'jdk.attach', str(source),
            str(exercise.process.pid), str(self.stop)], cwd=exercise.root, env=exercise.env,
            stdout=self.stream, stderr=exercise.log)
        try:
            deadline = time.monotonic()+20
            while time.monotonic()<deadline:
                require(self.process.poll() is None, 'Probe JMX encerrou; consultar log privado.')
                if self.output.stat().st_size:
                    return self
                time.sleep(0.1)
            raise TimeoutError('JMX local não produziu amostra.')
        except BaseException:
            self.__exit__(None,None,None)
            raise

    def __exit__(self, *unused):
        if self.process is not None:
            self.stop.touch(mode=0o600)
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.terminate()
                try:
                    self.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                    self.process.wait(timeout=5)
            finally:
                self.stream.close()

    def summary(self):
        require(self.process.returncode==0, 'Probe JMX falhou.')
        return summarize_pool(self.output.read_text())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def stopped_clone(exercise):
    require(exercise.process is None, 'Escritor próprio deve estar parado.')
    require(exercise.sql("select current_database(),current_setting('data_directory')")
            == ['rm_test|' + str(exercise.cluster)], 'Alvo de recuperação recusado.')
    require(exercise.sql("select count(*) from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid()") == ['0'],
            'Clone ainda possui outra conexão potencialmente escritora.')


def wait_row(exercise, query, predicate, message, timeout=85):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        require(exercise.process is not None and exercise.process.poll() is None,
                'Runtime encerrou durante prova de recuperação.')
        rows = exercise.sql(query)
        if predicate(rows):
            return rows
        time.sleep(0.25)
    raise TimeoutError(message)


def clone_template_sql(raw, schema):
    """Somente dump conhecido de t_template, sem remapear dados de outro tenant."""
    identifier(schema)
    require(re.fullmatch(r't_[a-f0-9]{32}', schema) and 'CREATE SCHEMA t_template;' in raw,
            'Template ou schema de fixture inválido.')
    return re.sub(r'\bt_template\b', schema, raw)


def verify_fixture_inventory(before, after, schema):
    # O backup principal já exige >=2 empresas. Este snapshot adicional pertence
    # a UMA fixture exclusiva; não reduzir a guarda do restore integral.
    require(before == after and before.get('tenants') == 1 and before.get('tenants_with_identity') == 1
            and before.get('tables') and before.get('metadata')
            and all(table.startswith(schema+'.') for table in before['tables']),
            'Restore da fixture pré-backup divergiu ou ficou incompleto.')


def restore_schema(exercise, schema, archive, expected):
    stopped_clone(exercise)
    identifier(schema)
    require(schema == exercise.prebackup_schema and archive == exercise.root/'prebackup.dump',
            'Restore limitado ao schema exclusivo deste ensaio.')
    exercise.sql('drop schema ' + identifier(schema) + ' cascade')
    exercise.run_command([exercise.pg/'pg_restore', '-h', exercise.socket, '-p', '55433', '-d', 'rm_test',
                          '--exit-on-error', '--single-transaction', archive])
    exercise.sql('begin isolation level repeatable read read only')
    try:
        observed = inventory(exercise.session, schema=schema)
        verify_fixture_inventory(expected, observed, schema)
    finally:
        exercise.sql('rollback')


def run_prebackup_recovery(exercise):
    """Cria ciphertext/token reais, faz snapshot, restaura e testa ambas as chaves."""
    from local_diagnostics import capture_diagnostics
    exercise.stop_app()
    stopped_clone(exercise)
    company, user, unit = (str(uuid.uuid4()) for _ in range(3))
    schema = exercise.prebackup_schema = 't_' + uuid.UUID(company).hex
    host = 'prebackup-' + uuid.UUID(company).hex + '.localhost'
    account = dict(email='prebackup-' + uuid.UUID(user).hex + '@example.invalid',
                   senha=exercise.fixture['contas']['clienteA']['senha'])
    source_user = str(uuid.UUID(exercise.fixture['contas']['clienteA']['id']))
    template = subprocess.check_output([str(exercise.pg/'pg_dump'), '-h', str(exercise.socket),
        '-p', '55433', '-d', 'rm_test', '-n', 't_template'], env=exercise.env, text=True)
    exercise.run_command(exercise.target[:-1]+['rm_test'], input=clone_template_sql(template, schema))
    # A criação da fixture usa o template migrado; a prova abaixo usa a aplicação.
    exercise.sql(f"insert into public.empresa(id,nome,schema_name,estado) values ('{company}','Ensaio fictício pré-backup','{schema}','ATIVO');"
        f"insert into public.dominio(host,empresa_id) values ('{host}','{company}');"
        f"insert into {schema}.unidade(id,nome) values ('{unit}','Unidade fictícia');"
        f"insert into {schema}.usuario(id,email,senha_hash,perfil,email_verificado) "
        f"select '{user}','{account['email']}',senha_hash,'CLIENTE',true from {exercise.schema}.usuario where id='{source_user}'")
    require(exercise.sql(f'select count(*) from {schema}.usuario') == ['1'], 'Conta fictícia não criada.')
    # O scheduler percorre todos os tenants ativos: isolamento explícito impede
    # expurgo/retry de qualquer massa histórica. Restaurar exatamente no finally.
    states = exercise.sql(f"select id,estado from public.empresa where id<>'{company}' and estado in ('ATIVO','SUSPENSO') order by id")
    for row in states:
        entity, state = row.split('|')
        uuid.UUID(entity)
        require(state in ('ATIVO','SUSPENSO'), 'Estado de isolamento inesperado.')
    blocker = exercise.root/'capture'/schema
    blocker.write_text('Falha de captura local deliberada; massa exclusiva.\n')
    blocker.chmod(0o600)
    result = dict(scope='clone local e captura fictícia', isolated_tenants=len(states),
                  fixture_schema=schema, external_delivery=False, writers_stopped_for_backup=False)
    exercise.record['prebackup_recovery'] = result
    try:
        exercise.sql(f"update public.empresa set estado='FALHOU' where id<>'{company}' and estado in ('ATIVO','SUSPENSO')")
        require(exercise.sql("select schema_name from public.empresa where estado in ('ATIVO','SUSPENSO')") == [schema],
                'Worker não está limitado ao tenant exclusivo.')
        current = exercise.start_app(email=True)
        client = type(current)(host, exercise.bundle/'certificate.pem')
        token = client.login(account)
        client.request('/api/v1/auth/recuperacao', {'email':account['email']}, expected=(202,))
        # Falha de filesystem acontece depois que a aplicação persiste o token e
        # cifra o corpo. Não se cria um novo token após o restore para aprovar a prova.
        rows = wait_row(exercise,
            f"select id,tipo,estado,tentativas from {schema}.email_identidade order by id",
            lambda r: len(r)==1 and r[0].endswith('|RECUPERACAO|PENDENTE|1'),
            'Token/conteúdo cifrado não foram preparados antes do backup.')
        mail_id = str(uuid.UUID(rows[0].split('|')[0]))
        exercise.stop_app()
        stopped_clone(exercise)
        require(blocker.is_file() and not blocker.is_symlink(), 'Falha de captura inesperada.')
        blocker.unlink()
        require(not list((exercise.root/'capture').rglob('*.txt')), 'Captura anterior ao snapshot é inesperada.')
        exercise.sql('begin isolation level repeatable read read only')
        try:
            snapshot = validate_snapshot(exercise.sql('select pg_export_snapshot()')[0])
            result['snapshot_at'] = exercise.sql('select transaction_timestamp()')[0]
            result['session_created_at'] = exercise.sql(f'select criada_em from {schema}.sessao')[0]
            require(exercise.sql(f"select count(*) from {schema}.sessao where criada_em<=transaction_timestamp() and revogada_em is null") == ['1'],
                    'Sessão não pertence ao ponto de recuperação.')
            fingerprints = exercise.sql(f"select id,encode(sha256(convert_to(conteudo_cifrado,'UTF8')),'hex'),expira_em "
                f"from {schema}.email_identidade where id='{mail_id}' and conteudo_cifrado is not null")
            token_hashes = exercise.sql(f"select hash from {schema}.recuperacao_senha where usuario_id='{user}' and consumido_em is null")
            require(len(fingerprints)==1 and len(token_hashes)==1, 'Ciphertext/token pré-snapshot ausentes.')
            expected = inventory(exercise.session, schema=schema)
            archive = exercise.root/'prebackup.dump'
            exercise.run_command([exercise.pg/'pg_dump', '-h', exercise.socket, '-p', '55433', '-d', 'rm_test',
                '-Fc', '-n', schema, '--snapshot='+snapshot, '-f', archive])
        finally:
            exercise.sql('rollback')
        config = exercise.root/'prebackup-configuration'
        shutil.copytree(exercise.bundle, config)
        result.update(writers_stopped_for_backup=True, archive_sha256=sha(archive),
            outbox_id=mail_id, outbox_expira_em=fingerprints[0].split('|')[2],
            ciphertext_sha256=fingerprints[0].split('|')[1],
            prebackup_token_fingerprint=hashlib.sha256(token_hashes[0].encode()).hexdigest(),
            session_token_fingerprint=hashlib.sha256(token.encode()).hexdigest(),
            configuration_sha256=exercise.config_hashes, capture_failure_before_snapshot=True)
        atomic_json(exercise.root/'prebackup-inventory.json', expected)
        # Remover e reconstruir tanto banco quanto configuração evita transformar
        # a prova em simples restart sobre os mesmos dados.
        restore_schema(exercise, schema, archive, expected)
        shutil.rmtree(exercise.bundle)
        shutil.copytree(config, exercise.bundle)
        started = time.monotonic()
        wrong_jwt, wrong_email = secrets.token_urlsafe(72), base64.b64encode(secrets.token_bytes(32)).decode()
        private = json.loads((exercise.bundle/'runtime.json').read_text())
        require(wrong_jwt != private['jwt'] and wrong_email != private['email'], 'Chaves negativas não diferem.')
        current = exercise.start_app(email=True, jwt_override=wrong_jwt, email_override=wrong_email)
        negative = type(current)(host, exercise.bundle/'certificate.pem')
        negative.request('/api/v1/auth/me', token=token, expected=(401,))
        wait_row(exercise, f"select estado,tentativas,expira_em>now() from {schema}.email_identidade where id='{mail_id}'",
            lambda r:r == ['FALHOU|2|t'], 'Chave errada não produziu falha inequívoca de decriptação.')
        require(not list((exercise.root/'capture').rglob('*.txt')), 'Chave errada produziu captura.')
        negative_diagnostics = capture_diagnostics(exercise, 'wrong-email-key', schema=schema)
        require('EMAIL_FALHOU' in negative_diagnostics['alerts'], 'Diagnóstico não detectou e-mail falho.')
        exercise.stop_app()
        result['wrong_keys'] = dict(jwt_status=401, outbox_state='FALHOU', attempts=2,
            unexpired=True, captures=0, seconds=round(time.monotonic()-started,3),
            diagnostic_alerts=negative_diagnostics['alerts'])
        # A negativa consome o estado da outbox: voltar ao MESMO snapshot, sem
        # zerar tentativas nem fabricar outra mensagem/token para o caso positivo.
        restore_schema(exercise, schema, archive, expected)
        current = exercise.start_app(email=True)
        positive = type(current)(host, exercise.bundle/'certificate.pem')
        positive.request('/api/v1/auth/me', token=token)
        wait_row(exercise, f"select estado from {schema}.email_identidade where id='{mail_id}'",
            lambda r:r == ['CAPTURADO'], 'Outbox pré-backup não retomou com as chaves restauradas.')
        capture = exercise.root/'capture'/schema/(mail_id+'.txt')
        require(capture.is_file() and not capture.is_symlink() and not capture.stat().st_mode & 0o077,
                'Captura recuperada deve ser privada e regular.')
        message = capture.read_text()
        codes = re.findall(r'^Código: ([A-Za-z0-9_-]{43})$', message, re.MULTILINE)
        require(len(codes)==1 and hashlib.sha256(codes[0].encode()).hexdigest()==token_hashes[0]
                and 'Para: '+account['email']+'\n' in message and 'Empresa: '+company+'\n' in message,
                'Captura não corresponde ao token/tenant/conta anteriores ao backup.')
        require(len(list((exercise.root/'capture').rglob('*.txt'))) == 1, 'Entrega recuperada duplicada.')
        require(exercise.sql(f"select conteudo_cifrado is null from {schema}.email_identidade where id='{mail_id}'") == ['t'],
                'Conteúdo capturado não foi expurgado.')
        positive_diagnostics = capture_diagnostics(exercise, 'restored-email-key', schema=schema)
        require('EMAIL_FALHOU' not in positive_diagnostics['alerts'], 'Diagnóstico não normalizou e-mail recuperado.')
        # Parar worker antes do aviso de reset; não deixar outro envio interferir
        # com a contagem da única mensagem restaurada.
        exercise.stop_app()
        current = exercise.start_app()
        positive = type(current)(host, exercise.bundle/'certificate.pem')
        positive.csrf = positive.request('/api/v1/auth/csrf')
        password = secrets.token_urlsafe(36)
        positive.request('/api/v1/auth/recuperacao/confirmar', {'codigo':codes[0], 'senha':password})
        positive.request('/api/v1/auth/me', token=token, expected=(401,))
        positive.request('/api/v1/auth/recuperacao/confirmar', {'codigo':codes[0], 'senha':password}, expected=(422,))
        fresh = positive.login(dict(account, senha=password))
        positive.request('/api/v1/auth/me', token=fresh)
        result.update(restored_snapshot_twice=True, original_jwt_and_session_accepted=True,
            original_token_captured=True, capture_sha256=sha(capture), captures=1,
            reset_consumed_original_token=True, token_reuse_status=422, original_session_revoked_status=401,
            new_password_login=True, restored_keys_verified=True,
            restored_diagnostic_alerts=positive_diagnostics['alerts'])
    finally:
        exercise.stop_app()
        if exercise.session is not None:
            stopped_clone(exercise)
            for row in states:
                entity, state = row.split('|')
                exercise.sql(f"update public.empresa set estado='{state}' where id='{entity}'")
            observed = exercise.sql(f"select id,estado from public.empresa where id<>'{company}' and estado in ('ATIVO','SUSPENSO') order by id")
            require(observed == states, 'Estados dos demais tenants não foram preservados.')
            result['other_tenant_states_restored'] = True
        atomic_json(exercise.root/'prebackup-recovery.json', result)
    return exercise.start_app()


def validate_proxy_request(path, raw, expected):
    require(path == '/api/v1/pedidos' and len(raw) <= 65536 and raw == expected,
            'Proxy limitado à intenção fictícia exata.')


def lose_committed_response(exercise, client, body, token):
    """Termina TLS no proxy próprio; commit upstream, zero bytes HTTP downstream."""
    from local_rehearsal import verify_local_listener
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 8091))
    private = json.loads((exercise.bundle/'runtime.json').read_text())
    key = exercise.root/'proxy-key.pem'
    require(not key.exists(), 'Chave temporária do proxy já existe.')
    upstream_context = ssl.create_default_context(cafile=str(exercise.bundle/'certificate.pem'))
    outcome = {}
    expected = json.dumps(body).encode()

    class DropAfterCommit(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Não registrar tokens/cookies nem payload privado.

        def do_POST(self):
            try:
                length = int(self.headers.get('Content-Length','0'))
                require(0 < length <= 65536, 'Corpo do proxy recusado.')
                raw = self.rfile.read(length)
                validate_proxy_request(self.path, raw, expected)
                require(self.headers.get('Host') == client.host, 'Host do proxy recusado.')
                headers = {name:self.headers[name] for name in
                    ('Host','Content-Type','Authorization','Cookie',client.csrf['headerName']) if name in self.headers}
                connection = http.client.HTTPSConnection('127.0.0.1', 8090, context=upstream_context, timeout=15)
                try:
                    connection.request('POST', '/api/v1/pedidos', raw, headers)
                    response = connection.getresponse()
                    payload = response.read()
                    require(response.status in (200,201), 'Criação upstream recusada.')
                    order = json.loads(payload)
                    uuid.UUID(order['id'])
                    outcome.update(order=order, upstream_status=response.status,
                        response_sha256=hashlib.sha256(payload).hexdigest())
                finally:
                    connection.close()
                # Nenhum send_response/write: o cliente recebe falha de transporte
                # depois que a aplicação confirmou a resposta do commit upstream.
                outcome['downstream_http_bytes'] = 0
            except Exception as failure:
                outcome['error'] = type(failure).__name__
            finally:
                self.close_connection = True
                try:
                    self.connection.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass
                self.connection.close()

    class LocalTLSServer(HTTPServer):
        accepted = None

        def get_request(self):
            connection, address = super().get_request()
            connection.settimeout(15)
            try:
                self.accepted = server_context.wrap_socket(connection, server_side=True,
                                                           do_handshake_on_connect=False)
                self.accepted.do_handshake()
                return self.accepted, address
            except BaseException:
                connection.close()
                if self.accepted is not None:
                    self.accepted.close()
                raise

    server, worker = None, None
    observed_error = None
    try:
        exercise.run_command(['openssl', 'pkcs12', '-in', exercise.bundle/'localhost.p12', '-nocerts',
            '-nodes', '-out', key, '-passin', 'env:RM_KEYSTORE_PASSWORD'],
            env=dict(exercise.env, RM_KEYSTORE_PASSWORD=private['tls_password']))
        key.chmod(0o600)
        server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        server_context.load_cert_chain(exercise.bundle/'certificate.pem', key)
        server = LocalTLSServer(('127.0.0.1',8091), DropAfterCommit)
        server.timeout = 15
        worker = threading.Thread(target=server.handle_request, daemon=True)
        verify_local_listener(os.getpid(), port=8091)
        worker.start()
        try:
            client.request('/api/v1/pedidos', body, token, port=8091)
        except (http.client.RemoteDisconnected, urllib.error.URLError, ConnectionError) as failure:
            observed_error = type(failure).__name__
        worker.join(timeout=22)
        require(not worker.is_alive() and observed_error and 'order' in outcome and 'error' not in outcome,
                'Perda da resposta após commit não foi demonstrada.')
        order = outcome.pop('order')
        return order, dict(outcome, client_transport_error=observed_error,
            proxy='TLS loopback 127.0.0.1:8091 próprio', external_service=False)
    finally:
        if server is not None:
            if server.accepted is not None:
                try:
                    server.accepted.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass
                server.accepted.close()
            server.server_close()
        if worker is not None and worker.ident is not None:
            worker.join(timeout=17)
        key.unlink(missing_ok=True)
        require(worker is None or not worker.is_alive(), 'Thread própria do proxy não encerrou.')

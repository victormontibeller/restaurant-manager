"""Probe HTTP real no banco restaurado; nunca aponta para dev/test/hml originais.

Consumido por database_recovery.py. Configuração e contas fictícias são privadas.
Não migra, não promove release, não envia e-mail, não substitui matriz E2E.
"""
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import ssl
import subprocess
import time
import urllib.error
import urllib.request
import uuid
from typing import Any, cast

from provisioning_queue import validate_artifact
from release_support import atomic_json, verify_listener


def private_file(path):
    path = Path(path)
    repo = Path(__file__).resolve().parents[1]
    if (path.is_symlink() or not path.is_file() or path.stat().st_mode & 0o077
            or path.stat().st_uid != os.getuid() or path.resolve().is_relative_to(repo)):
        raise ValueError('Arquivo de recuperação deve ser privado e externo ao checkout.')
    return path


def validate_fixture(data):
    required = {'jwt_secret', 'email_secret', 'tls_file', 'tls_password', 'accounts'}
    if set(data) != required or len(data['jwt_secret'].encode()) < 64:
        raise ValueError('Configuração privada incompleta.')
    import base64
    if len(base64.b64decode(data['email_secret'], validate=True)) != 32:
        raise ValueError('Chave de comunicação inválida.')
    accounts = data['accounts']
    if not isinstance(accounts, list) or len(accounts) < 3:
        raise ValueError('Exigir duas empresas e funcionário restrito.')
    hosts = set()
    for account in accounts:
        if (not re.fullmatch(r'[a-z0-9-]+\.localhost', account['host'])
                or not account['email'].endswith('@example.invalid') or not account['senha']
                or account['perfil'] not in ('ADMINISTRADOR', 'COZINHA')):
            raise ValueError('Conta fictícia inválida.')
        uuid.UUID(account['empresa_id']); uuid.UUID(account['usuario_id'])
        hosts.add(account['host'])
    if len(hosts) < 2 or len({a['empresa_id'] for a in accounts}) < 2:
        raise ValueError('Duas empresas distintas obrigatórias.')
    if not any(a['perfil'] == 'COZINHA' and a.get('allowed_unit') and a.get('forbidden_unit')
               and a['allowed_unit'] != a['forbidden_unit'] for a in accounts):
        raise ValueError('Funcionário restrito a uma filial obrigatório.')
    for account in accounts:
        for key in ('allowed_unit', 'forbidden_unit'):
            if account.get(key):
                uuid.UUID(account[key])


def prepare(job, fixture_path, root, attempt):
    gate = validate_artifact(job, root)
    data = json.loads(private_file(fixture_path).read_text())
    validate_fixture(data)
    for port in (55433, 8090):
        with socket.socket() as check:
            check.bind(('127.0.0.1', port))  # Não mata ocupante nem reutiliza seu listener.
    certificate = private_file(data['tls_file'])
    bundle = attempt / 'configuration'
    bundle.mkdir(mode=0o700)
    shutil.copyfile(certificate, bundle / 'localhost.p12')
    (bundle / 'localhost.p12').chmod(0o600)
    data['tls_file'] = str(bundle / 'localhost.p12')
    atomic_json(bundle / 'runtime.json', data)
    (bundle / 'runtime.json').chmod(0o600)
    atomic_json(bundle / 'manifest.json', {
        name: hashlib.sha256((bundle / name).read_bytes()).hexdigest()
        for name in ('runtime.json', 'localhost.p12')})
    return dict(job=job, gate=gate, bundle=bundle)


def read_bundle(bundle) -> dict[str, Any]:
    manifest = json.loads((bundle / 'manifest.json').read_text())
    if set(manifest) != {'runtime.json', 'localhost.p12'}:
        raise ValueError('Manifesto de configuração inválido.')
    for name, digest in manifest.items():
        if hashlib.sha256(private_file(bundle / name).read_bytes()).hexdigest() != digest:
            raise ValueError('Configuração recuperada divergente.')
    data = json.loads((bundle / 'runtime.json').read_text())
    validate_fixture(data)
    if Path(data['tls_file']) != bundle / 'localhost.p12':
        raise ValueError('Certificado não pertence à cópia recuperada.')
    return data


class Client:
    def __init__(self, host):
        self.host = host
        self.cookies = http.cookiejar.CookieJar()
        self.client = urllib.request.build_opener(urllib.request.ProxyHandler({}),
            urllib.request.HTTPCookieProcessor(self.cookies),
            urllib.request.HTTPSHandler(context=ssl._create_unverified_context()))
        self.csrf = None

    def request(self, path, body=None, token=None, method=None) -> tuple[int, Any]:
        headers: dict[str, str] = {'Host': self.host}
        if body is not None:
            headers['Content-Type'] = 'application/json'
        if self.csrf:
            headers[self.csrf['headerName']] = self.csrf['token']
        if token:
            headers['Authorization'] = 'Bearer ' + token
        request = urllib.request.Request('https://127.0.0.1:8090' + path,
            data=None if body is None else json.dumps(body).encode(), headers=headers, method=method)
        try:
            response = self.client.open(request, timeout=30)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read()
            return cast(int, response.status), json.loads(raw) if raw else None

    def login(self, account):
        status, self.csrf = self.request('/api/v1/auth/csrf')
        require(status == 200, 'CSRF restaurado indisponível.')
        status, result = self.request('/api/v1/auth/login', {k: account[k] for k in ('email', 'senha')})
        require(status == 200, 'Login restaurado recusado.')
        return result['accessToken']


def require(condition, message):
    if not condition:
        raise ValueError(message)


def run(prepared, root, attempt, session, pg_env, binary, log):
    # Sessão administrativa é socket do cluster novo; confirmar alvo ANTES de escrever.
    cluster = attempt / 'cluster'
    actual = session.query("select current_database(),current_setting('data_directory'),current_setting('port'),current_setting('listen_addresses')")
    require(actual == [f'rm_test|{cluster}|55433|127.0.0.1'], 'Alvo de aplicação restaurada recusado.')
    password = secrets.token_hex(32)
    session.query("set password_encryption='scram-sha-256'")
    session.query("alter role rm_test_app login password '" + password + "'")
    session.query('grant connect on database rm_test to rm_test_app')
    identity = subprocess.check_output([str(binary / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
        '-h', '127.0.0.1', '-p', '55433', '-U', 'rm_test_app', '-d', 'rm_test', '-c',
        'select current_database(),current_user,inet_server_port(),host(inet_server_addr())'],
        env=dict(pg_env, PGPASSWORD=password), stderr=log, text=True, timeout=10).strip()
    require(identity == 'rm_test|rm_test_app|55433|127.0.0.1', 'Conexão runtime restaurada recusada.')
    accounts = read_bundle(prepared['bundle'])['accounts']
    # Contas são conferidas contra os registros restaurados, não criadas pelo probe.
    for account in accounts:
        schema = 't_' + uuid.UUID(account['empresa_id']).hex
        actual = session.query("select e.schema_name from public.empresa e join public.dominio d on d.empresa_id=e.id "
            "where d.host='" + account['host'] + "' and e.id='" + account['empresa_id'] + "' and e.estado in ('ATIVO','SUSPENSO')")
        require(actual == [schema], 'Empresa restaurada divergente.')
        actual = session.query('select perfil from ' + schema + ".usuario where id='" + account['usuario_id'] + "' and ativo")
        require(actual == [account['perfil']], 'Conta restaurada divergente.')
        if account['perfil'] == 'COZINHA':
            for key in ('allowed_unit', 'forbidden_unit'):
                actual = session.query('select count(*) from ' + schema + ".unidade where id='" + account[key] + "' and ativa")
                require(actual == ['1'], 'Filial do negativo precisa existir e estar ativa.')
            actual = session.query('select unidade_id from ' + schema + ".usuario_unidade where usuario_id='"
                + account['usuario_id'] + "' order by unidade_id")
            require(actual == [account['allowed_unit']], 'Funcionário deve estar vinculado somente à filial permitida.')
    capture = attempt / 'capture'
    capture.mkdir(mode=0o700)
    working = attempt / 'runtime'
    working.mkdir(mode=0o700)
    process = None
    record: dict[str, Any] = dict(approved=False, database_identity=identity, accounts=[],
                  git_sha=prepared['gate']['git_sha'], artifact_sha256=prepared['gate']['artifact_sha256'])

    def stop():
        nonlocal process
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=30)
            except subprocess.TimeoutExpired:
                process.kill(); process.wait(timeout=10)
            process = None

    def start(email):
        nonlocal process
        data = read_bundle(prepared['bundle'])  # Relê somente backup, nunca arquivo original.
        env = dict(PATH='/usr/bin:/bin', HOME=str(Path.home()), LANG='C.UTF-8',
            RM_DB_URL='jdbc:postgresql://127.0.0.1:55433/rm_test', RM_DB_USER='rm_test_app', RM_DB_PASSWORD=password,
            RM_STAGE='test', RM_PORT='8090', RM_RELEASE_SHA=record['git_sha'], RM_JWT_SECRET=data['jwt_secret'],
            RM_JWT_KEY_ID='v1', RM_EMAIL_SECRET=data['email_secret'], RM_EMAIL_CAPTURE_DIRECTORY=str(capture),
            SERVER_SSL_KEY_STORE='file:' + data['tls_file'], SERVER_SSL_KEY_STORE_PASSWORD=data['tls_password'],
            SERVER_SSL_KEY_STORE_TYPE='PKCS12')
        jar = prepared['job'] / 'app.jar'
        require(hashlib.sha256(jar.read_bytes()).hexdigest() == record['artifact_sha256'], 'JAR adulterado.')
        process = subprocess.Popen([str(root / 'toolchains/jdk-21.0.13+9/bin/java'), '-Xmx384m',
            '-XX:ActiveProcessorCount=2', '-jar', str(jar), '--rm.recovery-test=true',
            '--rm.auth.retencao-agendada=false', '--rm.email.agendado=' + str(email).lower()],
            cwd=working, env=env, stdout=log, stderr=subprocess.STDOUT)
        atomic_json(attempt / 'application-running.json', dict(pid=process.pid, **record))
        deadline = time.monotonic() + 240
        while True:
            require(process.poll() is None, 'Aplicação restaurada encerrou durante startup.')
            try:
                verify_listener(process.pid, 8090)
                with urllib.request.urlopen('https://127.0.0.1:8090/actuator/health',
                        context=ssl._create_unverified_context(), timeout=5) as response:
                    require(json.load(response) == {'status': 'UP'}, 'Health restaurado indisponível.')
                with urllib.request.urlopen('https://127.0.0.1:8090/',
                        context=ssl._create_unverified_context(), timeout=5) as response:
                    require(b'<app-root>' in response.read(), 'Angular não recuperado.')
                return
            except (OSError, ValueError):
                if time.monotonic() >= deadline:
                    raise TimeoutError('Startup da aplicação restaurada excedeu prazo.')
                time.sleep(1)
    try:
        start(False)
        clients = []
        for account in accounts:
            client = Client(account['host']); token = client.login(account)
            status, me = client.request('/api/v1/auth/me', token=token)
            require(status == 200 and me['usuarioId'] == account['usuario_id']
                    and me['empresaId'] == account['empresa_id'] and me['perfil'] == account['perfil'], 'Identidade HTTP divergente.')
            other = next(a for a in accounts if a['empresa_id'] != account['empresa_id'])
            require(Client(other['host']).request('/api/v1/auth/me', token=token)[0] == 401, 'JWT cruzou tenant restaurado.')
            if account['perfil'] == 'COZINHA':
                require(client.request('/api/v1/equipe', token=token)[0] == 403, 'Cozinha acessou equipe.')
                for key, expected in [('allowed_unit', 200), ('forbidden_unit', 404)]:
                    require(client.request('/api/v1/operacao/unidades/' + account[key] + '/eventos', token=token)[0] == expected,
                            'Isolamento de unidade restaurada divergente.')
            clients.append((client, token, account))
            record['accounts'].append(dict(empresa_id=account['empresa_id'], usuario_id=account['usuario_id'], perfil=account['perfil'], approved=True))
        client, token, account = next(item for item in clients if item[2]['perfil'] == 'COZINHA')
        admin_client, admin_token, _ = next(item for item in clients
            if item[2]['empresa_id'] == account['empresa_id'] and item[2]['perfil'] == 'ADMINISTRADOR')
        require(admin_client.request('/api/v1/operacao/unidades/' + account['forbidden_unit'] + '/eventos', token=admin_token)[0] == 200,
                'Filial negada ao funcionário deve ser acessível ao Administrador.')
        require(client.request('/api/v1/auth/recuperacao', {'email': account['email']})[0] == 202, 'Outbox restaurada indisponível.')
        # Mensagem foi cifrada no PostgreSQL com worker parado. Restart recupera chave e a entrega.
        stop(); start(True)
        for current, access, _ in clients:
            require(current.request('/api/v1/auth/me', token=access)[0] == 200, 'JWT/sessão não sobreviveram ao restart.')
        directory = capture / ('t_' + uuid.UUID(account['empresa_id']).hex)
        deadline = time.monotonic() + 90
        code = None
        while time.monotonic() < deadline and code is None:
            for file in directory.glob('*.txt'):
                text = private_file(file).read_text()
                if text.startswith('Para: ' + account['email'] + '\n'):
                    matches = re.findall(r'^Código: ([A-Za-z0-9_-]{43})$', text, re.MULTILINE)
                    if matches:
                        code = matches[0]
            if code is None:
                time.sleep(1)
        require(code is not None, 'Chave/outbox não recuperou captura após restart.')
        new_password = secrets.token_urlsafe(24)
        require(client.request('/api/v1/auth/recuperacao/confirmar', {'codigo': code, 'senha': new_password})[0] == 204,
                'Código recuperado não funcionou.')
        require(client.request('/api/v1/auth/me', token=token)[0] == 401, 'Reset não revogou sessão restaurada.')
        client.login(dict(account, senha=new_password))
        require(client.request('/api/v1/auth/recuperacao/confirmar', {'codigo': code, 'senha': new_password})[0] == 422,
                'Código recuperado foi reutilizado.')
        for current, access, other in clients:
            if other['usuario_id'] != account['usuario_id'] or other['empresa_id'] != account['empresa_id']:
                require(current.request('/api/v1/auth/me', token=access)[0] == 200, 'Reset revogou outro usuário.')
                current.login(other)
        record.update(approved=True, restart=True, copied_configuration_verified=True,
                      jwt_survived_restart=True, encrypted_outbox_after_restore_survived_restart=True,
                      other_accounts_preserved=True, media='Não implementada na Sprint01; não testada.',
                      limitation='JWT/outbox criados após restore; não comprova recuperação de tokens/mensagens pré-backup.')
    finally:
        stop()
        record['stopped'] = process is None
        atomic_json(attempt / 'application-result.json', record)
    return record

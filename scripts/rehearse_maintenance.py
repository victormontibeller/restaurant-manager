"""Ensaio real e finito de manutenção, somente rm_test; nunca promove hml.

Serializado com build/E2E/deploy. Original é preservado e retornado por OID;
candidato mutado fica bloqueado, sem DROP. Não há recuperação automática após
SIGKILL: reconciliar ledger/processos/OIDs antes de qualquer nova execução.
"""
import argparse
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import signal
import socket
import ssl
import subprocess
import time
import urllib.request
import uuid

from application_recovery import Client, private_file, require, validate_fixture
from database_recovery import Session, inventory, validate_source, verify_inventory
from maintenance_database import Admin, DatabaseSwap, assert_no_pending
from release_support import (atomic_json, durable_artifact, runtime_config, private_runtime_path,
                             verify, verify_listener, artifact_hash, clean_sha)

UNIT = 'restaurant-manager-maintenance-test.service'


def state():
    return subprocess.check_output(['systemctl', '--user', 'show', UNIT,
                                    '--property=MainPID', '--value'], text=True).strip()


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--job', type=Path, required=True)
    parser.add_argument('--runtime-config', type=Path, required=True)
    parser.add_argument('--application-fixture', type=Path, required=True)
    args = parser.parse_args()
    validate_source(os.environ)
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
    repo = Path(__file__).resolve().parents[1]
    runner_sha = clean_sha(repo)
    artifact, gate = durable_artifact(args.job, root, repo)
    config = private_runtime_path(str(args.runtime_config))
    values = dict(line.split('=', 1) for line in config.read_text().splitlines() if line)
    require(all(values.get(k) == os.environ[k] for k in ('RM_DB_URL', 'RM_DB_USER', 'RM_DB_PASSWORD', 'RM_STAGE')),
            'Runtime não pertence ao banco exclusivo de teste.')
    fixture = json.loads(private_file(args.application_fixture).read_text())
    validate_fixture(fixture)
    require(values['RM_JWT_SECRET'] == fixture['jwt_secret'] and values['RM_EMAIL_SECRET'] == fixture['email_secret'],
            'Configuração não corresponde à massa fictícia.')
    # Contrato restrito e certificado verificado antes de tocar banco/unidade.
    text = runtime_config(values, identity=True)
    context = ssl.create_default_context(cafile=values['RM_TLS_TRUST_CERTIFICATE'])
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 8091))
    require(state() == '0', 'Unidade de ensaio já possui processo; preservar execução.')
    attempt = root / 'maintenance-tests' / uuid.uuid4().hex
    attempt.mkdir(parents=True, mode=0o700)
    (attempt / 'runtime.env').write_text(text)
    before_hml = verify(root)
    record = dict(approved=False, started_at=datetime.now(timezone.utc).isoformat(),
                  git_sha=gate['git_sha'], runner_sha=runner_sha, artifact_sha256=gate['artifact_sha256'],
                  scope='Manutenção nativa rm_test, cópia consistente e retorno por OID; sem deploy hml',
                  hml_before=before_hml)
    atomic_json(attempt / 'running.json', record)
    swap = None
    owned = False
    code = 1
    def interrupted(signum, frame):
        raise InterruptedError('Ensaio interrompido; recuperar original.')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    with (root / 'deploy.lock').open('a') as lock, (attempt / 'execution.log').open('xb') as log:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            assert_no_pending(attempt.parent, 'test')
            admin = Admin(root, log)
            require(not admin.pending('test'), 'Banco original preservado por tentativa anterior; reconciliar antes.')
            admin.verify_policy('rm_test', 'test')
            # Não assumir que só o serviço de ensaio acessa o banco.
            require(admin.connections('rm_test') == 0, 'Banco possui conexões; aguardar dono, sem encerrar clientes.')
            binary = admin.binary
            pg_env = dict(admin.env, PGPASSWORD=os.environ['RM_MIGRATION_PASSWORD'])
            command = [str(binary / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                       '-h', '127.0.0.1', '-p', '55432', '-U', 'rm_test_owner', '-d', 'rm_test']
            def sql(query, expected=True):
                result = subprocess.run(command + ['-c', query], env=pg_env, stdout=subprocess.PIPE,
                                        stderr=log, text=True, timeout=150)
                require((result.returncode == 0) == expected, 'Resultado SQL do ensaio divergente.')
                return result.stdout.strip()
            require(sql('select current_database(),current_user,inet_server_port(),host(inet_server_addr())')
                    == 'rm_test|rm_test_owner|55432|127.0.0.1', 'Alvo SQL efetivo recusado.')
            def snapshot():
                session = Session(command, pg_env, log)
                try:
                    session.query('begin isolation level repeatable read read only')
                    return inventory(session, release_table_locks=True)
                finally:
                    session.close()
            def stop():
                nonlocal owned
                if owned:
                    subprocess.run(['systemctl', '--user', 'stop', UNIT], check=True, stdout=log, stderr=log, timeout=60)
                    require(state() == '0', 'Parada nativa não confirmada.')
                    owned = False
            def start():
                nonlocal owned
                require(state() == '0', 'Outro processo ocupa unidade do ensaio.')
                owned = True  # Limpeza também cobre startup parcialmente concluído.
                subprocess.run(['systemd-run', '--user', '--unit=' + UNIT, '--collect',
                    '--property=Type=exec', '--property=KillMode=control-group', '--property=TimeoutStopSec=45',
                    '--property=MemoryMax=650M', '--property=UMask=0077', '--property=NoNewPrivileges=true',
                    '--property=WorkingDirectory=' + str(attempt), '--property=EnvironmentFile=' + str(attempt / 'runtime.env'),
                    '--property=StandardOutput=append:' + str(attempt / 'application.log'),
                    '--property=StandardError=append:' + str(attempt / 'application.log'),
                    '--setenv=RM_PORT=8091', '--setenv=RM_RELEASE_SHA=' + gate['git_sha'],
                    str(root / 'toolchains/jdk-21.0.13+9/bin/java'), '-Xmx384m', '-XX:ActiveProcessorCount=2',
                    '-jar', str(artifact), '--rm.auth.retencao-agendada=false', '--rm.email.agendado=false'],
                    check=True, stdout=log, stderr=log, timeout=30)
                deadline = time.monotonic() + 240
                while True:
                    try:
                        pid = int(state()); require(pid > 0, 'Serviço do ensaio encerrou.')
                        verify_listener(pid, 8091)
                        with urllib.request.urlopen('https://127.0.0.1:8091/actuator/health', context=context, timeout=5) as response:
                            require(json.load(response) == {'status': 'UP'}, 'Health do ensaio recusado.')
                        environment = dict(x.split(b'=', 1) for x in Path(f'/proc/{pid}/environ').read_bytes().split(b'\0') if b'=' in x)
                        require(environment.get(b'RM_DB_USER') == b'rm_test_app' and environment.get(b'RM_RELEASE_SHA') == gate['git_sha'].encode()
                                and not any(k.startswith(b'RM_MIGRATION_') for k in environment), 'Identidade nativa divergente.')
                        require(artifact_hash(artifact) == gate['artifact_sha256'], 'Artefato mudou.')
                        return pid
                    except (OSError, ValueError):
                        if time.monotonic() >= deadline:
                            raise TimeoutError('Startup nativo excedeu prazo.')
                        time.sleep(1)
            def accounts():
                checked = []
                for account in fixture['accounts']:
                    client = Client(account['host'], 'https://127.0.0.1:8091', context)
                    token = client.login(account)
                    status, me = client.request('/api/v1/auth/me', token=token)
                    require(status == 200 and me['usuarioId'] == account['usuario_id'] and me['empresaId'] == account['empresa_id'],
                            'Identidade antes/depois da manutenção divergente.')
                    other = next(a for a in fixture['accounts'] if a['empresa_id'] != account['empresa_id'])
                    require(Client(other['host'], 'https://127.0.0.1:8091', context).request('/api/v1/auth/me', token=token)[0] == 401,
                            'JWT cruzou empresa durante manutenção.')
                    if account['perfil'] == 'COZINHA':
                        require(client.request('/api/v1/equipe', token=token)[0] == 403, 'Cozinha recebeu administração.')
                        for field, expected in [('allowed_unit', 200), ('forbidden_unit', 404)]:
                            require(client.request('/api/v1/operacao/unidades/' + account[field] + '/eventos', token=token)[0] == expected,
                                    'Fronteira de unidade divergente.')
                    checked.append(dict(empresa_id=account['empresa_id'], usuario_id=account['usuario_id'], perfil=account['perfil']))
                return checked
            record['initial_pid'] = start()
            record['initial_accounts'] = accounts()
            stop()
            require(admin.connections('rm_test') == 0, 'Conexões restantes após parada nativa.')
            before = snapshot()
            atomic_json(attempt / 'original-inventory.json', before)
            swap = DatabaseSwap(admin, 'test', attempt)
            swap.clone()
            after = snapshot()
            verify_inventory(before, after)
            atomic_json(attempt / 'clone-inventory.json', after)
            record['clone_equal'] = True
            # Executa migrador Java real; a falha posterior é injeção SQL explícita,
            # não é apresentada como uma migration de produto que falhou.
            environment = {k: os.environ[k] for k in ('RM_DB_URL', 'RM_DB_USER', 'RM_MIGRATION_USER', 'RM_MIGRATION_PASSWORD', 'RM_STAGE')}
            migration = subprocess.run([str(root / 'toolchains/jdk-21.0.13+9/bin/java'), '-Xmx192m',
                '-XX:ActiveProcessorCount=2', '-jar', str(artifact), '--migrate-only'], env=environment,
                stdout=log, stderr=log, timeout=300)
            require(migration.returncode == 0, 'Migrador real falhou no clone.')
            record['migration_exit'] = migration.returncode
            record['clone_pid'] = start()
            record['clone_accounts'] = accounts()
            stop()
            probe = 'maintenance_probe_' + uuid.uuid4().hex
            sql('create table public.' + probe + '(id integer primary key); insert into public.' + probe + ' values (1)')
            require(sql('select count(*) from public.' + probe) == '1', 'DDL confirmado não observado.')
            sql('select 1/0', expected=False)
            record['injected_sql_failure_after_committed_ddl'] = True
            swap.rollback()
            restored = snapshot()
            verify_inventory(before, restored)
            atomic_json(attempt / 'returned-inventory.json', restored)
            require(sql("select to_regclass('public." + probe + "') is null") == 't', 'DDL candidato vazou no original.')
            admin.verify_policy('rm_test', 'test')
            record['restored_pid'] = start()
            record['restored_accounts'] = accounts()
            stop()
            record['hml_after'] = verify(root, before_hml['served_sha'])
            require(record['hml_after'] == before_hml, 'Homologação mudou durante o ensaio.')
            clean_sha(repo, runner_sha)
            record.update(approved=True, original_oid=swap.record['original_oid'], candidate_oid=swap.record['candidate_oid'],
                          failed_database=swap.failed, database_restored=True, native_service_stopped=True,
                          tables=len(before['tables']), rows=sum(t['rows'] for t in before['tables'].values()))
            code = 0
        except Exception as error:
            record['error_type'] = type(error).__name__
        finally:
            try:
                if owned:
                    subprocess.run(['systemctl', '--user', 'stop', UNIT], check=True, stdout=log, stderr=log, timeout=60)
                    require(state() == '0', 'Parada do ensaio não confirmada.')
                    owned = False
                if swap is not None and swap.record['state'] != 'original-restaurado':
                    swap.rollback()
                    record['database_restored_after_error'] = True
            except Exception as error:
                record.update(approved=False, cleanup_pending=True, cleanup_error_type=type(error).__name__)
                code = 1
            record.update(finished_at=datetime.now(timezone.utc).isoformat(), exit_code=code)
            atomic_json(attempt / 'result.json', record)
    print(json.dumps(dict(attempt=str(attempt), **record)))
    return code


if __name__ == '__main__':
    raise SystemExit(main())

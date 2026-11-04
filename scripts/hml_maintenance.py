"""Primeira transição fundação -> identidade em hml fictícia, com retorno por OID.

Não promove healthy.json. O candidato fica pendente de E2E e impede outro deploy
até validação/retorno explícitos. Nunca apaga bancos nem aceita produção.
"""
import argparse
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import uuid

from database_recovery import Session, inventory
from maintenance_database import Admin, DatabaseSwap, assert_no_pending, durable_journal
from release_support import (UNIT, artifact_hash, atomic_json, clean_sha, durable_artifact,
                             install_artifact, migration_fingerprint, previous_artifact,
                             private_config, private_runtime_path, runtime_config,
                             require_foundation_artifact, artifact_has_identity,
                             systemctl, verify, wait_for_release, assert_no_hml_maintenance)


def validate_rehearsal(receipt, gate):
    if (any(receipt.get(k) is not True for k in ('approved', 'database_restored',
            'native_service_stopped', 'clone_equal')) or receipt.get('exit_code') != 0
            or receipt.get('migration_exit') != 0 or receipt.get('cleanup_pending')
            or any(receipt.get(k) != gate[k] for k in ('git_sha', 'artifact_sha256'))):
        raise ValueError('Ensaio de manutenção não corresponde ao candidato ou não foi concluído.')


def upgrade(ops):
    ops.preflight()
    ops.save('parando-escritores')
    try:
        ops.stop()
        before = ops.snapshot()
        ops.save_snapshot(before)
        ops.clone()
        after = ops.snapshot()
        ops.compare_clone(before, after)
        ops.migrate()
        ops.install()
        ops.start()
        observed = ops.verify_candidate()
        ops.save('health-aprovado-e2e-pendente', observed)
        return observed
    except Exception:
        rollback(ops)
        raise


def rollback(ops):
    ops.save('retornando-original')
    started = False
    try:
        ops.stop()
        ops.restore_database()
        ops.compare_original()
        ops.restore_service()
        started = True  # Inclui startup parcialmente concluído.
        ops.start()
        ops.verify_previous()
        ops.save('original-restaurado')
    except Exception:
        try:
            if started:
                ops.stop()
        finally:
            ops.save('retorno-pendente')
        raise


def immutable_text(path, text):
    if path.exists():
        if path.is_symlink() or path.read_text() != text:
            raise ValueError('Arquivo privado existente diverge; não sobrescrever.')
    else:
        with path.open('x') as stream:
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        path.chmod(0o600)


class Operations:
    def __init__(self, root, attempt, log, lock_fd):
        self.root, self.attempt, self.log, self.lock_fd = root, attempt, log, lock_fd
        self.unit = Path.home() / '.config/systemd/user' / UNIT
        self.admin = Admin(root, log)
        self.swap = None
        self.record = {}
        self.values = {}

    def load(self):
        self.record = json.loads(private_runtime_path(str(self.attempt / 'state.json')).read_text())
        if self.record.get('stage') != 'hml' or self.record.get('attempt') != str(self.attempt):
            raise ValueError('Ledger de homologação divergente.')
        if self.record.get('state') == 'original-restaurado':
            raise ValueError('Retorno já concluído; conferir release, sem repetir mutações.')
        for key in ('git_sha', 'previous_sha', 'runner_sha'):
            if not re.fullmatch('[0-9a-f]{40}', self.record.get(key, '')):
                raise ValueError('SHA inválido no ledger.')
        self.target = self.root / 'releases' / self.record['git_sha'] / 'app.jar'
        previous = self.root / 'releases' / self.record['previous_sha'] / 'app.jar'
        if (artifact_hash(previous) != self.record['previous_hash']
                or artifact_hash(self.root / 'healthy.json') != self.record['healthy_hash']
                or artifact_hash(previous.parent / 'runtime.env') != self.record['previous_runtime_hash']
                or artifact_hash(self.attempt / 'previous.service') != self.record['previous_unit_hash']
                or previous_artifact(self.root, (self.attempt / 'previous.service').read_text()) != previous):
            raise ValueError('Artefato/configuração anterior divergente; retorno recusado.')
        self.values = private_config(self.attempt / 'connection.env')
        ledger = self.attempt / 'database-swap.json'
        if ledger.exists():
            self.swap = DatabaseSwap.resume(self.admin, 'hml', self.attempt)

    def preflight(self):
        # Tudo que independe da parada é validado antes de alterar disponibilidade.
        assert_no_hml_maintenance(self.root)
        assert_no_pending(self.attempt.parent, 'hml')
        if self.admin.pending('hml'):
            raise ValueError('Banco anterior preservado; reconciliar manutenção pendente.')
        self.admin.verify_policy('rm_hml', 'hml')
        before = verify(self.root)
        healthy = json.loads((self.root / 'healthy.json').read_text())
        if any(before[k] != healthy[k] for k in ('served_sha', 'artifact_sha256')):
            raise ValueError('Serviço não corresponde ao último release validado.')
        previous = self.root / 'releases' / before['served_sha'] / 'app.jar'
        require_foundation_artifact(previous)
        old_text = self.unit.read_text()
        if (old_text != (previous.parent / 'validated.service').read_text()
                or previous_artifact(self.root, old_text) != previous):
            raise ValueError('Unidade anterior não corresponde ao baseline validado.')
        # Não reaproveita implicitamente credenciais/configuração de outro runtime.
        actual = dict(x.split(b'=', 1) for x in Path(f'/proc/{before["pid"]}/environ').read_bytes().split(b'\0') if b'=' in x)
        if any(actual.get(k.encode()) != self.values[k].encode() for k in ('RM_STAGE', 'RM_DB_URL', 'RM_DB_USER', 'RM_DB_PASSWORD')):
            raise ValueError('Configuração não corresponde ao serviço hml atual.')
        self.sql('select current_database(),current_user,inet_server_port(),host(inet_server_addr())', identity=True)
        immutable_text(self.attempt / 'previous.service', old_text)
        immutable_text(self.attempt / 'connection.env', ''.join(k + '=' + self.values[k] + '\n' for k in (
            'RM_STAGE', 'RM_DB_URL', 'RM_DB_USER', 'RM_DB_PASSWORD', 'RM_MIGRATION_USER', 'RM_MIGRATION_PASSWORD')))
        self.record.update(stage='hml', attempt=str(self.attempt), previous_sha=before['served_sha'],
                           previous_hash=before['artifact_sha256'], previous_unit_hash=artifact_hash(self.attempt / 'previous.service'),
                           previous_runtime_hash=artifact_hash(previous.parent / 'runtime.env'),
                           healthy_hash=artifact_hash(self.root / 'healthy.json'), before=before,
                           started_at=datetime.now(timezone.utc).isoformat())

    def save(self, state, observed=None):
        self.record.update(state=state, updated_at=datetime.now(timezone.utc).isoformat())
        if observed is not None:
            self.record['observed'] = observed
        durable_journal(self.attempt / 'state.json', self.record)
        atomic_json(self.root / 'candidate.json', dict(self.record, maintenance_attempt=str(self.attempt)))

    def stop(self):
        pid = int(subprocess.check_output(['systemctl', '--user', 'show', UNIT, '--property=MainPID', '--value'], text=True))
        if pid:
            args = Path(f'/proc/{pid}/cmdline').read_bytes().split(b'\0')
            jar = Path(os.fsdecode(args[args.index(b'-jar') + 1])).resolve()
            permitted = {self.target, self.root / 'releases' / self.record['previous_sha'] / 'app.jar'}
            if jar not in permitted:
                raise ValueError('Processo alheio à tentativa; não parar.')
        systemctl('stop', UNIT)
        if subprocess.check_output(['systemctl', '--user', 'show', UNIT, '--property=MainPID', '--value'], text=True).strip() != '0':
            raise ValueError('Parada do serviço não confirmada.')
        if self.admin.connections('rm_hml'):
            raise ValueError('Conexões restantes: não matar clientes nem iniciar migração.')

    def command(self):
        return [str(self.admin.binary / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                '-h', '127.0.0.1', '-p', '55432', '-U', 'rm_hml_owner', '-d', 'rm_hml']

    def sql(self, query, identity=False):
        result = subprocess.run(self.command() + ['-c', query], env=dict(self.admin.env, PGPASSWORD=self.values['RM_MIGRATION_PASSWORD']),
                                stdout=subprocess.PIPE, stderr=self.log, text=True, timeout=150)
        if result.returncode or (identity and result.stdout.strip() != 'rm_hml|rm_hml_owner|55432|127.0.0.1'):
            raise ValueError('Conexão/consulta hml recusada.')
        return result.stdout.strip()

    def snapshot(self):
        self.sql('select current_database(),current_user,inet_server_port(),host(inet_server_addr())', identity=True)
        session = Session(self.command(), dict(self.admin.env, PGPASSWORD=self.values['RM_MIGRATION_PASSWORD']), self.log)
        try:
            session.query('begin isolation level repeatable read read only')
            return inventory(session, require_identity=False)
        finally:
            session.close()

    def save_snapshot(self, before):
        atomic_json(self.attempt / 'original-inventory.json', before)

    def clone(self):
        self.swap = DatabaseSwap(self.admin, 'hml', self.attempt)
        self.swap.clone()

    def compare_clone(self, before, after):
        if not before.get('tables') or not before.get('metadata') or before != after:
            raise ValueError('Clone de homologação diverge do original.')
        atomic_json(self.attempt / 'clone-inventory.json', after)
        self.save('clone-verificado')

    def migrate(self):
        self.save('migrando-clone')
        env = {k: self.values[k] for k in ('RM_DB_URL', 'RM_DB_USER', 'RM_MIGRATION_USER', 'RM_MIGRATION_PASSWORD', 'RM_STAGE')}
        result = subprocess.run([str(self.root / 'toolchains/jdk-21.0.13+9/bin/java'), '-Xmx192m',
                '-XX:ActiveProcessorCount=2', '-jar', str(self.target), '--migrate-only'], env=env,
                stdout=self.log, stderr=self.log, timeout=300, pass_fds=(self.lock_fd,))
        if result.returncode:
            raise RuntimeError('Migrador falhou no clone; retornar original.')
        self.record['migration_exit'] = result.returncode

    def install(self):
        self.save('instalando-unidade')
        content = (self.attempt / 'candidate.service').read_text()
        self.unit.write_text(content)
        systemctl('daemon-reload')

    def start(self):
        systemctl('start', UNIT)

    def verify_candidate(self):
        result = wait_for_release(self.root, self.record['git_sha'], seconds=240)
        if artifact_hash(self.root / 'healthy.json') != self.record['healthy_hash']:
            raise ValueError('Baseline validado mudou durante deploy.')
        return result

    def restore_database(self):
        if self.swap is not None:
            self.swap.rollback()
        self.admin.verify_policy('rm_hml', 'hml')

    def compare_original(self):
        path = self.attempt / 'original-inventory.json'
        if path.exists():
            actual = self.snapshot()
            if actual != json.loads(path.read_text()):
                raise ValueError('Retorno não recuperou o inventário original.')
            atomic_json(self.attempt / 'returned-inventory.json', actual)

    def restore_service(self):
        if artifact_hash(self.root / 'healthy.json') != self.record['healthy_hash']:
            raise ValueError('Baseline mudou; retorno exige reconciliação.')
        self.unit.write_text((self.attempt / 'previous.service').read_text())
        systemctl('daemon-reload')

    def verify_previous(self):
        observed = wait_for_release(self.root, self.record['previous_sha'], seconds=240)
        if observed['artifact_sha256'] != self.record['previous_hash']:
            raise ValueError('Retorno de artefato divergente.')
        self.record['restored'] = observed


def candidate_service(root, release, sha):
    return f'''[Unit]
Description=Restaurant Manager homologacao ficticia em validacao
After=restaurant-manager-postgres.service
Requires=restaurant-manager-postgres.service
[Service]
ExecStart={root}/toolchains/jdk-21.0.13+9/bin/java -Xmx384m -XX:ActiveProcessorCount=2 -jar {release}/app.jar
WorkingDirectory={release}
EnvironmentFile={release}/runtime.env
Environment=RM_PORT=8088
Environment=RM_RELEASE_SHA={sha}
Restart=on-failure
RestartSec=10
SuccessExitStatus=143
TimeoutStopSec=60
KillMode=control-group
MemoryMax=650M
NoNewPrivileges=true
UMask=0077
[Install]
WantedBy=default.target
'''


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='action', required=True)
    install = commands.add_parser('install')
    install.add_argument('--job', type=Path, required=True)
    install.add_argument('--runtime-config', type=Path, required=True)
    install.add_argument('--rehearsal', type=Path, required=True)
    restore = commands.add_parser('rollback')
    restore.add_argument('attempt', type=Path)
    args = parser.parse_args()
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
    repo = Path(__file__).resolve().parents[1]
    runner_sha = clean_sha(repo)
    if re.search(r'\s', str(root)):
        raise ValueError('Prefixo com espaços não suportado por esta unidade nativa.')
    attempts = root / 'maintenance-releases'
    attempts.mkdir(mode=0o700, exist_ok=True)
    with (root / 'deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if args.action == 'install':
            artifact, gate = durable_artifact(args.job, root, repo)
            if not artifact_has_identity(artifact):
                raise ValueError('Transição exige artefato de identidade.')
            receipt = json.loads(private_runtime_path(str(args.rehearsal)).read_text())
            validate_rehearsal(receipt, gate)
            values = private_config(private_runtime_path(str(args.runtime_config)))
            runtime = runtime_config(values, identity=True)
            attempt = attempts / uuid.uuid4().hex
            attempt.mkdir(mode=0o700)
            release = root / 'releases' / gate['git_sha']
            release.mkdir(mode=0o700, exist_ok=True)
            install_artifact(artifact, release / 'app.jar', gate['artifact_sha256'])
            immutable_text(release / 'runtime.env', runtime)
            atomic_json(release / 'manifest.json', dict(gate, migrations_sha256=migration_fingerprint(artifact)))
            immutable_text(attempt / 'candidate.service', candidate_service(root, release, gate['git_sha']))
        else:
            attempt = private_runtime_path(str(args.attempt), directory=True)
            if attempt.parent != attempts or not re.fullmatch('[0-9a-f]{32}', attempt.name):
                raise ValueError('Tentativa fora do registro privado de homologação.')
        def interrupted(signum, frame):
            raise InterruptedError('Manutenção interrompida; retornar original.')
        signal.signal(signal.SIGTERM, interrupted)
        signal.signal(signal.SIGINT, interrupted)
        with (attempt / 'execution.log').open('ab') as log:
            ops = Operations(root, attempt, log, lock.fileno())
            if args.action == 'install':
                ops.target, ops.values = release / 'app.jar', values
                ops.record = dict(gate, runner_sha=runner_sha, rehearsal_hash=artifact_hash(args.rehearsal))
                upgrade(ops)
            else:
                ops.load()
                rollback(ops)
            clean_sha(repo, runner_sha)
            print(json.dumps(dict(attempt=str(attempt), state=ops.record['state'],
                                  git_sha=ops.record['git_sha'], healthy_promoted=False)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

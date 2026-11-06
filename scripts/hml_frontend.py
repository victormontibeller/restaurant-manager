"""Substituição restrita de candidato hml ainda não aceito.

Por padrão backend é idêntico, exceto static/. Opt-in login-startup admite
somente o incremento delimitado da consulta de login; login-startup-frontend
combina esse mesmo incremento com static/. Não migra nem restaura
banco. Falha retorna somente o binário anterior no MESMO clone, nunca o baseline
pré-identidade. Recuperação explícita conserva o journal e todos os artefatos.
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
import zipfile
import uuid
from typing import Any, cast

from hml_accounts import validate_runtime
from hml_maintenance import candidate_service, validate_rehearsal
from maintenance_database import Admin, DatabaseSwap, durable_journal
from release_support import (UNIT, artifact_hash, clean_sha, durable_artifact, install_artifact,
                             migration_fingerprint, previous_artifact, private_runtime_path,
                             systemctl, verify, wait_for_release, artifact_has_identity)

MODES = ('frontend', 'login-startup', 'login-startup-frontend')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def require_same_backend(old, new):
    def backend(path):
        with zipfile.ZipFile(path) as archive:
            names = archive.namelist()
            require(len(names) == len(set(names)), 'Entradas ZIP duplicadas.')
            require(any(n.startswith('BOOT-INF/classes/static/') for n in names), 'Frontend ausente.')
            return {n: archive.read(n) for n in names if not n.startswith('BOOT-INF/classes/static/')}
    require(backend(old) == backend(new), 'Backend, dependências ou metadados diferentes: troca recusada.')
    require(migration_fingerprint(old) == migration_fingerprint(new), 'Migrations divergentes.')


def require_login_startup_change(old, new):
    _require_login_startup_change(old, new, allow_frontend=False)


def _require_login_startup_change(old, new, *, allow_frontend):
    """Exceção delimitada ao incremento revisado; não é deploy genérico Java."""
    require(artifact_has_identity(old) and artifact_has_identity(new), 'Identidade ausente.')
    def entries(path):
        with zipfile.ZipFile(path) as archive:
            names = archive.namelist()
            require(len(names) == len(set(names)), 'Entradas ZIP duplicadas.')
            require(any(n.startswith('BOOT-INF/classes/static/') for n in names), 'Frontend ausente.')
            return {n: archive.read(n) for n in names
                    if not (allow_frontend and n.startswith('BOOT-INF/classes/static/'))}
    before, after = entries(old), entries(new)
    require(before.keys() == after.keys(), 'Entradas adicionadas/removidas fora do incremento de login.')
    config = 'BOOT-INF/classes/application.yml'
    package = 'BOOT-INF/classes/br/com/restaurantmanager/identidade/'
    expected = {config, package + 'Usuario.class', package + 'IdentidadeRepository.class'}
    require({n for n in before if before[n] != after[n]} == expected,
            'Mudanças fora do incremento delimitado de login.')
    anchor = b'      hibernate.jdbc.time_zone: UTC\n'
    addition = ('      # Compila/valida a HQL nomeada no startup, não no primeiro login.\n'
                '      hibernate.query.startup_check: true\n').encode()
    require(before[config].count(anchor) == 1
            and after[config] == before[config].replace(anchor, anchor + addition),
            'Configuração fora do incremento delimitado de login.')
    require(migration_fingerprint(old) == migration_fingerprint(new), 'Migrations divergentes.')


def require_login_startup_frontend_change(old, new):
    _require_login_startup_change(old, new, allow_frontend=True)


def record_mode(record):
    mode = record.get('mode', 'frontend')  # Journals anteriores ao opt-in.
    require(mode in MODES, 'Modo de substituição desconhecido.')
    return mode


def verify_frontend_record(attempt, gate):
    directory = attempt / 'frontend-replacement'
    if not directory.exists():
        require(not any(attempt.glob('frontend-history-*'))
                and not any(attempt.glob('frontend-preparing-*')),
                'Journal ativo ausente com histórico/preparação: reconciliar antes de continuar.')
        return
    record = json.loads(private_runtime_path(str(directory / 'journal.json')).read_text())
    record_mode(record)
    require(record.get('state') in ('concluido', 'anterior-restaurado'), 'Troca de frontend ainda pendente.')
    expected = record['gate'] if record['state'] == 'concluido' else record['old_state']
    require(all(expected[k] == gate[k] for k in ('git_sha', 'artifact_sha256')), 'Recibo de frontend diverge do candidato.')


def durable_text(path, content):
    temporary = path.with_suffix(path.suffix + '.pending')
    fd = os.open(temporary, os.O_CREAT | os.O_WRONLY | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as stream:
        os.fchmod(stream.fileno(), 0o600)
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)
    for directory in (path.parent, path.parent.parent):
        fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)


def replace_frontend(ops):
    ops.preflight()
    ops.prepare()  # Intenção e bloqueio persistidos antes de mudar disponibilidade.
    try:
        ops.stop()
        ops.install()
        ops.start()
        observed = ops.verify_new()
        ops.complete(observed)
    except Exception:
        recover_frontend(ops)
        raise


def recover_frontend(ops):
    try:
        ops.mark_pending()
        ops.stop()
        ops.restore_service()
        ops.start()
        observed = ops.verify_old()
        ops.complete_return(observed)
    except Exception:
        ops.stop()
        raise


class Replacement:
    mode = 'frontend'
    job: Path
    rehearsal: Path
    record: dict[str, Any]
    db: dict[str, Any]

    def __init__(self, root, repo, attempt, log):
        self.root, self.repo, self.attempt = root, repo, attempt
        self.unit = Path.home() / '.config/systemd/user' / UNIT
        self.directory = attempt / 'frontend-replacement'
        self.admin = Admin(root, log)

    def database(self):
        self.admin.verify_policy('rm_hml', 'hml')
        swap = DatabaseSwap.resume(self.admin, 'hml', self.attempt)
        require(swap.record['state'] == 'clone-pronto', 'Clone já aceito ou em retorno.')
        require(swap.confirm('rm_hml', swap.record['candidate_oid'])['allowed'] is True
                and swap.confirm(swap.backup, swap.record['original_oid'])['allowed'] is False
                and self.admin.connections(swap.backup) == 0, 'OID/preservação do original divergente.')
        return dict(candidate_oid=swap.record['candidate_oid'], original_oid=swap.record['original_oid'],
                    ledger_sha256=artifact_hash(self.attempt / 'database-swap.json'))

    def preflight(self):
        requested_mode = record_mode({'mode': self.mode})
        self.archive = None
        if self.directory.exists():
            self.load(allow_returned=True)
            require(self.record['state'] == 'anterior-restaurado'
                    or (requested_mode in ('login-startup', 'login-startup-frontend')
                        and self.record['state'] == 'concluido'),
                    'Troca já registrada; recuperar antes de novo candidato.')
            current = json.loads(private_runtime_path(str(self.attempt / 'state.json')).read_text())
            verify_frontend_record(self.attempt, current)
            self.archive = self.attempt / ('frontend-history-' + uuid.uuid4().hex)
        self.mode = requested_mode
        self.old_state = json.loads(private_runtime_path(str(self.attempt / 'state.json')).read_text())
        verify_frontend_record(self.attempt, self.old_state)
        require(self.old_state.get('stage') == 'hml' and self.old_state.get('attempt') == str(self.attempt)
                and self.old_state.get('state') == 'health-aprovado-e2e-pendente'
                and not (self.attempt / 'acceptance-intent.json').exists(), 'Manutenção não elegível.')
        self.before = verify(self.root, self.old_state['git_sha'])
        require(self.before['artifact_sha256'] == self.old_state['artifact_sha256'], 'Candidato divergente.')
        artifact, self.gate = durable_artifact(self.job, self.root, self.repo)
        require(self.gate['git_sha'] != self.before['served_sha'], 'Mesmo artefato não é substituição.')
        validate_rehearsal(json.loads(private_runtime_path(str(self.rehearsal)).read_text()), self.gate)
        self.old_release = self.root / 'releases' / self.before['served_sha']
        self.release = self.root / 'releases' / self.gate['git_sha']
        self.old_service = self.unit.read_text()
        require(self.old_service == (self.attempt / 'candidate.service').read_text()
                and previous_artifact(self.root, self.old_service) == self.old_release / 'app.jar',
                'Unidade não corresponde ao candidato anterior.')
        guard = {'frontend': require_same_backend,
                 'login-startup': require_login_startup_change,
                 'login-startup-frontend': require_login_startup_frontend_change}[self.mode]
        guard(self.old_release / 'app.jar', artifact)
        environ = dict(x.split(b'=', 1) for x in Path('/proc/%s/environ' % self.before['pid']).read_bytes().split(b'\0') if b'=' in x)
        validate_runtime(self.before, self.old_state, environ)
        runtime = private_runtime_path(str(self.old_release / 'runtime.env'))
        self.runtime = runtime.read_text()
        configured = dict(line.split('=', 1) for line in self.runtime.splitlines())
        require(all(environ.get(k.encode()) == v.encode() for k, v in configured.items())
                and not any(k.startswith('RM_MIGRATION_') for k in configured), 'Configuração runtime divergente.')
        self.db = self.database()
        require(artifact_hash(self.root / 'healthy.json') == self.old_state['healthy_hash'], 'Baseline alterado.')
        self.old_candidate = json.loads(private_runtime_path(str(self.root / 'candidate.json')).read_text())
        require(self.old_candidate.get('maintenance_attempt') == str(self.attempt)
                and all(self.old_candidate.get(k) == self.old_state[k] for k in ('git_sha', 'artifact_sha256', 'state')),
                'Registro candidato divergente.')
        self.artifact = artifact

    def prepare(self):
        self.release.mkdir(mode=0o700, exist_ok=True)
        install_artifact(self.artifact, self.release / 'app.jar', self.gate['artifact_sha256'])
        with (self.release / 'app.jar').open('rb') as stream:
            os.fsync(stream.fileno())
        runtime_path = self.release / 'runtime.env'
        require(not runtime_path.exists() or runtime_path.read_text() == self.runtime, 'Runtime imutável diverge.')
        durable_text(runtime_path, self.runtime)
        durable_journal(self.release / 'manifest.json', dict(self.gate, migrations_sha256=migration_fingerprint(self.artifact)))
        self.new_service = candidate_service(self.root, self.release, self.gate['git_sha'])
        staging = self.attempt / ('frontend-preparing-' + uuid.uuid4().hex)
        staging.mkdir(mode=0o700)
        durable_text(staging / 'previous.service', self.old_service)
        durable_text(staging / 'next.service', self.new_service)
        self.record = dict(state='preparado', stage='hml', mode=self.mode,
                           attempt=str(self.attempt), runner_sha=clean_sha(self.repo),
                           old_state=self.old_state, old_candidate=self.old_candidate, gate=self.gate, database=self.db,
                           runtime_sha256=artifact_hash(runtime_path), old_service_sha256=artifact_hash(staging / 'previous.service'),
                           new_service_sha256=artifact_hash(staging / 'next.service'),
                           rehearsal_sha256=artifact_hash(self.rehearsal), started_at=datetime.now(timezone.utc).isoformat())
        durable_journal(staging / 'journal.json', self.record)
        if getattr(self, 'archive', None) is not None:
            self.directory.rename(self.archive)
        staging.rename(self.directory)
        descriptor = os.open(self.attempt, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)
        self.mark_pending()

    def save(self, state):
        self.record.update(state=state, updated_at=datetime.now(timezone.utc).isoformat())
        durable_journal(self.directory / 'journal.json', self.record)

    def mark_pending(self):
        durable_journal(self.attempt / 'state.json', dict(self.record['old_state'], state='frontend-troca-pendente',
                                                       frontend_replacement=str(self.directory)))

    def load(self, allow_returned=False):
        self.record = json.loads(private_runtime_path(str(self.directory / 'journal.json')).read_text())
        self.mode = record_mode(self.record)
        eligible = ('preparado', 'concluido', 'anterior-restaurado') if allow_returned else ('preparado', 'concluido')
        require(self.record.get('attempt') == str(self.attempt) and self.record.get('stage') == 'hml'
                and self.record.get('state') in eligible, 'Troca não está pendente.')
        self.old_state, self.gate = self.record['old_state'], self.record['gate']
        self.old_release = self.root / 'releases' / self.old_state['git_sha']
        self.release = self.root / 'releases' / self.gate['git_sha']
        require(artifact_hash(self.old_release / 'app.jar') == self.old_state['artifact_sha256']
                and artifact_hash(self.old_release / 'runtime.env') == self.record['runtime_sha256']
                and artifact_hash(self.directory / 'previous.service') == self.record['old_service_sha256']
                and previous_artifact(self.root, (self.directory / 'previous.service').read_text()) == self.old_release / 'app.jar',
                'Artefato/configuração anterior divergente.')
        require(artifact_hash(private_runtime_path(str(self.directory / 'next.service'))) == self.record['new_service_sha256'],
                'Unidade nova diverge do journal.')
        require(self.database() == self.record['database']
                and artifact_hash(self.root / 'healthy.json') == self.old_state['healthy_hash'], 'Banco/baseline divergente.')
        current = json.loads(private_runtime_path(str(self.attempt / 'state.json')).read_text())
        require(current.get('state') in ('frontend-troca-pendente', 'health-aprovado-e2e-pendente')
                and not (self.attempt / 'acceptance-intent.json').exists(), 'Aceitação/retorno incompatível com recuperação.')

    def stop(self):
        require(artifact_hash(self.directory / 'previous.service') == self.record['old_service_sha256']
                and artifact_hash(self.directory / 'next.service') == self.record['new_service_sha256'], 'Unidade alterada.')
        require(self.unit.read_text() in ((self.directory / 'previous.service').read_text(),
                                         (self.directory / 'next.service').read_text()),
                'Unidade alheia: não parar nem sobrescrever.')
        require(artifact_hash(self.old_release / 'app.jar') == self.old_state['artifact_sha256']
                and artifact_hash(self.old_release / 'runtime.env') == self.record['runtime_sha256'],
                'Retorno binário não está íntegro.')
        pid = int(subprocess.check_output(['systemctl', '--user', 'show', UNIT, '--property=MainPID', '--value'], text=True))
        if pid:
            args = Path('/proc/%s/cmdline' % pid).read_bytes().split(b'\0')
            jar = Path(os.fsdecode(args[args.index(b'-jar') + 1])).resolve()
            require(jar in (self.old_release / 'app.jar', self.release / 'app.jar'), 'Processo alheio: não parar.')
        systemctl('stop', UNIT)
        require(subprocess.check_output(['systemctl', '--user', 'show', UNIT, '--property=MainPID', '--value'], text=True).strip() == '0', 'Serviço ainda ativo.')

    def install(self):
        durable_text(self.unit, self.new_service)
        systemctl('daemon-reload')

    def start(self):
        systemctl('start', UNIT)

    def checked_runtime(self, sha, digest):
        observed = wait_for_release(self.root, sha, seconds=240)
        require(observed['artifact_sha256'] == digest and self.database() == self.record['database']
                and artifact_hash(self.root / 'healthy.json') == self.old_state['healthy_hash'], 'Runtime/banco/baseline alterado.')
        self.verify_runtime_configuration(observed)
        return observed

    def verify_runtime_configuration(self, observed):
        release = self.root / 'releases' / observed['served_sha']
        runtime = private_runtime_path(str(release / 'runtime.env'))
        require(artifact_hash(runtime) == self.record['runtime_sha256'], 'Configuração runtime mudou.')
        configured = dict(line.split('=', 1) for line in runtime.read_text().splitlines())
        environ = dict(x.split(b'=', 1) for x in Path('/proc/%s/environ' % observed['pid']).read_bytes().split(b'\0') if b'=' in x)
        validate_runtime(observed, dict(artifact_sha256=observed['artifact_sha256']), environ)
        require(all(environ.get(k.encode()) == v.encode() for k, v in configured.items())
                and not any(k.startswith(b'RM_MIGRATION_') for k in environ), 'Ambiente efetivo divergente.')
        expected = 'next.service' if observed['served_sha'] == self.gate['git_sha'] else 'previous.service'
        require(self.unit.read_text() == (self.directory / expected).read_text(), 'Unidade efetiva divergente.')

    def verify_new(self):
        return self.checked_runtime(self.gate['git_sha'], self.gate['artifact_sha256'])

    def verify_old(self):
        return self.checked_runtime(self.old_state['git_sha'], self.old_state['artifact_sha256'])

    def complete(self, observed):
        terminal = dict(self.old_state, **self.gate, observed=observed, frontend_replacement=str(self.directory),
                        rehearsal_hash=self.record['rehearsal_sha256'])
        durable_text(self.attempt / 'candidate.service', self.new_service)
        durable_journal(self.root / 'candidate.json', dict(terminal, maintenance_attempt=str(self.attempt)))
        durable_journal(self.attempt / 'state.json', terminal)
        self.record['observed'] = observed
        self.save('concluido')

    def restore_service(self):
        durable_text(self.unit, (self.directory / 'previous.service').read_text())
        systemctl('daemon-reload')

    def complete_return(self, observed):
        durable_text(self.attempt / 'candidate.service', (self.directory / 'previous.service').read_text())
        terminal = dict(self.old_state, frontend_replacement=str(self.directory), observed=observed)
        durable_journal(self.root / 'candidate.json', dict(terminal, maintenance_attempt=str(self.attempt)))
        durable_journal(self.attempt / 'state.json', terminal)
        self.record['observed'] = observed
        self.save('anterior-restaurado')


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('replace', 'recover'))
    parser.add_argument('--attempt', type=Path, required=True)
    parser.add_argument('--job', type=Path)
    parser.add_argument('--rehearsal', type=Path)
    parser.add_argument('--mode', choices=MODES)
    args = parser.parse_args()
    require(args.action == 'replace' or args.mode is None, 'Recuperação usa somente o modo do journal.')
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
    repo = Path(__file__).resolve().parents[1]
    runner_sha = clean_sha(repo)
    attempt = private_runtime_path(str(args.attempt), directory=True)
    require(attempt.parent == root / 'maintenance-releases' and re.fullmatch('[0-9a-f]{32}', attempt.name), 'Tentativa fora do registro.')
    def interrupted(signum, frame):
        raise InterruptedError('Substituição interrompida.')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    with (root / 'e2e-worker.lock').open('a') as worker, (root / 'deploy.lock').open('a') as lock, (attempt / 'frontend.log').open('ab') as log:
        fcntl.flock(worker, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        ops = Replacement(root, repo, attempt, log)
        if args.action == 'replace':
            ops.mode = args.mode or 'frontend'
            require(args.job is not None and args.rehearsal is not None, 'Job e ensaio obrigatórios.')
            ops.job, ops.rehearsal = cast(Path, args.job), cast(Path, args.rehearsal)
            replace_frontend(ops)
        else:
            ops.load()
            recover_frontend(ops)
        clean_sha(repo, runner_sha)
        print(json.dumps(dict(state=ops.record['state'], observed=ops.record['observed'], healthy_promoted=False)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

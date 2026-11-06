"""Despacho assistido de UM UUID fictício em hml, após gates operacionais.

Usar with-env.sh hml e opt-in RM_HML_PROVISIONING_ENABLED=true. Não instala
agendamento, não retoma FALHOU nem altera o baseline. --resume exige diagnóstico
prévio da intenção privada e apenas reconcilia/repete o mesmo UUID no mesmo banco.
"""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import stat
import sys
import uuid

from hml_accounts import validate_runtime
from hml_identity_smoke import runtime_database
from hml_maintenance import validate_rehearsal
from maintenance_database import durable_journal
from provisioning_queue import Queue, interrupt, validate_artifact, validate_environment
from release_support import artifact_hash, clean_sha, private_runtime_path, verify


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate_fictitious(data):
    require(data.get('fictitious') is True and isinstance(data.get('host'), str)
            and re.fullmatch(r'[a-z0-9][a-z0-9-]{0,62}\.localhost', data['host']),
            'Solicitação deve usar domínio local e identidade fictícia.')


def validate_platform_host(runtime, configured):
    require(runtime.get(b'RM_PLATFORM_HOST', b'plataforma.localhost')
            == configured.get('RM_PLATFORM_HOST', 'plataforma.localhost').encode(),
            'Domínio SaaS divergente entre HTTP e provisionador.')


def durable_directory(root, parts):
    path = root
    for part in parts:
        path = path / part
        path.mkdir(exist_ok=True, mode=0o700)
        private_runtime_path(str(path), directory=True)
        # Persiste também a entrada criada no pai, inclusive no primeiro uso.
        # Só sincronizar intent.json e dois pais perde ancestrais recém-criados.
        for directory in (path, path.parent):
            descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
            try:
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
    return path


def dispatch_one(queue, identity, persist):
    Queue.identity(identity)
    state = queue.state(identity)
    if state == 'CONCLUIDO':
        return dict(approved=True, exit_code=0, state=state, reconciled_without_execution=True)
    require(state == 'SOLICITADO', 'Falha de negócio exige retomada versionada pela API/UI.')
    persist('executando')  # Durável ANTES da chamada externa; falha não executa Java.
    code = queue.execute(identity)
    state = queue.state(identity)  # Também confere empresa e domínio persistidos.
    return dict(approved=code == 0 and state == 'CONCLUIDO', exit_code=code,
                state=state, reconciled_without_execution=False)


@contextmanager
def deployment_lock(root, inherited_fd=None):
    """Compartilha a descrição aberta do pai sem liberar seu flock ao terminar.

    Usado por jornada assistida que mantém exclusão entre UI, CLI e read-back.
    Não aceita outro inode nem symlink; nenhuma opção ignora a aquisição do lock.
    """
    path = root / 'deploy.lock'
    require(not path.is_symlink(), 'Lock não pode ser redirecionado.')
    descriptor = os.open(path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600) if inherited_fd is None else os.dup(inherited_fd)
    try:
        actual, expected = os.fstat(descriptor), path.stat()
        require(stat.S_ISREG(actual.st_mode) and actual.st_uid == os.getuid()
                and (actual.st_dev, actual.st_ino) == (expected.st_dev, expected.st_ino),
                'Descritor não pertence ao lock de publicação.')
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with os.fdopen(descriptor, 'a') as lock:
            descriptor = None
            yield lock
        # Não usar LOCK_UN: o pai conserva a mesma descrição aberta.
    finally:
        if descriptor is not None:
            os.close(descriptor)


def main():
    os.umask(0o077)
    signal.signal(signal.SIGTERM, interrupt)
    signal.signal(signal.SIGINT, interrupt)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--job', type=Path, required=True)
    parser.add_argument('--id')
    parser.add_argument('--rehearsal', type=Path, required=True)
    parser.add_argument('--resume', action='store_true')
    parser.add_argument('--check', action='store_true', help='Confere gates/runtime/migrations sem criar intenção ou executar Java.')
    parser.add_argument('--deploy-lock-fd', type=int, help='Descritor herdado do mesmo deploy.lock, mantido pelo chamador.')
    args = parser.parse_args()
    identity = Queue.identity(args.id) if args.id is not None else None
    require(args.check or identity is not None, 'UUID obrigatório para despacho.')
    require(not (args.check and args.resume), 'Preflight não executa retomada.')
    require(validate_environment(os.environ, allow_hml=True) == 'hml', 'Somente hml fictícia.')
    repo = Path(__file__).resolve().parents[1]
    runner_sha = clean_sha(repo)
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
    private_runtime_path(str(root), directory=True)
    gate = validate_artifact(args.job, root)  # Mesma aplicação Java; Angular não executa DDL.
    rehearsal = private_runtime_path(str(args.rehearsal))
    validate_rehearsal(json.loads(rehearsal.read_text()), gate)
    with deployment_lock(root, args.deploy_lock_fd) as lock:
        before = verify(root, gate['git_sha'])
        environ = dict(x.split(b'=', 1) for x in Path('/proc/%s/environ' % before['pid']).read_bytes().split(b'\0') if b'=' in x)
        validate_runtime(before, gate, environ)
        validate_platform_host(environ, os.environ)
        require(not any(k.startswith(b'RM_MIGRATION_') for k in environ), 'HTTP contém credencial privilegiada.')
        require(environ.get(b'RM_DB_PASSWORD') == os.environ['RM_DB_PASSWORD'].encode(), 'Credencial runtime divergente.')
        database = runtime_database(root, gate)
        baseline_hash = artifact_hash(root / 'healthy.json')
        if args.check:
            queue = Queue(os.environ, root, args.job.resolve(), root, lock.fileno(), allow_hml=True)
            queue.verify_migrations()
            require(verify(root, gate['git_sha']) == before and runtime_database(root, gate) == database
                    and artifact_hash(root / 'healthy.json') == baseline_hash, 'Estado mudou durante preflight.')
            clean_sha(repo, runner_sha)
            print(json.dumps(dict(preflight_approved=True, git_sha=gate['git_sha'],
                                  artifact_sha256=gate['artifact_sha256'], database=database,
                                  healthy_promoted=False)))
            return 0
        identity = Queue.identity(args.id)
        directory = durable_directory(root, ('provisioning', 'hml-assisted', identity))
        intent = dict(id=identity, git_sha=gate['git_sha'], artifact_sha256=gate['artifact_sha256'], database=database)
        intent_path = directory / 'intent.json'
        if intent_path.exists():
            require(args.resume and json.loads(private_runtime_path(str(intent_path)).read_text()) == intent,
                    'Intenção existente exige --resume explícito no mesmo artefato/banco.')
        else:
            require(not args.resume, 'Retomada sem intenção anterior recusada.')
        attempt = durable_directory(directory, (uuid.uuid4().hex,))
        queue = Queue(os.environ, root, args.job.resolve(), attempt, lock.fileno(), allow_hml=True)
        queue.verify_migrations()
        metadata = json.loads(queue.sql("select json_build_object('host',host,'fictitious',"
            "administrador_email like '%@example.invalid') from public.solicitacao_provisionamento where id='"
            + identity + "'::uuid") or '{}')
        validate_fictitious(metadata)
        # Não sobrescrever a intenção original; cada tentativa possui seu próprio recibo.
        if not intent_path.exists():
            durable_journal(intent_path, intent)
        record = dict(intent, approved=False, runner_sha=runner_sha, attempt=str(attempt),
                      pid=os.getpid(), process_start_ticks=Path('/proc/self/stat').read_text().rsplit(')', 1)[1].split()[19],
                      started_at=datetime.now(timezone.utc).isoformat(), rehearsal_sha256=artifact_hash(rehearsal),
                      phase='preflight-aprovado', resumed=args.resume)
        def persist(phase):
            record['phase'] = phase
            durable_journal(attempt / 'progress.json', record)
        code = 1
        try:
            persist('pronto')
            outcome = dispatch_one(queue, identity, persist)
            record.update(outcome)
            require(verify(root, gate['git_sha']) == before and runtime_database(root, gate) == database
                    and artifact_hash(root / 'healthy.json') == baseline_hash,
                    'Runtime, banco ou baseline mudou durante despacho.')
            validate_artifact(args.job, root)
            clean_sha(repo, runner_sha)
            code = 0 if outcome['approved'] else 1
        except Exception as error:
            record.update(approved=False, error_type=type(error).__name__)
        finally:
            record.update(approved=code == 0, command_exit_code=code,
                          finished_at=datetime.now(timezone.utc).isoformat(), healthy_promoted=False)
            durable_journal(attempt / 'result.json', record)
            print(json.dumps(dict(id=identity, approved=code == 0, attempt=str(attempt), healthy_promoted=False)))
        return code


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print('Despacho assistido recusado: ' + type(error).__name__, file=sys.stderr)
        sys.exit(1)

"""Build nativo independente da sessão, em cópia privada de um commit.

Uso: python3 scripts/durable_build.py start
Consulte request.json, running.json, result.json e build.log no diretório retornado.
Ausência de result.json nunca significa aprovação; confira também a unidade systemd.
"""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid

from release_support import artifact_hash, atomic_json, clean_sha

UNIT = 'restaurant-manager-build.service'


def now():
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def exclusive_lock(path):
    with path.open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def execute_job(job):
    request = json.loads((job / 'request.json').read_text())
    identity = dict(request, pid=os.getpid(), started_at=now(),
                    process_start_ticks=Path('/proc/self/stat').read_text().rsplit(')', 1)[1].split()[19])
    atomic_json(job / 'running.json', identity)
    code = 1
    approved = False
    result = dict(identity)
    try:
        env = dict(os.environ, RM_BUILD_GATE_FILE=str(job / 'gate.json'))
        with (job / 'build.log').open('x') as log:
            code = subprocess.run(['bash', 'scripts/build-release.sh'], cwd=job / 'checkout',
                                  env=env, stdout=log, stderr=subprocess.STDOUT).returncode
        if code == 0:
            gate = json.loads((job / 'gate.json').read_text())
            jar = job / 'checkout/backend/target/restaurant-manager-0.1.0-SNAPSHOT.jar'
            if (gate['git_sha'] != request['git_sha']
                    or gate['checks'] != 'backend+frontend'
                    or gate['artifact_sha256'] != artifact_hash(jar)
                    or clean_sha(job / 'checkout', request['git_sha']) != request['git_sha']):
                raise ValueError('Gate divergente.')
            shutil.copyfile(jar, job / 'app.jar')
            if artifact_hash(job / 'app.jar') != gate['artifact_sha256']:
                raise ValueError('Cópia divergente.')
            result['artifact_sha256'] = gate['artifact_sha256']
            approved = True
    except Exception as error:
        code = 1
        result['error_type'] = type(error).__name__
    result.update(exit_code=code, release_gate=approved, finished_at=now())
    atomic_json(job / 'result.json', result)
    return code


def start(repo, root):
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    with exclusive_lock(root / 'launch.lock'):
        state = subprocess.check_output(['systemctl', '--user', 'show', UNIT,
                                         '--property=ActiveState', '--value'], text=True).strip()
        if state not in ('inactive', 'failed', ''):
            raise ValueError('Build existente; consulte seu resultado antes de iniciar outro.')
        sha = clean_sha(repo)
        job = root / (sha[:12] + '-' + uuid.uuid4().hex[:12])
        job.mkdir(mode=0o700)
        subprocess.run(['git', 'clone', '--quiet', '--no-hardlinks', '--no-checkout',
                        str(repo), str(job / 'checkout')], check=True)
        subprocess.run(['git', 'checkout', '--quiet', '--detach', sha], cwd=job / 'checkout', check=True)
        # O wrapper Windows foi versionado com CRLF e text/eol=crlf; um clone
        # novo o considera modificado pela normalização, mesmo com bytes iguais.
        # Desabilita só essa conversão local, sem ignorar alterações de conteúdo.
        (job / 'checkout/.git/info/attributes').write_text('backend/mvnw.cmd -text\n')
        clean_sha(job / 'checkout', sha)
        atomic_json(job / 'request.json', {'git_sha': sha, 'created_at': now(), 'unit': UNIT})
        subprocess.run(['systemctl', '--user', 'reset-failed', UNIT], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, check=False)
        command = ['systemd-run', '--user', '--unit=' + UNIT, '--collect',
                   '--property=Type=exec', '--property=UMask=0077',
                   '--setenv=PATH=' + os.environ['PATH'],
                   '--setenv=RM_HOME=' + os.environ.get('RM_HOME', str(Path.home() / '.local/share/restaurant-manager')),
                   sys.executable, str(job / 'checkout/scripts/durable_build.py'), 'worker', str(job)]
        subprocess.run(command, check=True)
        atomic_json(root / 'latest.json', {'job': str(job), 'git_sha': sha, 'unit': UNIT})
        print(json.dumps({'job': str(job), 'git_sha': sha, 'unit': UNIT}))


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['start', 'worker'])
    parser.add_argument('job', nargs='?', type=Path)
    args = parser.parse_args()
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')) / 'builds'
    if args.action == 'start':
        start(Path(__file__).resolve().parent.parent, root)
        return 0
    if args.job is None or not args.job.resolve().is_relative_to(root.resolve()):
        parser.error('Diretório privado de build inválido.')
    with exclusive_lock(root / 'worker.lock'):
        return execute_job(args.job.resolve())


if __name__ == '__main__':
    sys.exit(main())

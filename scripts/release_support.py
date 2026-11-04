"""Primitivas pequenas de release; sem ações ao importar."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import urllib.request
import zipfile

UNIT = 'restaurant-manager-hml.service'
RUNTIME_KEYS = ('RM_DB_URL', 'RM_DB_USER', 'RM_DB_PASSWORD', 'RM_STAGE')


def private_config(path):
    if path.is_symlink() or path.stat().st_mode & 0o077:
        raise ValueError('Configuração deve ser arquivo privado 0600.')
    values = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        key, value = line.split('=', 1)
        if key in values or not re.fullmatch(r'[A-Z_]+', key) or not re.fullmatch(r'[A-Za-z0-9_:/+.@=-]+', value):
            raise ValueError('Configuração inválida; valores não serão exibidos.')
        values[key] = value
    if (values.get('RM_DB_URL') != 'jdbc:postgresql://127.0.0.1:55432/rm_hml'
            or values.get('RM_DB_USER') != 'rm_hml_app' or values.get('RM_STAGE') != 'hml'
            or values.get('RM_MIGRATION_USER') != 'rm_hml_owner'):
        raise ValueError('Destino de homologação recusado.')
    if not values.get('RM_DB_PASSWORD') or not values.get('RM_MIGRATION_PASSWORD'):
        raise ValueError('Credenciais privadas incompletas.')
    return values


def runtime_config(values):
    return ''.join(f'{key}={values[key]}\n' for key in RUNTIME_KEYS)


def migration_fingerprint(jar):
    with zipfile.ZipFile(jar) as archive:
        names = sorted(n for n in archive.namelist() if n.startswith('BOOT-INF/classes/db/migration/') and n.endswith('.sql'))
        if not names:
            raise ValueError('Artefato sem migrations.')
        digest = hashlib.sha256()
        for name in names:
            digest.update(name.encode() + b'\0' + archive.read(name))
        return digest.hexdigest()


def artifact_hash(jar):
    return hashlib.sha256(jar.read_bytes()).hexdigest()


def install_artifact(source, target, expected_hash):
    if target.exists():
        if artifact_hash(target) != expected_hash:
            raise ValueError('Release imutável divergente.')
        return
    staging = target.with_suffix('.staging')
    try:
        shutil.copyfile(source, staging)
        if artifact_hash(staging) != expected_hash:
            raise ValueError('Cópia diverge do gate; nenhum migrador foi iniciado.')
        staging.replace(target)
    finally:
        staging.unlink(missing_ok=True)


def previous_artifact(root, unit_text):
    match = re.search(r'^ExecStart=.* -jar ([^\s]+)$', unit_text, re.MULTILINE)
    if not match:
        raise ValueError('Serviço anterior não reconhecido.')
    jar = Path(match.group(1)).resolve()
    if not jar.is_relative_to(root / 'releases'):
        raise ValueError('Serviço anterior fora dos releases.')
    return jar


def atomic_json(path, data):
    temporary = path.with_suffix(path.suffix + '.new')
    temporary.write_text(json.dumps(data, indent=2) + '\n')
    temporary.replace(path)


def systemctl(*args):
    subprocess.run(['systemctl', '--user', *args], check=True)


def verify(root, expected_sha=None):
    pid = int(subprocess.check_output(['systemctl', '--user', 'show', UNIT, '--property=MainPID', '--value'], text=True))
    if pid <= 0:
        raise ValueError('Serviço sem processo ativo.')
    args = Path(f'/proc/{pid}/cmdline').read_bytes().split(b'\0')
    jar = Path(os.fsdecode(args[args.index(b'-jar') + 1])).resolve()
    if not jar.is_relative_to(root / 'releases'):
        raise ValueError('Artefato fora dos releases.')
    manifest = json.loads((jar.parent / 'manifest.json').read_text())
    sha = manifest['git_sha']
    if not re.fullmatch(r'[0-9a-f]{40}', sha) or jar.parent.name != sha:
        raise ValueError('Identidade de release inválida.')
    if expected_sha and sha != expected_sha:
        raise ValueError('Outro release está em execução.')
    if artifact_hash(jar) != manifest['artifact_sha256']:
        raise ValueError('Hash divergente.')
    # Inspeciona apenas presença/identidade; nenhum valor secreto sai do processo.
    environ = dict(entry.split(b'=', 1) for entry in Path(f'/proc/{pid}/environ').read_bytes().split(b'\0') if b'=' in entry)
    if any(key.startswith(b'RM_MIGRATION_') for key in environ):
        raise ValueError('Runtime recebeu credencial de migração.')
    if environ.get(b'RM_DB_USER') != b'rm_hml_app' or environ.get(b'RM_RELEASE_SHA') != sha.encode():
        raise ValueError('Identidade de runtime divergente.')
    with urllib.request.urlopen('http://127.0.0.1:8088/actuator/health', timeout=3) as response:
        if json.load(response) != {'status': 'UP'}:
            raise ValueError('Health não aprovado.')
    with urllib.request.urlopen('http://127.0.0.1:8088/', timeout=3) as response:
        if b'<app-root>' not in response.read():
            raise ValueError('Shell Angular não servido.')
    return {'served_sha': sha, 'artifact_sha256': manifest['artifact_sha256'], 'health': 'UP', 'pid': pid}


def wait_for_release(root, sha, seconds=90):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        try:
            return verify(root, sha)
        except (OSError, ValueError, subprocess.CalledProcessError):
            time.sleep(1)
    raise RuntimeError('Health/identidade não aprovados dentro do prazo.')

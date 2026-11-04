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


def verify_listener(pid, port=8088):
    """Liga health ao inode TCP do PID real, inclusive IPv4 mapeado em IPv6."""
    sockets = set()
    for fd in Path(f'/proc/{pid}/fd').iterdir():
        try:
            sockets.add(os.readlink(fd))
        except FileNotFoundError:
            continue  # descritor transitório; o socket servidor deve permanecer
    listeners = []
    loopback = {'0100007F', '0000000000000000FFFF00000100007F',
                '00000000000000000000000001000000'}
    for table in ('tcp', 'tcp6'):
        for line in Path(f'/proc/{pid}/net/{table}').read_text().splitlines()[1:]:
            fields = line.split()
            address, encoded_port = fields[1].split(':')
            if fields[3] == '0A' and int(encoded_port, 16) == port:
                if address not in loopback or f'socket:[{fields[9]}]' not in sockets:
                    raise ValueError('Listener não pertence ao processo ou expõe rede externa.')
                listeners.append(fields[9])
    if not listeners:
        raise ValueError('Processo não possui listener esperado.')


def clean_sha(repo, expected=None):
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
    if subprocess.check_output(['git', 'status', '--porcelain'], cwd=repo, text=True).strip():
        raise ValueError('Checkout sujo; evidência não identifica código imutável.')
    if expected is not None and sha != expected:
        raise ValueError('HEAD mudou durante a execução.')
    return sha


def verify_e2e_coverage(data):
    """Inventário mínimo da fundação; famílias futuras não são aprovadas aqui."""
    projects = ('chromium-desktop', 'chromium-mobile', 'chromium-tablet',
                'firefox-desktop', 'webkit-desktop')
    scenarios = ('S00-UI01', 'S00-UI02', 'S00-UI03', 'S00-API01')
    expected = {(project, scenario) for project in projects for scenario in scenarios}
    stats = data['stats']
    if data.get('errors') or any(stats[key] for key in ('unexpected', 'skipped', 'flaky')):
        raise ValueError('Relatório contém falhas ou cenários não aprovados.')
    found = set()
    total = 0
    def visit(suite):
        nonlocal total
        for spec in suite.get('specs', []):
            for test in spec.get('tests', []):
                total += 1
                key = (test['projectName'], spec['title'].split(':', 1)[0])
                results = test['results']
                if (key in found or test['expectedStatus'] != 'passed' or test['status'] != 'expected'
                        or len(results) != 1 or results[0]['status'] != 'passed'
                        or results[0].get('retry', 0) != 0 or results[0].get('errors')):
                    raise ValueError('Cenário repetido, instável ou não aprovado.')
                found.add(key)
        for child in suite.get('suites', []):
            visit(child)
    for suite in data['suites']:
        visit(suite)
    if not expected.issubset(found) or stats['expected'] != total:
        raise ValueError('Inventário obrigatório incompleto ou contador divergente.')
    return sorted(found)


def verify(root, expected_sha=None):
    pid = int(subprocess.check_output(['systemctl', '--user', 'show', UNIT, '--property=MainPID', '--value'], text=True))
    if pid <= 0:
        raise ValueError('Serviço sem processo ativo.')
    verify_listener(pid)
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
    current_pid = int(subprocess.check_output(['systemctl', '--user', 'show', UNIT, '--property=MainPID', '--value'], text=True))
    if current_pid != pid or Path(f'/proc/{pid}/cmdline').read_bytes().split(b'\0') != args:
        raise ValueError('Processo mudou durante verificação.')
    verify_listener(pid)
    return {'served_sha': sha, 'artifact_sha256': manifest['artifact_sha256'], 'health': 'UP', 'pid': pid}


def wait_for_release(root, sha, seconds=90):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        try:
            return verify(root, sha)
        except (OSError, ValueError, subprocess.CalledProcessError):
            time.sleep(1)
    raise RuntimeError('Health/identidade não aprovados dentro do prazo.')


def restore_healthy(root, unit, fingerprint):
    """Retorna somente para baseline comprovado; erro de recuperação para o serviço."""
    try:
        healthy = json.loads((root / 'healthy.json').read_text())
        if not isinstance(healthy, dict):
            raise ValueError('Marcador de retorno inválido.')
        sha = healthy['served_sha']
        if not isinstance(sha, str) or not re.fullmatch(r'[0-9a-f]{40}', sha):
            raise ValueError('SHA de retorno inválido.')
        restored = root / 'releases' / sha
        if migration_fingerprint(restored / 'app.jar') != fingerprint:
            raise ValueError('Retorno incompatível.')
        if artifact_hash(restored / 'app.jar') != healthy['artifact_sha256']:
            raise ValueError('Artefato de retorno adulterado.')
        content = (restored / 'validated.service').read_text()
        if previous_artifact(root, content) != (restored / 'app.jar').resolve():
            raise ValueError('Unidade de retorno divergente.')
        unit.write_text(content)
        systemctl('daemon-reload')
        systemctl('restart', UNIT)
        return wait_for_release(root, sha)
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile, RuntimeError, subprocess.CalledProcessError):
        systemctl('stop', UNIT)
        raise RuntimeError('Retorno não verificado; serviço parado.') from None

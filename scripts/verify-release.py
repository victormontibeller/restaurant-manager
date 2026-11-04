#!/usr/bin/env python3
"""Health não destrutivo + identidade do processo e hash do release servido."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request

root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
unit = 'restaurant-manager-hml.service'
pid = int(subprocess.check_output(['systemctl', '--user', 'show', unit, '--property=MainPID', '--value'], text=True))
if pid <= 0:
    raise SystemExit('Serviço sem processo ativo.')
args = Path(f'/proc/{pid}/cmdline').read_bytes().split(b'\0')
jar = Path(os.fsdecode(args[args.index(b'-jar')+1])).resolve()
if not jar.is_relative_to(root / 'releases'):
    raise SystemExit('Artefato fora do diretório de releases.')
manifest = json.loads((jar.parent / 'manifest.json').read_text())
actual = hashlib.sha256(jar.read_bytes()).hexdigest()
if manifest['artifact_sha256'] != actual:
    raise SystemExit('Hash do artefato divergente.')
if len(manifest['git_sha']) != 40:
    raise SystemExit('SHA inválido.')
with urllib.request.urlopen('http://127.0.0.1:8088/actuator/health', timeout=10) as response:
    if json.load(response) != {'status': 'UP'}:
        raise SystemExit('Health não aprovado.')
with urllib.request.urlopen('http://127.0.0.1:8088/', timeout=10) as response:
    if b'<app-root>' not in response.read():
        raise SystemExit('Shell Angular não servido.')
print(json.dumps({'served_sha': manifest['git_sha'], 'artifact_sha256': actual, 'health': 'UP', 'pid': pid}))

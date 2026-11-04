#!/usr/bin/env python3
"""Publica candidato limpo em homologação loopback; não promove aprovação E2E."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import urllib.request

os.umask(0o077)
repo = Path(__file__).resolve().parents[1]
root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
lockfile = (root / 'deploy.lock').open('a')
fcntl.flock(lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)
if subprocess.check_output(['git', 'status', '--porcelain'], cwd=repo, text=True).strip():
    raise SystemExit('Checkout sujo: recuse publicar código sem commit.')
sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
jar = repo / 'backend/target/restaurant-manager-0.1.0-SNAPSHOT.jar'
gate = json.loads((root / 'build-gate.json').read_text())
digest = hashlib.sha256(jar.read_bytes()).hexdigest()
if gate != {'git_sha': sha, 'artifact_sha256': digest, 'checks': 'backend+frontend'}:
    raise SystemExit('Build/testes não correspondem ao candidato.')
release = root / 'releases' / sha
release.mkdir(parents=True, exist_ok=True)
target = release / 'app.jar'
if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() != digest:
    raise SystemExit('Release imutável já existe com hash divergente.')
shutil.copy2(jar, target)
(release / 'manifest.json').write_text(json.dumps({'git_sha':sha,'artifact_sha256':digest}, indent=2))
# Credenciais apenas via arquivo privado. O serviço não atende tráfego até Flyway e JPA concluírem.
config = root / 'hml.env'
values = dict(line.split('=',1) for line in config.read_text().splitlines() if '=' in line)
if values.get('RM_DB_URL') != 'jdbc:postgresql://127.0.0.1:55432/rm_hml' or values.get('RM_DB_USER') != 'rm_hml_app':
    raise SystemExit('Destino de homologação recusado.')
unit = Path.home() / '.config/systemd/user/restaurant-manager-hml.service'
previous = unit.read_text() if unit.exists() else None
content = f'''[Unit]
Description=Restaurant Manager homologacao ficticia
After=restaurant-manager-postgres.service
Requires=restaurant-manager-postgres.service
[Service]
ExecStart={root}/toolchains/jdk-21.0.13+9/bin/java -Xmx384m -XX:ActiveProcessorCount=2 -jar {target}
EnvironmentFile={config}
Environment=RM_PORT=8088
Environment=RM_RELEASE_SHA={sha}
Restart=on-failure
RestartSec=10
MemoryMax=650M
NoNewPrivileges=true
UMask=0077
[Install]
WantedBy=default.target
'''
(root / 'candidate.json').write_text(json.dumps({'git_sha':sha,'state':'validando-health'}))
unit.write_text(content)
subprocess.run(['systemctl','--user','daemon-reload'],check=True)
subprocess.run(['systemctl','--user','enable',unit.name],check=True)
subprocess.run(['systemctl','--user','restart',unit.name],check=True)
for _ in range(90):
    try:
        with urllib.request.urlopen('http://127.0.0.1:8088/actuator/health', timeout=2) as response:
            if json.load(response) == {'status':'UP'}:
                subprocess.run(['python3',str(repo/'scripts/verify-release.py')],check=True)
                (root / 'candidate.json').write_text(json.dumps({'git_sha':sha,'state':'health-aprovado-e2e-pendente'}))
                print('Candidato com health aprovado; executar E2E antes de marcar validado.')
                break
    except (OSError, ValueError):
        pass
    time.sleep(1)
else:
    (root / 'candidate.json').write_text(json.dumps({'git_sha':sha,'state':'falhou-health'}))
    # Rollback automático só para migrations compatíveis explicitamente registradas.
    if previous and os.environ.get('RM_BACKWARD_COMPATIBLE') == 'true':
        unit.write_text(previous)
        subprocess.run(['systemctl','--user','daemon-reload'],check=True)
        subprocess.run(['systemctl','--user','restart',unit.name],check=True)
    else:
        subprocess.run(['systemctl','--user','stop',unit.name],check=True)
    raise SystemExit('Health falhou. Candidato não promovido; avaliar compatibilidade de banco.')

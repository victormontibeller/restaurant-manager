#!/usr/bin/env python3
"""Publica candidato limpo em homologação loopback; não promove aprovação E2E."""
import fcntl
import json
import os
from pathlib import Path

import subprocess
from release_support import (UNIT, artifact_hash, atomic_json, migration_fingerprint,
                             private_config, runtime_config, systemctl, wait_for_release,
                             install_artifact, previous_artifact, restore_healthy)

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
digest = artifact_hash(jar)
if gate != {'git_sha': sha, 'artifact_sha256': digest, 'checks': 'backend+frontend'}:
    raise SystemExit('Build/testes não correspondem ao candidato.')
release = root / 'releases' / sha
release.mkdir(parents=True, exist_ok=True)
target = release / 'app.jar'
install_artifact(jar, target, digest)
fingerprint = migration_fingerprint(target)
atomic_json(release / 'manifest.json', {'git_sha': sha, 'artifact_sha256': digest, 'migrations_sha256': fingerprint})
config = root / 'hml.env'
values = private_config(config)
unit = Path.home() / '.config/systemd/user' / UNIT
previous = unit.read_text() if unit.exists() else None
if previous and migration_fingerprint(previous_artifact(root, previous)) != fingerprint:
    raise SystemExit('Migrations diferentes exigem procedimento de manutenção/backup; serviço preservado.')
java = root / 'toolchains/jdk-21.0.13+9/bin/java'
# Migração falha antes de alterar o serviço. Environment reduzido impede overrides herdados.
migration_env = {k: v for k, v in os.environ.items() if not k.startswith(('RM_', 'SPRING_', 'JAVA_', 'JDK_'))}
migration_env.update({k: values[k] for k in ('RM_DB_URL', 'RM_DB_USER', 'RM_MIGRATION_USER', 'RM_MIGRATION_PASSWORD', 'RM_STAGE')})
atomic_json(root / 'candidate.json', {'git_sha': sha, 'state': 'migrando'})
try:
    with (release / 'migration.log').open('w') as log:
        migration = subprocess.run([str(java), '-Xmx192m', '-XX:ActiveProcessorCount=2', '-jar', str(target), '--migrate-only'],
                                   env=migration_env, stdout=log, stderr=subprocess.STDOUT, timeout=120)
except (OSError, subprocess.TimeoutExpired):
    atomic_json(root / 'candidate.json', {'git_sha': sha, 'state': 'falhou-migration-servico-preservado'})
    raise SystemExit('Migrador indisponível/tempo excedido; serviço anterior preservado.')
if migration.returncode:
    atomic_json(root / 'candidate.json', {'git_sha': sha, 'state': 'falhou-migration-servico-preservado'})
    raise SystemExit('Migração falhou; serviço anterior preservado. Consulte o registro privado.')
runtime = release / 'runtime.env'
runtime.write_text(runtime_config(values))
runtime.chmod(0o600)
content = f'''[Unit]
Description=Restaurant Manager homologacao ficticia
After=restaurant-manager-postgres.service
Requires=restaurant-manager-postgres.service
[Service]
ExecStart={java} -Xmx384m -XX:ActiveProcessorCount=2 -jar {target}
EnvironmentFile={runtime}
Environment=RM_PORT=8088
Environment=RM_RELEASE_SHA={sha}
Restart=on-failure
RestartSec=10
SuccessExitStatus=143
MemoryMax=650M
NoNewPrivileges=true
UMask=0077
[Install]
WantedBy=default.target
'''
atomic_json(root / 'candidate.json', {'git_sha': sha, 'state': 'validando-health'})
if previous:
    (release / 'previous.service').write_text(previous)
unit.write_text(content)
try:
    systemctl('daemon-reload')
    systemctl('enable', UNIT)
    systemctl('restart', UNIT)
    observed = wait_for_release(root, sha)
except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError):
    atomic_json(root / 'candidate.json', {'git_sha': sha, 'state': 'falhou-health'})
    try:
        restored = restore_healthy(root, unit, fingerprint)
        atomic_json(root / 'candidate.json', {'git_sha': sha, 'state': 'falhou-health-retorno-verificado', 'restored_sha': restored['served_sha']})
    except RuntimeError:
        atomic_json(root / 'candidate.json', {'git_sha': sha, 'state': 'falhou-retorno-servico-parado'})
    raise SystemExit('Health falhou. Candidato não promovido; consulte estado privado.')
atomic_json(root / 'candidate.json', {**observed, 'git_sha': sha, 'state': 'health-aprovado-e2e-pendente'})
print(json.dumps(observed))

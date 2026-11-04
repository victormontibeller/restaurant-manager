#!/usr/bin/env python3
"""Ensaio REAL restrito ao serviço fictício: falha de startup e retorno compatível."""
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import time
from release_support import (UNIT, atomic_json, migration_fingerprint, restore_healthy,
                             systemctl, verify, wait_for_release)

os.umask(0o077)
root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
report = Path(os.environ['RM_REPORT_DIR']).resolve()
repo = Path(__file__).resolve().parents[1]
if report.is_relative_to(repo):
    raise SystemExit('Relatório deve ficar fora do checkout.')
report.mkdir(parents=True, exist_ok=True)
with (root / 'deploy.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    healthy = json.loads((root / 'healthy.json').read_text())
    before = verify(root, healthy['served_sha'])
    marker = (root / 'healthy.json').read_bytes()
    unit = Path.home() / '.config/systemd/user' / UNIT
    original = unit.read_text()
    fingerprint = migration_fingerprint(root / 'releases' / before['served_sha'] / 'app.jar')
    started = time.monotonic()
    rejected = False
    try:
        # Somente a unidade exclusiva, sem editar binário/banco/rede/serviços alheios.
        failing = re.sub(r'^ExecStart=.*$', 'ExecStart=/usr/bin/false', original, flags=re.MULTILINE)
        failing = re.sub(r'^Restart=.*$', 'Restart=no', failing, flags=re.MULTILINE)
        unit.write_text(failing)
        systemctl('daemon-reload')
        subprocess.run(['systemctl', '--user', 'restart', UNIT], check=False)
        try:
            wait_for_release(root, before['served_sha'], seconds=3)
        except RuntimeError:
            rejected = True
        if not rejected:
            raise RuntimeError('Ensaio não provocou falha real.')
    finally:
        after = restore_healthy(root, unit, fingerprint)
    if marker != (root / 'healthy.json').read_bytes():
        raise RuntimeError('Ensaio alterou o marcador saudável indevidamente.')
    if before['served_sha'] != after['served_sha'] or before['pid'] == after['pid']:
        raise RuntimeError('Retorno/reinício não demonstrado.')
    result = {'scenario': 'S00-OPS01', 'failure_rejected': rejected, 'before': before, 'after': after,
              'seconds': round(time.monotonic() - started, 3), 'database_restored': False,
              'scope': 'startup nativo e retorno do mesmo release compatível; não é restore de banco'}
    atomic_json(report / 'recovery.json', result)
    print(json.dumps(result))

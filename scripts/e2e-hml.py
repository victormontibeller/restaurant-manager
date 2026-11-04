#!/usr/bin/env python3
"""Executa navegadores reais e vincula relatório ao PID/SHA/hash observado."""
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
from release_support import atomic_json, verify, clean_sha, verify_e2e_coverage, artifact_hash

os.umask(0o077)
repo = Path(__file__).resolve().parents[1]
root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
report = Path(os.environ['RM_REPORT_DIR']).resolve()
if report.is_relative_to(repo) or (report / 'results.json').exists():
    raise SystemExit('Use diretório privado novo para preservar evidências.')
report.mkdir(parents=True, exist_ok=True)
sha = clean_sha(repo)
before = verify(root, sha)
env = dict(os.environ, RM_BASE_URL='http://127.0.0.1:8088', RM_REPORT_DIR=str(report))
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
result = subprocess.run(['npm', '--prefix', 'frontend', 'run', 'e2e'], cwd=repo, env=env)
after = verify(root, sha)
clean_sha(repo, sha)
if before != after:
    raise SystemExit('Runtime mudou durante E2E; resultado não promove candidato.')
data = json.loads((report / 'results.json').read_text())
stats = data['stats']
coverage = verify_e2e_coverage(data)
if result.returncode:
    raise SystemExit('E2E falhou/ignorou/instabilizou cenários; candidato não aprovado.')
atomic_json(report / 'release-evidence.json', {**after, 'started_at': started, 'stats': stats,
                                             'scope': 'sprint-00-fundacao', 'visual_review': 'pendente',
                                             'coverage': coverage, 'results_sha256': artifact_hash(report / 'results.json')})
print(json.dumps({'served_sha': sha, 'stats': stats, 'report': str(report)}))

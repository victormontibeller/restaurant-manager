#!/usr/bin/env python3
"""Registra baseline validado no escopo declarado, não conclusão de Sprint/projeto."""
import argparse
import fcntl
import json
import os
from pathlib import Path
from release_support import UNIT, atomic_json, verify, clean_sha, verify_e2e_coverage, artifact_hash

os.umask(0o077)
parser = argparse.ArgumentParser()
parser.add_argument('report', type=Path)
parser.add_argument('--visual-reviewed', action='store_true', required=True)
args = parser.parse_args()
root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
with (root / 'deploy.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    report = args.report.resolve()
    evidence = json.loads((report / 'release-evidence.json').read_text())
    clean_sha(Path(__file__).resolve().parents[1], evidence['served_sha'])
    data = json.loads((report / 'results.json').read_text())
    coverage = verify_e2e_coverage(data)
    stats = data['stats']
    if (evidence.get('scope') != 'sprint-00-fundacao'
            or evidence.get('coverage') != [list(pair) for pair in coverage]
            or evidence.get('results_sha256') != artifact_hash(report / 'results.json')):
        raise SystemExit('Escopo, cobertura ou hash do relatório divergente.')
    if stats != evidence['stats'] or stats['unexpected'] or stats['flaky'] or stats['skipped'] or stats['expected'] <= 0:
        raise SystemExit('Evidências incompletas ou divergentes.')
    observed = verify(root, evidence['served_sha'])
    if observed['artifact_sha256'] != evidence['artifact_sha256']:
        raise SystemExit('Artefato divergente do E2E.')
    release = root / 'releases' / observed['served_sha']
    (release / 'validated.service').write_text((Path.home() / '.config/systemd/user' / UNIT).read_text())
    evidence['visual_review'] = 'aprovada-pelo-revisor'
    atomic_json(report / 'release-evidence.json', evidence)
    atomic_json(root / 'healthy.json', {**observed, 'scope': evidence['scope'], 'report': str(report), 'stats': stats})
    print(json.dumps({'validated_sha': observed['served_sha'], 'scope': evidence['scope']}))

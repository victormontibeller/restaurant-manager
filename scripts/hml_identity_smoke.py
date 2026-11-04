"""Smoke nativo de dez identidades em hml; não é matriz integral nem promotor."""
import argparse
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
from typing import Any

from application_recovery import private_file, require
from hml_accounts import atomic_json, validate_runtime
from maintenance_database import Admin, DatabaseSwap
from release_support import artifact_hash, clean_sha, durable_artifact, verify, verify_e2e_coverage, private_runtime_path

PROJECTS = ('chromium-desktop', 'chromium-mobile', 'chromium-tablet', 'firefox-desktop', 'webkit-desktop')
SCENARIOS = tuple('S01-HML' + str(i).zfill(2) for i in range(1, 11))


def runtime_database(root, gate):
    candidate = json.loads(private_runtime_path(str(root / 'candidate.json')).read_text())
    attempt = private_runtime_path(candidate['maintenance_attempt'], directory=True)
    require(attempt.parent == root / 'maintenance-releases', 'Tentativa hml fora do registro.')
    state = json.loads(private_runtime_path(str(attempt / 'state.json')).read_text())
    require(state.get('stage') == 'hml' and state.get('state') in (
        'health-aprovado-e2e-pendente', 'aceitacao-pendente', 'identidade-aceita')
        and all(state.get(k) == gate[k] for k in ('git_sha', 'artifact_sha256')),
        'Tentativa não corresponde ao runtime de identidade.')
    admin = Admin(root, sys.stderr)
    admin.verify_policy('rm_hml', 'hml')
    swap = DatabaseSwap.resume(admin, 'hml', attempt)
    require(swap.confirm('rm_hml', swap.record['candidate_oid'])['allowed'] is True
            and swap.confirm(swap.backup, swap.record['original_oid'])['allowed'] is False
            and admin.connections(swap.backup) == 0, 'Bancos da tentativa divergentes.')
    return dict(attempt=str(attempt), database='rm_hml', candidate_oid=swap.record['candidate_oid'],
                original_oid=swap.record['original_oid'])


def foundation_coverage(data):
    found = verify_e2e_coverage(data)
    expected = {(p, s) for p in PROJECTS for s in ('S00-UI01', 'S00-UI02', 'S00-UI03', 'S00-API01')}
    require(set(found) == expected, 'Regressão da fundação exige vinte combinações exatas.')
    return found


def coverage(data):
    found = []
    def visit(suite):
        for spec in suite.get('specs', []):
            for test in spec['tests']:
                key = (test['projectName'], spec['title'].split(':', 1)[0])
                require(test['status'] == 'expected' and test['expectedStatus'] == 'passed'
                        and len(test['results']) == 1, 'Cenário ausente, instável ou repetido.')
                result = test['results'][0]
                require(result['status'] == 'passed' and not result.get('errors')
                        and result.get('retry', 0) == 0, 'Resultado não aprovado.')
                found.append(key)
        for child in suite.get('suites', []):
            visit(child)
    for suite in data['suites']:
        visit(suite)
    expected = {(p, s) for p in PROJECTS for s in SCENARIOS}
    require(not data.get('errors') and set(found) == expected and len(found) == len(expected),
            'Cobertura não corresponde às cinquenta combinações obrigatórias.')
    stats = data['stats']
    require(stats['expected'] == len(expected) and all(stats[k] == 0 for k in ('skipped', 'unexpected', 'flaky')),
            'Totais não correspondem à cobertura aprovada.')
    return sorted(found)


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--job', type=Path, required=True)
    parser.add_argument('--fixture', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--foundation', action='store_true', help='Regressão do shell/API no candidato de identidade, sem promover baseline.')
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
    runner_sha = clean_sha(repo)
    artifact, gate = durable_artifact(args.job, root, repo)
    fixture = json.loads(private_file(args.fixture).read_text())
    require(fixture.get('stage') == 'hml' and fixture.get('approved') is True
            and all(fixture.get(k) == gate[k] for k in ('git_sha', 'artifact_sha256')),
            'Fixture não pertence ao candidato aprovado para ensaio.')
    require(args.report.is_absolute() and not args.report.resolve().is_relative_to(repo)
            and not args.report.exists(), 'Relatório deve ser privado, externo e novo.')
    args.report.mkdir(mode=0o700, parents=True)
    with (root / 'e2e-worker.lock').open('a') as workflow, (root / 'deploy.lock').open('a') as lock:
        fcntl.flock(workflow, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        before = verify(root, gate['git_sha'])
        environ = dict(x.split(b'=', 1) for x in Path(f'/proc/{before["pid"]}/environ').read_bytes().split(b'\0') if b'=' in x)
        validate_runtime(before, gate, environ)
        database = runtime_database(root, gate)
        baseline_hash = artifact_hash(root / 'healthy.json')
        scope = 'sprint-01-regressao-fundacao-hml' if args.foundation else 'sprint-01-smoke-identidades-hml'
        config = 'playwright.hml-fundacao.config.ts' if args.foundation else 'playwright.hml-identidade.config.ts'
        record: dict[str, Any] = dict(approved=False, scope=scope, database=database,
                      runner_sha=runner_sha, **before, started_at=datetime.now(timezone.utc).isoformat(),
                      fixture_sha256=artifact_hash(args.fixture), runner_pid=os.getpid())
        atomic_json(args.report / 'running.json', record)
        code = 1
        try:
            env = dict(os.environ, RM_BASE_URL='https://hmla.localhost:8088', RM_HML_FIXTURE=str(args.fixture),
                       RM_PRIVATE_HOST='hmla.localhost',
                       RM_REPORT_DIR=str(args.report), PLAYWRIGHT_BROWSERS_PATH=str(root / 'browsers'),
                       LD_LIBRARY_PATH=str(root / 'toolchains/browser-libs/usr/lib/x86_64-linux-gnu'),
                       RM_WEBKIT_EXECUTABLE=str(repo / 'scripts/webkit-local.sh'))
            with (args.report / 'execution.log').open('x') as log:
                result = subprocess.run(['npm', '--prefix', 'frontend', 'run', 'e2e', '--',
                                         '--config=' + config],
                                        cwd=repo, env=env, stdout=log, stderr=log, timeout=2400,
                                        pass_fds=(lock.fileno(), workflow.fileno()))
            record['playwright_exit_code'] = result.returncode
            data = json.loads((args.report / 'results.json').read_text())
            record['stats'] = data['stats']
            require(result.returncode == 0, 'Smoke possui falhas; nenhum baseline promovido.')
            record['coverage'] = foundation_coverage(data) if args.foundation else coverage(data)
            require(verify(root, gate['git_sha']) == before, 'Runtime mudou durante smoke.')
            require(runtime_database(root, gate) == database, 'Banco mudou durante smoke.')
            require(artifact_hash(args.fixture) == record['fixture_sha256'], 'Fixture mudou durante smoke.')
            require(artifact_hash(root / 'healthy.json') == baseline_hash, 'Baseline mudou durante smoke.')
            durable_artifact(args.job, root, repo)
            clean_sha(repo, runner_sha)
            record.update(approved=True, results_sha256=artifact_hash(args.report / 'results.json'), visual_review='pendente')
            code = 0
        except Exception as error:
            record['error_type'] = type(error).__name__
        finally:
            record.update(exit_code=code, finished_at=datetime.now(timezone.utc).isoformat(), healthy_promoted=False)
            atomic_json(args.report / 'release-evidence.json', record)
        print(json.dumps(record))
    return code


if __name__ == '__main__':
    raise SystemExit(main())

"""Confere a regressão do artefato de identidade sem promover baseline ou Sprint.

Recebe referências privadas a execuções reais, não contadores copiados. Aceita
parcelas do MESMO JAR com fontes de testes identificadas; rejeita lacunas,
duplicatas, retries e revisão visual incompleta. Não executa testes mutantes.
"""
import argparse
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from hml_identity_smoke import PROJECTS, runtime_database
from hml_accounts import validate_runtime
from hml_maintenance import validate_rehearsal
from maintenance_database import durable_journal
from release_support import artifact_hash, clean_sha, durable_artifact, private_runtime_path, verify

SCENARIOS = tuple('S01-UI%02d' % i for i in range(1, 44)) + (
    'S00-UI01', 'S00-UI02', 'S00-UI03', 'S00-API01') + tuple('S01-HML%02d' % i for i in range(1, 11))
EXPECTED = {(project, scenario) for project in PROJECTS for scenario in SCENARIOS}
SURFACES = ('login', 'cadastro', 'recuperacao', 'verificacao', 'convites', 'acessos',
            'equipe', 'unidades', 'eventos', 'plataforma', 'estado-empresa', 'provisionamento', 'exportacao')
VISUAL_TARGETS = dict(login=('S01-UI01', 'login.png'), cadastro=('S01-UI14', 'cadastro-mobile.png'),
    recuperacao=('S01-UI11', 'recuperacao-mobile.png'), verificacao=('S01-UI21', 'verificacao-mobile.png'),
    convites=('S01-UI18', 'convites.png'), acessos=('S01-UI04', 'acessos.png'),
    equipe=('S01-UI04', 'administrador-protegido.png'), unidades=('S01-UI05', 'unidades.png'),
    eventos=('S01-UI32', 'eventos-unidade.png'), plataforma=('S01-UI24', 'saas-mobile.png'),
    exportacao=('S01-UI42', 'exportacao.png'),
    **{'estado-empresa': ('S01-UI26', 'estado-comercial-mobile.png'),
       'provisionamento': ('S01-UI29', 'provisionamento-concluido.png')})
VISUAL_COMPLEMENTS = {
    'convites': ('convites-contexto.png', 'convites-reautenticacao.png',
        'convites-cadastro-viewport.png', 'convites-criar-viewport.png',
        'convites-consulta.png', 'convites-paginacao.png'),
    'plataforma': ('saas-erro.png', 'saas-estado-consulta.png',
        'saas-metadados.png', 'saas-paginacao.png')}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def report_coverage(data):
    found = []
    def visit(suite):
        for spec in suite.get('specs', []):
            for test in spec['tests']:
                results = test['results']
                require(test['status'] == 'expected' and test['expectedStatus'] == 'passed'
                        and len(results) == 1, 'Cenário ausente, repetido ou instável.')
                result = results[0]
                require(result['status'] == 'passed' and result.get('retry', 0) == 0
                        and not result.get('errors'), 'Resultado não aprovado.')
                found.append((test['projectName'], spec['title'].split(':', 1)[0]))
        for child in suite.get('suites', []):
            visit(child)
    for suite in data['suites']:
        visit(suite)
    stats = data['stats']
    require(not data.get('errors') and len(found) == len(set(found))
            and stats['expected'] == len(found) and len(found) > 0
            and all(stats[k] == 0 for k in ('unexpected', 'skipped', 'flaky')),
            'Cobertura/contagem contém falhas, duplicatas ou omissões.')
    return sorted(found)


def collect_coverage(reports):
    found = [pair for data in reports for pair in report_coverage(data)]
    require(set(found) == EXPECTED and len(found) == len(EXPECTED),
            'Matriz de identidade incompleta ou repetida; nenhuma aprovação.')
    return sorted(found)


def validate_binding(receipt, gate):
    require(receipt.get('approved') is True and receipt.get('exit_code') == 0
            and all(receipt.get(k) == gate[k] for k in ('git_sha', 'artifact_sha256')),
            'Execução não aprovada ou de outro artefato.')


def validate_visual(entries):
    expected = {(surface, layout) for surface in SURFACES for layout in ('mobile', 'desktop')}
    keys = [(e['surface'], e['layout']) for e in entries]
    require(set(keys) == expected and len(keys) == len(expected),
            'Revisão visual deve cobrir cada superfície em mobile e desktop.')
    images = list(entries)
    for entry in entries:
        complements = entry.get('complements', [])
        names = [Path(e['path']).name for e in complements]
        required = VISUAL_COMPLEMENTS.get(entry['surface'], ())
        require(set(names) == set(required) and len(names) == len(required),
                'Complementos visuais ausentes, duplicados ou desconhecidos.')
        images.extend(complements)
    require(len({str(Path(e['path']).resolve()) for e in images}) == len(images),
            'Não reutilizar a mesma captura para outra superfície/layout.')
    for entry in images:
        require(entry.get('approved') is True and isinstance(entry.get('notes'), str)
                and entry['notes'].strip() and re.fullmatch('[0-9a-f]{64}', entry.get('sha256', ''))
                and Path(entry['path']).is_absolute(), 'Inspeção visual incompleta.')


def validate_database_binding(receipt, database):
    require(receipt.get('database') == database, 'Smoke pertence a outro banco/tentativa ou não registrou OIDs.')


def validate_visual_origin(entry, directory, coverage, *, complement=False):
    image = Path(entry['path'])
    scenario, filename = VISUAL_TARGETS[entry['surface']]
    projects = ('chromium-mobile',) if entry['layout'] == 'mobile' else (
        'chromium-desktop', 'firefox-desktop', 'webkit-desktop')
    filenames = VISUAL_COMPLEMENTS.get(entry['surface'], ()) if complement else (filename,)
    require(image.is_relative_to(directory / 'artifacts') and image.name in filenames
            and scenario + '-' in image.parent.name
            and any(image.parent.name.endswith('-' + p) and (p, scenario) in coverage for p in projects),
            'Captura não corresponde à superfície, cenário e projeto aprovados.')


def validate_visual_files(visual, image_roots):
    validate_visual(visual)
    for entry in visual:
        for image_entry, complement in [(entry, False)] + [
                (dict(e, surface=entry['surface'], layout=entry['layout']), True)
                for e in entry.get('complements', [])]:
            image = private_runtime_path(image_entry['path'])
            origins = [(directory, covered) for directory, covered in image_roots
                       if image.is_relative_to(directory / 'artifacts')]
            require(len(origins) == 1 and image.suffix == '.png'
                    and artifact_hash(image) == image_entry['sha256'],
                    'Captura não pertence aos resultados revisados ou foi alterada.')
            validate_visual_origin(image_entry, *origins[0], complement=complement)


def check_bundle(bundle, root, repo):
    bundle = private_runtime_path(str(bundle))
    bundle_hash = artifact_hash(bundle)
    manifest = json.loads(bundle.read_text())
    require(manifest.get('scope') == 'sprint-01-regressao-identidade', 'Escopo desconhecido.')
    job = Path(manifest['job'])
    artifact, gate = durable_artifact(job, root, repo)
    before = verify(root, gate['git_sha'])
    environ = dict(x.split(b'=', 1) for x in Path('/proc/%s/environ' % before['pid']).read_bytes().split(b'\0') if b'=' in x)
    validate_runtime(before, gate, environ)
    database = runtime_database(root, gate)
    reports, references, image_roots = [], [], []
    hml_seen = False
    for entry in manifest['runs']:
        receipt_path = private_runtime_path(entry['receipt'])
        receipt = json.loads(receipt_path.read_text())
        require(receipt.get('finished_at'), 'Execução ainda sem término registrado.')
        source = private_runtime_path(entry['source'], directory=True)
        source_sha = receipt.get('source_sha', receipt.get('runner_sha'))
        require(re.fullmatch('[0-9a-f]{40}', source_sha or ''), 'Fonte da execução não identificada.')
        clean_sha(source, source_sha)
        durable_artifact(job, root, source)
        if entry.get('name'):
            rows = [r for r in receipt['results'] if r['name'] == entry['name']]
            require(len(rows) == 1, 'Parcela ausente ou ambígua no recibo.')
            run = rows[0]
            bound = dict(run, git_sha=receipt.get('git_sha'), artifact_sha256=receipt.get('artifact_sha256'))
            directory = private_runtime_path(run['report'], directory=True)
        else:
            run = receipt
            bound = dict(run, git_sha=receipt.get('git_sha', receipt.get('served_sha')))
            directory = receipt_path.parent
            if receipt.get('scope') == 'sprint-01-smoke-identidades-hml':
                require(receipt.get('served_sha') == before['served_sha'], 'Smoke não pertence ao runtime.')
                validate_database_binding(receipt, database)
                hml_seen = True
        validate_binding(bound, gate)
        results = private_runtime_path(str(directory / 'results.json'))
        digest = artifact_hash(results)
        # Recibos históricos sem hash exigem vínculo explícito no manifesto revisado.
        require(digest == run.get('results_sha256', entry.get('results_sha256')),
                'Hash dos resultados diverge do recibo/manifesto.')
        data = json.loads(results.read_text())
        coverage = report_coverage(data)
        require(run.get('stats') == data['stats'] and run.get('coverage') == [list(p) for p in coverage],
                'Resultados divergem do inventário registrado pelo executor.')
        reports.append(data)
        image_roots.append((directory, coverage))
        references.append(dict(receipt=str(receipt_path), receipt_sha256=artifact_hash(receipt_path),
                               results=str(results), results_sha256=digest, source_sha=source_sha))
    require(hml_seen, 'Smoke real de homologação obrigatório.')
    coverage = collect_coverage(reports)
    rehearsal_path = private_runtime_path(manifest['maintenance'])
    validate_rehearsal(json.loads(rehearsal_path.read_text()), gate)
    visual = manifest['visual']
    validate_visual_files(visual, image_roots)
    totals = dict(tests=0, failures=0, errors=0, skipped=0)
    xmls = sorted((job / 'checkout/backend/target/surefire-reports').glob('TEST-*.xml'))
    require(bool(xmls), 'Resultados backend ausentes.')
    for xml in xmls:
        suite = ET.parse(xml).getroot()
        for key in totals:
            totals[key] += int(suite.attrib.get(key, 0))
    require(totals['tests'] > 0 and not any(totals[k] for k in ('failures', 'errors', 'skipped')),
            'Backend contém falhas ou testes não executados.')
    require(verify(root, gate['git_sha']) == before and artifact_hash(bundle) == bundle_hash
            and runtime_database(root, gate) == database,
            'Runtime/manifesto mudou durante conferência.')
    return dict(approved=True, scope=manifest['scope'], **before, git_sha=gate['git_sha'],
                bundle_sha256=bundle_hash, bundle=str(bundle), database=database, coverage=coverage, backend=totals,
                references=references, maintenance_sha256=artifact_hash(rehearsal_path), visual=visual,
                finished_at=datetime.now(timezone.utc).isoformat(), exit_code=0,
                healthy_promoted=False, sprint_complete=False)


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    runner_sha = clean_sha(repo)
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
    require(args.output.is_absolute() and not args.output.exists()
            and not args.output.resolve().is_relative_to(repo), 'Saída privada externa e nova obrigatória.')
    private_runtime_path(str(args.output.parent), directory=True)
    with (root / 'deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        result = check_bundle(args.bundle, root, repo)
        clean_sha(repo, runner_sha)
        durable_journal(args.output, dict(result, runner_sha=runner_sha))
        print(json.dumps({'approved': True, 'served_sha': result['served_sha'],
                          'combinations': len(result['coverage']), 'output': str(args.output),
                          'healthy_promoted': False, 'sprint_complete': False}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

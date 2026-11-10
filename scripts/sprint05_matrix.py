"""Matriz integrada local, com runtime externo e evidência fechada por artefato.

Plano privado (JSON, schema_version=1)::

  {"schema_version": 1, "git_sha": "<40 hex>",
   "artifact": {"path": "/private/candidato/app.jar", "sha256": "<64 hex>"},
   "runtime": {"pid": 12345, "port": 8089},
   "build_receipt": "/private/candidato/build.json",
   "environment": {"PLAYWRIGHT_BROWSERS_PATH": "/private/browsers"},
   "suites": {"foundation": {"config": "/private/foundation.config.ts",
                "env": {"RM_BASE_URL": "https://a.localhost:8089"}},
              "pedidos": {"env": {"RM_BASE_URL": "https://sprint03.localhost:8089"}}},
   "pair_env": {"S03-UI01:chromium-desktop": {"RM_PEDIDOS_FIXTURE": "/private/massa.json"}},
   "input_files": ["/private/test.env"],
   "quota_probe": ["python3", "/private/quota.py"]}

Todas as famílias de FAMILIES devem constar em suites. build_receipt contém
git_sha, artifact_sha256, release_gate=true, exit_code=0 e source_sha256 igual
ao retorno de application_fingerprints() coletado no build. quota_probe é opcional:
recebe MATRIX_SUITE, MATRIX_PROJECT e MATRIX_SCENARIOS no ambiente e devolve
JSON {allowed: boolean, wait_seconds: number}; somente consulta, nunca zera cotas.
Se todos os lotes aguardam quota, run devolve 75 para o coordenador aguardar.

inventory --plan PLANO --output DIR executa --list real, sem iniciar aplicação.
run --plan PLANO --output DIR [--pair CENARIO:PROJETO | --suite FAMILIA --project PROJETO]
consolidate --plan PLANO --output DIR [--visual-review REVISAO.json]

A revisão visual é JSON {reviewer, entries:[{surface:"T01", project, pair,
path:"/caminho/captura.png", sha256, approved:true, notes}]}. Exige as 28 telas
em desktop Chromium e mobile; cada captura precisa constar no manifesto produzido
pelo próprio runner e pertencer a um cenário que cobre a tela. Capturar não é
revisar: ausência/rejeição mantém visual pendente. Nem este gate nem uma revisão
visual aprovam Linux, provedor real ou piloto. Dados/relatórios ficam privados.
"""

import argparse
import fcntl
import hashlib
import html
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import zipfile
from urllib.parse import urlsplit

from build_sources import build_source_manifest

REPO = Path(__file__).resolve().parents[1]
FRONTEND = REPO / 'frontend'
PROJECTS = ('chromium-desktop', 'chromium-mobile', 'chromium-tablet',
            'firefox-desktop', 'webkit-desktop')
FAMILIES = {
    'foundation': ['S00-UI01', 'S00-UI02', 'S00-UI03', 'S00-API01'],
    'pwa': ['S02-PWA01', 'S02-PWA02'],
    'funcionamento': ['S02-UI01', 'S02-UI02'],
    'identidade': [f'S01-UI{i:02}' for i in range(1, 10)],
    'eventos': [f'S01-UI{i:02}' for i in [*range(32, 41), 42, 43]],
    'catalogo': ['S02-UI03', 'S02-UI04', 'S02-UI05',
                 *['S02-UI-PERFIL-' + p for p in
                   ['GERENTE', 'ATENDIMENTO', 'CAIXA', 'COZINHA', 'EXPEDICAO', 'ADMINISTRADOR']],
                 'S02-UI-PERFIS-CLIENTES'],
    'recuperacao': ['S01-UI10', 'S01-UI11', 'S01-UI12'],
    'plataforma': ['S01-UI23', 'S01-UI24', 'S01-UI25'],
    'cadastro': ['S01-UI13', 'S01-UI14', 'S01-UI15', 'S01-UI16'],
    'estado-empresa': ['S01-UI26', 'S01-UI27', 'S01-UI28'],
    'verificacao': ['S01-UI20', 'S01-UI21', 'S01-UI22'],
    'convites': ['S01-UI17', 'S01-UI18', 'S01-UI19', 'S01-UI41'],
    'provisionamento': ['S01-UI29', 'S01-UI30', 'S01-UI31'],
    'pedidos': [f'S03-UI{i:02}' for i in range(1, 14)],
    'sprint04': [f'S04-UI{i:02}' for i in range(1, 11)],
}
SCENARIO_FAMILY = {scenario: family for family, scenarios in FAMILIES.items() for scenario in scenarios}
EXPECTED = {(scenario, project) for scenario in SCENARIO_FAMILY for project in PROJECTS}
SURFACES = {f'T{i:02}' for i in range(1, 29)}
ID_RE = re.compile(r'^(S(?:00-(?:UI\d{2}|API01)|01-UI\d{2}|02-(?:UI\d{2}|PWA\d{2}|UI-PERFIL-[A-Z]+|UI-PERFIS-CLIENTES)|0[34]-UI\d{2}))(?=[:\s]|$)')


class EvidenceError(ValueError):
    """Erro sanitizado; nunca inclui conteúdo de fixture ou processo."""


def require(condition, message):
    if not condition:
        raise EvidenceError(message)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def object_digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def read_json(path):
    try:
        return json.loads(Path(path).read_text())
    except (OSError, ValueError) as error:
        raise EvidenceError('Documento JSON ausente ou inválido.') from error


def private_path(value, directory=False):
    path = Path(value)
    require(path.is_absolute() and '..' not in path.parts and not path.is_symlink()
            and path.exists() and path.stat().st_uid == os.getuid()
            and not path.stat().st_mode & 0o077
            and not path.resolve().is_relative_to(REPO)
            and (path.is_dir() if directory else path.is_file()),
            'Entrada/saída deve ser privada, absoluta, sem symlink e externa ao checkout.')
    # /private/tmp é permitido: a raiz específica da execução é 0700.
    for parent in path.parents:
        require(not parent.is_symlink(), 'Ancestral com symlink recusado.')
    return path


def write_json(path, value):
    path = Path(path)
    temporary = path.with_name(path.name + '.writing')
    with temporary.open('w', encoding='utf-8') as handle:
        os.chmod(temporary, 0o600)
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
    temporary.replace(path)


def coverage_catalog():
    """Expectativas revisadas no código dos cenários, sem consultar permissões da API."""
    catalog = {}

    def put(ids, surfaces, actors, units, expectation):
        for scenario in ids:
            catalog[scenario] = {'surfaces': surfaces.split(), 'actors': actors.split(),
                                 'units': units.split(), 'expectation': expectation}

    put(FAMILIES['foundation'], 'T01 T02', 'Publico', 'empresa_A domínio_desconhecido',
        'API/PostgreSQL reais; teclado/rede; domínio desconhecido 404 e gestão sem sessão 401.')
    put(FAMILIES['pwa'], 'T01 T02 T06', 'Publico', 'empresa_A',
        'Shell público offline e atualização consentida; nenhuma API ou sessão em cache.')
    put(FAMILIES['funcionamento'], 'T01 T23', 'Publico ADMINISTRADOR', 'unidade_A',
        'Horários persistem; sobreposição/conflito negados; disponibilidade revalidada após offline.')
    put(FAMILIES['identidade'], 'T06', 'ADMINISTRADOR', 'empresa_A',
        'Sessão real, validação/foco, CSRF, refresh e revogação; escrita incerta sem falso sucesso.')
    put(['S01-UI04', 'S01-UI08'], 'T25', 'ADMINISTRADOR', 'empresa_A',
        'Reautenticação e política persistida; último Administrador protegido; pendência bloqueia navegação.')
    put(['S01-UI05', 'S01-UI06', 'S01-UI07', 'S01-UI09'], 'T23', 'ADMINISTRADOR', 'unidade_A unidade_B',
        'CRUD e paginação com conflito/rede/resposta perdida preservando estado confirmado.')
    put(FAMILIES['recuperacao'] + FAMILIES['cadastro'], 'T06', 'Publico Cliente', 'empresa_A',
        'Cadastro/recuperação capturados; código único; validação, offline e resposta perdida reconciliados.')
    put(FAMILIES['verificacao'], 'T06', 'Publico ATENDIMENTO', 'empresa_A',
        'Verificação capturada preserva perfil e senha; código inválido/rede e resposta perdida tratados.')
    put(FAMILIES['convites'], 'T06 T24', 'ADMINISTRADOR ATENDIMENTO', 'empresa_A unidade_A',
        'Convite real, revogação, perfil preservado e reenvio idempotente; funcionário sem privilégio administrativo.')
    catalog['S01-UI41']['actors'] = ['ADMINISTRADOR', 'EXPEDICAO']
    put(FAMILIES['plataforma'] + FAMILIES['estado-empresa'] + FAMILIES['provisionamento'],
        'T28', 'OperadorSaaS Publico', 'plataforma empresa_A empresa_B',
        'Sessão SaaS separada; origem empresarial/Bearer negados; estado/versionamento e worker real sem impersonação.')
    put(['S01-UI32', 'S01-UI33', 'S01-UI34'], 'T27', 'ADMINISTRADOR COZINHA Cliente',
        'empresa_A empresa_B unidade_A unidade_B',
        'SSE durável/reconexão sem duplicação; revogação e outro tenant não recebem eventos.')
    put(['S01-UI35'], 'T24 T27', 'ADMINISTRADOR ATENDIMENTO', 'unidade_A unidade_B',
        'Vínculo inativo visível/reversível; revogação impede acesso com JWT ainda válido.')
    for number, actor in enumerate(['GERENTE', 'ATENDIMENTO', 'CAIXA', 'COZINHA', 'EXPEDICAO'], 36):
        put([f'S01-UI{number}'], 'T25 T27', actor + ' ADMINISTRADOR', 'unidade_A unidade_B',
            'Acompanha filial atribuída; ação revogada impede acesso; sem administração exclusiva; vínculo revalidado.')
    put(['S01-UI42', 'S01-UI43'], 'T22 T27', 'ADMINISTRADOR GERENTE', 'unidade_A unidade_B',
        'Exportação mínima reconsulta servidor, nega revogação/outra filial e não usa cache após falha.')
    put(['S02-UI03', 'S02-UI04', 'S02-UI05'], 'T02 T03 T04 T05 T20 T21',
        'Publico Cliente ADMINISTRADOR', 'unidade_A unidade_B',
        'Catálogo/mídia/combo reais; total reconfirmado; concorrência, upload inválido e resposta perdida reconciliados.')
    for actor in ['GERENTE', 'ATENDIMENTO', 'CAIXA', 'COZINHA', 'EXPEDICAO']:
        put(['S02-UI-PERFIL-' + actor], 'T20 T21 T25', actor + ' ADMINISTRADOR', 'unidade_A unidade_B',
            'Concessão e revogação delegáveis; escrita empresarial compartilhada; oferta restrita à filial; exclusivo negado.')
    put(['S02-UI-PERFIL-ADMINISTRADOR'], 'T20 T21', 'ADMINISTRADOR', 'unidade_A unidade_B',
        'Administrador gere catálogo compartilhado e oferta nas duas unidades sem restrição de funcionário.')
    put(['S02-UI-PERFIS-CLIENTES'], 'T02 T07', 'Cliente', 'cliente_A cliente_B',
        'Favoritos pessoais isolados entre contas; gestão negada pela UI/API.')
    order = [
        ('T05 T09 T12 T15', 'Cliente ATENDIMENTO COZINHA', 'Pedido, aceite e preparo preservam três unidades de item.'),
        ('T03 T10 T11 T14 T17', 'ParticipanteMesa ATENDIMENTO CAIXA', 'Configuração simples e rodada autorizada, ajuda e fechamento; sessão antiga negada.'),
        ('T05 T09', 'Cliente', 'Resposta perdida conserva intenção e não duplica pedido.'),
        ('T04 T09 T15', 'Cliente COZINHA', 'Combo cancela unidade completa e preserva primeiro preparo.'),
        ('T12 T23 T27', 'ADMINISTRADOR ATENDIMENTO', 'Prazos configurados expiram e emitem um único alerta durável.'),
        ('T12 T25', 'ATENDIMENTO CAIXA COZINHA EXPEDICAO GERENTE', 'Ações por perfil e payload financeiro negado à Cozinha.'),
        ('T05 T08 T12', 'Cliente ATENDIMENTO', 'Delivery confirma endereço/taxa e admite recusa operacional.'),
        ('T05 T08', 'Cliente', 'Offline invalida confirmação e mantém formulário navegável por teclado.'),
        ('T13 T14', 'ATENDIMENTO', 'Pedido assistido e serviço de mesa exigem ações próprias.'),
        ('T09 T12 T25 T27', 'ADMINISTRADOR ATENDIMENTO', 'Revogação remove ações e encerra SSE com JWT ainda válido.'),
        ('T09 T27', 'Cliente', 'Falha de transporte SSE usa polling real e recupera acompanhamento.'),
        ('T13 T14 T17', 'ATENDIMENTO', 'Paginação alcança mais de cinquenta mesas, solicitações e comandas.'),
        ('T14', 'ATENDIMENTO', 'Cadastro corrige nome rejeitado e recupera resposta perdida sem duplicar.'),
    ]
    for number, (surfaces, actors, expectation) in enumerate(order, 1):
        put([f'S03-UI{number:02}'], surfaces, actors, 'unidade_A', expectation)
    catalog['S03-UI06']['units'] = ['unidade_A', 'unidade_B_negada']
    catalog['S03-UI03']['units'] += ['cliente_A', 'cliente_B_negado']
    catalog['S03-UI02']['units'] += ['participante_A', 'participante_B_negado']
    financial = [
        ('T07', 'Cliente', 'Endereço próprio versionado; isolamento entre clientes e remoção.'),
        ('T23', 'ADMINISTRADOR', 'Regiões e prazo persistidos; sobreposição rejeitada e reautenticação.'),
        ('T14 T17 T18 T19', 'ADMINISTRADOR', 'Comanda vazia sem cobrança; dinheiro/troco, ajuste e devolução confirmados.'),
        ('T18', 'CAIXA', 'Resposta perdida recupera o mesmo recebimento persistido.'),
        ('T13 T16 T18 T19', 'ATENDIMENTO EXPEDICAO GERENTE CAIXA', 'Despacho/ocorrência/nova tentativa; conclusão sem pagamento negada; taxa e estorno.'),
        ('T22', 'GERENTE COZINHA', 'Relatório separa indicadores e fuso; Cozinha recebe 403.'),
        ('T26', 'ADMINISTRADOR', 'OAuth simulado retorna à conta correta sem expor segredos.'),
        ('T08 T09 T19', 'Cliente GERENTE', 'Checkout simulado pendente/recusado/repetido; confirmação confiável, devolução parcial e cancelamento.'),
        ('T26 T27', 'GERENTE', 'Pendências/notificações consultáveis; integração administrativa negada.'),
        ('T16', 'EXPEDICAO ADMINISTRADOR', 'Revogação de expedição nega UI/API e remove dados da tela aberta.'),
    ]
    for number, (surfaces, actors, expectation) in enumerate(financial, 1):
        put([f'S04-UI{number:02}'], surfaces, actors, 'unidade_A', expectation)
    catalog['S04-UI01']['units'] += ['cliente_A', 'cliente_B_negado']
    require(set(catalog) == set(SCENARIO_FAMILY), 'Catálogo independente incompleto.')
    require({s for row in catalog.values() for s in row['surfaces']} == SURFACES, 'Telas sem mapeamento.')
    return catalog


def report_pairs(data, executed=True):
    require(not data.get('errors'), 'Relatório contém erros globais.')
    pairs = []

    def walk(suite):
        for spec in suite.get('specs', []):
            match = ID_RE.match(spec.get('title', ''))
            require(match is not None, 'Cenário sem identificador conhecido.')
            for test in spec.get('tests', []):
                pair = (match[1], test.get('projectName'))
                require(pair in EXPECTED and pair not in pairs, 'Par desconhecido ou duplicado.')
                if executed:
                    results = test.get('results', [])
                    require(test.get('status') == 'expected' and test.get('expectedStatus') == 'passed'
                            and len(results) == 1 and results[0].get('status') == 'passed'
                            and results[0].get('retry') == 0 and not results[0].get('errors')
                            and not results[0].get('error'),
                            'Falha, skip, retry, flaky ou resultado incompleto recusado.')
                pairs.append(pair)
        for child in suite.get('suites', []):
            walk(child)

    for suite in data.get('suites', []):
        walk(suite)
    require(pairs, 'Relatório vazio.')
    if executed:
        stats = data.get('stats', {})
        require(stats.get('expected') == len(pairs)
                and all(stats.get(key) == 0 for key in ('unexpected', 'skipped', 'flaky')),
                'Contagem de resultados inconsistente.')
        require(data.get('config', {}).get('workers') == 1, 'Execução deve usar um worker.')
    return set(pairs)


def observe_runtime(plan):
    artifact, runtime = plan['artifact'], plan['runtime']
    jar = private_path(artifact['path']).resolve()
    require(jar.is_file() and digest(jar) == artifact['sha256'], 'JAR divergente do candidato.')
    pid, port = runtime['pid'], runtime['port']
    require(type(pid) is int and pid > 0 and port == 8089, 'Runtime local inválido.')
    fields = {}
    for field in ('comm', 'lstart', 'args'):
        result = subprocess.run(['ps', '-ww', '-p', str(pid), '-o', field + '='],
                                text=True, capture_output=True, timeout=10)
        require(result.returncode == 0 and len(result.stdout.strip().splitlines()) == 1,
                'Identidade do processo indisponível.')
        fields[field] = result.stdout.strip()
    require(Path(fields['comm']).name == 'java'
            and re.search(r'(?:^|\s)-jar\s+' + re.escape(str(jar)) + r'(?:\s|$)', fields['args']),
            'PID não executa o JAR registrado.')
    lsof = shutil.which('lsof') or '/usr/sbin/lsof'
    listener = subprocess.run([lsof, '-nP', '-a', '-p', str(pid), '-iTCP:' + str(port),
                               '-sTCP:LISTEN', '-Fpn'], text=True, capture_output=True, timeout=10)
    listeners = [line[1:] for line in listener.stdout.splitlines() if line.startswith('n')]
    require(listener.returncode == 0 and [line for line in listener.stdout.splitlines()
            if line.startswith('p')] == ['p' + str(pid)] and listeners
            and set(listeners) <= {f'127.0.0.1:{port}', f'[::1]:{port}'},
            'PID não é o servidor da porta registrada ou não está restrito a loopback.')
    return {'git_sha': plan['git_sha'], 'artifact_sha256': artifact['sha256'], 'pid': pid,
            'started_at': ' '.join(fields['lstart'].split()), 'port': port,
            'command_sha256': hashlib.sha256(fields['args'].encode()).hexdigest()}


def config_for(plan, family):
    default = FRONTEND / ('playwright.config.ts' if family == 'foundation' else f'playwright.{family}.config.ts')
    path = Path(plan['suites'][family].get('config', default))
    require(path.is_absolute() and path.is_file() and not path.is_symlink(), 'Config Playwright inválida.')
    return path


def pair_environment(plan, family, pairs):
    overrides = plan.get('pair_env', {})
    selections = [overrides.get(':'.join(pair), {}) for pair in pairs]
    require(not selections or all(row == selections[0] for row in selections),
            'Lote com fixtures diferentes: execute cada par separadamente.')
    values = {**plan.get('environment', {}), **plan['suites'][family].get('env', {}),
              **(selections[0] if selections else {})}
    require(all(isinstance(key, str) and isinstance(value, str) for key, value in values.items()),
            'Variáveis devem ser strings.')
    target = urlsplit(values.get('RM_BASE_URL', ''))
    require(target.scheme == 'https' and target.port == 8089 and target.hostname
            and target.hostname.endswith('.localhost') and not target.username and not target.password
            and target.path in ('', '/') and not target.query and not target.fragment,
            'Destino deve ser HTTPS local na porta 8089.')
    # Não herdar credenciais ou overrides de uma execução anterior.
    environment = {key: value for key, value in os.environ.items()
                   if not key.startswith(('RM_', 'SPRING_', 'SERVER_', 'MATRIX_', 'PLAYWRIGHT_'))}
    environment.update(values)
    return environment


def input_fingerprints(plan):
    paths = {Path(name) for name in application_fingerprints()}
    for pattern in ('frontend/dist/restaurant-manager/browser/**/*',
                    'frontend/e2e*/**/*.ts', 'frontend/playwright*.ts',
                    'scripts/*.py', 'scripts/*.sh', 'scripts/*.cjs'):
        paths.update(path for path in REPO.glob(pattern) if path.is_file())
    paths.add(Path(plan['build_receipt']))
    paths.update(Path(value) for value in plan.get('input_files', []))
    paths.update(config_for(plan, family) for family in FAMILIES)
    environments = [plan.get('environment', {}), *[row.get('env', {}) for row in plan['suites'].values()],
                    *plan.get('pair_env', {}).values()]
    for values in environments:
        for key, value in values.items():
            if key.endswith('_FIXTURE'):
                paths.add(private_path(value))
    probe = plan.get('quota_probe', [])
    if probe:
        require(isinstance(probe, list) and len(probe) == 2 and Path(probe[1]).is_absolute(),
                'Probe de quota deve ser [interpretador, script absoluto].')
        paths.add(private_path(probe[1]))
    require(all(path.is_file() and not path.is_symlink() for path in paths), 'Entrada ausente ou vinculada.')
    return {str(path.resolve()): digest(path) for path in sorted(paths)}


def application_fingerprints():
    try:
        manifest = build_source_manifest(REPO)
    except (OSError, ValueError) as error:
        raise EvidenceError('Fontes do build ausentes ou vinculadas.') from error
    return {str((REPO / name).resolve()): checksum for name, checksum in manifest.items()}


def verify_pwa_artifact(jar):
    """PWA02 serve o dist local: os bytes precisam ser os empacotados no Java."""
    build = FRONTEND / 'dist/restaurant-manager/browser'
    files = {path.relative_to(build).as_posix(): path for path in build.rglob('*') if path.is_file()}
    require('sw.js' in files and 'index.html' in files and all(not path.is_symlink() for path in files.values()),
            'Build PWA local ausente ou vinculado externamente.')
    try:
        with zipfile.ZipFile(jar) as archive:
            prefix = 'BOOT-INF/classes/static/'
            packaged = [name[len(prefix):] for name in archive.namelist()
                        if name.startswith(prefix) and not name.endswith('/')]
            require(set(packaged) == set(files) and len(packaged) == len(files),
                    'Inventário estático do JAR diverge do dist usado pela PWA.')
            require(all(archive.read(prefix + name) == path.read_bytes() for name, path in files.items()),
                    'Bytes da PWA divergem do candidato integrado.')
    except zipfile.BadZipFile as error:
        raise EvidenceError('Artefato Java inválido.') from error


def load_plan(path):
    plan = read_json(private_path(path))
    require(plan.get('schema_version') == 1 and re.fullmatch(r'[0-9a-f]{40}', plan.get('git_sha', ''))
            and re.fullmatch(r'[0-9a-f]{64}', plan.get('artifact', {}).get('sha256', '')),
            'Identificação do candidato incompleta.')
    require(set(plan.get('suites', {})) == set(FAMILIES), 'Plano deve declarar todas as famílias, sem exclusões.')
    require(all(tuple(key.split(':')) in EXPECTED for key in plan.get('pair_env', {})),
            'Override de par desconhecido.')
    build = read_json(private_path(plan['build_receipt']))
    require(build.get('git_sha') == plan['git_sha'] and build.get('artifact_sha256') == plan['artifact']['sha256']
            and build.get('release_gate') is True and build.get('exit_code') == 0,
            'Build reprovado ou vinculado a outro SHA/JAR.')
    require(build.get('source_sha256') == application_fingerprints(),
            'Fontes atuais não correspondem às fontes registradas durante o build.')
    return plan


def frozen(plan, output, create=False):
    verify_pwa_artifact(plan['artifact']['path'])
    current = {'schema_version': 1, 'plan_sha256': object_digest(plan),
               'runtime': observe_runtime(plan), 'inputs': input_fingerprints(plan),
               'coverage_sha256': object_digest(coverage_catalog())}
    path = output / 'frozen.json'
    if create and not path.exists():
        write_json(path, current)
    require(path.is_file() and read_json(path) == current,
            'SHA, JAR, PID/início do processo, plano ou inputs mudaram desde o congelamento.')
    return current


def inventory(plan, output):
    binding = frozen(plan, output, create=True)
    inventory_dir = output / 'inventory'
    inventory_dir.mkdir(mode=0o700, exist_ok=True)
    all_pairs, reports = set(), {}
    for family, scenarios in FAMILIES.items():
        environment = pair_environment(plan, family, [(scenarios[0], PROJECTS[0])])
        environment['RM_REPORT_DIR'] = str(inventory_dir / family)
        command = [str(FRONTEND / 'node_modules/.bin/playwright'), 'test', '--config', str(config_for(plan, family)),
                   '--list', '--reporter=json']
        result = subprocess.run(command, cwd=FRONTEND, env=environment, capture_output=True, text=True, timeout=90)
        require(result.returncode == 0, 'Inventário Playwright falhou: ' + family)
        try:
            data = json.loads(result.stdout)
        except ValueError as error:
            raise EvidenceError('Inventário Playwright não devolveu JSON.') from error
        expected = {(scenario, project) for scenario in scenarios for project in PROJECTS}
        pairs = report_pairs(data, executed=False)
        require(pairs == expected, 'Inventário real diverge do catálogo independente: ' + family)
        path = inventory_dir / (family + '.json')
        write_json(path, data)
        reports[family] = {'path': str(path), 'sha256': digest(path)}
        all_pairs.update(pairs)
    require(all_pairs == EXPECTED, 'Inventário integrado incompleto.')
    frozen(plan, output)
    value = {'binding_sha256': object_digest(binding), 'reports': reports,
             'pairs': [list(pair) for pair in sorted(all_pairs)], 'expected': len(EXPECTED)}
    write_json(output / 'inventory.json', value)
    return value


def check_inventory(output, binding):
    data = read_json(output / 'inventory.json')
    require(data.get('binding_sha256') == object_digest(binding) and data.get('expected') == len(EXPECTED)
            and {tuple(pair) for pair in data.get('pairs', [])} == EXPECTED
            and len(data.get('pairs', [])) == len(EXPECTED)
            and set(data.get('reports', {})) == set(FAMILIES), 'Inventário incompleto ou de outro candidato.')
    for family, row in data['reports'].items():
        path = Path(row['path'])
        require(path.resolve().is_relative_to(output.resolve()) and digest(path) == row['sha256'],
                'Arquivo do inventário ausente/alterado.')
        require(report_pairs(read_json(path), False) == {(s, p) for s in FAMILIES[family] for p in PROJECTS},
                'Inventário da família divergente.')


def run_job(plan, output, family, project, scenarios):
    pairs = [(scenario, project) for scenario in scenarios]
    binding = frozen(plan, output)
    check_inventory(output, binding)
    job_id = family + '--' + project + '--' + (scenarios[0] if len(scenarios) == 1 else 'all')
    directory = output / 'runs' / job_id
    if directory.exists():
        previous = read_json(directory / 'receipt.json')
        report = directory / 'results.json'
        require(report.is_file() and digest(report) == previous.get('report_sha256'),
                'Lote anterior sem relatório íntegro; preservar diagnóstico e abrir nova execução.')
        require(check_receipt(previous, read_json(report), binding) == set(pairs),
                'Lote anterior diverge do solicitado.')
        print(json.dumps({'suite': family, 'project': project, 'pairs': len(pairs), 'status': 'verified_existing'}), flush=True)
        return 0
    environment = pair_environment(plan, family, pairs)
    environment.update(MATRIX_SUITE=family, MATRIX_PROJECT=project, MATRIX_SCENARIOS=','.join(scenarios))
    if plan.get('quota_probe'):
        probe = subprocess.run(plan['quota_probe'], cwd=REPO, env=environment,
                               text=True, capture_output=True, timeout=30)
        require(probe.returncode == 0, 'Consulta de quota falhou; nenhuma quota foi alterada pelo runner.')
        try:
            allowance = json.loads(probe.stdout)
        except ValueError as error:
            raise EvidenceError('Resposta inválida do probe de quota.') from error
        require(type(allowance.get('allowed')) is bool, 'Probe não informou disponibilidade.')
        if not allowance['allowed']:
            return 75
    directory.mkdir(parents=True, mode=0o700)
    os.chmod(directory.parent, 0o700)
    environment['RM_REPORT_DIR'] = str(directory)
    command = [str(FRONTEND / 'node_modules/.bin/playwright'), 'test', '--config', str(config_for(plan, family)),
               '--project', project, '--workers=1', '--retries=0',
               '--grep', '(?:^|\\s)(?:' + '|'.join(re.escape(s) for s in scenarios) + ')(?=[:\\s]|$)']
    receipt = {'schema_version': 1, 'binding_sha256': object_digest(binding), 'runtime_before': binding['runtime'],
               'pairs': [list(pair) for pair in pairs], 'command': command, 'status': 'running',
               'started_unix': time.time(), 'screenshots': []}
    write_json(directory / 'receipt.json', receipt)
    with (directory / 'execution.log').open('w') as log:
        os.chmod(directory / 'execution.log', 0o600)
        result = subprocess.run(command, cwd=FRONTEND, env=environment, stdout=log, stderr=subprocess.STDOUT,
                                timeout=max(300, len(pairs) * 240))
    receipt.update(exit_code=result.returncode, status='failed', ended_unix=time.time())
    try:
        receipt['runtime_after'] = frozen(plan, output)['runtime']
        report = directory / 'results.json'
        receipt['report_sha256'] = digest(report)
        require(result.returncode == 0 and report_pairs(read_json(report)) == set(pairs),
                'Lote falhou ou produziu cobertura diferente da solicitada.')
        for path in sorted((directory / 'artifacts').rglob('*.png')):
            require(not path.is_symlink(), 'Captura vinculada externamente.')
            folder = path.relative_to(directory / 'artifacts').parts[0]
            matched = [pair for pair in pairs if re.search(re.escape(pair[0]) + r'(?:-|$)', folder)]
            # Alguns nomes longos são truncados pelo Playwright; uma captura sem
            # associação única permanece disponível no HTML, mas não aprova tela.
            if len(matched) == 1:
                receipt['screenshots'].append({'path': str(path.resolve()), 'sha256': digest(path),
                                              'pair': list(matched[0])})
        receipt['status'] = 'passed'
    finally:
        write_json(directory / 'receipt.json', receipt)
    print(json.dumps({'suite': family, 'project': project, 'pairs': len(pairs), 'status': receipt['status']}), flush=True)
    return result.returncode


def check_receipt(receipt, report, binding):
    require(receipt.get('status') == 'passed' and receipt.get('exit_code') == 0,
            'Lote falhou, está incompleto ou não foi executado.')
    require(receipt.get('binding_sha256') == object_digest(binding)
            and receipt.get('runtime_before') == binding['runtime']
            and receipt.get('runtime_after') == binding['runtime'],
            'Lote pertence a outro SHA/JAR/PID ou mudou de runtime durante a execução.')
    pairs = report_pairs(report)
    require(pairs == {tuple(pair) for pair in receipt.get('pairs', [])}
            and len(pairs) == len(receipt.get('pairs', [])), 'Receipt e relatório divergem.')
    return pairs


def check_visual(review, screenshots, pair_coverage):
    require(isinstance(review.get('reviewer'), str) and bool(review['reviewer'].strip()), 'Revisor visual ausente.')
    found = set()
    for entry in review.get('entries', []):
        surface, project = entry.get('surface'), entry.get('project')
        pair = tuple(entry.get('pair', []))
        key = (surface, project)
        require(surface in SURFACES and project in ('chromium-desktop', 'chromium-mobile')
                and key not in found and pair in pair_coverage and pair[1] == project
                and surface in pair_coverage[pair]['surfaces'], 'Mapeamento visual incorreto ou duplicado.')
        require(entry.get('approved') is True and isinstance(entry.get('notes'), str)
                and len(entry['notes'].strip()) >= 12, 'Revisão visual reprovada ou sem observação concreta.')
        path = entry.get('path', '')
        require(path in screenshots and screenshots[path]['sha256'] == entry.get('sha256')
                and pair in screenshots[path]['pairs'] and Path(path).is_file()
                and digest(path) == entry['sha256'], 'Captura não pertence à execução aprovada ou foi alterada.')
        found.add(key)
    require(found == {(s, p) for s in SURFACES for p in ('chromium-desktop', 'chromium-mobile')},
            'Revisão visual incompleta: exigidas 28 telas em desktop e mobile.')
    return True


def consolidate(plan, output, visual_path=None):
    binding = frozen(plan, output)
    check_inventory(output, binding)
    seen, screenshots, rows, problems = set(), {}, [], []
    catalog = coverage_catalog()
    for path in sorted((output / 'runs').glob('*/receipt.json')):
        try:
            receipt = read_json(path)
            report_path = path.parent / 'results.json'
            require(report_path.is_file() and digest(report_path) == receipt.get('report_sha256'),
                    'Relatório ausente ou modificado após execução.')
            pairs = check_receipt(receipt, read_json(report_path), binding)
            require(not seen.intersection(pairs), 'Mesmo par aparece em mais de uma execução.')
            seen.update(pairs)
            for pair in sorted(pairs):
                rows.append({'scenario': pair[0], 'project': pair[1], 'status': 'passed', **catalog[pair[0]],
                             'report': str(report_path), 'html': str(path.parent / 'html/index.html')})
            for shot in receipt.get('screenshots', []):
                source = Path(shot['path'])
                require(source.resolve().is_relative_to(path.parent.resolve() / 'artifacts')
                        and not source.is_symlink() and source.is_file() and digest(source) == shot['sha256'],
                        'Captura alterada ou externa ao lote.')
                capture_pair = tuple(shot.get('pair', []))
                require(capture_pair in pairs, 'Captura sem cenário de origem aprovado.')
                screenshots[str(source)] = {'sha256': shot['sha256'], 'pairs': {capture_pair}}
        except (EvidenceError, OSError, KeyError) as error:
            problems.append({'batch': path.parent.name, 'reason': str(error) if isinstance(error, EvidenceError)
                             else 'Arquivo obrigatório ausente ou inválido.'})
    missing = EXPECTED - seen
    automated = not problems and not missing and len(seen) == len(EXPECTED)
    visual, visual_reason = False, 'Revisão visual não fornecida.'
    if visual_path:
        try:
            require(automated, 'Automação incompleta impede aprovação visual integrada.')
            visual = check_visual(read_json(private_path(visual_path)), screenshots,
                                  {pair: catalog[pair[0]] for pair in seen})
            visual_reason = 'Revisão visual vinculada às capturas da execução.'
        except EvidenceError as error:
            visual_reason = str(error)
    result = {'schema_version': 1, 'scope': 'mac-ci-local', 'runtime': binding['runtime'],
              'expected': len(EXPECTED), 'passed': len(seen), 'automated_approved': automated,
              'visual_approved': visual, 'approved': automated and visual, 'visual_reason': visual_reason,
              'linux_homologation': False, 'external_services_approved': False, 'pilot_approved': False,
              'production_approved': False, 'problems': problems, 'missing': [list(pair) for pair in sorted(missing)],
              'coverage': rows, 'coverage_note': 'Mapeamento independente dos cenários existentes; cada linha descreve seu escopo, sem inferir combinações não executadas.',
              'screenshots': [{'path': path, 'sha256': row['sha256'], 'pairs': [list(pair) for pair in sorted(row['pairs'])]}
                              for path, row in screenshots.items()]}
    write_json(output / 'matrix.json', result)
    body = ['<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Matriz Sprint 5</title>',
            '<style>body{font:16px system-ui;margin:2rem}table{border-collapse:collapse}td,th{padding:.5rem;border:1px solid #bbb;text-align:left}</style>',
            '<h1>Matriz integrada local — Sprint 5</h1>',
            f'<p>{len(seen)}/{len(EXPECTED)} pares. Automação: {automated}. Revisão visual: {visual}.</p>',
            '<p>Linux, serviços externos, piloto e produção permanecem pendentes.</p>',
            '<p>' + html.escape(visual_reason) + '</p>', '<table><tr><th>Cenário/projeto</th><th>Telas</th><th>Perfis/escopo</th><th>Expectativa independente</th></tr>']
    for row in rows:
        body.append('<tr><td><a href="' + html.escape(os.path.relpath(row['html'], output), quote=True) + '">'
                    + html.escape(row['scenario'] + ' / ' + row['project']) + '</a></td><td>'
                    + html.escape(', '.join(row['surfaces'])) + '</td><td>'
                    + html.escape(', '.join(row['actors']) + '; ' + ', '.join(row['units'])) + '</td><td>'
                    + html.escape(row['expectation']) + '</td></tr>')
    body.append('</table><h2>Pendências/falhas</h2><pre>' + html.escape(json.dumps(
        {'problems': problems, 'missing': result['missing']}, ensure_ascii=False, indent=2)) + '</pre></html>')
    (output / 'index.html').write_text('\n'.join(body))
    os.chmod(output / 'index.html', 0o600)
    return result


def jobs(plan, pair=None, family=None, project=None):
    if pair:
        parts = tuple(pair.split(':'))
        require(parts in EXPECTED, 'Par desconhecido.')
        return [(SCENARIO_FAMILY[parts[0]], parts[1], [parts[0]])]
    if family:
        require(family in FAMILIES and project in PROJECTS, 'Família/projeto inválidos.')
        return [(family, project, FAMILIES[family])]
    # Intercala projetos por cenário nas suítes com fixtures isoladas.
    selected = [(f, p, FAMILIES[f]) for f in FAMILIES if f not in ('pedidos', 'sprint04') for p in PROJECTS]
    selected += [(f, p, [s]) for f in ('pedidos', 'sprint04') for s in FAMILIES[f] for p in PROJECTS]
    return selected


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('command', choices=('inventory', 'run', 'consolidate'))
    parser.add_argument('--plan', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--pair')
    parser.add_argument('--suite')
    parser.add_argument('--project')
    parser.add_argument('--visual-review')
    args = parser.parse_args()
    os.umask(0o077)
    plan, output = load_plan(args.plan), private_path(args.output, directory=True)
    with (output / '.matrix.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if args.command == 'inventory':
            result = inventory(plan, output)
            print(json.dumps({'inventoried': result['expected'], 'linux_homologation': False}))
        elif args.command == 'run':
            pending = jobs(plan, args.pair, args.suite, args.project)
            blocked = 0
            for family, project, scenarios in pending:
                code = run_job(plan, output, family, project, scenarios)
                if code == 75:
                    blocked += 1
                elif code:
                    return code
            return 75 if blocked else 0
        else:
            result = consolidate(plan, output, args.visual_review)
            print(json.dumps({key: result[key] for key in ('expected', 'passed', 'automated_approved', 'visual_approved',
                                                         'approved', 'linux_homologation')}))
            return 0 if result['approved'] else 1
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (EvidenceError, KeyError, OSError, subprocess.TimeoutExpired) as error:
        print(str(error) if isinstance(error, EvidenceError) else 'Falha operacional; consulte os arquivos privados.', file=sys.stderr)
        sys.exit(2)

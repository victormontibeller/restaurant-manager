#!/usr/bin/env python3
"""Publicação opt-in de commits de sprint na demonstração gerenciada deste Mac."""
import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import shlex
import shutil
import ssl
import subprocess as sp
import sys
import tempfile
import time
import urllib.request
import zipfile

BASE = Path.home() / '.local/share/restaurant-manager-manual'
RELEASES = BASE / 'release/sprints'
AUTO = RELEASES / 'automacao'
LABEL = 'com.restaurantmanager.demo.local'
JOB = f'gui/{os.getuid()}/{LABEL}'
HOOK_MARKER = '# restaurant-manager: demo-local-sprints-v1'
SPRINT = re.compile(r'(?:codex|hermes)/sprint-(\d+)-[\w-]+')
HASHED = re.compile(r'(?:main|chunk|styles|polyfills)-[A-Za-z0-9_-]+\.(?:css|js)')
STATIC = 'BOOT-INF/classes/static/'
MIGRATIONS = 'BOOT-INF/classes/db/migration/'
ENTRADAS = ('backend/src/main', 'backend/pom.xml', 'backend/mvnw', 'backend/.mvn',
            'frontend/src', 'frontend/public', 'frontend/angular.json', 'frontend/package.json',
            'frontend/package-lock.json', 'frontend/.postcssrc.json', 'frontend/tsconfig.json',
            'frontend/tsconfig.app.json', 'scripts/build-pwa.cjs', 'scripts/pwa-assets.cjs')


def exigir(condicao, mensagem):
    if not condicao:
        raise RuntimeError(mensagem)


def ambiente():
    return {k: os.environ[k] for k in ('HOME', 'PATH', 'TMPDIR', 'LANG', 'LC_ALL') if k in os.environ}


def git(repo, *args):
    return sp.check_output(['/usr/bin/git', '-C', repo, *args], env=ambiente(), text=True).strip()


def gravar(path, dados):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False, mode='w') as tmp:
        tmp.write(dados)
    Path(tmp.name).replace(path)


def json_salvar(path, valor):
    gravar(path, json.dumps(valor, ensure_ascii=False) + '\n')


def ler(path):
    return json.loads(path.read_text()) if path.is_file() else None


@contextmanager
def trava(path):
    with path.open('a') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        yield


def validar_ambiente(repo):
    exigir(sys.platform == 'darwin', 'A demonstração requer macOS.')
    cfg = repo / '.env'
    exigir(cfg.is_symlink() and cfg.resolve() == BASE / '.env', 'Checkout alheio à demonstração local.')
    valores = {}
    for linha in cfg.read_text().splitlines():
        chave, sep, valor = linha.partition('=')
        if sep and chave in ('RM_STAGE', 'RM_DB_USER', 'RM_DB_URL', 'RM_PORT'):
            valores[chave] = valor.strip().strip('"').strip("'")
    exigir(valores == {'RM_STAGE': 'dev', 'RM_PORT': '8095', 'RM_DB_USER': 'rm_dev_app',
                       'RM_DB_URL': 'jdbc:postgresql://127.0.0.1:5432/rm_dev'},
           'Ambiente, porta ou banco diferentes da demo autorizada.')
    plist = plistlib.loads((RELEASES / (LABEL + '.plist')).read_bytes())
    args = plist.get('ProgramArguments', [])
    exigir(plist.get('Label') == LABEL and len(args) == 5 and args[:4] == [
        '/bin/bash', str(RELEASES / 'iniciar.sh'), str(repo), str(RELEASES / 'atual')],
        'Configuração do serviço da demonstração divergente.')
    java = Path(args[-1])
    exigir(java.is_absolute() and java.name == 'java' and os.access(java, os.X_OK), 'Java da demo indisponível.')
    return java


def release_ativa():
    link = RELEASES / 'atual'
    exigir(link.is_symlink(), 'Seleção de release inválida.')
    return release_managed(link.resolve())


def release_managed(path):
    exigir(path.parent == RELEASES and not path.is_symlink() and (path / 'app.jar').is_file()
           and (path / 'static/sw.js').is_file(), 'Release fora do serviço gerenciado.')
    return path


def dados_http(path):
    tls = ssl.create_default_context(cafile=str(BASE / 'tls/demo-ca.crt'))
    cliente = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=tls))
    with cliente.open('https://demo.localhost:8095' + path, timeout=3) as r:
        exigir(r.geturl() == 'https://demo.localhost:8095' + path, 'Redirecionamento inesperado da demo.')
        return r.read()


def conferir(release):
    saida = sp.check_output(['/usr/sbin/lsof', '-nP', '-iTCP:8095', '-sTCP:LISTEN', '-Fpn'], text=True)
    pids = re.findall(r'^p(\d+)$', saida, re.M)
    exigir(len(pids) == 1 and re.findall(r'^n(.+)$', saida, re.M) == ['127.0.0.1:8095'],
           'A porta da demonstração precisa pertencer a um único listener de loopback.')
    estado = sp.check_output(['/bin/launchctl', 'print', JOB], text=True, stderr=sp.DEVNULL)
    exigir(re.search(r'^\s*pid = ' + pids[0] + r'$', estado, re.M), 'Processo fora do serviço launchd esperado.')
    args = sp.check_output(['/bin/ps', '-p', pids[0], '-o', 'command='], text=True).strip()
    exigir(args.endswith(' -jar ' + str(release / 'app.jar')), 'O processo não está servindo o JAR esperado.')
    exigir(json.loads(dados_http('/actuator/health'))['status'] == 'UP', 'Saúde da demo indisponível.')
    for url, arquivo in [('/sw.js', 'sw.js'), ('/conta', 'index.html')]:
        exigir(dados_http(url) == (release / 'static' / arquivo).read_bytes(), 'Identidade da PWA divergente.')


def selecionar(release):
    tmp = RELEASES / ('selecao-' + str(time.time_ns()))
    tmp.symlink_to(release)
    tmp.replace(RELEASES / 'atual')


def reiniciar(release):
    ativo = sp.run(['/bin/launchctl', 'print', JOB], stdout=sp.DEVNULL, stderr=sp.DEVNULL)
    if ativo.returncode:
        sp.run(['/bin/launchctl', 'bootstrap', f'gui/{os.getuid()}', RELEASES / (LABEL + '.plist')], check=True)
    else:
        sp.run(['/bin/launchctl', 'kickstart', '-k', JOB], check=True)
    fim = time.monotonic() + 90
    while True:
        try:
            conferir(release)
            return
        except (OSError, RuntimeError, ValueError, KeyError, sp.CalledProcessError):
            if time.monotonic() >= fim:
                raise RuntimeError('O JAR, a PWA ou a saúde não foram confirmados após o reinício.')
            time.sleep(1)


def preparar_static(jar, anterior, destino):
    with zipfile.ZipFile(jar) as novo, zipfile.ZipFile(anterior / 'app.jar') as antigo:
        def migracoes(z):
            return {n: z.read(n) for n in z.namelist() if n.startswith(MIGRATIONS) and n.endswith('.sql')}
        exigir(migracoes(novo) and migracoes(novo) == migracoes(antigo),
               'As migrações mudaram. Atualize o banco da demo pelo procedimento de manutenção.')
        for nome in novo.namelist():
            if not nome.startswith(STATIC) or nome.endswith('/'):
                continue
            rel = Path(nome[len(STATIC):])
            exigir(not rel.is_absolute() and '..' not in rel.parts, 'Caminho estático inválido no artefato.')
            p = destino / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(novo.read(nome))
    exigir(all((destino / f).is_file() for f in ('index.html', 'sw.js')) and
           any(HASHED.fullmatch(p.name) for p in destino.glob('main-*.js')), 'PWA incompleta.')
    for p in (anterior / 'static').iterdir():
        if HASHED.fullmatch(p.name) and p.is_file() and not p.is_symlink():
            alvo = destino / p.name
            if alvo.exists():
                exigir(alvo.read_bytes() == p.read_bytes(), 'Dois assets diferentes usam o mesmo hash público.')
            else:
                os.link(p, alvo)


def empacotar(repo, sha, java, dest):
    ferramentas = ler(AUTO / 'config.json')
    env = ambiente()
    env.update(JAVA_HOME=str(java.parent.parent), NG_BUILD_MAX_WORKERS='2')
    env['PATH'] = os.pathsep.join([str(java.parent), str(Path(ferramentas['node']).parent),
                                   str(Path(ferramentas['npm']).parent), env.get('PATH', os.defpath)])
    with tempfile.TemporaryDirectory(prefix='rm-demo-build-') as temp:
        raiz = Path(temp)
        arquivo = raiz / 'fonte.tar'
        sp.run(['/usr/bin/git', 'archive', '--format=tar', '-o', arquivo, sha], cwd=repo, env=env, check=True)
        sp.run(['/usr/bin/tar', '-xf', arquivo], cwd=raiz, env=env, check=True)
        for args in ([ferramentas['npm'], '--prefix', 'frontend', 'ci', '--ignore-scripts', '--prefer-offline'],
                     [ferramentas['npm'], '--prefix', 'frontend', 'run', 'typecheck'],
                     [ferramentas['npm'], '--prefix', 'frontend', 'run', 'build'],
                     ['bash', 'backend/mvnw', '-ntp', '-f', 'backend/pom.xml', '-DskipTests', 'package']):
            sp.run(args, cwd=raiz, env=env, check=True)
        shutil.copyfile(raiz / 'backend/target/restaurant-manager-0.1.0-SNAPSHOT.jar', dest / 'app.jar')


def versao(path):
    nome = re.match(r'^(\d+)-', path.name)
    exigir(nome is not None, 'Release gerenciada sem número de sprint.')
    return int(nome[1])


def assinatura_app(repo, sha):
    arvore = sp.check_output(['/usr/bin/git', '-C', repo, 'ls-tree', '-rz', sha, '--', *ENTRADAS],
                             env=ambiente())
    exigir(arvore, 'As entradas da aplicação não estão presentes no commit.')
    return hashlib.sha256(arvore).hexdigest()


def pedido_atual(repo):
    ramo = git(repo, 'branch', '--show-current')
    match = SPRINT.fullmatch(ramo)
    if not match:
        return None
    sha, *pais = git(repo, 'rev-list', '--parents', '-n', '1', 'HEAD').split()
    assinatura = assinatura_app(repo, sha)
    if pais and assinatura == assinatura_app(repo, pais[0]):
        return None
    return {'branch': ramo, 'sprint': int(match[1]), 'sha': sha, 'aplicacao': assinatura}


def enfileirar(repo):
    config = ler(AUTO / 'config.json') or {}
    exigir(Path.cwd().resolve() == repo and config.get('repo') == str(repo),
           'O hook está autorizado apenas no checkout instalado.')
    with trava(AUTO / 'pedido.lock'):
        pedido = pedido_atual(repo)
        if not pedido:
            return
        atual = ler(AUTO / 'pedido.json') or {}
        minimo = max(versao(release_ativa()), atual.get('sprint', 0))
        if pedido['sprint'] < minimo:
            print(f'Demo preservada na sprint {minimo:02d}.', flush=True)
            return
        json_salvar(AUTO / 'pedido.json', pedido)
    with (AUTO / 'worker.log').open('a') as log:
        sp.Popen([sys.executable, str(AUTO / 'worker.py'), 'worker', '--repo', str(repo)],
                 stdin=sp.DEVNULL, stdout=log, stderr=sp.STDOUT, env=ambiente(),
                 cwd=repo, start_new_session=True, close_fds=True)
    print('Demo enfileirada para', pedido['sha'][:12], '· acompanhamento em', AUTO / 'worker.log')


def promover(anterior, candidato, diario, continua, apontar, reinicio):
    # O hook pode registrar um commit durante o reinício. Só a escolha do ponteiro é serializada.
    with trava(AUTO / 'pedido.lock'):
        if not continua():
            return False
        json_salvar(diario, {'anterior': str(anterior), 'candidato': str(candidato)})
        apontar(candidato)
    try:
        reinicio(candidato)
    except BaseException:
        exigir(release_ativa() == candidato, 'A seleção mudou fora do worker; recuperação registrada para revisão.')
        print('Falha na confirmação. Restaurando', anterior.name, flush=True)
        apontar(anterior)
        reinicio(anterior)
        diario.unlink()
        print('Release anterior confirmada', anterior.name, flush=True)
        raise
    diario.unlink()
    return True


def trabalhar(repo):
    java = validar_ambiente(repo)
    with trava(AUTO / 'worker.lock'):
        diario = AUTO / 'recuperacao.json'
        if diario.exists():
            registro = ler(diario)
            anterior = release_managed(Path(registro['anterior']))
            exigir(release_ativa() in (anterior, Path(registro['candidato'])), 'A demo mudou fora da atualização interrompida.')
            selecionar(anterior)
            reiniciar(anterior)
            diario.unlink()
        pedido = ler(AUTO / 'pedido.json')
        if not pedido or not vigente(repo, pedido):
            return
        anterior = release_ativa()
        if (ler(anterior / 'origem.json') or {}).get('aplicacao') == pedido['aplicacao']:
            conferir(anterior)
            return
        exigir(pedido['sprint'] >= versao(anterior), 'Uma sprint mais nova já foi publicada.')
        conferir(anterior)
        nome = f"{pedido['sprint']:02d}-{time.strftime('%Y%m%d-%H%M%S')}-{pedido['sha'][:12]}-"
        candidato = Path(tempfile.mkdtemp(prefix=nome, dir=RELEASES))
        try:
            resultado(pedido, 'empacotando')
            print('Empacotando', pedido['sha'], flush=True)
            empacotar(repo, pedido['sha'], java, candidato)
            preparar_static(candidato / 'app.jar', anterior, candidato / 'static')
            validar_ambiente(repo)
            conferir(anterior)
            with (candidato / 'app.jar').open('rb') as arquivo:
                digest = hashlib.sha256()
                for bloco in iter(lambda: arquivo.read(1024 * 1024), b''):
                    digest.update(bloco)
                assinatura = digest.hexdigest()
            json_salvar(candidato / 'origem.json', dict(pedido, jarSha256=assinatura))
            if not promover(anterior, candidato, diario,
                            lambda: vigente(repo, pedido) and release_ativa() == anterior, selecionar, reiniciar):
                resultado(pedido, 'superado')
                print('Seleção alterada ou commit superado durante o build.', flush=True)
                shutil.rmtree(candidato)
                return
            resultado(pedido, 'confirmado')
            print('Demo confirmada', pedido['sha'], flush=True)
        except BaseException as erro:
            resultado(pedido, 'falhou', str(erro))
            if not diario.exists() and release_ativa() != candidato:
                shutil.rmtree(candidato)
            raise


def resultado(pedido, estado, mensagem=''):
    json_salvar(AUTO / 'resultado.json', {'sha': pedido['sha'], 'estado': estado,
                'horario': time.strftime('%Y-%m-%d %H:%M:%S %z'), 'mensagem': mensagem})


def vigente(repo, pedido):
    if ler(AUTO / 'pedido.json') != pedido:
        return False
    atual = git(repo, 'rev-parse', '--verify', 'refs/heads/' + pedido['branch'])
    return atual == pedido['sha'] or assinatura_app(repo, atual) == pedido['aplicacao']


def hook(repo):
    destino = Path(git(repo, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks/post-commit'))
    padrao = Path(git(repo, 'rev-parse', '--absolute-git-dir')) / 'hooks/post-commit'
    exigir(destino == padrao, 'Hooks personalizados em uso. A instalação preservou a configuração existente.')
    return destino


def instalar(repo):
    validar_ambiente(repo)
    conferir(release_ativa())
    destino = hook(repo)
    exigir(not destino.is_symlink() and (not destino.exists() or HOOK_MARKER in destino.read_text().splitlines()),
           'Já existe um post-commit de outro fluxo.')
    AUTO.mkdir(mode=0o700, exist_ok=True)
    node, npm = shutil.which('node'), shutil.which('npm')
    exigir(node and npm, 'Node e npm precisam estar disponíveis na instalação.')
    json_salvar(AUTO / 'config.json', {'repo': str(repo), 'node': node, 'npm': npm})
    gravar(AUTO / 'worker.py', Path(__file__).read_text())
    comando = shlex.join([sys.executable, str(AUTO / 'worker.py'), 'enqueue', '--repo', str(repo)])
    # Worktrees compartilham os hooks; o opt-in pertence somente à pasta selecionada.
    gravar(destino, '#!/bin/sh\n' + HOOK_MARKER + '\n[ "$PWD" = ' + shlex.quote(str(repo)) +
           ' ] || exit 0\nexec ' + comando + '\n')
    destino.chmod(0o700)
    print('Hook da demo instalado neste checkout. A próxima confirmação em uma sprint inicia o build.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('acao', choices=['install', 'uninstall', 'enqueue', 'worker', 'status'])
    parser.add_argument('--repo', type=Path, default=Path.cwd())
    args = parser.parse_args()
    repo = args.repo.resolve()
    os.umask(0o077)
    if args.acao == 'install':
        instalar(repo)
    elif args.acao == 'uninstall':
        dest = hook(repo)
        exigir(not dest.is_symlink() and dest.is_file() and HOOK_MARKER in dest.read_text().splitlines(),
               'Não há hook próprio para remover.')
        dest.unlink()
        print('Hook removido. A demo continua com a release selecionada.')
    elif args.acao == 'status':
        print('Release selecionada:', release_ativa().name)
        print('Pedido mais recente:', ler(AUTO / 'pedido.json'))
        print('Última execução:', ler(AUTO / 'resultado.json'))
        if (AUTO / 'recuperacao.json').exists():
            print('Há uma troca interrompida para recuperar.')
        print('Log privado:', AUTO / 'worker.log')
    elif args.acao == 'enqueue':
        enfileirar(repo)
    else:
        trabalhar(repo)


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, RuntimeError, sp.SubprocessError) as erro:
        sys.exit('Demo local: ' + str(erro))

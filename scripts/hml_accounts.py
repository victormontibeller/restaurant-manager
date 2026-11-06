#!/usr/bin/env python3
"""Massa fictícia de identidade por API real no candidato hml; não promove release.

Só cria contas novas via convite/cadastro e captura local. Intenções privadas são
persistidas antes da escrita. Falha parcial exige reconciliação, nunca retry cego.
"""
import argparse
import fcntl
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import ssl
import time
import urllib.error
import urllib.request
import uuid
from typing import Any, cast

from application_recovery import NoRedirect, private_file, require
from maintenance_database import Admin, DatabaseSwap
from release_support import durable_artifact, private_config, private_runtime_path, verify

PROFILES = ('GERENTE', 'ATENDIMENTO', 'CAIXA', 'COZINHA', 'EXPEDICAO')


def atomic_json(path, record):
    temporary = path.with_suffix('.new')
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'w') as stream:
        stream.write(json.dumps(record, indent=2) + '\n')
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)
    descriptor = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def validate_runtime(before, gate, environ):
    require(before['artifact_sha256'] == gate['artifact_sha256'], 'Hash servido divergente.')
    expected = {b'RM_DB_URL': b'jdbc:postgresql://127.0.0.1:55432/rm_hml',
                b'RM_DB_USER': b'rm_hml_app', b'RM_STAGE': b'hml'}
    require(all(environ.get(k) == v for k, v in expected.items()), 'Banco do runtime divergente.')


def validate_seed(data, gate):
    require(data.get('stage') == 'hml' and data.get('smoke_api_approved') is True,
            'Seed inicial de homologação não aprovado.')
    require(data.get('git_sha') == gate['git_sha'] and
            data.get('artifact_sha256') == gate['artifact_sha256'], 'Artefato da fixture divergente.')
    accounts = data['accounts']
    require(len(accounts) == 2 and {a['host'] for a in accounts} == {'hmla.localhost', 'hmlb.localhost'},
            'Exigir duas empresas fictícias explícitas.')
    require(len({a['empresa_id'] for a in accounts}) == 2, 'Empresas devem ser distintas.')
    for account in accounts:
        require(account['perfil'] == 'ADMINISTRADOR' and
                account['email'].endswith('@example.invalid'), 'Administrador fictício obrigatório.')
        for key in ('empresa_id', 'usuario_id', 'unit'):
            require(str(uuid.UUID(account[key])) == account[key], 'UUID não canônico.')
    primary = next(a for a in accounts if a['host'] == 'hmla.localhost')
    require(str(uuid.UUID(primary['second_unit'])) == primary['second_unit'] and
            primary['unit'] != primary['second_unit'], 'Duas filiais distintas obrigatórias.')
    return primary


class Client:
    def __init__(self, host, certificate):
        require(host in ('hmla.localhost', 'hmlb.localhost'), 'Host fora da massa fictícia.')
        self.host = host
        self.csrf = None
        self.http = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(),
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
            urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=str(certificate))))

    def request(self, path, body=None, token=None, method=None) -> tuple[int, Any]:
        require(path.startswith('/api/v1/') and '?' not in path and '#' not in path,
                'Rota de fixture inválida.')
        headers: dict[str, str] = {'Host': self.host}
        if self.csrf:
            headers[self.csrf['headerName']] = self.csrf['token']
        if token:
            headers['Authorization'] = 'Bearer ' + token
        if body is not None:
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request('https://127.0.0.1:8088' + path,
            data=None if body is None else json.dumps(body).encode(), headers=headers, method=method)
        try:
            response = self.http.open(req, timeout=30)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read()
            return cast(int, response.status), json.loads(raw) if raw else None

    def prepare(self):
        status, self.csrf = self.request('/api/v1/auth/csrf')
        require(status == 200, 'CSRF indisponível.')

    def login(self, account):
        self.prepare()
        status, result = self.request('/api/v1/auth/login',
                                      {k: account[k] for k in ('email', 'senha')})
        require(status == 200, 'Login fictício recusado.')
        return result['accessToken']


def capture_code(directory, account, subject, timeout=60):
    deadline = time.monotonic() + timeout
    while True:
        codes = set()
        for file in directory.glob('*.txt'):
            text = private_file(file).read_text()
            if (text.startswith('Para: ' + account['email'] + '\n') and
                    '\nAssunto: ' + subject + '\n' in text and
                    '\nEmpresa: ' + account['empresa_id'] + '\n' in text):
                codes.update(re.findall(r'^Código: ([A-Za-z0-9_-]{43})$', text, re.MULTILINE))
        require(len(codes) <= 1, 'Captura ambígua; reconciliar intenção sem reenvio.')
        if codes:
            return codes.pop()
        if time.monotonic() >= deadline:
            raise TimeoutError('Captura fictícia não entregue; preservar intenção.')
        time.sleep(1)


def plan(primary):
    accounts = []
    for profile in (*PROFILES, 'CLIENTE', 'CLIENTE'):
        identity = str(uuid.uuid4())
        accounts.append(dict(host=primary['host'], empresa_id=primary['empresa_id'],
            email=f'hml-{profile.lower()}-{identity}@example.invalid', senha=secrets.token_urlsafe(24),
            perfil=profile, intention=identity, status='planejado',
            allowed_unit=primary['unit'], forbidden_unit=primary['second_unit']))
    return accounts


def seed(root, repo, job, initial, output):
    require(not output.exists() and not output.is_symlink(), 'Saída existente exige reconciliação manual.')
    private_file(initial)
    require(output.is_absolute() and not output.resolve().is_relative_to(repo), 'Saída deve ser privada externa.')
    private_runtime_path(output.parent, directory=True)
    artifact, gate = durable_artifact(job, root, repo)
    values = private_config(root / 'hml-identity.env')
    data = json.loads(initial.read_text())
    primary = validate_seed(data, gate)
    with (root / 'e2e-worker.lock').open('a') as workflow, (root / 'deploy.lock').open('a') as lock:
        fcntl.flock(workflow, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        before = verify(root, gate['git_sha'])
        environ = dict(entry.split(b'=', 1) for entry in
                       Path(f'/proc/{before["pid"]}/environ').read_bytes().split(b'\0') if b'=' in entry)
        validate_runtime(before, gate, environ)
        candidate = json.loads((root / 'candidate.json').read_text())
        require(candidate['state'] == 'health-aprovado-e2e-pendente' and
                candidate['maintenance_attempt'] == data['maintenance_attempt'] and
                candidate['git_sha'] == gate['git_sha'], 'Candidato/fixture não correspondem.')
        attempt = Path(data['maintenance_attempt'])
        require(attempt.parent == root / 'maintenance-releases', 'Manutenção fora de hml.')
        private_runtime_path(attempt, directory=True)
        with output.with_suffix('.log').open('x') as log:
            admin = Admin(root, log)
            swap = DatabaseSwap.resume(admin, 'hml', attempt)
            require(swap.record['state'] == 'clone-pronto', 'Clone não pronto.')
            require(swap.confirm('rm_hml', swap.record['candidate_oid'])['allowed'] is True and
                    swap.confirm(swap.backup, swap.record['original_oid'])['allowed'] is False,
                    'OID candidato/original não preservado.')
        certificate = values['RM_TLS_TRUST_CERTIFICATE']
        manager = Client(primary['host'], certificate)
        token = manager.login(primary)
        status, me = manager.request('/api/v1/auth/me', token=token)
        require(status == 200 and me['usuarioId'] == primary['usuario_id'] and
                me['empresaId'] == primary['empresa_id'], 'Identidade administrativa divergente.')
        require(manager.request('/api/v1/auth/reautenticar', {'senha': primary['senha']}, token)[0] == 204,
                'Reautenticação recusada.')
        authenticated_at = time.monotonic()
        record = dict(stage='hml', git_sha=gate['git_sha'], artifact_sha256=gate['artifact_sha256'],
                      maintenance_attempt=str(attempt), approved=False, accounts=plan(primary))
        atomic_json(output, record)
        try:
            directory = Path(values['RM_EMAIL_CAPTURE_DIRECTORY']) / ('t_' + uuid.UUID(primary['empresa_id']).hex)
            for account in record['accounts']:
                account['status'] = 'solicitando'
                atomic_json(output, record)
                client = Client(account['host'], certificate)
                client.prepare()
                customer = account['perfil'] == 'CLIENTE'
                if customer:
                    require(client.request('/api/v1/auth/cadastro', {'email': account['email']})[0] == 202,
                            'Cadastro recusado.')
                else:
                    # Renovar antes da intenção seguinte, sem repetir mutação incerta
                    # nem consumir um login/reautenticação por convite.
                    if time.monotonic() - authenticated_at > 180:
                        status, refreshed = manager.request('/api/v1/auth/refresh', method='POST')
                        require(status == 200, 'Renovação recusada.')
                        token = refreshed['accessToken']
                        require(manager.request('/api/v1/auth/reautenticar', {'senha': primary['senha']}, token)[0] == 204,
                                'Reautenticação recusada.')
                        authenticated_at = time.monotonic()
                    status, invitation = manager.request('/api/v1/equipe/convites',
                        dict(id=account['intention'], email=account['email'], perfil=account['perfil'],
                             unidades=[primary['unit']]), token)
                    require(status == 200 and invitation['id'] == account['intention'], 'Convite recusado.')
                account['status'] = 'aguardando-captura'
                atomic_json(output, record)
                code = capture_code(directory, account, 'Criar conta de cliente' if customer else 'Convite de funcionário')
                path = '/api/v1/auth/cadastro/confirmar' if customer else '/api/v1/auth/convites/aceitar'
                account['status'] = 'confirmando'
                atomic_json(output, record)
                require(client.request(path, dict(codigo=code, senha=account['senha']))[0] == 204,
                        'Confirmação recusada; conferir conta antes de repetir.')
                access = client.login(account)
                status, me = client.request('/api/v1/auth/me', token=access)
                require(status == 200 and me['empresaId'] == account['empresa_id'] and
                        me['perfil'] == account['perfil'] and me['emailVerificado'] is True,
                        'Conta persistida não corresponde ao plano.')
                account['usuario_id'] = me['usuarioId']
                require(client.request('/api/v1/equipe', token=access)[0] == 403 and
                        client.request('/api/v1/configuracoes/acessos', token=access)[0] == 403,
                        'Conta ganhou administração indevida.')
                require(Client('hmlb.localhost', certificate).request('/api/v1/auth/me', token=access)[0] == 401,
                        'JWT atravessou empresa.')
                if not customer:
                    for unit, expected in ((primary['unit'], 200), (primary['second_unit'], 404)):
                        require(client.request('/api/v1/operacao/unidades/' + unit + '/eventos', token=access)[0] == expected,
                                'Isolamento entre filiais divergente.')
                require(client.request('/api/v1/auth/logout', method='POST')[0] == 204, 'Logout recusado.')
                require(client.request('/api/v1/auth/me', token=access)[0] == 401, 'Sessão não revogada.')
                account['status'] = 'verificado'
                atomic_json(output, record)
            require(verify(root, gate['git_sha']) == before, 'Runtime mudou durante massa.')
            record['approved'] = True
            record['scope'] = 'Sete contas via API/captura; não aprova UI, SaaS ou Sprint.'
        finally:
            atomic_json(output, record)
    return dict(approved=record['approved'], accounts=len(record['accounts']),
                profiles=list(PROFILES), customers=2, served_sha=gate['git_sha'])


if __name__ == '__main__':
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--job', type=Path, required=True)
    parser.add_argument('--initial', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
    try:
        print(json.dumps(seed(root, Path(__file__).resolve().parents[1], args.job, args.initial, args.output)))
    except Exception as error:
        print(json.dumps(dict(approved=False, error_type=type(error).__name__)))
        raise SystemExit(1)

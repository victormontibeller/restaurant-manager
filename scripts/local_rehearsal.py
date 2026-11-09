#!/usr/bin/env python3
"""Backup, carga e falha local em clone descartável; nunca migra a origem.

Requer PostgreSQL/Java já instalados, rm_test fictício e configuração privada.
Não instala ferramentas, não promove release e não substitui homologação Linux.
"""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import shlex
import shutil
import signal
import socket
import ssl
import struct
import subprocess
import threading
import time
import urllib.error
import urllib.request
import uuid
import zlib
from datetime import datetime, timezone

from database_recovery import (Session, inventory, identifier,
                               validate_snapshot, validate_source, validate_tenant_coverage, verify_inventory)
from release_support import atomic_json

REPO = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def private_file(path):
    path = Path(path)
    require(not path.is_symlink() and path.is_file() and path.stat().st_uid == os.getuid()
            and not path.stat().st_mode & 0o077 and not path.resolve().is_relative_to(REPO),
            'Configuração deve ser privada, externa ao checkout e do operador.')
    return path


def read_env(path):
    result = {}
    for raw in private_file(path).read_text().splitlines():
        if not raw.strip() or raw.lstrip().startswith('#'):
            continue
        key, separator, value = raw.removeprefix('export ').partition('=')
        require(separator and re.fullmatch('[A-Z][A-Z0-9_]*', key) and key not in result, 'Configuração inválida.')
        parsed = shlex.split(value)
        require(len(parsed) == 1, 'Configuração inválida.')
        result[key] = parsed[0]
    validate_source(result)
    return result


def validate_profile(profile):
    require(set(profile) == {'duration_seconds', 'concurrency', 'pause_seconds', 'operations', 'scope'},
            'Perfil de carga incompleto.')
    require(type(profile['duration_seconds']) is int and 1 <= profile['duration_seconds'] <= 120
            and type(profile['concurrency']) is int and 1 <= profile['concurrency'] <= 8
            and 0.05 <= profile['pause_seconds'] <= 5
            and profile['operations'] and set(profile['operations']) <= {'catalogo', 'carrinho'},
            'Carga excede os limites do ensaio local.')


def validate_source_manifest(manifest, repo=REPO):
    paths = {p.relative_to(repo).as_posix()
             for directory in ('backend/src/main', 'frontend/src', 'frontend/public')
             for p in (repo / directory).rglob('*') if p.is_file()}
    paths.update(('backend/pom.xml', 'frontend/package.json', 'frontend/package-lock.json',
                  'frontend/angular.json', 'frontend/.postcssrc.json', 'frontend/tsconfig.json',
                  'frontend/tsconfig.app.json', 'frontend/tsconfig.e2e.json', 'scripts/build-pwa.cjs'))
    require(isinstance(manifest, dict) and set(manifest) == paths
            and all((repo / name).is_file() and manifest[name] == digest(repo / name) for name in paths),
            'Manifesto não corresponde ao conjunto completo das fontes e configurações do build.')
    return len(paths)


def partitioned_inventory(session, schemas, require_complete=True):
    """Mesmo snapshot; metadados limitados a um schema por mensagem/lock."""
    if require_complete:
        validate_tenant_coverage(session, schemas)
    result = dict(tables={}, metadata={}, tenants=0, tenants_with_identity=0)
    for schema in schemas:
        session.query('savepoint inventory_schema')
        try:
            part = inventory(session, schema=schema, release_table_locks=True)
        finally:
            session.query('rollback to savepoint inventory_schema')
            session.query('release savepoint inventory_schema')
        result['tables'].update(part['tables'])
        for key, values in part['metadata'].items():
            result['metadata'].setdefault(key, []).extend(values or [])
        for key in ('tenants', 'tenants_with_identity'):
            result[key] += part[key]
    for values in result['metadata'].values():
        values.sort(key=lambda row: row['name'])
    return result


def verify_local_listener(pid):
    result = subprocess.run(['lsof','-nP','-a','-p',str(pid),'-iTCP:8090','-sTCP:LISTEN','-Fpn'],
                            capture_output=True, text=True, timeout=5)
    fields = {line for line in result.stdout.splitlines() if line.startswith(('p','n'))}
    require(result.returncode == 0 and fields == {f'p{pid}', 'n127.0.0.1:8090'},
            'Listener HTTPS não pertence ao processo próprio em loopback.')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


class Client:
    def __init__(self, host, certificate):
        self.host = host
        self.opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({}), NoRedirect(),
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
            urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=str(certificate))))
        self.csrf = None

    def request(self, path, body=None, token=None, method=None):
        headers = {'Host': self.host, 'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        if self.csrf:
            headers[self.csrf['headerName']] = self.csrf['token']
        request = urllib.request.Request('https://127.0.0.1:8090' + path,
            data=json.dumps(body).encode() if body is not None else None, headers=headers, method=method)
        try:
            response = self.opener.open(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read()
            require(response.status in (200, 201, 204), 'HTTP inesperado: ' + str(response.status))
            return json.loads(raw) if raw else None

    def login(self, account):
        self.csrf = self.request('/api/v1/auth/csrf')
        return self.request('/api/v1/auth/login', {k: account[k] for k in ('email', 'senha')})['accessToken']


class Rehearsal:
    def __init__(self, args):
        self.args = args
        self.root = args.output.resolve()
        # pg_ctl repassa -o por shell e PostgreSQL interpreta uma lista de sockets.
        # Recusar espaços/metacaracteres antes de criar qualquer arquivo do ensaio.
        require(re.fullmatch(r'/[A-Za-z0-9_./-]+', str(self.root)),
                'Diretório de saída aceita somente letras ASCII, números, /, _, ponto e hífen.')
        require(not self.root.exists() and not self.root.is_relative_to(REPO)
                and len(str(self.root / 'socket')) < 90, 'Use diretório novo, externo e de caminho curto.')
        self.root.mkdir(mode=0o700)
        self.pg = args.pg_bin.resolve()
        self.java = args.java_home.resolve() / 'bin'
        self.cluster = self.root / 'cluster'
        self.socket = self.root / 'socket'
        self.socket.mkdir(mode=0o700)
        self.process = None
        self.active = False
        self.session = None
        self.log = (self.root / 'execution.log').open('xb')
        self.env = dict(PATH=os.environ.get('PATH', '/usr/bin:/bin'), HOME=str(Path.home()),
                        LC_ALL='C', PGCONNECT_TIMEOUT='5',
                        PGOPTIONS='-c statement_timeout=120000 -c timezone=UTC -c datestyle=ISO,YMD')
        self.record = dict(approved=False, scope='mac-local', linux_homologation=False,
                           source_mutated=False, external_services=False,
                           free_disk_before_bytes=shutil.disk_usage(self.root).free,
                           started_at=datetime.now(timezone.utc).isoformat())

    def run_command(self, command, env=None, input=None, timeout=300):
        result = subprocess.run([str(c) for c in command], env=env or self.env, input=input,
            text=True, stdout=self.log, stderr=self.log, timeout=timeout)
        require(result.returncode == 0, 'Comando falhou; consultar log privado: ' + Path(command[0]).name)

    def sql(self, query):
        require(self.session is not None, 'Sessão do clone ausente.')
        return self.session.query(query)

    def prepare(self):
        a = self.args
        validate_profile(json.loads(a.profile.read_text()))
        source = read_env(a.source_env)
        self.fixture = json.loads(private_file(a.fixture).read_text())
        f = self.fixture
        require(re.fullmatch('[a-z0-9-]+[.]localhost', f['host'])
                and f['email'].endswith('@example.invalid')
                and f['contas']['clienteA']['email'].endswith('@example.invalid'), 'Exigir massa fictícia local.')
        self.schema = 't_' + uuid.UUID(f['empresa']).hex
        require(f['schema'] == self.schema, 'Schema da massa divergente.')
        uuid.UUID(f['unidadeA'])
        require(digest(a.jar) == a.jar_sha256, 'Hash do JAR divergente.')
        manifest = json.loads(a.source_manifest.read_text())
        source_files_checked = validate_source_manifest(manifest)
        self.record.update(git_head=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(),
                           artifact_sha256=a.jar_sha256, source_manifest_sha256=digest(a.source_manifest),
                           profile_sha256=digest(a.profile), source_files_checked=source_files_checked,
                           postgres_version=subprocess.check_output([str(self.pg / 'postgres'), '--version'], text=True).strip())
        self.record['harness_sha256'] = {name:digest(REPO/'scripts'/name)
            for name in ('local_rehearsal.py','database_recovery.py','release_support.py')}
        for port in (55433, 8090):
            with socket.socket() as probe:
                probe.bind(('127.0.0.1', port))
        command = [str(self.pg / 'psql'), '-XqAt', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1',
                   '-p', '55432', '-U', 'rm_test_owner', '-d', 'rm_test']
        source_env = dict(self.env, PGPASSWORD=source['RM_MIGRATION_PASSWORD'])
        started = time.monotonic()
        session = Session(command, source_env, self.log)
        try:
            require(session.query('select current_database(),current_user,inet_server_port(),host(inet_server_addr())')
                    == ['rm_test|rm_test_owner|55432|127.0.0.1'], 'Origem efetiva recusada.')
            session.query('begin isolation level repeatable read read only')
            snapshot = validate_snapshot(session.query('select pg_export_snapshot()')[0])
            self.record['snapshot_at'] = session.query('select transaction_timestamp()')[0]
            schemas = session.query("select nspname from pg_namespace where nspname='public' or nspname like 't\\_%' escape '\\' order by nspname")
            require(session.query("select nspname from pg_namespace where nspname not like 'pg\\_%' escape '\\' and nspname not like 't\\_%' escape '\\' and nspname not in ('public','information_schema')") == [], 'Schema fora das convenções; revisar cobertura do backup.')
            before = partitioned_inventory(session, schemas)
            atomic_json(self.root / 'source-inventory.json', before)
            self.archives = []
            # Todos os arquivos usam o mesmo snapshot; lotes limitam locks na origem.
            for index in range(0, len(schemas), 10):
                archive = self.root / ('database-' + str(index // 10) + '.dump')
                selected = [arg for schema in schemas[index:index+10] for arg in ('-n', schema)]
                self.run_command([self.pg / 'pg_dump', '-h', '127.0.0.1', '-p', '55432', '-U', 'rm_test_owner',
                    '-d', 'rm_test', '-Fc', '--snapshot=' + snapshot, *selected, '-f', archive], env=source_env)
                self.archives.append(archive)
        finally:
            session.close()
        self.record.update(backup_seconds=round(time.monotonic() - started, 3),
                           archive_bytes=sum(p.stat().st_size for p in self.archives),
                           archives_sha256={p.name: digest(p) for p in self.archives})
        self.run_command([self.pg / 'initdb', '-D', self.cluster, '--encoding=UTF8', '--locale=C',
                          '--auth-local=trust', '--auth-host=scram-sha-256'])
        # Socket trust restrito ao diretório 0700; TCP só runtime do clone, com senha nova.
        (self.cluster / 'pg_hba.conf').write_text('local all all trust\n'
            'host rm_test rm_test_app 127.0.0.1/32 scram-sha-256\n'
            'host all all 0.0.0.0/0 reject\nhost all all ::/0 reject\n')
        options = "-c listen_addresses=127.0.0.1 -p 55433 -c unix_socket_directories=" + str(self.socket)
        options += ' -c shared_buffers=32MB -c max_connections=12 -c max_locks_per_transaction=4096 -c jit=off'
        self.active = True
        self.run_command([self.pg / 'pg_ctl', '-D', self.cluster, '-l', self.root / 'postgres.log',
                          '-o', options, '-w', '-t', '30', 'start'])
        self.target = [str(self.pg / 'psql'), '-XqAt', '-v', 'ON_ERROR_STOP=1', '-h', str(self.socket),
                       '-p', '55433', '-d', 'postgres']
        self.session = Session(self.target, self.env, self.log)
        require(self.sql("select current_database(),current_setting('data_directory'),inet_server_addr() is null")
                == ['postgres|' + str(self.cluster) + '|t'], 'Clone efetivo recusado.')
        self.sql('create role rm_test_owner nologin; create role rm_test_app nologin')
        self.sql('create database rm_test owner rm_test_owner')
        self.sql('revoke all on database rm_test from public')
        self.session.close()
        self.session = Session(self.target[:-1] + ['rm_test'], self.env, self.log)
        require(self.sql("select current_database(),current_setting('data_directory')")
                == ['rm_test|' + str(self.cluster)], 'Destino vazio recusado.')
        require(self.sql("select count(*) from pg_class where relnamespace='public'::regnamespace") == ['0'],
                'Schema public do clone precisa estar vazio.')
        # Preserva o public padrão do template (owner/USAGE). O pg_dump seletivo
        # inclui CREATE SCHEMA public, mas pode omitir sua ACL padrão.
        self.session.close()
        self.session = None
        started = time.monotonic()
        for archive in self.archives:
            listing = subprocess.check_output([str(self.pg/'pg_restore'), '-l', str(archive)], env=self.env, text=True)
            restore_list = self.root/(archive.stem+'.list')
            restore_list.write_text('\n'.join(line for line in listing.splitlines()
                if not re.search(r'\bSCHEMA - public \S+$', line))+'\n')
            self.run_command([self.pg / 'pg_restore', '-h', self.socket, '-p', '55433', '-d', 'rm_test',
                              '--exit-on-error', '--single-transaction', '-L', restore_list, archive])
        self.session = Session(self.target[:-1] + ['rm_test'], self.env, self.log)
        self.sql('begin isolation level repeatable read read only')
        after = partitioned_inventory(self.session, schemas)
        atomic_json(self.root / 'restored-inventory.json', after)
        verify_inventory(before, after)
        self.sql('commit')
        self.record.update(restore_verify_seconds=round(time.monotonic() - started, 3),
                           tables=len(after['tables']), tenants=after['tenants'],
                           rows=sum(t['rows'] for t in after['tables'].values()))
        after = self.media_roundtrip(after, schemas)
        media = []
        for table in after['tables']:
            if not table.endswith('.midia'):
                continue
            schema = table.split('.')[0]
            counts = self.sql(f"select count(*),count(*) filter(where sha256<>encode(sha256(conteudo),'hex') or tamanho<>octet_length(conteudo)) from {schema}.midia")[0].split('|')
            require(counts[1] == '0', 'Mídia restaurada corrompida.')
            require(self.sql(f'select count(*) from {schema}.produto p left join {schema}.midia m on m.id=p.midia_id where p.midia_id is not null and m.id is null') == ['0'], 'Referência de mídia órfã.')
            if int(counts[0]):
                media.append((schema, int(counts[0])))
        require(len(media) >= 2, 'Exigir mídia fictícia em duas empresas.')
        self.record['media'] = dict(tenants=len(media), images=sum(n for _, n in media), invalid_hashes=0, orphan_references=0)
        self.password = secrets.token_hex(32)
        self.sql("alter role rm_test_app login password '" + self.password + "'; grant connect on database rm_test to rm_test_app")
        self.bundle = self.root / 'configuration'
        self.bundle.mkdir(mode=0o700)
        private = dict(jwt=secrets.token_urlsafe(72), email=base64.b64encode(secrets.token_bytes(32)).decode(),
                       tls_password=secrets.token_hex(24), password=self.password)
        atomic_json(self.bundle / 'runtime.json', private)
        self.run_command([self.java / 'keytool', '-genkeypair', '-alias', 'local', '-keyalg', 'RSA',
            '-keystore', self.bundle / 'localhost.p12', '-storetype', 'PKCS12', '-storepass:env', 'RM_KEYSTORE_PASSWORD',
            '-dname', 'CN=127.0.0.1', '-ext', 'SAN=ip:127.0.0.1,dns:localhost', '-validity', '3'],
            env=dict(self.env, RM_KEYSTORE_PASSWORD=private['tls_password']))
        self.run_command([self.java / 'keytool', '-exportcert', '-rfc', '-alias', 'local',
            '-keystore', self.bundle / 'localhost.p12', '-storepass:env', 'RM_KEYSTORE_PASSWORD',
            '-file', self.bundle / 'certificate.pem'], env=dict(self.env, RM_KEYSTORE_PASSWORD=private['tls_password']))
        config_hashes = {p.name: digest(p) for p in self.bundle.iterdir()}
        backup_config = self.root / 'configuration-backup'
        shutil.copytree(self.bundle, backup_config)
        for path in self.bundle.iterdir():
            path.unlink()
        self.bundle.rmdir()
        shutil.copytree(backup_config, self.bundle)
        require(config_hashes == {p.name: digest(p) for p in self.bundle.iterdir()}, 'Configuração recuperada divergiu.')
        self.config_hashes = config_hashes
        self.record['configuration_restored'] = True
        shutil.copyfile(a.jar, self.root / 'app.jar')
        (self.root / 'capture').mkdir(mode=0o700)
        (self.root / 'runtime').mkdir(mode=0o700)

    def media_roundtrip(self, baseline, schemas):
        """Massa adicional apenas no clone; restaura schemas com escritores parados."""
        selected = []
        for schema in schemas:
            if schema == 'public' or not baseline['tables'].get(schema+'.produto', {}).get('rows'):
                continue
            rows = self.sql(f"select p.id,u.id from {schema}.produto p cross join {schema}.usuario u where u.perfil='ADMINISTRADOR' and u.email like '%@example.invalid' and exists(select 1 from public.empresa e join public.dominio d on d.empresa_id=e.id where e.schema_name='{schema}' and e.estado='ATIVO') order by p.id,u.id limit 1")
            if rows:
                product, author = rows[0].split('|')
                uuid.UUID(product); uuid.UUID(author)
                selected.append((schema, product, author))
            if len(selected) == 2:
                break
        require(len(selected) == 2, 'Exigir duas empresas fictícias com catálogo para a massa de mídia.')
        # PNG RGB de um pixel, sem metadados; bytes fictícios gerados para o ensaio.
        def chunk(kind, value):
            return struct.pack('!I',len(value))+kind+value+struct.pack('!I',zlib.crc32(kind+value))
        png = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!IIBBBBB',1,1,8,2,0,0,0))
        png += chunk(b'IDAT',zlib.compress(b'\x00\x12\x34\x56'))+chunk(b'IEND',b'')
        checksum = hashlib.sha256(png).hexdigest()
        for schema, product, author in selected:
            media_id = str(uuid.uuid4())
            self.sql(f"begin; insert into {schema}.midia(id,autor_id,tipo,largura,altura,tamanho,sha256,conteudo) values('{media_id}','{author}','image/png',1,1,{len(png)},'{checksum}',decode('{png.hex()}','hex')); update {schema}.produto set midia_id='{media_id}' where id='{product}'; update {schema}.controle_midia set quantidade=(select count(*) from {schema}.midia),bytes=(select sum(tamanho) from {schema}.midia); commit")
        names = [s for s,_,_ in selected]
        self.sql('begin isolation level repeatable read read only')
        snapshot = validate_snapshot(self.sql('select pg_export_snapshot()')[0])
        before = partitioned_inventory(self.session, names, require_complete=False)
        atomic_json(self.root/'media-inventory.json', before)
        archive = self.root/'media-fixture.dump'
        self.run_command([self.pg/'pg_dump', '-h', self.socket, '-p', '55433', '-d', 'rm_test', '-Fc',
            '--snapshot='+snapshot, *[a for schema in names for a in ('-n',schema)], '-f', archive])
        self.sql('commit')
        require(self.sql("select current_database(),current_setting('data_directory')")
                == ['rm_test|'+str(self.cluster)], 'Alvo de restauração da mídia recusado.')
        require(self.process is None, 'Escritor da aplicação precisa estar parado.')
        started = time.monotonic()
        self.sql('begin; '+ '; '.join('drop schema '+identifier(schema)+' cascade' for schema in names)+'; commit')
        self.run_command([self.pg/'pg_restore', '-h',self.socket, '-p','55433', '-d','rm_test',
                          '--exit-on-error', '--single-transaction',archive])
        self.sql('begin isolation level repeatable read read only')
        after = partitioned_inventory(self.session, schemas)
        self.sql('commit')
        # Nada fora dos dois schemas pode mudar como efeito da recuperação.
        expected = dict(baseline, tables=dict(baseline['tables']), metadata={})
        expected['tables'].update(before['tables'])
        for key, values in baseline['metadata'].items():
            expected['metadata'][key] = sorted([row for row in values if row['name'].split('.')[0] not in names]
                + before['metadata'][key], key=lambda row:row['name'])
        verify_inventory(expected, after)
        atomic_json(self.root/'media-restored-inventory.json', after)
        self.record['media_roundtrip'] = dict(fixture_images=2, source='massa acrescentada somente ao clone',
            writers_stopped=True, schema_restore_seconds=round(time.monotonic()-started,3),
            archive_sha256=digest(archive), other_schemas_unchanged=True)
        return after

    def start_app(self, jobs=False):
        require(self.process is None and digest(self.root / 'app.jar') == self.args.jar_sha256, 'Artefato divergente.')
        with socket.socket() as probe:
            probe.bind(('127.0.0.1',8090))
        require(self.config_hashes == {p.name: digest(p) for p in self.bundle.iterdir()}, 'Configuração adulterada.')
        p = json.loads((self.bundle / 'runtime.json').read_text())
        env = dict(PATH=self.env['PATH'], HOME=self.env['HOME'], RM_STAGE='test', RM_PORT='8090',
            RM_DB_URL='jdbc:postgresql://127.0.0.1:55433/rm_test', RM_DB_USER='rm_test_app', RM_DB_PASSWORD=p['password'],
            RM_JWT_SECRET=p['jwt'], RM_JWT_KEY_ID='local', RM_EMAIL_SECRET=p['email'],
            RM_EMAIL_CAPTURE_DIRECTORY=str(self.root / 'capture'), RM_RELEASE_SHA=self.record['git_head'],
            SERVER_SSL_KEY_STORE=str(self.bundle / 'localhost.p12'), SERVER_SSL_KEY_STORE_TYPE='PKCS12',
            SERVER_SSL_KEY_STORE_PASSWORD=p['tls_password'])
        self.process = subprocess.Popen([str(self.java / 'java'), '-Xmx384m', '-XX:ActiveProcessorCount=2',
            '-jar', str(self.root / 'app.jar'), '--rm.recovery-test=true', '--rm.auth.retencao-agendada=false',
            '--rm.email.agendado=false', '--rm.pagamentos.agendado=false', '--rm.comunicacoes.agendado=false',
            '--rm.pedidos.agendado=' + str(jobs).lower()], cwd=self.root/'runtime', env=env, stdout=self.log, stderr=self.log)
        atomic_json(self.root / 'runtime.json', dict(pid=self.process.pid, artifact_sha256=self.args.jar_sha256))
        client = Client(self.fixture['host'], self.bundle / 'certificate.pem')
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            require(self.process.poll() is None, 'Aplicação encerrou no startup.')
            try:
                require(client.request('/actuator/health')['status'] == 'UP', 'Health indisponível.')
                verify_local_listener(self.process.pid)
                self.record.setdefault('runtime_pids', []).append(self.process.pid)
                return client
            except (OSError, ValueError):
                time.sleep(0.5)
        raise TimeoutError('Startup excedeu 90 segundos.')

    def verify_media_http(self):
        samples = []
        schemas = self.sql("select schema_name from public.empresa where estado='ATIVO' order by schema_name")
        for schema in schemas:
            identifier(schema)
            found = self.sql(f"select d.host,m.id,m.sha256 from public.dominio d join public.empresa e on e.id=d.empresa_id cross join {schema}.midia m where e.schema_name='{schema}' order by d.host,m.id limit 1")
            if found:
                samples.append(found[0].split('|'))
            if len(samples) == 2:
                break
        require(len(samples) == 2, 'Mídia HTTP exige duas empresas restauradas.')
        for index, (host, media_id, expected) in enumerate(samples):
            require(re.fullmatch('[a-z0-9.-]+[.]localhost', host), 'Domínio de mídia deve ser local.')
            client = Client(host, self.bundle/'certificate.pem')
            request = urllib.request.Request('https://127.0.0.1:8090/api/v1/midias/'+media_id, headers={'Host':host})
            with client.opener.open(request, timeout=15) as response:
                require(response.status == 200 and hashlib.sha256(response.read()).hexdigest() == expected,
                        'Bytes HTTP restaurados divergentes.')
            request = urllib.request.Request('https://127.0.0.1:8090/api/v1/midias/'+samples[1-index][1], headers={'Host':host})
            try:
                client.opener.open(request, timeout=15).close()
            except urllib.error.HTTPError as error:
                require(error.code == 404, 'Negativo de mídia retornou status inesperado.')
            else:
                raise ValueError('Mídia de outra empresa acessível.')
        self.record['media_http'] = dict(positive_bytes_verified=2, cross_tenant_denied=2)

    def load(self, client):
        f = self.fixture
        admin = client.login(f)
        # Produto próprio do clone, sem alterar catálogo/banco originais.
        category, product = str(uuid.uuid4()), str(uuid.uuid4())
        client.request('/api/v1/gestao/catalogo/categorias', dict(id=category, nome='Ensaio local Sprint 5', ativa=True, versao=0), admin)
        client.request('/api/v1/gestao/catalogo/produtos', dict(id=product, nome='Produto fictício Sprint 5', versao=0,
            descricao='Ensaio isolado', categoriaId=category, tipo='SIMPLES', ativo=True, sugerido=False, midiaId=None,
            adicionais=[], grupos=[]), admin)
        data = dict(versao=0, preco='20.00', disponivel=True, canais=['RETIRADA'])
        client.request(f"/api/v1/gestao/catalogo/produtos/{product}/unidades/{f['unidadeA']}", data, admin, method='PUT')
        self.lines = [dict(id=str(uuid.uuid4()), produtoId=product, quantidade=1, adicionais=[], escolhas=[])]
        self.cart = dict(unidadeId=f['unidadeA'], canal='RETIRADA', linhas=self.lines)
        catalog_path = '/api/v1/catalogo?unidadeId=' + f['unidadeA'] + '&canal=RETIRADA'
        require(client.request(catalog_path)['aberto'], 'Unidade fictícia precisa estar aberta para o ensaio.')
        self.profile = json.loads(self.args.profile.read_text())
        validate_profile(self.profile)
        profile = self.profile
        started = time.monotonic()
        end = started + profile['duration_seconds']
        latencies, errors, samples = [], [], []
        guard = threading.Lock()

        def worker(index):
            local = Client(f['host'], self.bundle / 'certificate.pem')
            while time.monotonic() < end:
                op = profile['operations'][index % len(profile['operations'])]
                before = time.monotonic()
                try:
                    result = local.request(catalog_path) if op == 'catalogo' else local.request('/api/v1/carrinho/calcular', self.cart)
                    require('itens' in result if op == 'catalogo' else result['total'] == '20.00', 'Resposta de carga divergente.')
                    with guard:
                        latencies.append((time.monotonic() - before) * 1000)
                except Exception as error:
                    with guard:
                        errors.append(type(error).__name__)
                index += 1
                time.sleep(profile['pause_seconds'])

        before_stats = self.sql('select xact_commit,xact_rollback,blks_read,blks_hit from pg_stat_database where datname=current_database()')
        with ThreadPoolExecutor(max_workers=profile['concurrency']) as pool:
            futures = [pool.submit(worker, i) for i in range(profile['concurrency'])]
            while time.monotonic() < end:
                raw = subprocess.check_output(['ps', '-axo', 'pid=,ppid=,%cpu=,rss='], text=True)
                rows = [line.split() for line in raw.splitlines()]
                postgres = int((self.cluster / 'postmaster.pid').read_text().splitlines()[0])
                app = self.process.pid
                selected = [row for row in rows if int(row[0]) in (postgres, app) or int(row[1]) == postgres]
                counts = self.sql("select count(*),count(*) filter(where state='active') from pg_stat_activity where usename='rm_test_app'")[0]
                samples.append(dict(seconds=round(time.monotonic()-started, 3),
                    cpu_percent=sum(float(row[2]) for row in selected), rss_kib=sum(int(row[3]) for row in selected),
                    runtime_connections=counts))
                time.sleep(1)
            for future in futures:
                future.result()
        elapsed = time.monotonic() - started
        latencies.sort()
        require(latencies, 'Carga não executou requisições.')
        result = dict(requests=len(latencies), errors=errors, elapsed_seconds=round(elapsed, 3),
            requests_per_second=round(len(latencies)/elapsed, 2),
            latency_ms={name:round(latencies[min(len(latencies)-1, int(len(latencies)*q))], 3)
                        for name,q in [('p50',.5),('p95',.95),('p99',.99)]},
            peak_cpu_percent=max(s['cpu_percent'] for s in samples), peak_rss_kib=max(s['rss_kib'] for s in samples),
            pg_stats_before=before_stats,
            pg_stats_after=self.sql('select xact_commit,xact_rollback,blks_read,blks_hit from pg_stat_database where datname=current_database()'),
            database_bytes=int(self.sql('select pg_database_size(current_database())')[0]),
            free_disk_bytes=shutil.disk_usage(self.root).free, samples=samples, profile=profile,
            pool_measurement='conexões runtime observadas no PostgreSQL; não é telemetria interna Hikari')
        atomic_json(self.root / 'load.json', result)
        self.record['load'] = {k:v for k,v in result.items() if k not in ('samples', 'pg_stats_before', 'pg_stats_after')}
        require(not errors, 'Carga teve erros; não aprovar.')

    def recovery(self, client):
        f, schema = self.fixture, self.schema
        token = client.login(f['contas']['clienteA'])
        # Configuração de prazo só no clone; constraints continuam ativas.
        self.sql(f"insert into {schema}.prazo_aceite_unidade(unidade_id,alerta_segundos,expiracao_segundos) values ('{f['unidadeA']}',2,4) on conflict(unidade_id) do update set alerta_segundos=2,expiracao_segundos=4")
        cart = client.request('/api/v1/carrinho/calcular', self.cart)
        body = dict(intencaoId=str(uuid.uuid4()), unidadeId=f['unidadeA'], canal='RETIRADA', comandaId=None,
            revisao=cart['revisao'], linhas=self.lines, observacao='Falha fictícia Sprint 5', endereco=None,
            revisaoDelivery=None, pagamento='PRESENCIAL')
        order = client.request('/api/v1/pedidos', body, token)
        uuid.UUID(order['id'])
        require(order['estado'] == 'AGUARDANDO_ACEITE', 'Pedido do ensaio não aguarda aceite.')
        old_pid = self.process.pid
        self.process.kill()  # Somente Popen próprio; simula perda da resposta após commit.
        self.process.wait(timeout=10)
        self.process = None
        failed = False
        try:
            client.request('/actuator/health')
        except OSError:
            failed = True
        require(failed, 'Indisponibilidade da API não demonstrada.')
        # Prova de rollback transacional de uma conexão interrompida, apenas no clone.
        self.sql('create table public.ensaio_falha_local(id integer primary key)')
        interrupted = Session(self.target[:-1]+['rm_test'], self.env, self.log)
        try:
            interrupted.query('begin; insert into public.ensaio_falha_local values(1)')
            interrupted.process.kill()
            interrupted.process.wait(timeout=10)
        finally:
            interrupted.close()
        require(self.sql('select count(*) from public.ensaio_falha_local') == ['0'], 'Transação interrompida não foi revertida.')
        started = time.monotonic()
        client = self.start_app(jobs=True)
        token = client.login(f['contas']['clienteA'])
        replay = client.request('/api/v1/pedidos', body, token)
        require(replay['id'] == order['id'], 'Reenvio duplicou pedido.')
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            if self.sql(f"select estado from {schema}.pedido where id='{order['id']}'") == ['CANCELADO']:
                break
            time.sleep(0.5)
        else:
            raise TimeoutError('Job não retomou o pedido expirado.')
        count = self.sql(f"select count(*) from {schema}.pedido where id='{order['id']}'")
        require(count == ['1'], 'Pedido duplicado no banco.')
        require(self.sql(f"select count(*) from {schema}.recebimento where checkout_id='{order['id']}'") == ['0'], 'Pedido presencial gerou recebimento indevido.')
        history = self.sql(f"select tipo,count(*) from {schema}.pedido_historico where pedido_id='{order['id']}' group by tipo order by tipo")
        require(all(line.rsplit('|',1)[1]=='1' for line in history), 'Histórico de retomada duplicado.')
        lag = self.sql(f"select greatest(0,extract(epoch from (h.ocorrido_em-p.expirar_em))) from {schema}.pedido p join {schema}.pedido_historico h on h.pedido_id=p.id where p.id='{order['id']}' and h.tipo='PEDIDO_EXPIRADO'")
        require(len(lag) == 1, 'Atraso do job não foi medido.')
        self.record['recovery'] = dict(api_failure_observed=True, before_pid=old_pid, after_pid=self.process.pid,
            restart_and_job_seconds=round(time.monotonic()-started,3), order_count=1, state='CANCELADO',
            receipts=0, transactional_disconnect_rollback=True, history=history, job_delay_seconds=lag,
            lost_response='resposta recebida pelo harness e descartada antes do reenvio; sem falha de transporte injetada')

    def close(self):
        errors = []
        for action in (self.stop_app, self.close_session, self.stop_cluster):
            try:
                action()
            except Exception as error:
                errors.append(type(error).__name__)
        self.record['cleanup_errors'] = errors
        if errors:
            self.record['approved'] = False
        self.record['finished_at'] = datetime.now(timezone.utc).isoformat()
        atomic_json(self.root / 'result.json', self.record)
        self.log.close()

    def stop_app(self):
        if self.process is not None and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=10)
        self.process = None

    def close_session(self):
        if self.session:
            self.session.close()
            self.session = None

    def stop_cluster(self):
        if self.active:
            self.run_command([self.pg/'pg_ctl', '-D', self.cluster, '-m', 'fast', '-w', '-t', '30', 'stop'])
            self.active = False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('source-env', 'fixture', 'jar', 'source-manifest', 'pg-bin', 'java-home', 'output'):
        parser.add_argument('--'+name, type=Path, required=True)
    parser.add_argument('--jar-sha256', required=True)
    parser.add_argument('--profile', type=Path, default=REPO/'scripts/profiles/sprint05-local.json')
    args = parser.parse_args()
    os.umask(0o077)
    exercise = Rehearsal(args)
    def interrupted(signum, frame):
        raise InterruptedError('Ensaio interrompido; recolhendo processos próprios.')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        exercise.prepare()
        client = exercise.start_app()
        exercise.record['snapshot_to_app_ready_seconds'] = round(time.time() -
            datetime.fromisoformat(exercise.record['snapshot_at']).timestamp(), 3)
        exercise.verify_media_http()
        exercise.load(client)
        exercise.recovery(client)
        exercise.record['approved'] = True
    except Exception as error:
        exercise.record['error_type'] = type(error).__name__
        exercise.record['error'] = str(error) if isinstance(error, (ValueError, TimeoutError)) else 'Consultar log privado.'
    finally:
        exercise.close()
    print(json.dumps(exercise.record, ensure_ascii=False))
    return 0 if exercise.record['approved'] else 1


if __name__ == '__main__':
    raise SystemExit(main())

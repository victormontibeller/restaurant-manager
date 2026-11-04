"""Executa um lote da fila SaaS por CLI real, sem DDL/credencial owner no HTTP.

Invocar por with-env.sh dev|test. Homologação permanece recusada até o gate
operacional. Um timer chama este processo finito; PostgreSQL mantém a fila.
"""
import argparse
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import uuid
import zipfile
import zlib

from release_support import atomic_json, clean_sha


def now():
    return datetime.now(timezone.utc).isoformat()


def validate_limit(limit):
    if type(limit) is not int or not 1 <= limit <= 10:
        raise ValueError('Lote deve conter de uma a dez solicitações.')


def process_batch(queue, limit, on_result=lambda result: None, on_start=lambda identity: None):
    validate_limit(limit)
    results = []
    for identity in queue.pending(limit):
        on_start(identity)
        code = queue.execute(identity)
        state = queue.state(identity)
        result = dict(id=identity, exit_code=code, state=state,
                      approved=code == 0 and state == 'CONCLUIDO')
        results.append(result)
        on_result(result)
        # Lock ocupado, timeout ou interrupção: não avançar cegamente no lote.
        # A intenção permanece no banco, mas o runner exige diagnóstico para retomá-la.
        if state == 'SOLICITADO':
            break
    return results


def validate_environment(env):
    stage = env.get('RM_STAGE')
    if (stage not in ('dev', 'test')
            or env.get('RM_DB_URL') != f'jdbc:postgresql://127.0.0.1:55432/rm_{stage}'
            or env.get('RM_DB_USER') != f'rm_{stage}_app'
            or env.get('RM_MIGRATION_USER') != f'rm_{stage}_owner'):
        raise ValueError('Destino da fila recusado.')
    return stage


def validate_artifact(job, root):
    job = job.resolve()
    if not job.is_relative_to(root.resolve() / 'builds'):
        raise ValueError('Job privado de build obrigatório.')
    gate = json.loads((job / 'gate.json').read_text())
    result = json.loads((job / 'result.json').read_text())
    if (result.get('release_gate') is not True or result.get('exit_code') != 0
            or not re.fullmatch('[0-9a-f]{40}', gate.get('git_sha', ''))
            or result.get('git_sha') != gate['git_sha']
            or gate.get('checks') != 'backend+frontend'
            or result.get('artifact_sha256') != gate.get('artifact_sha256')
            or hashlib.sha256((job / 'app.jar').read_bytes()).hexdigest() != gate['artifact_sha256']):
        raise ValueError('Artefato sem gate/hash correspondente.')
    clean_sha(job / 'checkout', gate['git_sha'])
    # Este runner somente aceita o mesmo código de aplicação/migrations da sua
    # revisão. Mudanças de scripts/docs/testes não exigem reconstruir o JAR.
    source = Path('backend/src/main')
    repo = Path(__file__).resolve().parent.parent
    for base in (repo, job / 'checkout'):
        if not (base / source).is_dir():
            raise ValueError('Fonte da aplicação ausente.')
    def fingerprint(base):
        return {str(p.relative_to(base / source)): hashlib.sha256(p.read_bytes()).hexdigest()
                for p in (base / source).rglob('*') if p.is_file()}
    if fingerprint(repo) != fingerprint(job / 'checkout'):
        raise ValueError('Artefato de outra revisão da aplicação.')
    if (repo / 'backend/pom.xml').read_bytes() != (job / 'checkout/backend/pom.xml').read_bytes():
        raise ValueError('Dependências da aplicação divergentes.')
    application = job / 'checkout' / source / 'java/br/com/restaurantmanager/RestaurantManagerApplication.java'
    if 'args[0].equals("--processar-solicitacao")' not in application.read_text():
        raise ValueError('Artefato não oferece o comando privilegiado esperado.')
    return gate


def migration_checksums(jar, location):
    # Flyway ChecksumCalculator: CRC32 de linhas UTF-8, sem BOM inicial/CR/LF.
    # Somente migrations SQL versionadas simples deste projeto são aceitas.
    prefix = 'BOOT-INF/classes/db/migration/' + location + '/'
    expected = {}
    with zipfile.ZipFile(jar) as archive:
        for name in archive.namelist():
            if not name.startswith(prefix) or not name.endswith('.sql'):
                continue
            filename = name[len(prefix):]
            if not re.fullmatch(r'V[0-9]+__[a-z0-9_]+\.sql', filename):
                raise ValueError('Formato de migration não suportado pela guarda.')
            text = archive.read(name).decode('utf-8-sig').replace('\r', '').replace('\n', '')
            checksum = zlib.crc32(text.encode('utf-8'))
            expected[filename] = checksum if checksum < 2**31 else checksum - 2**32
    if not expected:
        raise ValueError('Migrations obrigatórias ausentes.')
    return expected


def interrupt(signum, frame):
    # subprocess.run encerra/recolhe o filho ao propagar esta exceção.
    raise InterruptedError('Worker interrompido.')


class Queue:
    def __init__(self, env, root, job, attempt, lock_fd=None):
        self.stage = validate_environment(env)
        self.env = {k: env[k] for k in ('RM_STAGE', 'RM_DB_URL', 'RM_DB_USER',
                    'RM_DB_PASSWORD', 'RM_MIGRATION_USER', 'RM_MIGRATION_PASSWORD')}
        self.java = Path(env['JAVA_HOME']) / 'bin/java'
        self.job = job
        self.attempt = attempt
        self.lock_fd = lock_fd
        prefix = root / 'toolchains/postgres/usr'
        self.psql = [str(prefix / 'lib/postgresql/16/bin/psql'), '-X', '-h', '127.0.0.1',
                     '-p', '55432', '-U', env['RM_DB_USER'], '-d', 'rm_' + self.stage,
                     '-At', '-v', 'ON_ERROR_STOP=1']
        self.pg_env = dict(PGPASSWORD=env['RM_DB_PASSWORD'],
                           LD_LIBRARY_PATH=str(prefix / 'lib/x86_64-linux-gnu'),
                           PGCONNECT_TIMEOUT='5', PGOPTIONS='-c statement_timeout=5000')
        actual = self.sql('select current_database(),current_user,inet_server_port(),host(inet_server_addr())')
        if actual != f'rm_{self.stage}|rm_{self.stage}_app|55432|127.0.0.1':
            raise ValueError('Conexão efetiva da fila recusada.')

    def verify_migrations(self):
        for schema, location in [('public', 'public'), ('t_template', 'tenant')]:
            rows = json.loads(self.sql("select coalesce(json_agg(json_build_object('script',script,"
                                       "'checksum',checksum,'success',success)), '[]'::json) from "
                                       + schema + ".flyway_schema_history where type<>'SCHEMA'"))
            expected = migration_checksums(self.job / 'app.jar', location)
            if (len(rows) != len(expected) or any(r['success'] is not True for r in rows)
                    or {r['script']: r['checksum'] for r in rows} != expected):
                raise ValueError('Banco e artefato possuem migrations incompatíveis.')

    def sql(self, query):
        return subprocess.check_output(self.psql + ['-c', query], env=self.pg_env,
                                       text=True, stderr=subprocess.PIPE, timeout=10).strip()

    def pending(self, limit):
        validate_limit(limit)
        values = self.sql("select id from public.solicitacao_provisionamento where estado='SOLICITADO' "
                          f'order by criado_em,id limit {limit}').splitlines()
        for value in values:
            self.identity(value)
        return values

    @staticmethod
    def identity(value):
        if not isinstance(value, str) or str(uuid.UUID(value)) != value:
            raise ValueError('Identificador da fila inválido.')
        return value

    def state(self, identity):
        state = self.sql("select estado from public.solicitacao_provisionamento where id='"
                         + self.identity(identity) + "'::uuid")
        if state not in ('SOLICITADO', 'CONCLUIDO', 'FALHOU'):
            raise ValueError('Resultado da solicitação ausente ou inválido.')
        if state == 'CONCLUIDO':
            # Confirma a empresa/domínio, não somente a marca da fila.
            actual = self.sql("select count(*) from public.solicitacao_provisionamento s "
                              "join public.empresa e on e.id=s.id join public.dominio d on d.empresa_id=e.id "
                              "where s.id='" + identity + "'::uuid and e.estado in ('ATIVO','SUSPENSO') "
                              "and d.host=s.host and e.schema_name='t_" + uuid.UUID(identity).hex + "'")
            if actual != '1':
                raise ValueError('Conclusão da fila sem empresa/domínio correspondentes.')
        return state

    def execute(self, identity):
        self.identity(identity)
        with (self.attempt / (identity + '.log')).open('x') as log:
            try:
                return subprocess.run([str(self.java), '-Xmx128m', '-XX:ActiveProcessorCount=2',
                                       '-jar', str(self.job / 'app.jar'), '--processar-solicitacao', identity],
                                      env=self.env, stdout=log, stderr=subprocess.STDOUT,
                                      pass_fds=() if self.lock_fd is None else (self.lock_fd,),
                                      timeout=90).returncode
            except subprocess.TimeoutExpired:
                # subprocess.run encerra e recolhe o processo próprio antes de retornar.
                return 124

    def backlog(self):
        return json.loads(self.sql("select json_build_object("
            "'pending',count(*) filter(where estado='SOLICITADO'),"
            "'failed',count(*) filter(where estado='FALHOU'),"
            "'oldest_pending_seconds',coalesce(extract(epoch from clock_timestamp()-"
            "min(criado_em) filter(where estado='SOLICITADO')),0)) from public.solicitacao_provisionamento"))


def main():
    os.umask(0o077)
    signal.signal(signal.SIGTERM, interrupt)
    signal.signal(signal.SIGINT, interrupt)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('job', type=Path)
    parser.add_argument('--limit', type=int, default=3)
    parser.add_argument('--resume', action='store_true', help='Reconhece pausa técnica após diagnóstico; não retoma FALHOU no banco.')
    args = parser.parse_args()
    validate_limit(args.limit)
    stage = validate_environment(os.environ)
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
    gate = validate_artifact(args.job, root)
    runner_sha = clean_sha(Path(__file__).resolve().parent.parent)
    attempts = root / 'provisioning' / stage
    attempts.mkdir(parents=True, exist_ok=True, mode=0o700)
    attempt = attempts / uuid.uuid4().hex
    attempt.mkdir(mode=0o700)
    progress = []
    record = dict(stage=stage, git_sha=gate['git_sha'], runner_sha=runner_sha,
                  artifact_sha256=gate['artifact_sha256'], pid=os.getpid(),
                  process_start_ticks=Path('/proc/self/stat').read_text().rsplit(')', 1)[1].split()[19],
                  started_at=now(), results=progress)
    atomic_json(attempt / 'running.json', record)

    code = 1
    try:
        with (root / 'deploy.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            atomic_json(attempts / 'latest.json', dict(attempt=str(attempt)))
            queue = Queue(os.environ, root, args.job.resolve(), attempt, lock.fileno())
            queue.verify_migrations()
            pause = attempts / 'paused.json'
            if pause.exists():
                if not args.resume:
                    raise RuntimeError('Fila pausada; exige diagnóstico e retomada técnica explícita.')
                pause.rename(attempt / 'acknowledged-pause.json')

            def started(identity):
                # Gravar ANTES do filho: SIGTERM, SIGKILL ou read-back indisponível
                # deixam uma pausa conservadora, inclusive se o efeito já confirmou.
                atomic_json(pause, dict(id=identity, attempt=str(attempt), created_at=now()))

            def persist(result):
                progress.append(result)
                atomic_json(attempt / 'progress.json', record)
                if result['state'] != 'SOLICITADO':
                    pause.unlink()

            results = process_batch(queue, args.limit, persist, started)
            record['backlog'] = queue.backlog()
            code = 0 if all(r['approved'] for r in results) else 1
    except BlockingIOError:
        record['error_type'] = 'OCUPADO'
        code = 75
    except Exception as error:
        record['error_type'] = type(error).__name__
    record.update(exit_code=code, finished_at=now())
    atomic_json(attempt / 'result.json', record)
    print(json.dumps(dict(attempt=str(attempt), exit_code=code)))
    return code


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print('Fila recusada. Tipo: ' + type(error).__name__, file=sys.stderr)
        sys.exit(1)

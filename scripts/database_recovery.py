"""Ensaio de backup/restore de rm_test em cluster privado.

Não promove release nem restaura sobre dev/test/hml. Modo padrão sem TCP;
probe opcional de aplicação usa somente loopback e configuração privada copiada.
O inventário e pg_dump compartilham o mesmo snapshot PostgreSQL somente leitura.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import select
import signal
import subprocess
import tempfile
import time
import uuid
from datetime import datetime, timezone

from release_support import atomic_json


def validate_source(env):
    expected = dict(RM_STAGE='test', RM_DB_URL='jdbc:postgresql://127.0.0.1:55432/rm_test',
                    RM_MIGRATION_USER='rm_test_owner', RM_DB_USER='rm_test_app')
    if any(env.get(k) != v for k, v in expected.items()):
        raise ValueError('Ensaio aceita somente o banco exclusivo de testes.')


def validate_snapshot(value):
    if not re.fullmatch(r'[0-9A-F]+-[0-9A-F]+-[0-9]+', value):
        raise ValueError('Snapshot inválido.')
    return value


def verify_inventory(before, after):
    if (before != after or before.get('tenants', 0) < 2
            or before.get('tenants_with_identity', 0) < 2
            or not before.get('tables') or not before.get('metadata')):
        raise ValueError('Restore divergente ou massa insuficiente.')


def safe_cleanup(session, stop=None):
    errors = []
    for action in ([session.close] if session is not None else []) + ([stop] if stop else []):
        try:
            action()
        except Exception as error:
            errors.append(type(error).__name__)
    return errors


def canonical_constraint(value):
    # PostgreSQL pode distribuir o cast varchar[] -> text[] entre constantes
    # após reparse do pg_dump. Normalizar SOMENTE este formato literal restrito.
    pattern = r"\(ARRAY\[((?:'[A-Za-z0-9_./-]+'::character varying(?:, )?)+)\]\)::text\[\]"
    return re.sub(pattern, lambda m: 'ARRAY[' + ', '.join('(' + x + ')::text' for x in m[1].split(', ')) + ']', value)


def identifier(value):
    # Identificadores vêm do catálogo, não de SQL arbitrário recebido pelo CLI.
    if not re.fullmatch(r'[a-z_][a-z0-9_]*', value):
        raise ValueError('Identificador fora das convenções do projeto.')
    return '"' + value + '"'


class Session:
    def __init__(self, command, env, log):
        self.process = subprocess.Popen(command, env=env, stdin=subprocess.PIPE,
                                        stdout=subprocess.PIPE, stderr=log)
        self.pending = b''

    def query(self, sql):
        marker = 'fim_' + uuid.uuid4().hex
        self.process.stdin.write((sql + ';\n\\echo ' + marker + '\n').encode())
        self.process.stdin.flush()
        rows = []
        deadline = time.monotonic() + 120
        while True:
            if b'\n' not in self.pending:
                remaining = deadline - time.monotonic()
                if remaining <= 0 or not select.select([self.process.stdout], [], [], remaining)[0]:
                    raise TimeoutError('Consulta do inventário excedeu o prazo.')
                block = os.read(self.process.stdout.fileno(), 65536)
                if not block:
                    raise RuntimeError('Sessão PostgreSQL encerrada; consulte log privado.')
                self.pending += block
                continue
            line, self.pending = self.pending.split(b'\n', 1)
            if line.decode() == marker:
                return rows
            rows.append(line.decode())

    def close(self):
        if self.process.poll() is None:
            self.process.stdin.close()  # EOF desfaz a transação somente leitura.
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=10)
        self.process.stdout.close()


def snapshot_inventory(command, env, log, snapshot, release_table_locks=False):
    # Exportador mantém o ponto MVCC, não os locks de todas as tabelas/índices.
    # Encerrar o leitor antes do pg_dump evita duplicar entradas de locks por PID.
    validate_snapshot(snapshot)
    reader = Session(command, env, log)
    try:
        reader.query('begin isolation level repeatable read read only')
        reader.query("set transaction snapshot '" + snapshot + "'")
        return inventory(reader, release_table_locks=release_table_locks)
    finally:
        reader.close()


def inventory(session, require_identity=True, release_table_locks=False, schema=None):
    if schema is not None:
        identifier(schema)

    def scope(column):
        return (column + "='" + schema + "'" if schema is not None else
                "(" + column + "='public' or " + column + " like 't\\_%' escape '\\')")

    tables = session.query("select n.nspname||'.'||c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace "
                           "where c.relkind='r' and " + scope('n.nspname') + " order by 1")
    result = {}
    for table in tables:
        table_schema, name = table.split('.')
        qualified = identifier(table_schema) + '.' + identifier(name)
        # Somente hashes saem da consulta: nenhuma senha, token ou e-mail no relatório.
        # Modo de manutenção: escritores próprios parados e transação RR ativa.
        # Rollback do savepoint libera locks da leitura sem trocar snapshot MVCC.
        # Não habilitar implicitamente em sessões fora de uma transação.
        if release_table_locks:
            session.query('savepoint inventory_table')
        try:
            rows = session.query("select encode(sha256(convert_to(row_to_json(t)::text,'UTF8')),'hex') from "
                                 + qualified + " t order by 1")
        finally:
            if release_table_locks:
                session.query('rollback to savepoint inventory_table')
                session.query('release savepoint inventory_table')
        if any(not re.fullmatch('[0-9a-f]{64}', row) for row in rows):
            raise ValueError('Hash de linha inválido.')
        result[table] = dict(rows=len(rows), sha256=hashlib.sha256('\n'.join(rows).encode()).hexdigest())
    metadata = session.query("select json_build_object('schemas',(select json_agg(x order by name) from "
        "(select nspname name,pg_get_userbyid(nspowner) owner,nspacl::text acl from pg_namespace "
        "where " + scope('nspname') + ") x),"
        "'constraints',(select json_agg(x order by name) from (select n.nspname||'.'||c.relname||'.'||k.conname name,"
        "pg_get_constraintdef(k.oid) definition,k.convalidated validated from pg_constraint k join pg_class c on c.oid=k.conrelid "
        "join pg_namespace n on n.oid=c.relnamespace where " + scope('n.nspname') + ") x),"
        "'relations',(select json_agg(x order by name) from (select n.nspname||'.'||c.relname name,c.relkind kind,"
        "pg_get_userbyid(c.relowner) owner,coalesce(c.relacl,case when c.relkind='r' then acldefault('r',c.relowner) "
        "when c.relkind='S' then acldefault('S',c.relowner) end)::text acl from pg_class c join pg_namespace n on n.oid=c.relnamespace "
        "where " + scope('n.nspname') + ") x),"
        "'indexes',(select json_agg(x order by name) from (select schemaname||'.'||indexname name,indexdef definition "
        "from pg_indexes where " + scope('schemaname') + ") x),"
        "'triggers',(select json_agg(x order by name) from (select n.nspname||'.'||c.relname||'.'||t.tgname name,"
        "pg_get_triggerdef(t.oid) definition,t.tgenabled enabled from pg_trigger t join pg_class c on c.oid=t.tgrelid "
        "join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and " + scope('n.nspname') + ") x),"
        "'functions',(select json_agg(x order by name) from (select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' name,"
        "pg_get_functiondef(p.oid) definition,pg_get_userbyid(p.proowner) owner,p.proacl::text acl from pg_proc p "
        "join pg_namespace n on n.oid=p.pronamespace where p.prokind in ('f','p') and " + scope('n.nspname') + ") x))")
    tenant_filter = " and schema_name='" + schema + "'" if schema is not None else ''
    tenants = session.query("select schema_name from public.empresa where estado in ('ATIVO','SUSPENSO')" + tenant_filter + " order by schema_name")
    with_identity = 0
    for tenant_schema in tenants:
        identifier(tenant_schema)
        if tenant_schema + '.usuario' not in result or tenant_schema + '.unidade' not in result:
            if require_identity:
                raise ValueError('Empresa ativa sem schema recuperável.')
            continue  # Fundação anterior à identidade; não inventar contas recuperadas.
        if result[tenant_schema + '.usuario']['rows'] > 0 and result[tenant_schema + '.unidade']['rows'] > 0:
            with_identity += 1
    definitions = json.loads('\n'.join(metadata))
    for entry in definitions['constraints'] or []:
        entry['definition'] = canonical_constraint(entry['definition'])
    for entry in definitions.get('indexes') or []:
        entry['definition'] = canonical_constraint(entry['definition'])
    for entries in definitions.values():
        for entry in entries or []:
            if entry.get('acl') is not None:
                entry['acl'] = sorted(entry['acl'].strip('{}').split(','))
    return dict(tables=result, metadata=definitions,
                tenants=len(tenants), tenants_with_identity=with_identity)


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--application-job', type=Path)
    parser.add_argument('--application-fixture', type=Path)
    args = parser.parse_args()
    if bool(args.application_job) != bool(args.application_fixture):
        parser.error('Job e configuração privada devem ser informados juntos.')
    validate_source(os.environ)
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
    scratch = Path(os.environ['TMPDIR']).resolve()
    if not scratch.is_dir() or scratch.is_relative_to('/tmp'):
        raise ValueError('Scratch privado obrigatório fora de /tmp.')
    pg = root / 'toolchains/postgres/usr'
    binary = pg / 'lib/postgresql/16/bin'
    env = dict(LD_LIBRARY_PATH=str(pg / 'lib/x86_64-linux-gnu'), PGCONNECT_TIMEOUT='5',
               PGOPTIONS='-c statement_timeout=120000 -c timezone=UTC -c datestyle=ISO,YMD',
               PATH='/usr/bin:/bin', HOME=str(Path.home()), LC_ALL='C.UTF-8')
    source_env = dict(env, PGPASSWORD=os.environ['RM_MIGRATION_PASSWORD'])
    source = [str(binary / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1',
              '-p', '55432', '-U', 'rm_test_owner', '-d', 'rm_test']
    attempt = root / 'recovery' / uuid.uuid4().hex
    attempt.mkdir(parents=True, mode=0o700)
    record = dict(approved=False, started_at=datetime.now(timezone.utc).isoformat(),
                  scope='backup/restore PostgreSQL rm_test; sem mídia, chaves, aplicação ou deploy',
                  source_database='rm_test', source_port=55432, source_mutated=False)
    application = None
    target_database = 'rm_test' if args.application_job else 'rm_restore_test'
    atomic_json(attempt / 'running.json', record)
    active = False
    session = None
    cluster = attempt / 'cluster'
    started = time.monotonic()
    def interrupted(signum, frame):
        raise InterruptedError('Ensaio interrompido.')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    with (root / 'deploy.lock').open('a') as lock, (attempt / 'execution.log').open('xb') as log:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            if args.application_job:
                import application_recovery
                application = application_recovery.prepare(args.application_job, args.application_fixture, root, attempt)
                record['scope'] = 'Banco e aplicação restaurados isoladamente; configuração/chaves privadas; sem mídia/deploy'
            session = Session(source, source_env, log)
            actual = session.query('select current_database(),current_user,inet_server_port(),host(inet_server_addr())')
            if actual != ['rm_test|rm_test_owner|55432|127.0.0.1']:
                raise ValueError('Conexão efetiva da fonte recusada.')
            session.query('begin isolation level repeatable read read only')
            snapshot = validate_snapshot(session.query('select pg_export_snapshot()')[0])
            record['snapshot'] = snapshot
            record['snapshot_at'] = session.query('select transaction_timestamp()')[0]
            before = snapshot_inventory(source, source_env, log, snapshot)
            atomic_json(attempt / 'source-inventory.json', before)
            archive = attempt / 'database.dump'
            subprocess.run([str(binary / 'pg_dump'), '-h', '127.0.0.1', '-p', '55432', '-U', 'rm_test_owner',
                            '-d', 'rm_test', '-Fc', '--snapshot=' + snapshot, '-f', str(archive)],
                           env=source_env, check=True, stdout=log, stderr=log, timeout=240)
            session.close(); session = None
            record['archive_sha256'] = hashlib.sha256(archive.read_bytes()).hexdigest()
            record['archive_bytes'] = archive.stat().st_size
            record['backup_seconds'] = round(time.monotonic() - started, 3)
            # Novo cluster vazio, socket privado exclusivo, sem porta TCP/credenciais copiadas.
            subprocess.run([str(binary / 'initdb'), '-D', str(cluster), '-L', str(pg / 'share/postgresql/16'),
                            '--encoding=UTF8', '--locale=C.UTF-8', '--auth-local=peer', '--auth-host=reject'],
                           env=env, check=True, stdout=log, stderr=log, timeout=90)
            if application:
                (cluster / 'pg_hba.conf').write_text('local all all peer\n'
                    'host rm_test rm_test_app 127.0.0.1/32 scram-sha-256\n'
                    'host all all 0.0.0.0/0 reject\nhost all all ::/0 reject\n')
            with tempfile.TemporaryDirectory(prefix='rm-restore-', dir=scratch) as socket:
                # Restore atômico de muitos schemas exige locks de catálogo;
                # configuração somente do cluster descartável, nunca da origem.
                listen = '127.0.0.1' if application else ''
                options = "-c listen_addresses='" + listen + "' -c unix_socket_directories=" + socket + " -p 55433 -c shared_buffers=16MB -c max_connections=8 -c max_locks_per_transaction=2048 -c jit=off"
                # Marcar antes do pg_ctl para recolher também startup parcialmente concluído.
                active = True
                subprocess.run([str(binary / 'pg_ctl'), '-D', str(cluster), '-l', str(attempt / 'postgres.log'),
                                '-o', options, '-w', '-t', '30', 'start'], env=env, check=True, stdout=log, stderr=log, timeout=45)
                try:
                    username = pwd.getpwuid(os.getuid()).pw_name
                    target = [str(binary / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', socket,
                              '-p', '55433', '-U', username, '-d', 'postgres']
                    session = Session(target, env, log)
                    actual = session.query("select current_database(),current_user,current_setting('data_directory'),current_setting('listen_addresses'),inet_server_addr() is null")
                    if actual != [f'postgres|{username}|{cluster}|{listen}|t']:
                        raise ValueError('Cluster de restauração não corresponde ao isolado.')
                    if application:
                        from release_support import verify_listener
                        verify_listener(int((cluster / 'postmaster.pid').read_text().splitlines()[0]), 55433)
                    session.query('create role rm_test_owner nologin')
                    session.query('create role rm_test_app nologin')
                    session.query('create database ' + target_database + ' owner rm_test_owner')
                    session.query('revoke all on database ' + target_database + ' from public')
                    session.close(); session = None
                    restore_started = time.monotonic()
                    subprocess.run([str(binary / 'pg_restore'), '-h', socket, '-p', '55433', '-U', username,
                                    '-d', target_database, '--exit-on-error', '--single-transaction', str(archive)],
                                   env=env, check=True, stdout=log, stderr=log, timeout=300)
                    session = Session(target[:-1] + [target_database], env, log)
                    session.query('begin isolation level repeatable read read only')
                    after = inventory(session)
                    atomic_json(attempt / 'restored-inventory.json', after)
                    verify_inventory(before, after)
                    session.close(); session = None
                    if application:
                        session = Session(target[:-1] + [target_database], env, log)
                        record['application'] = application_recovery.run(application, root, attempt, session, env, binary, log)
                        session.close(); session = None
                    record.update(approved=True, tables=len(after['tables']), tenants=after['tenants'],
                                  rows=sum(t['rows'] for t in after['tables'].values()),
                                  restore_verify_seconds=round(time.monotonic() - restore_started, 3))
                finally:
                    def stop_cluster():
                        subprocess.run([str(binary / 'pg_ctl'), '-D', str(cluster), '-m', 'fast', '-w', '-t', '30', 'stop'],
                                       env=env, check=True, stdout=log, stderr=log, timeout=45)
                    errors = safe_cleanup(session, stop_cluster)
                    session = None
                    if errors:
                        record['cleanup_errors'] = errors
                        raise RuntimeError('Limpeza do cluster não confirmada.')
                    active = False
        except Exception as error:
            record.update(approved=False, error_type=type(error).__name__)
        finally:
            errors = safe_cleanup(session)
            if active:
                def stop_remaining():
                    subprocess.run([str(binary / 'pg_ctl'), '-D', str(cluster), '-m', 'fast', '-w', '-t', '30', 'stop'],
                                   env=env, check=True, stdout=log, stderr=log, timeout=45)
                errors.extend(safe_cleanup(None, stop_remaining))
                record['cleanup_pending'] = bool(errors)
                record['approved'] = False
            if errors:
                record['cleanup_errors'] = record.get('cleanup_errors', []) + errors
                record['approved'] = False
            record.update(finished_at=datetime.now(timezone.utc).isoformat(), seconds=round(time.monotonic()-started, 3))
            atomic_json(attempt / 'result.json', record)
    print(json.dumps(dict(attempt=str(attempt), **record)))
    return 0 if record['approved'] else 1


if __name__ == '__main__':
    raise SystemExit(main())

"""Manutenção ensaiada exclusivamente no clone privado do local_rehearsal.

Reutiliza a troca conservadora por OID; não chama o migrador de porta 55432,
systemd ou deploy. A incompatibilidade é uma entrada Flyway/DDL SINTÉTICA,
confirmada antes de uma falha SQL. O JAR real deve recusá-la no startup.
"""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import pwd
import subprocess
import time

from database_recovery import Session, verify_inventory
from maintenance_database import Admin, DatabaseSwap, durable_journal


def require(condition, message):
    if not condition:
        raise ValueError(message)


class LocalAdmin(Admin):
    """Adaptador sem systemd; herda as regras de preservação/ACL da manutenção."""
    def __init__(self, exercise, log):
        self.root = exercise.root.resolve()
        self.cluster = exercise.cluster
        self.socket = exercise.socket
        self.binary = exercise.pg
        self.log = log
        self.username = pwd.getpwuid(os.getuid()).pw_name
        self.env = dict(PATH=exercise.env['PATH'], HOME=str(Path.home()), LC_ALL='C',
                        PGCONNECT_TIMEOUT='5',
                        PGOPTIONS='-c statement_timeout=120000 -c lock_timeout=5000')
        self.command = [str(self.binary / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                        '-h', str(self.socket), '-p', '55433', '-d', 'postgres']
        self.verify()

    def verify(self):
        require(self.cluster == self.root / 'cluster' and self.socket == self.root / 'socket'
                and not self.cluster.is_symlink() and not self.socket.is_symlink()
                and self.cluster.is_dir() and self.socket.is_dir()
                and not self.root.stat().st_mode & 0o077,
                'Manutenção exige o cluster privado próprio, sem redirecionamento.')
        actual = json.loads(self.query("select json_build_object('database',current_database(),"
            "'user',current_user,'directory',current_setting('data_directory'),'port',current_setting('port'),"
            "'socket',inet_server_addr() is null,'superuser',current_setting('is_superuser'))"))
        require(actual == dict(database='postgres', user=self.username, directory=str(self.cluster),
                               port='55433', socket=True, superuser='on'),
                'Identidade do clone administrativo recusada; origem não será alterada.')

    def database_query(self, sql, expected_failure=False):
        self.verify()
        result = subprocess.run(self.command[:-1] + ['rm_test', '-c', sql], env=self.env,
                                text=True, capture_output=True, timeout=150)
        self.log.write(result.stderr.encode())
        self.log.flush()
        if expected_failure:
            require(result.returncode != 0 and 'division by zero' in result.stderr,
                    'Falha SQL injetada não foi observada após o DDL confirmado.')
        else:
            require(result.returncode == 0, 'SQL no clone recusado; consulte o registro privado.')
        return result.stdout.strip()


def snapshot(exercise, admin, destination):
    # Importação tardia permite integrar sem dependência circular no harness.
    from local_rehearsal import partitioned_inventory
    admin.verify()
    require(exercise.process is None and exercise.session is None,
            'Inventário exige escritores e sessão anterior encerrados.')
    session = Session(admin.command[:-1] + ['rm_test'], admin.env, admin.log)
    try:
        session.query('begin isolation level repeatable read read only')
        schemas = session.query("select nspname from pg_namespace where nspname='public' "
                                "or starts_with(nspname,'t_') order by nspname")
        result = partitioned_inventory(session, schemas)
    finally:
        session.close()
    durable_journal(destination, result)
    return result


def runtime_gate(exercise, compatible):
    """Não aceita uma falha genérica de startup como prova de incompatibilidade."""
    require(exercise.process is None, 'Gate exige runtime próprio parado.')
    exercise.log.flush()
    log_path = exercise.root / 'execution.log'
    offset = log_path.stat().st_size
    started = time.monotonic()
    result = dict(expected_compatible=compatible, approved=False)
    try:
        try:
            exercise.start_app()
        except ValueError:
            process = exercise.process
            if compatible or process is None or process.poll() in (None, 0):
                raise
            exercise.log.flush()
            with log_path.open('rb') as stream:
                stream.seek(offset)
                diagnostic = stream.read().decode(errors='replace')
            require('FlywayValidateException' in diagnostic
                    and 'Detected applied migration not resolved locally: 9999' in diagnostic,
                    'Startup falhou por causa diferente da incompatibilidade sintética esperada.')
            result.update(approved=True, healthy=False, pid=process.pid,
                          exit_code=process.returncode, cause='migration-sintetica-9999-nao-resolvida')
        else:
            require(compatible, 'Candidato incompatível ficou saudável; gate deve recusá-lo.')
            result.update(approved=True, healthy=True, pid=exercise.process.pid)
    finally:
        exercise.stop_app()
    result['seconds'] = round(time.monotonic() - started, 3)
    return result


def run_local_maintenance(exercise):
    """Executar após prepare(), com o clone ativo e antes do runtime contínuo."""
    require(exercise.active and exercise.process is None,
            'Manutenção local exige clone preparado e aplicação parada.')
    attempt = exercise.root / 'maintenance'
    attempt.mkdir(mode=0o700)
    record = dict(approved=False, scope='clone-local-mac-ou-ci', linux_homologation=False,
                  linux_deploy=False, synthetic_migration=True, real_migrator_executed=False,
                  downmigration=False, database_drop=False, candidate_promoted=False,
                  created_at=datetime.now(timezone.utc).isoformat())
    exercise.record['maintenance'] = record
    admin, swap = None, None
    artifact = exercise.root / 'app.jar'
    artifact_before = hashlib.sha256(artifact.read_bytes()).hexdigest()
    require(artifact_before == exercise.args.jar_sha256, 'Artefato da manutenção divergente.')
    exercise.close_session()
    try:
        with (attempt / 'postgres.log').open('xb') as log:
            os.chmod(attempt / 'postgres.log', 0o600)
            admin = LocalAdmin(exercise, log)
            require(admin.connections('rm_test') == 0, 'Conexões existentes impedem manutenção local.')
            # ACL/SET no nível do banco não vêm do pg_dump. Configurar SOMENTE o
            # clone já restaurado, antes do snapshot e do ensaio de preservação.
            admin.configure('rm_test', 'test')
            record['compatible_before'] = runtime_gate(exercise, True)
            require(admin.connections('rm_test') == 0, 'Runtime anterior não drenou suas conexões.')
            before = snapshot(exercise, admin, attempt / 'before-inventory.json')
            swap = DatabaseSwap(admin, 'test', attempt)
            try:
                swap.clone()
                require(admin.connections(swap.backup) == 0
                        and admin.metadata(swap.backup)['allowed'] is False,
                        'Original precisa permanecer bloqueado e sem escritores.')
                candidate = snapshot(exercise, admin, attempt / 'candidate-inventory.json')
                verify_inventory(before, candidate)
                # Esta entrada NÃO é migration do produto nem execução do
                # migrador oficial. O DDL e histórico fictícios são confirmados
                # para provar a recusa do binário real e o retorno pós-DDL.
                admin.database_query("begin; create table public.ensaio_manutencao_local(id integer primary key); "
                    "insert into public.ensaio_manutencao_local values(1); "
                    "insert into public.flyway_schema_history(installed_rank,version,description,type,script,"
                    "checksum,installed_by,execution_time,success) select coalesce(max(installed_rank),0)+1,"
                    "'9999','Ensaio local sintetico','SQL','V9999__ensaio_local_sintetico.sql',123,current_user,0,true "
                    "from public.flyway_schema_history; commit")
                require(admin.database_query("select (select count(*) from public.ensaio_manutencao_local),"
                    "(select count(*) from public.flyway_schema_history where version='9999' and success)") == '1|1',
                    'DDL/histórico sintéticos não foram confirmados antes da falha.')
                admin.database_query('select 1/0', expected_failure=True)
                record['ddl_committed_before_sql_failure'] = True
                record['incompatible_candidate'] = runtime_gate(exercise, False)
            finally:
                exercise.stop_app()
                # Nunca DROP/downmigration: devolve o original exato pelo OID e
                # mantém o candidato rejeitado, bloqueado, para diagnóstico.
                swap.rollback()
            require(admin.connections('rm_test') == 0, 'Conexões inesperadas após retorno.')
            require(admin.metadata('rm_test')['oid'] == swap.record['original_oid']
                    and admin.metadata(swap.failed)['oid'] == swap.record['candidate_oid']
                    and admin.metadata(swap.failed)['allowed'] is False,
                    'Retorno/preservação por OID não confirmado.')
            after = snapshot(exercise, admin, attempt / 'after-inventory.json')
            verify_inventory(before, after)
            require(admin.database_query("select to_regclass('public.ensaio_manutencao_local') is null,"
                "not exists(select 1 from public.flyway_schema_history where version='9999')") == 't|t',
                'Banco original contém alterações do candidato.')
            admin.verify_policy('rm_test', 'test')
            record['compatible_after'] = runtime_gate(exercise, True)
            require(admin.connections('rm_test') == 0, 'Runtime recuperado não drenou suas conexões.')
            require(hashlib.sha256(artifact.read_bytes()).hexdigest() == artifact_before,
                    'Binário foi alterado durante o ensaio.')
            record.update(approved=True, original_oid=swap.record['original_oid'],
                          candidate_oid=swap.record['candidate_oid'], preserved_candidate=swap.failed,
                          preserved_candidate_bytes=int(admin.query("select pg_database_size('" + swap.failed + "')")),
                          writers_stopped=True, inventories_equal=True, binary_unchanged=True,
                          artifact_sha256=artifact_before, restored_without_downmigration=True)
    finally:
        exercise.stop_app()
        record['finished_at'] = datetime.now(timezone.utc).isoformat()
        durable_journal(attempt / 'result.json', record)
        # Falha durante uma troca incerta exige reconciliação pelo ledger; não
        # abrir sessão em um candidato cujo retorno não tenha sido confirmado.
        if admin is not None and (swap is None or swap.record['state'] == 'original-restaurado'):
            exercise.session = Session(admin.command[:-1] + ['rm_test'], admin.env, exercise.log)
    return record

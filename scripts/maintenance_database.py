"""Troca conservadora de banco fictício para manutenção nativa.

O chamador mantém deploy.lock e para seus escritores ANTES de clone/rollback.
Não mata conexões, não apaga bancos e não promove um release. Somente test/hml
no cluster privado conhecido; original preservado por OID e bloqueado a conexões.
"""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import pwd
import re
import subprocess
import uuid

def durable_journal(path, record):
    temporary = path.with_suffix('.new')
    with temporary.open('w') as stream:
        stream.write(json.dumps(record, indent=2) + '\n')
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)
    for directory in (path.parent, path.parent.parent):
        descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)


def assert_no_pending(attempts, stage):
    validate_stage(stage)
    for path in attempts.glob('*/database-swap.json'):
        record = json.loads(path.read_text())
        if record.get('stage') == stage and record.get('state') != 'original-restaurado':
            raise ValueError('Manutenção anterior não reconciliada; não iniciar outra.')


def validate_stage(stage):
    if stage not in ('test', 'hml'):
        raise ValueError('Manutenção aceita somente test/hml fictícios.')
    return 'rm_' + stage


def database_name(name):
    if not re.fullmatch(r'rm_(test|hml)(_(before|failed)_[0-9a-f]{32})?', name):
        raise ValueError('Nome fora da allowlist de manutenção.')
    return '"' + name + '"'


class Admin:
    """Admin local por peer; não entrega credencial de DDL ao runtime."""
    def __init__(self, root, log):
        self.root = root.resolve()
        self.log = log
        prefix = self.root / 'toolchains/postgres/usr'
        self.binary = prefix / 'lib/postgresql/16/bin'
        self.env = dict(PATH='/usr/bin:/bin', HOME=str(Path.home()), LC_ALL='C.UTF-8',
                        LD_LIBRARY_PATH=str(prefix / 'lib/x86_64-linux-gnu'),
                        PGCONNECT_TIMEOUT='5', PGOPTIONS='-c statement_timeout=120000 -c lock_timeout=5000')
        self.command = [str(self.binary / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                        '-h', str(self.root / 'postgres/socket'), '-p', '55432', '-d', 'postgres']
        self.username = pwd.getpwuid(os.getuid()).pw_name
        self.verify()

    def query(self, sql):
        result = subprocess.run(self.command + ['-c', sql], env=self.env, text=True,
                                stdout=subprocess.PIPE, stderr=self.log, timeout=150)
        if result.returncode:
            raise RuntimeError('Comando PostgreSQL recusado; consulte registro privado.')
        return result.stdout.strip()

    def verify(self):
        actual = json.loads(self.query("select json_build_object('database',current_database(),"
            "'user',current_user,'directory',current_setting('data_directory'),'port',current_setting('port'),"
            "'socket',inet_server_addr() is null,'superuser',current_setting('is_superuser'))"))
        if actual != dict(database='postgres', user=self.username,
                          directory=str(self.root / 'postgres/data'), port='55432', socket=True, superuser='on'):
            raise ValueError('Cluster administrativo efetivo recusado.')
        if (self.root / 'postgres/data').is_symlink() or (self.root / 'postgres/socket').is_symlink():
            raise ValueError('Cluster privado não pode ser redirecionado.')

    def metadata(self, name):
        database_name(name)
        value = self.query("select json_build_object('oid',oid,'owner',pg_get_userbyid(datdba),"
                           "'allowed',datallowconn) from pg_database where datname='" + name + "'")
        return json.loads(value) if value else None

    def connections(self, name):
        database_name(name)
        return int(self.query("select count(*) from pg_stat_activity where datname='" + name + "'"))

    def pending(self, stage):
        name = validate_stage(stage)
        return self.query("select datname from pg_database where starts_with(datname,'" + name + "_before_') order by datname").splitlines()

    def set_connections(self, name, allowed):
        self.verify()
        self.query('alter database ' + database_name(name) + ' allow_connections ' + str(bool(allowed)).lower())
        if self.metadata(name)['allowed'] is not allowed:
            raise ValueError('Bloqueio de conexões não confirmado.')

    def rename(self, old, new):
        self.verify()
        self.query('alter database ' + database_name(old) + ' rename to ' + database_name(new))

    def copy(self, old, new, owner):
        self.verify()
        if owner != new + '_owner' or new not in ('rm_test', 'rm_hml'):
            raise ValueError('Proprietário de cópia recusado.')
        self.query('create database ' + database_name(new) + ' with template ' + database_name(old)
                   + ' owner ' + owner + ' allow_connections false')

    def configure(self, name, stage):
        if name != validate_stage(stage):
            raise ValueError('Banco de configuração recusado.')
        # CREATE DATABASE não copia ACL/configuração no nível do banco.
        self.query('revoke all on database ' + database_name(name) + ' from public; '
                   'grant connect on database ' + database_name(name) + ' to ' + name + '_app; '
                   'alter role ' + name + '_app in database ' + database_name(name) + ' set search_path to pg_catalog')
        self.verify_policy(name, stage)

    def verify_policy(self, name, stage):
        expected = validate_stage(stage)
        database_name(name)
        value = json.loads(self.query("select json_build_object('owner',pg_get_userbyid(datdba),"
            "'limit',datconnlimit,'template',datistemplate,'acl',(select json_agg(x order by x.role,x.privilege) from "
            "(select coalesce(r.rolname,'PUBLIC') role,a.privilege_type privilege,a.is_grantable grantable "
            "from aclexplode(coalesce(datacl,acldefault('d',datdba))) a left join pg_roles r on r.oid=a.grantee) x),"
            "'settings',(select coalesce(json_agg(x order by x.role),'[]'::json) from (select coalesce(r.rolname,'ALL') role,"
            "s.setconfig settings from pg_db_role_setting s left join pg_roles r on r.oid=s.setrole where s.setdatabase=d.oid) x)) "
            "from pg_database d where datname='" + name + "'"))
        acl = [dict(role=expected + '_app', privilege='CONNECT', grantable=False)] + [
            dict(role=expected + '_owner', privilege=p, grantable=False) for p in ('CONNECT', 'CREATE', 'TEMPORARY')]
        policy = dict(owner=expected + '_owner', limit=-1, template=False, acl=acl,
                      settings=[dict(role=expected + '_app', settings=['search_path=pg_catalog'])])
        if value != policy:
            raise ValueError('Política de banco não suportada; não recriar privilégios implicitamente.')
        return value


class DatabaseSwap:
    def __init__(self, admin, stage, attempt):
        self.database = validate_stage(stage)
        self.stage, self.admin, self.attempt = stage, admin, attempt
        if admin.pending(stage):
            raise ValueError('Banco anterior preservado sem reconciliação; nova troca recusada.')
        token = uuid.uuid4().hex
        self.backup = self.database + '_before_' + token
        self.failed = self.database + '_failed_' + token
        source = admin.metadata(self.database)
        if not source or source['owner'] != self.database + '_owner' or source['allowed'] is not True:
            raise ValueError('Banco original indisponível ou proprietário divergente.')
        self.record = dict(stage=stage, database=self.database, backup=self.backup, failed=self.failed,
                           original_oid=source['oid'], candidate_oid=None, state='preparado',
                           created_at=datetime.now(timezone.utc).isoformat())
        self.save('preparado')

    def save(self, state):
        self.record['state'] = state
        durable_journal(self.attempt / 'database-swap.json', self.record)

    def confirm(self, name, oid):
        value = self.admin.metadata(name)
        if not value or value['oid'] != oid or value['owner'] != self.database + '_owner':
            raise ValueError('Identidade OID/proprietário divergente; intervenção necessária.')
        return value

    def freeze(self, name, oid):
        self.confirm(name, oid)
        self.admin.set_connections(name, False)
        if self.admin.connections(name):
            raise RuntimeError('Escritores/conexões ainda presentes; nenhum cliente será encerrado.')

    def clone(self):
        if self.admin.metadata(self.backup) or self.admin.metadata(self.failed):
            raise ValueError('Nome de preservação já existe.')
        self.save('bloqueando-original')
        self.freeze(self.database, self.record['original_oid'])
        self.save('renomeando-original')
        self.admin.rename(self.database, self.backup)
        self.confirm(self.backup, self.record['original_oid'])
        self.save('copiando')
        try:
            self.admin.copy(self.backup, self.database, self.database + '_owner')
            candidate = self.admin.metadata(self.database)
        except Exception:
            self.save('clone-incerto-reconciliar')
            raise
        if not candidate or candidate['oid'] == self.record['original_oid']:
            raise ValueError('Cópia não possui identidade independente.')
        self.record['candidate_oid'] = candidate['oid']
        self.save('configurando-clone')
        self.confirm(self.database, candidate['oid'])
        self.admin.configure(self.database, self.stage)
        self.admin.set_connections(self.database, True)
        self.save('clone-pronto')

    def rollback(self):
        current = self.admin.metadata(self.database)
        if current and current['oid'] == self.record['original_oid']:
            self.confirm(self.database, self.record['original_oid'])
            self.admin.set_connections(self.database, True)
            self.save('original-restaurado')
            return
        self.confirm(self.backup, self.record['original_oid'])
        if current:
            if not self.record['candidate_oid']:
                raise ValueError('Candidato sem OID registrado; reconciliar antes do retorno.')
            self.confirm(self.database, self.record['candidate_oid'])
            if self.admin.metadata(self.failed):
                raise ValueError('Destino de preservação do candidato já existe.')
            self.save('bloqueando-candidato')
            self.freeze(self.database, self.record['candidate_oid'])
            self.admin.rename(self.database, self.failed)
            self.confirm(self.failed, self.record['candidate_oid'])
        self.save('retornando-original')
        self.admin.rename(self.backup, self.database)
        self.confirm(self.database, self.record['original_oid'])
        self.admin.set_connections(self.database, True)
        self.save('original-restaurado')

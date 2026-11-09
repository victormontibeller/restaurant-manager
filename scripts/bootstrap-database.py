#!/usr/bin/env python3
"""Cluster nativo exclusivo; não altera PostgreSQL global nem imprime segredos."""
import os
from pathlib import Path
import platform
import secrets
import subprocess

if platform.system() != 'Linux':
    raise SystemExit('Instalação nativa exclusiva do Linux/systemd; no Mac, use o ensaio local isolado do runbook.')

ROOT = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
PG = ROOT / 'toolchains/postgres'
BIN = PG / 'usr/lib/postgresql/16/bin'
os.umask(0o077)
ROOT.mkdir(parents=True, exist_ok=True)
ENV = dict(os.environ, LD_LIBRARY_PATH=str(PG / 'usr/lib/x86_64-linux-gnu'))
DATA = ROOT / 'postgres/data'
SOCKET = ROOT / 'postgres/socket'
SOCKET.mkdir(parents=True, exist_ok=True)

def run(args, **kwargs):
    return subprocess.run(args, env=ENV, check=True, text=True, **kwargs)

if not (DATA / 'PG_VERSION').exists():
    run([str(BIN / 'initdb'), '-D', str(DATA), '-L', str(PG / 'usr/share/postgresql/16'), '--encoding=UTF8', '--locale=C.UTF-8', '--auth-local=peer', '--auth-host=scram-sha-256'])
    with (DATA / 'postgresql.conf').open('a') as f:
        f.write(f"\nlisten_addresses = '127.0.0.1'\nport = 55432\nunix_socket_directories = '{SOCKET}'\nshared_buffers = '64MB'\nmax_connections = 35\npassword_encryption = 'scram-sha-256'\njit = off\n")
unit = Path.home() / '.config/systemd/user/restaurant-manager-postgres.service'
unit.parent.mkdir(parents=True, exist_ok=True)
content = f'''[Unit]
Description=PostgreSQL exclusivo Restaurant Manager (local)
[Service]
ExecStart={BIN}/postgres -D {DATA}
Environment=LD_LIBRARY_PATH={PG}/usr/lib/x86_64-linux-gnu
Restart=on-failure
RestartSec=5
TimeoutStopSec=60
KillSignal=SIGINT
MemoryMax=400M
NoNewPrivileges=true
[Install]
WantedBy=default.target
'''
if unit.exists() and unit.read_text() != content:
    raise SystemExit('Unidade existente divergente; revisar antes de substituir.')
unit.write_text(content)
run(['systemctl', '--user', 'daemon-reload'])
run(['systemctl', '--user', 'enable', '--now', unit.name])
# pg_isready retries bounded; only our dedicated cluster.
import time
for _ in range(30):
    if subprocess.run([str(BIN / 'pg_isready'), '-h', str(SOCKET), '-p', '55432'], env=ENV, stdout=subprocess.DEVNULL).returncode == 0:
        break
    time.sleep(1)
else:
    raise SystemExit('Cluster não ficou pronto.')
base = [str(BIN / 'psql'), '-X', '-v', 'ON_ERROR_STOP=1', '-h', str(SOCKET), '-p', '55432', '-d', 'postgres']
identity = run(base + ['-Atc', 'select current_database(), inet_server_port(), current_user'], capture_output=True).stdout.strip()
if identity != f'postgres||{os.environ["USER"]}':
    raise SystemExit('Identidade inesperada do cluster.')
for stage in ('dev', 'test', 'hml'):
    path = ROOT / f'{stage}.env'
    db, owner, runtime = f'rm_{stage}', f'rm_{stage}_owner', f'rm_{stage}_app'
    existing = run(base + ['-Atc', f"select 1 from pg_database where datname='{db}'"], capture_output=True).stdout.strip()
    if existing:
        if not path.exists():
            raise SystemExit(f'{db} existe sem configuração privada. Recusando alterar.')
        expected = run(base + ['-Atc', f"select pg_get_userbyid(datdba) from pg_database where datname='{db}'"], capture_output=True).stdout.strip()
        if expected != owner or path.stat().st_mode & 0o077:
            raise SystemExit(f'{db}: proprietário/permissões privadas divergentes.')
        grants = run(base[:-1] + [db, '-Atc', f"select has_database_privilege('{runtime}','{db}','CONNECT'),has_schema_privilege('{runtime}','public','USAGE'),has_schema_privilege('{runtime}','public','CREATE')"], capture_output=True).stdout.strip()
        if grants != 't|t|f':
            raise SystemExit(f'{db}: privilégios incompletos; corrigir explicitamente antes de retomar.')
        print(f'{db}: preservado; proprietário, modo e privilégios verificados')
        continue
    if path.exists():
        raise SystemExit('Configuração sem banco: intervenção necessária; nada sobrescrito.')
    owner_pw, app_pw = secrets.token_urlsafe(36), secrets.token_urlsafe(36)
    sql = f"""CREATE ROLE {owner} LOGIN PASSWORD '{owner_pw}';
CREATE ROLE {runtime} LOGIN PASSWORD '{app_pw}';
CREATE DATABASE {db} OWNER {owner};
REVOKE ALL ON DATABASE {db} FROM PUBLIC;
GRANT CONNECT ON DATABASE {db} TO {runtime};
ALTER ROLE {runtime} IN DATABASE {db} SET search_path TO pg_catalog;
"""
    # stdin instead of command arguments; never log SQL containing passwords.
    result = subprocess.run(base, env=ENV, input=sql, text=True, capture_output=True)
    if result.returncode:
        raise SystemExit(f'Provisionamento de {db} falhou; examinar cluster sem expor SQL.')
    path.write_text(f'RM_DB_URL=jdbc:postgresql://127.0.0.1:55432/{db}\nRM_DB_USER={runtime}\nRM_DB_PASSWORD={app_pw}\nRM_MIGRATION_USER={owner}\nRM_MIGRATION_PASSWORD={owner_pw}\nRM_STAGE={stage}\n')
    path.chmod(0o600)
    run(base[:-1] + [db, '-c', f'REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO {runtime};'], capture_output=True)
    print(f'{db}: criado com proprietário/runtime exclusivos')
print('Cluster pronto somente em loopback; configurações privadas 0600.')

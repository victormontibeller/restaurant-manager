#!/usr/bin/env python3
"""Cluster efêmero do runner; somente CI, nunca servidor de homologação."""
import os
from pathlib import Path
import secrets
import subprocess

if os.environ.get('GITHUB_ACTIONS') != 'true':
    raise SystemExit('Exclusivo do runner GitHub Actions.')
root = Path(os.environ['RUNNER_TEMP']) / 'restaurant-manager'
root.mkdir(mode=0o700)
bin = Path('/usr/lib/postgresql/16/bin')
subprocess.run([str(bin/'initdb'),'-D',str(root/'data'),'--auth-local=trust','--auth-host=scram-sha-256','--encoding=UTF8','--locale=C.UTF-8'],check=True,stdout=subprocess.DEVNULL)
subprocess.run([str(bin/'pg_ctl'),'-D',str(root/'data'),'-l',str(root/'postgres.log'),'-o',f'-h 127.0.0.1 -p 55432 -k {root}','-w','start'],check=True)
owner, runtime = secrets.token_hex(32), secrets.token_hex(32)
for value in (owner,runtime):
    print(f'::add-mask::{value}',flush=True)
sql = f"""CREATE ROLE rm_test_owner LOGIN PASSWORD '{owner}';
CREATE ROLE rm_test_app LOGIN PASSWORD '{runtime}';
CREATE DATABASE rm_test OWNER rm_test_owner;
REVOKE ALL ON DATABASE rm_test FROM PUBLIC;
GRANT CONNECT ON DATABASE rm_test TO rm_test_app;
CREATE DATABASE rm_hml;
REVOKE ALL ON DATABASE rm_hml FROM PUBLIC;
"""
r = subprocess.run([str(bin/'psql'),'-X','-v','ON_ERROR_STOP=1','-h',str(root),'-p','55432','-d','postgres'],input=sql,text=True,capture_output=True)
if r.returncode: raise SystemExit('Falha no banco de CI.')
with open(os.environ['GITHUB_ENV'],'a') as f:
    f.write(f'RM_DB_URL=jdbc:postgresql://127.0.0.1:55432/rm_test\nRM_DB_USER=rm_test_app\nRM_DB_PASSWORD={runtime}\nRM_MIGRATION_USER=rm_test_owner\nRM_MIGRATION_PASSWORD={owner}\nRM_STAGE=test\n')

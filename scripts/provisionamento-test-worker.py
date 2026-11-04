"""Worker real do E2E, restrito a solicitação fictícia em rm_test.

Não cria resposta simulada. --falhar injeta falha transacional de auditoria
somente para o UUID testado e remove a constraint no finally.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import signal
import uuid


def main():
    def interromper(signum, frame):
        raise SystemExit(128 + signum)
    signal.signal(signal.SIGTERM, interromper)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('id', type=uuid.UUID)
    parser.add_argument('--falhar', action='store_true')
    args = parser.parse_args()
    if (os.environ.get('RM_STAGE') != 'test'
            or os.environ.get('RM_DB_URL') != 'jdbc:postgresql://127.0.0.1:55432/rm_test'
            or os.environ.get('RM_MIGRATION_USER') != 'rm_test_owner'):
        raise ValueError('Destino de teste recusado.')
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager'))
    jar = Path(os.environ['RM_PROVISION_JAR']).resolve()
    if not jar.is_relative_to(root.resolve() / 'builds') or jar.name != 'app.jar':
        raise ValueError('Artefato privado de build obrigatório.')
    gate = json.loads((jar.parent / 'gate.json').read_text())
    result = json.loads((jar.parent / 'result.json').read_text())
    if (not result['release_gate'] or result['exit_code'] != 0
            or result['git_sha'] != gate['git_sha']
            or hashlib.sha256(jar.read_bytes()).hexdigest() != gate['artifact_sha256']):
        raise ValueError('Artefato sem aprovação de build.')
    prefix = root / 'toolchains/postgres'
    env = dict(os.environ, PGPASSWORD=os.environ['RM_MIGRATION_PASSWORD'],
               LD_LIBRARY_PATH=str(prefix / 'usr/lib/x86_64-linux-gnu'))
    command = [str(prefix / 'usr/lib/postgresql/16/bin/psql'), '-X', '-h', '127.0.0.1',
               '-p', '55432', '-U', 'rm_test_owner', '-d', 'rm_test', '-At', '-v', 'ON_ERROR_STOP=1']

    def sql(query):
        return subprocess.check_output(command + ['-c', query], env=env, text=True, stderr=subprocess.PIPE, timeout=10).strip()

    if sql('select current_database(),current_user,inet_server_port(),host(inet_server_addr())') != 'rm_test|rm_test_owner|55432|127.0.0.1':
        raise ValueError('Conexão efetiva recusada.')
    if sql(f"select count(*) from public.solicitacao_provisionamento where id='{args.id}' and estado='SOLICITADO'") != '1':
        raise ValueError('Solicitação de teste pendente ausente.')
    constraint = 'teste_e2e_' + args.id.hex
    try:
        if args.falhar:
            sql(f"alter table public.auditoria_provisionamento add constraint {constraint} check(empresa_id<>'{args.id}'::uuid or evento<>'ATIVADO') not valid")
        code = subprocess.run([str(Path(os.environ['JAVA_HOME']) / 'bin/java'), '-Xmx128m',
                               '-XX:ActiveProcessorCount=2', '-jar', str(jar),
                               '--processar-solicitacao', str(args.id)], timeout=60).returncode
        expected = 'FALHOU' if args.falhar else 'CONCLUIDO'
        state = sql(f"select estado from public.solicitacao_provisionamento where id='{args.id}'")
        if state != expected or (code == 0) == args.falhar:
            raise ValueError('Worker não produziu o resultado esperado.')
        print(json.dumps({'git_sha': gate['git_sha'], 'id': str(args.id), 'estado': state, 'worker_exit': code}))
    finally:
        if args.falhar:
            sql(f'alter table public.auditoria_provisionamento drop constraint if exists {constraint}')


if __name__ == '__main__':
    main()

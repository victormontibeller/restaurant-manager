import unittest
from unittest.mock import Mock, patch
from contextlib import ExitStack, redirect_stdout
import io
import json
import os
from pathlib import Path
import sys
import tempfile
from hml_provisioning import dispatch_one, validate_fictitious, main
from provisioning_queue import Queue
import fcntl
import subprocess


class HmlProvisioningTest(unittest.TestCase):
    identity = '11111111-1111-4111-8111-111111111111'

    def test_lock_herdado_mantem_exclusao_apos_despacho(self):
        from hml_provisioning import deployment_lock
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as temporary:
            root = Path(temporary)
            with (root/'deploy.lock').open('a') as parent:
                fcntl.flock(parent, fcntl.LOCK_EX | fcntl.LOCK_NB)
                with deployment_lock(root, parent.fileno()) as inherited:
                    self.assertNotEqual(inherited.fileno(), parent.fileno())
                    with (root/'deploy.lock').open('a') as contender, self.assertRaises(BlockingIOError):
                        fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
                probe = subprocess.run([sys.executable, '-c',
                    'import sys; from pathlib import Path; from hml_provisioning import deployment_lock; '
                    'lock=deployment_lock(Path(sys.argv[1]),int(sys.argv[2])); '
                    'lock.__enter__(); lock.__exit__(None,None,None)', str(root), str(parent.fileno())],
                    cwd=Path(__file__).parent, pass_fds=(parent.fileno(),), capture_output=True, text=True)
                self.assertEqual(probe.returncode, 0, probe.stderr)
                bridge = """const {spawnSync}=require('node:child_process');
const [python,root,fd]=process.argv.slice(1);
const code='import sys; from pathlib import Path; from hml_provisioning import deployment_lock; lock=deployment_lock(Path(sys.argv[1]),3); lock.__enter__(); lock.__exit__(None,None,None)';
const result=spawnSync('bash',['-c','exec "$@"','bridge',python,'-c',code,root],{stdio:['pipe','pipe','pipe',Number(fd)]});
if(result.stderr)process.stderr.write(result.stderr);process.exit(result.status===null?1:result.status);
"""
                bridged = subprocess.run(['node', '-e', bridge, sys.executable, str(root), str(parent.fileno())],
                    cwd=Path(__file__).parent, pass_fds=(parent.fileno(),), capture_output=True, text=True)
                self.assertEqual(bridged.returncode, 0, bridged.stderr)
                with (root/'deploy.lock').open('a') as contender, self.assertRaises(BlockingIOError):
                    fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with deployment_lock(root, None):
                with (root/'deploy.lock').open('a') as contender, self.assertRaises(BlockingIOError):
                    fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def test_lock_herdado_recusa_arquivo_diferente_ou_redirecionado(self):
        from hml_provisioning import deployment_lock
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as temporary:
            root = Path(temporary)
            (root/'deploy.lock').touch()
            with (root/'other.lock').open('a') as other:
                with self.assertRaises(ValueError), deployment_lock(root, other.fileno()):
                    self.fail('Lock diferente aceito.')
            (root/'redirect').mkdir()
            (root/'redirect/deploy.lock').symlink_to(root/'deploy.lock')
            with self.assertRaises(ValueError), deployment_lock(root/'redirect', None):
                self.fail('Redirecionamento aceito.')

    def test_intencao_duravel_antecede_cli_e_readback(self):
        calls = []
        queue = Mock()
        queue.state.side_effect = ['SOLICITADO', 'CONCLUIDO']
        queue.execute.side_effect = lambda identity: calls.append('java') or 0
        result = dispatch_one(queue, self.identity, lambda state: calls.append(state))
        self.assertEqual(calls, ['executando', 'java'])
        self.assertTrue(result['approved'])
        self.assertFalse(result['reconciled_without_execution'])
        self.assertEqual(queue.state.call_count, 2)

    def test_conclusao_preexistente_reconcilia_sem_duplicar_cli(self):
        queue = Mock(); queue.state.return_value = 'CONCLUIDO'
        result = dispatch_one(queue, self.identity, Mock())
        self.assertTrue(result['approved'])
        self.assertTrue(result['reconciled_without_execution'])
        queue.execute.assert_not_called()

    def test_falha_exige_retomada_http_e_uuid_literal(self):
        queue = Mock(); queue.state.return_value = 'FALHOU'
        for value in [self.identity, self.identity.replace('-', ''), self.identity.upper().replace('1', 'A')]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                dispatch_one(queue, value, Mock())
        queue.execute.assert_not_called()

    def test_gravacao_falha_nao_executa_e_readback_incerto_nao_aprova(self):
        queue = Mock(); queue.state.return_value = 'SOLICITADO'
        with self.assertRaises(OSError):
            dispatch_one(queue, self.identity, Mock(side_effect=OSError('disco')))
        queue.execute.assert_not_called()
        queue.state.side_effect = ['SOLICITADO', OSError('conexao')]
        queue.execute.return_value = 0
        with self.assertRaises(OSError):
            dispatch_one(queue, self.identity, Mock())
        queue.execute.assert_called_once_with(self.identity)

    def test_saida_e_estado_devem_concordar(self):
        for exit_code, state in [(1, 'CONCLUIDO'), (124, 'SOLICITADO'), (0, 'FALHOU')]:
            queue = Mock(); queue.state.side_effect = ['SOLICITADO', state]; queue.execute.return_value = exit_code
            self.assertFalse(dispatch_one(queue, self.identity, Mock())['approved'])

    def test_recusa_dominio_externo_e_identidade_nao_ficticia(self):
        validate_fictitious({'host': 'hml-novo.localhost', 'fictitious': True})
        for data in [{'host': 'restaurante.example.com', 'fictitious': True},
                     {'host': 'hml.localhost', 'fictitious': False},
                     {'host': 'hml.localhost.evil', 'fictitious': True}, {}]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                validate_fictitious(data)

    def test_main_persiste_arvore_reconcilia_e_recusa_outra_intencao(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as temporary, ExitStack() as stack:
            root = Path(temporary)
            gate = dict(git_sha='a'*40, artifact_sha256='b'*64)
            before = dict(served_sha=gate['git_sha'], artifact_sha256=gate['artifact_sha256'], pid=123, health='UP')
            database = dict(attempt='fixture', database='rm_hml', candidate_oid='2', original_oid='1')
            rehearsal = root/'rehearsal.json'
            rehearsal.write_text(json.dumps(dict(gate, approved=True, database_restored=True,
                native_service_stopped=True, clone_equal=True, exit_code=0, migration_exit=0)))
            rehearsal.chmod(0o600)
            healthy = root/'healthy.json'; healthy.write_text('{}')
            env = dict(RM_HOME=str(root), RM_STAGE='hml', RM_DB_URL='jdbc:postgresql://127.0.0.1:55432/rm_hml',
                       RM_DB_USER='rm_hml_app', RM_MIGRATION_USER='rm_hml_owner', RM_DB_PASSWORD='fixture',
                       RM_MIGRATION_PASSWORD='fixture', RM_HML_PROVISIONING_ENABLED='true', JAVA_HOME='/private/java')
            environ = b'RM_STAGE=hml\0RM_DB_URL=jdbc:postgresql://127.0.0.1:55432/rm_hml\0RM_DB_USER=rm_hml_app\0RM_DB_PASSWORD=fixture\0'
            queue = Mock(); queue.sql.return_value = json.dumps(dict(host='hml.localhost', fictitious=True))
            queue.state.side_effect = ['SOLICITADO', 'CONCLUIDO']; queue.execute.return_value = 0
            original_identity = Queue.identity
            factory = stack.enter_context(patch('hml_provisioning.Queue', return_value=queue))
            factory.identity.side_effect = original_identity
            stack.enter_context(patch.dict(os.environ, env))
            stack.enter_context(patch('hml_provisioning.clean_sha', return_value='c'*40))
            stack.enter_context(patch('hml_provisioning.validate_artifact', return_value=gate))
            stack.enter_context(patch('hml_provisioning.verify', return_value=before))
            db = stack.enter_context(patch('hml_provisioning.runtime_database', return_value=database))
            stack.enter_context(patch.object(Path, 'read_bytes', return_value=environ))
            stack.enter_context(patch('hml_provisioning.artifact_hash', return_value='d'*64))
            stack.enter_context(patch('hml_provisioning.signal.signal'))
            paths = []
            fsync = os.fsync
            def synced(fd):
                paths.append(Path(os.readlink('/proc/self/fd/'+str(fd))))
                fsync(fd)
            stack.enter_context(patch('hml_provisioning.os.fsync', side_effect=synced))
            def execute(identity):
                self.assertIn(root, paths)
                self.assertIn(root/'provisioning', paths)
                self.assertTrue((root/'provisioning/hml-assisted'/identity/'intent.json').exists())
                return 0
            queue.execute.side_effect = execute
            argv = ['hml', '--job', str(root/'builds/job'), '--id', self.identity, '--rehearsal', str(rehearsal)]
            preflight_argv = ['hml', '--job', str(root/'builds/job'), '--rehearsal', str(rehearsal), '--check']
            with patch.object(sys, 'argv', preflight_argv), redirect_stdout(io.StringIO()) as output:
                self.assertEqual(main(), 0)
            queue.verify_migrations.assert_called_once_with()
            self.assertTrue(json.loads(output.getvalue())['preflight_approved'])
            self.assertFalse((root/'provisioning').exists())
            queue.execute.assert_not_called()
            queue.state.assert_not_called()
            queue.sql.assert_not_called()
            with patch.object(queue, 'verify_migrations', side_effect=ValueError('migration divergente')), \
                    patch.object(sys, 'argv', preflight_argv), self.assertRaises(ValueError):
                main()
            self.assertFalse((root/'provisioning').exists())
            queue.execute.assert_not_called()
            with patch.object(sys, 'argv', argv), redirect_stdout(io.StringIO()):
                self.assertEqual(main(), 0)
            # Todos os pais criados precisam ser persistidos ANTES de executar Java.
            self.assertIn(root, paths)
            self.assertIn(root/'provisioning', paths)
            queue.state.side_effect = None; queue.state.return_value = 'CONCLUIDO'
            with patch.object(sys, 'argv', argv), self.assertRaises(ValueError):
                main()
            with patch.object(sys, 'argv', argv+['--resume']), redirect_stdout(io.StringIO()):
                self.assertEqual(main(), 0)
            queue.execute.assert_called_once_with(self.identity)
            with patch('hml_provisioning.verify', side_effect=[before, dict(before, pid=456)]), \
                    patch.object(sys, 'argv', argv+['--resume']), redirect_stdout(io.StringIO()):
                self.assertEqual(main(), 1)
            receipts = [json.loads(p.read_text()) for p in (root/'provisioning/hml-assisted'/self.identity).glob('*/result.json')]
            self.assertEqual(sum(r['approved'] is False for r in receipts), 1)
            db.return_value = dict(database, candidate_oid='3')
            with patch.object(sys, 'argv', argv+['--resume']), self.assertRaises(ValueError):
                main()
            queue.execute.assert_called_once_with(self.identity)


if __name__ == '__main__':
    unittest.main()

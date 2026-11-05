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


class HmlProvisioningTest(unittest.TestCase):
    identity = '11111111-1111-4111-8111-111111111111'

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

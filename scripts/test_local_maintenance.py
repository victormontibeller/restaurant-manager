"""Guardas do ensaio; fakes não aprovam DDL ou startup PostgreSQL/Java reais."""
import hashlib
import json
import os
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from local_maintenance import LocalAdmin, run_local_maintenance, runtime_gate
from test_maintenance_database import FakeAdmin


class LocalMaintenanceTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ['TMPDIR'])
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / 'cluster').mkdir()
        (self.root / 'socket').mkdir()
        (self.root / 'app.jar').write_bytes(b'jar-ficticio-teste-unitario')
        log = (self.root / 'execution.log').open('wb')
        self.addCleanup(log.close)
        self.exercise = SimpleNamespace(root=self.root, cluster=self.root/'cluster',
            socket=self.root/'socket', pg=self.root/'bin', env={'PATH':'/usr/bin:/bin'},
            active=True, process=None, session=None, log=log, record={},
            args=SimpleNamespace(jar_sha256=hashlib.sha256((self.root/'app.jar').read_bytes()).hexdigest()))
        self.exercise.stop_app = MagicMock(side_effect=lambda: setattr(self.exercise, 'process', None))
        self.exercise.close_session = MagicMock(side_effect=lambda: setattr(self.exercise, 'session', None))

    def admin(self, **replacement):
        import pwd
        identity = dict(database='postgres', user=pwd.getpwuid(os.getuid()).pw_name,
                        directory=str(self.root/'cluster'), port='55433', socket=True, superuser='on')
        identity.update(replacement)
        with patch.object(LocalAdmin, 'query', return_value=json.dumps(identity)):
            return LocalAdmin(self.exercise, self.exercise.log)

    def startup(self, diagnostic=None, returncode=1, error=ValueError):
        def start():
            self.exercise.process = SimpleNamespace(pid=123, returncode=returncode,
                                                    poll=lambda:returncode)
            if diagnostic is not None:
                self.exercise.log.write(diagnostic.encode())
                self.exercise.log.flush()
                raise error('Startup fictício')
        self.exercise.start_app = MagicMock(side_effect=start)

    def test_admin_usa_somente_socket_e_porta_do_clone(self):
        admin = self.admin()
        self.assertEqual(admin.command[-6:], ['-h',str(self.root/'socket'),'-p','55433','-d','postgres'])
        self.assertNotIn('55432', admin.command)
        self.assertEqual(admin.env['PGCONNECT_TIMEOUT'], '5')

    def test_admin_recusa_origem_tcp_usuario_e_cluster_divergentes(self):
        for change in [dict(port='55432'), dict(socket=False), dict(user='rm_test_owner'),
                       dict(database='rm_test'), dict(directory='/outro/cluster'), dict(superuser='off')]:
            with self.subTest(change=change), self.assertRaisesRegex(ValueError, 'Identidade'):
                self.admin(**change)

    def test_admin_recusa_redirecionamento_antes_da_consulta(self):
        (self.root/'socket').rmdir()
        (self.root/'socket').symlink_to(self.root/'cluster')
        with patch.object(LocalAdmin, 'query') as query, self.assertRaisesRegex(ValueError, 'privado'):
            LocalAdmin(self.exercise, self.exercise.log)
        query.assert_not_called()

    def test_admin_recusa_raiz_nao_privada(self):
        self.root.chmod(0o755)
        with patch.object(LocalAdmin, 'query') as query, self.assertRaisesRegex(ValueError, 'privado'):
            LocalAdmin(self.exercise, self.exercise.log)
        query.assert_not_called()

    def test_falha_sql_exige_divisao_por_zero_e_codigo_nao_zero(self):
        admin = self.admin()
        for code,message in [(0,'division by zero'), (1,'permission denied')]:
            with self.subTest(code=code,message=message), patch.object(admin, 'verify'), \
                    patch('local_maintenance.subprocess.run', return_value=SimpleNamespace(
                        returncode=code, stderr=message, stdout='')), self.assertRaises(ValueError):
                admin.database_query('select 1/0', expected_failure=True)
        with patch.object(admin, 'verify'), patch('local_maintenance.subprocess.run',
                return_value=SimpleNamespace(returncode=1, stderr='ERROR: division by zero', stdout='')) as run:
            admin.database_query('select 1/0', expected_failure=True)
        self.assertEqual(run.call_args.args[0][-3:], ['rm_test','-c','select 1/0'])

    def test_gate_compativel_exige_startup_saudavel_e_para_processo(self):
        self.startup(returncode=None)
        result = runtime_gate(self.exercise, True)
        self.assertTrue(result['approved'])
        self.assertTrue(result['healthy'])
        self.assertIsNone(self.exercise.process)

    def test_gate_incompativel_exige_causa_exata_do_flyway(self):
        self.startup('FlywayValidateException: Detected applied migration not resolved locally: 9999')
        result = runtime_gate(self.exercise, False)
        self.assertTrue(result['approved'])
        self.assertFalse(result['healthy'])
        self.assertEqual(result['exit_code'], 1)
        self.assertIsNone(self.exercise.process)

    def test_gate_nao_aceita_falha_generica_timeout_ou_processovivo(self):
        for message,code,error in [('Falha TLS',1,ValueError), ('9999',1,ValueError),
            ('FlywayValidateException: Detected applied migration not resolved locally: 9999',None,ValueError),
            ('FlywayValidateException: Detected applied migration not resolved locally: 9999',0,ValueError),
            ('FlywayValidateException: Detected applied migration not resolved locally: 9999',1,TimeoutError)]:
            with self.subTest(message=message,code=code,error=error):
                self.startup(message,code,error)
                with self.assertRaises((ValueError,TimeoutError)):
                    runtime_gate(self.exercise, False)
                self.assertIsNone(self.exercise.process)

    def test_gate_ignora_erro_antigo_no_log(self):
        self.exercise.log.write(b'FlywayValidateException: Detected applied migration not resolved locally: 9999\n')
        self.startup('permission denied')
        with self.assertRaises(ValueError):
            runtime_gate(self.exercise, False)

    def test_gate_recusa_candidato_incompativel_saudavel(self):
        self.startup(returncode=None)
        with self.assertRaisesRegex(ValueError, 'ficou saudável'):
            runtime_gate(self.exercise, False)
        self.assertIsNone(self.exercise.process)

    def test_gate_compativel_nao_aceita_incompatibilidade_esperada_em_outro_cenario(self):
        self.startup('FlywayValidateException: Detected applied migration not resolved locally: 9999')
        with self.assertRaises(ValueError):
            runtime_gate(self.exercise, True)

    def fake_admin(self):
        admin = FakeAdmin()
        admin.verify = MagicMock()
        admin.verify_policy = MagicMock()
        admin.command = ['psql', '-d', 'postgres']
        admin.env = {}
        admin.database_query = MagicMock(side_effect=lambda query, **kwargs:
            '1|1' if query.startswith('select (select count') else
            't|t' if query.startswith('select to_regclass') else '')
        admin.query = MagicMock(return_value='1024')
        return admin

    def run_fake(self, admin, gate=None):
        with patch('local_maintenance.LocalAdmin', return_value=admin), \
                patch('local_maintenance.runtime_gate', side_effect=gate or (lambda e,c:dict(approved=True,healthy=c))) as gates, \
                patch('local_maintenance.snapshot', return_value={'snapshot':'igual'}), \
                patch('local_maintenance.verify_inventory'), patch('local_maintenance.Session'):
            result = run_local_maintenance(self.exercise)
        return result, gates

    def test_orquestracao_retorna_original_por_oid_e_preserva_candidato_bloqueado(self):
        admin = self.fake_admin()
        result, gates = self.run_fake(admin)
        self.assertTrue(result['approved'])
        self.assertEqual([call.args[1] for call in gates.call_args_list], [True,False,True])
        self.assertEqual(admin.metadata('rm_test')['oid'], 41)
        self.assertEqual(admin.metadata(result['preserved_candidate'])['oid'], 42)
        self.assertFalse(admin.metadata(result['preserved_candidate'])['allowed'])
        self.assertFalse(result['database_drop'])
        self.assertFalse(result['downmigration'])
        self.assertFalse(result['candidate_promoted'])
        self.assertEqual((self.root/'maintenance/result.json').stat().st_mode & 0o777, 0o600)

    def test_falha_inesperada_de_gate_ainda_retorna_original_sem_aprovar(self):
        admin = self.fake_admin()
        def gate(exercise, compatible):
            if not compatible:
                raise ValueError('Falha TLS sem evidência de incompatibilidade')
            return {'approved':True}
        with self.assertRaisesRegex(ValueError, 'TLS'):
            self.run_fake(admin, gate)
        self.assertEqual(admin.metadata('rm_test')['oid'],41)
        self.assertTrue(any(name.startswith('rm_test_failed_') for name in admin.databases))
        self.assertFalse(json.loads((self.root/'maintenance/result.json').read_text())['approved'])

    def test_conexoes_estranhas_bloqueiam_troca_sem_encerra_las(self):
        admin = self.fake_admin()
        admin.sessions = 1
        with self.assertRaisesRegex(ValueError, 'Conexões existentes'):
            self.run_fake(admin)
        self.assertEqual(admin.events, [])
        self.assertEqual(admin.metadata('rm_test')['oid'],41)

    def test_manutencao_recusa_runtime_ativo_antes_de_criar_recibo(self):
        self.exercise.process = object()
        with self.assertRaisesRegex(ValueError, 'aplicação parada'):
            run_local_maintenance(self.exercise)
        self.assertFalse((self.root/'maintenance').exists())


if __name__ == '__main__':
    unittest.main()

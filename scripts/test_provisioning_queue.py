import unittest
import uuid
from unittest.mock import patch
import subprocess
import tempfile
import os
from pathlib import Path
import json
import hashlib
import zipfile
import signal
import sys
import time
import fcntl

from provisioning_queue import Queue, main, migration_checksums, process_batch, validate_artifact, validate_environment


class FakeQueue:
    def __init__(self, states, exits=None):
        self.ids = [str(uuid.uuid4()) for _ in states]
        self.states = dict(zip(self.ids, states))
        self.exits = exits or {}
        self.called = []
        self.selected_limit = None

    def pending(self, limit):
        self.selected_limit = limit
        return self.ids[:limit]

    def execute(self, identity):
        self.called.append(identity)
        return self.exits.get(identity, 0)

    def state(self, identity):
        return self.states[identity]

    def verify_migrations(self):
        pass

    def backlog(self):
        return {}


class ProvisioningQueueTest(unittest.TestCase):
    def test_lote_limitado_confirma_cada_resultado(self):
        queue = FakeQueue(['CONCLUIDO'] * 3)
        results = process_batch(queue, 2)
        self.assertEqual(queue.selected_limit, 2)
        self.assertEqual(queue.called, queue.ids[:2])
        self.assertEqual(len(results), 2)
        self.assertTrue(all(r['approved'] for r in results))

    def test_falha_persistida_nao_bloqueia_proxima_solicitacao(self):
        queue = FakeQueue(['FALHOU', 'CONCLUIDO'])
        queue.exits[queue.ids[0]] = 1
        results = process_batch(queue, 5)
        self.assertEqual([r['state'] for r in results], ['FALHOU', 'CONCLUIDO'])
        self.assertEqual([r['approved'] for r in results], [False, True])

    def test_concorrencia_ou_interrupcao_preserva_pendente_e_para_lote(self):
        queue = FakeQueue(['SOLICITADO', 'CONCLUIDO'])
        queue.exits[queue.ids[0]] = 75
        results = process_batch(queue, 5)
        self.assertEqual(queue.called, queue.ids[:1])
        self.assertEqual(results[0]['state'], 'SOLICITADO')
        self.assertFalse(results[0]['approved'])

    def test_exit_zero_sem_estado_confirmado_nao_aprova(self):
        queue = FakeQueue(['FALHOU'])
        self.assertFalse(process_batch(queue, 1)[0]['approved'])

    def test_estado_confirmado_com_exit_falho_nao_oculta_falha(self):
        queue = FakeQueue(['CONCLUIDO'])
        queue.exits[queue.ids[0]] = 124
        self.assertFalse(process_batch(queue, 1)[0]['approved'])

    def test_limite_invalido_recusado_antes_de_consultar(self):
        queue = FakeQueue([])
        for limit in [0, -1, 11, True, 1.5]:
            with self.subTest(limit=limit), self.assertRaises(ValueError):
                process_batch(queue, limit)
        self.assertIsNone(queue.selected_limit)

    def test_fila_vazia_nao_chama_worker(self):
        queue = FakeQueue([])
        self.assertEqual(process_batch(queue, 3), [])
        self.assertEqual(queue.called, [])

    def test_progresso_salvo_antes_da_proxima_solicitacao(self):
        queue = FakeQueue(['CONCLUIDO', 'CONCLUIDO'])
        saved = []
        def persist(result):
            self.assertEqual(len(queue.called), len(saved) + 1)
            saved.append(result)
        self.assertEqual(process_batch(queue, 2, persist), saved)

    def test_allowlist_ambiente_e_identidade_efetiva(self):
        for stage in ['dev', 'test']:
            env = dict(RM_STAGE=stage, RM_DB_URL=f'jdbc:postgresql://127.0.0.1:55432/rm_{stage}',
                       RM_DB_USER=f'rm_{stage}_app', RM_MIGRATION_USER=f'rm_{stage}_owner',
                       RM_DB_PASSWORD='ficticio', RM_MIGRATION_PASSWORD='ficticio', JAVA_HOME='/private/java')
            self.assertEqual(validate_environment(env), stage)
            for key in ['RM_STAGE', 'RM_DB_URL', 'RM_DB_USER', 'RM_MIGRATION_USER']:
                with self.subTest(key=key), self.assertRaises(ValueError):
                    validate_environment(dict(env, **{key: 'hml'}))
            with patch.object(Queue, 'sql', return_value='rm_hml|rm_hml_app|55432|127.0.0.1'), self.assertRaises(ValueError):
                Queue(env, Path('/private'), Path('/private/builds/job'), Path('/private/attempt'))

    def test_uuid_invalido_recusado_sem_normalizar(self):
        canonical = str(uuid.uuid4())
        self.assertEqual(Queue.identity(canonical), canonical)
        for value in [canonical.upper(), canonical.replace('-', ''), "' OR true", None]:
            with self.subTest(value=value), self.assertRaises((ValueError, TypeError)):
                Queue.identity(value)

    def test_hml_exige_opt_in_explicito_e_nao_e_aceita_pelo_despachante(self):
        env = dict(RM_STAGE='hml', RM_DB_URL='jdbc:postgresql://127.0.0.1:55432/rm_hml',
                   RM_DB_USER='rm_hml_app', RM_MIGRATION_USER='rm_hml_owner',
                   RM_DB_PASSWORD='ficticio', RM_MIGRATION_PASSWORD='ficticio',
                   JAVA_HOME='/private/java', RM_HML_PROVISIONING_ENABLED='true')
        with self.assertRaises(ValueError):
            validate_environment(env)
        self.assertEqual(validate_environment(env, allow_hml=True), 'hml')
        for key, value in [('RM_HML_PROVISIONING_ENABLED', 'false'), ('RM_DB_USER', 'rm_test_app'),
                           ('RM_DB_URL', 'jdbc:postgresql://127.0.0.1:55432/rm_test'),
                           ('RM_MIGRATION_USER', 'rm_test_owner')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_environment(dict(env, **{key: value}), allow_hml=True)
        with patch.object(Queue, 'sql', return_value='rm_hml|rm_hml_app|55432|127.0.0.1'):
            queue = Queue(env, Path('/private'), Path('/private/builds/job'), Path('/private/attempt'), allow_hml=True)
        self.assertEqual(queue.env['RM_HML_PROVISIONING_ENABLED'], 'true')
        self.assertEqual(queue.stage, 'hml')

    def test_timeout_fica_incerto_e_nao_propaga_ambiente_hermes(self):
        env = dict(RM_STAGE='test', RM_DB_URL='jdbc:postgresql://127.0.0.1:55432/rm_test',
                   RM_DB_USER='rm_test_app', RM_MIGRATION_USER='rm_test_owner',
                   RM_DB_PASSWORD='ficticio', RM_MIGRATION_PASSWORD='ficticio',
                   JAVA_HOME='/private/java', SEGREDO_ALHEIO='nao-propagar')
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as folder:
            with patch.object(Queue, 'sql', return_value='rm_test|rm_test_app|55432|127.0.0.1'):
                queue = Queue(env, Path('/private'), Path('/private/builds/job'), Path(folder))
            with patch('provisioning_queue.subprocess.run', side_effect=subprocess.TimeoutExpired('java', 90)) as run:
                self.assertEqual(queue.execute(str(uuid.uuid4())), 124)
                self.assertNotIn('SEGREDO_ALHEIO', run.call_args.kwargs['env'])
                self.assertNotIn('RM_DB_PASSWORD', run.call_args.args[0])
                self.assertEqual(run.call_args.kwargs['timeout'], 90)

    def test_consulta_limita_ordem_e_ignora_falhas_para_retry_automatico(self):
        queue = object.__new__(Queue)
        identity = str(uuid.uuid4())
        with patch.object(queue, 'sql', return_value=identity) as sql:
            self.assertEqual(queue.pending(3), [identity])
            self.assertIn("where estado='SOLICITADO' order by criado_em,id limit 3", sql.call_args.args[0])
        with patch.object(queue, 'sql', return_value='INDEFINIDO'), self.assertRaises(ValueError):
            queue.state(identity)

    def test_migration_checksum_confere_conteudo_e_nao_fim_de_linha(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as folder:
            jar = Path(folder) / 'app.jar'
            with zipfile.ZipFile(jar, 'w') as archive:
                archive.writestr('BOOT-INF/classes/db/migration/public/V1__teste.sql', '\ufeff123\r\n456\n789\r')
            self.assertEqual(migration_checksums(jar, 'public'), {'V1__teste.sql': -873187034})
            with self.assertRaises(ValueError):
                migration_checksums(jar, 'tenant')
            queue = object.__new__(Queue)
            queue.job = Path(folder)
            with patch.object(queue, 'sql', return_value='[{"script":"V1__teste.sql","checksum":0,"success":true}]'), self.assertRaises(ValueError):
                queue.verify_migrations()

    def test_conclusao_exige_empresa_e_dominio(self):
        queue = object.__new__(Queue)
        for count in ['0', '2']:
            with patch.object(queue, 'sql', side_effect=['CONCLUIDO', count]), self.assertRaises(ValueError):
                queue.state(str(uuid.uuid4()))
        with patch.object(queue, 'sql', side_effect=['CONCLUIDO', '1']):
            self.assertEqual(queue.state(str(uuid.uuid4())), 'CONCLUIDO')

    def test_gate_valido_nao_aceita_binario_antigo_ou_adulterado(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as folder:
            root = Path(folder); job = root / 'builds/job'; repo = root / 'runner'
            source = Path('backend/src/main/java/br/com/restaurantmanager/RestaurantManagerApplication.java')
            for base in [repo, job / 'checkout']:
                (base / source).parent.mkdir(parents=True)
                (base / source).write_text('args[0].equals("--processar-solicitacao")')
                (base / 'backend/pom.xml').write_text('<project/>')
            jar = job / 'app.jar'; jar.write_bytes(b'fixture-unitaria-nao-release')
            gate = dict(git_sha='a'*40, artifact_sha256=hashlib.sha256(jar.read_bytes()).hexdigest(), checks='backend+frontend')
            (job / 'gate.json').write_text(json.dumps(gate))
            (job / 'result.json').write_text(json.dumps(dict(gate, release_gate=True, exit_code=0)))
            with patch('provisioning_queue.__file__', str(repo / 'scripts/provisioning_queue.py')), patch('provisioning_queue.clean_sha'):
                self.assertEqual(validate_artifact(job, root), gate)
                (job / 'checkout' / source).write_text('SpringApplication.run()')
                with self.assertRaises(ValueError):
                    validate_artifact(job, root)
                (repo / source).write_text('SpringApplication.run()')
                with self.assertRaises(ValueError):
                    validate_artifact(job, root)
                jar.write_bytes(b'alterado')
                with self.assertRaises(ValueError):
                    validate_artifact(job, root)

    def test_recusa_concorrente_nao_substitui_ponteiro_ativo(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as folder:
            root = Path(folder); attempts = root / 'provisioning/test'; attempts.mkdir(parents=True)
            latest = attempts / 'latest.json'; latest.write_text('{"attempt":"execucao-ativa"}')
            env = dict(RM_HOME=folder, RM_STAGE='test', RM_DB_URL='jdbc:postgresql://127.0.0.1:55432/rm_test',
                       RM_DB_USER='rm_test_app', RM_MIGRATION_USER='rm_test_owner')
            with (root / 'deploy.lock').open('w') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                with patch.dict(os.environ, env), patch.object(sys, 'argv', ['queue', str(root / 'builds/job')]), \
                        patch('provisioning_queue.validate_artifact', return_value=dict(git_sha='a'*40,artifact_sha256='b'*64)), \
                        patch('provisioning_queue.clean_sha', return_value='c'*40), patch('provisioning_queue.Queue') as queue:
                    self.assertEqual(main(), 75)
                    queue.assert_not_called()
            self.assertEqual(json.loads(latest.read_text()), {'attempt':'execucao-ativa'})
            results = [json.loads(p.read_text()) for p in attempts.glob('*/result.json')]
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]['error_type'], 'OCUPADO')

    def test_resultado_incerto_preserva_pausa_antes_de_executar(self):
        for failure in ('execute', 'state', 'progress'):
            with self.subTest(failure=failure), tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as folder:
                root = Path(folder)
                queue = FakeQueue(['CONCLUIDO'])
                identity = queue.ids[0]
                pause = root / 'provisioning/test/paused.json'
                original = queue.execute
                def execute(identity):
                    self.assertEqual(json.loads(pause.read_text())['id'], identity)
                    if failure == 'execute':
                        raise InterruptedError('Interrupção controlada')
                    return original(identity)
                queue.execute = execute
                queue.verify_migrations = lambda: None
                queue.backlog = lambda: {}
                if failure == 'state':
                    queue.state = lambda identity: (_ for _ in ()).throw(OSError('Leitura indisponível'))
                env = dict(RM_HOME=folder, RM_STAGE='test', RM_DB_URL='jdbc:postgresql://127.0.0.1:55432/rm_test',
                           RM_DB_USER='rm_test_app', RM_MIGRATION_USER='rm_test_owner')
                from release_support import atomic_json as save
                def persist(path, value):
                    if failure == 'progress' and path.name == 'progress.json':
                        raise OSError('Gravação indisponível')
                    save(path, value)
                with patch.dict(os.environ, env), patch.object(sys, 'argv', ['queue', str(root / 'builds/job')]), \
                        patch('provisioning_queue.validate_artifact', return_value=dict(git_sha='a'*40, artifact_sha256='b'*64)), \
                        patch('provisioning_queue.clean_sha', return_value='c'*40), \
                        patch('provisioning_queue.Queue', return_value=queue), patch('provisioning_queue.atomic_json', side_effect=persist):
                    self.assertEqual(main(), 1)
                    self.assertEqual(json.loads(pause.read_text())['id'], identity)
                    calls = list(queue.called)
                    self.assertEqual(main(), 1)
                    self.assertEqual(queue.called, calls)

    def test_retomada_explicita_remove_pausa_so_apos_confirmacao(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as folder:
            root = Path(folder); attempts = root / 'provisioning/test'; attempts.mkdir(parents=True)
            pause = attempts / 'paused.json'; original = {'id': str(uuid.uuid4()), 'attempt': 'anterior'}
            pause.write_text(json.dumps(original))
            queue = FakeQueue(['CONCLUIDO', 'FALHOU']); queue.verify_migrations = lambda: None; queue.backlog = lambda: {}
            queue.exits[queue.ids[1]] = 1
            env = dict(RM_HOME=folder, RM_STAGE='test', RM_DB_URL='jdbc:postgresql://127.0.0.1:55432/rm_test',
                       RM_DB_USER='rm_test_app', RM_MIGRATION_USER='rm_test_owner')
            with patch.dict(os.environ, env), patch.object(sys, 'argv', ['queue', str(root / 'builds/job'), '--resume']), \
                    patch('provisioning_queue.validate_artifact', return_value=dict(git_sha='a'*40, artifact_sha256='b'*64)), \
                    patch('provisioning_queue.clean_sha', return_value='c'*40), patch('provisioning_queue.Queue', return_value=queue):
                self.assertEqual(main(), 1)  # FALHOU confirmado não vira aprovação.
            self.assertFalse(pause.exists())
            self.assertEqual(queue.called, queue.ids)
            saved = list(attempts.glob('*/acknowledged-pause.json'))
            self.assertEqual(len(saved), 1)
            self.assertEqual(json.loads(saved[0].read_text()), original)

    def test_sigterm_recolhe_filho_e_libera_lock(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as folder:
            root = Path(folder); pidfile = root / 'child.pid'; executable = root / 'java-ficticio'
            executable.write_text('#!/usr/bin/python3\nimport os,time,pathlib\npathlib.Path('+repr(str(pidfile))+').write_text(str(os.getpid()))\ntime.sleep(30)\n')
            executable.chmod(0o700)
            scripts = str(Path(__file__).resolve().parent)
            code = ('import sys,signal,pathlib,fcntl;sys.path.insert(0,'+repr(scripts)+');'
                    'from provisioning_queue import Queue,interrupt,process_batch;from release_support import atomic_json;signal.signal(signal.SIGTERM,interrupt);'
                    'q=object.__new__(Queue);q.java=pathlib.Path('+repr(str(executable))+');'
                    'q.job=q.attempt=pathlib.Path('+repr(folder)+');q.env={};'
                    'f=(q.attempt/"lock").open("w");fcntl.flock(f,fcntl.LOCK_EX);q.lock_fd=f.fileno();'
                    'q.pending=lambda limit:['+repr(str(uuid.uuid4()))+'];'
                    'process_batch(q,1,on_start=lambda identity:atomic_json(q.attempt/"paused.json",dict(id=identity)))')
            child = subprocess.Popen([sys.executable, '-c', code], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                deadline = time.monotonic() + 10
                while not pidfile.exists() and time.monotonic() < deadline:
                    time.sleep(.05)
                self.assertTrue(pidfile.exists())
                pid = int(pidfile.read_text())
                child.terminate(); child.wait(timeout=10)
                self.assertTrue((root / 'paused.json').exists())
                with self.assertRaises(ProcessLookupError):
                    os.kill(pid, 0)
                with (root / 'lock').open('a') as lock:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            finally:
                if child.poll() is None:
                    child.kill(); child.wait(timeout=10)


if __name__ == '__main__':
    unittest.main()

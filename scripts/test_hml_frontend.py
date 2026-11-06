"""Igualdade de backend e recuperação binária; serviços simulados aqui."""
import os
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
import zipfile
from contextlib import ExitStack

from hml_frontend import (Replacement, require_same_backend, require_login_startup_change,
                          replace_frontend, recover_frontend, verify_frontend_record)
from release_support import artifact_hash


class FrontendReplacementTest(unittest.TestCase):
    def login_jars(self, directory, extra=None):
        prefix = 'BOOT-INF/classes/'
        package = prefix + 'br/com/restaurantmanager/identidade/'
        files = {prefix + 'db/migration/public/V1.sql': b'SELECT 1;',
                 prefix + 'static/index.html': b'frontend preservado',
                 prefix + 'application.yml': b'      hibernate.jdbc.time_zone: UTC\n',
                 package + 'Usuario.class': b'entidade anterior',
                 package + 'IdentidadeRepository.class': b'consulta anterior',
                 package + 'JwtConfiguration.class': b'jwt preservado',
                 'BOOT-INF/lib/sdk.jar': b'biblioteca preservada'}
        changed = dict(files)
        changed[package + 'Usuario.class'] = b'entidade com named query'
        changed[package + 'IdentidadeRepository.class'] = b'createNamedQuery'
        changed[prefix + 'application.yml'] += (
            '      # Compila/valida a HQL nomeada no startup, não no primeiro login.\n'
            '      hibernate.query.startup_check: true\n').encode()
        changed.update(extra or {})
        paths = []
        for name, entries in [('old.jar', files), ('new.jar', changed)]:
            path = Path(directory) / name
            with zipfile.ZipFile(path, 'w') as archive:
                for key, value in entries.items():
                    archive.writestr(key, value)
            paths.append(path)
        return paths

    def test_opt_in_login_aceita_so_correcao_delimitada(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            old, new = self.login_jars(directory)
            with self.assertRaises(ValueError):
                require_same_backend(old, new)
            require_login_startup_change(old, new)

    def test_opt_in_login_recusa_mudancas_fora_do_incremento(self):
        entries = ['BOOT-INF/lib/sdk.jar', 'BOOT-INF/classes/static/index.html',
                   'BOOT-INF/classes/db/migration/public/V1.sql',
                   'BOOT-INF/classes/db/migration/callback.conf',
                   'BOOT-INF/classes/br/com/restaurantmanager/identidade/JwtConfiguration.class',
                   'BOOT-INF/classes/application.yml', 'META-INF/MANIFEST.MF']
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            for entry in entries:
                with self.subTest(entry=entry), self.assertRaises(ValueError):
                    require_login_startup_change(*self.login_jars(directory, {entry: b'alterado'}))
            old, new = self.login_jars(directory)
            with zipfile.ZipFile(new, 'a') as archive:
                archive.writestr('BOOT-INF/lib/sdk.jar', b'biblioteca preservada')
            with self.assertRaises(ValueError):
                require_login_startup_change(old, new)

    def test_modo_legado_aceito_modo_desconhecido_recusado(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            ops = self.disk_operations(Path(directory))
            with patch('hml_frontend.clean_sha', return_value='e' * 40):
                ops.prepare()
            ops.complete(dict(served_sha='b' * 40))
            path = ops.directory / 'journal.json'
            record = json.loads(path.read_text())
            record.pop('mode')
            path.write_text(json.dumps(record))
            verify_frontend_record(ops.attempt, ops.gate)
            ops.load()
            self.assertEqual(ops.mode, 'frontend')
            record['mode'] = 'desconhecido'
            path.write_text(json.dumps(record))
            with self.assertRaisesRegex(ValueError, 'Modo'):
                verify_frontend_record(ops.attempt, ops.gate)
            with self.assertRaisesRegex(ValueError, 'Modo'):
                ops.load()

    def test_journal_ausente_com_historico_ou_preparacao_falha_fechado(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            attempt = Path(directory)
            verify_frontend_record(attempt, {})  # Sem qualquer troca: legado válido.
            for name in ('frontend-history-' + 'a' * 32, 'frontend-preparing-' + 'b' * 32):
                with self.subTest(name=name):
                    marker = attempt / name
                    marker.mkdir()
                    with self.assertRaisesRegex(ValueError, 'reconciliar'):
                        verify_frontend_record(attempt, {})
                    marker.rmdir()

    def test_encadeamento_explicito_preserva_historico_e_retorna_anterior_imediato(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory, ExitStack() as stack:
            ops = self.disk_operations(Path(directory))
            stack.enter_context(patch('hml_frontend.clean_sha', return_value='e' * 40))
            stack.enter_context(patch('hml_frontend.systemctl'))
            ops.prepare()
            ops.install()
            observed = dict(served_sha=ops.gate['git_sha'], artifact_sha256=ops.gate['artifact_sha256'], pid=123)
            ops.complete(observed)
            with self.assertRaisesRegex(ValueError, 'Troca já registrada'):
                ops.preflight()
            prior = (ops.directory / 'journal.json').read_bytes()
            next_gate = dict(ops.gate, git_sha='f' * 40)
            ops.job = ops.root / 'job'
            stack.enter_context(patch('hml_frontend.verify', return_value=observed))
            stack.enter_context(patch('hml_frontend.durable_artifact', return_value=(ops.artifact, next_gate)))
            stack.enter_context(patch('hml_frontend.validate_rehearsal'))
            stack.enter_context(patch('hml_frontend.validate_runtime'))
            guard = stack.enter_context(patch('hml_frontend.require_login_startup_change'))
            original = Path.read_bytes
            def contents(path):
                return b'RM_STAGE=hml\0' if str(path) == '/proc/123/environ' else original(path)
            stack.enter_context(patch.object(Path, 'read_bytes', contents))
            ops.mode = 'login-startup'
            ops.preflight()
            guard.assert_called_once_with(ops.old_release / 'app.jar', ops.artifact)
            self.assertEqual(ops.old_state['git_sha'], 'b' * 40)
            ops.prepare()
            assert ops.archive is not None
            self.assertEqual((ops.archive / 'journal.json').read_bytes(), prior)
            self.assertEqual(ops.record['mode'], 'login-startup')
            ops.install()
            # O retorno não depende de o novo JAR ainda estar íntegro.
            (ops.release / 'app.jar').write_bytes(b'corrompido')
            ops.load()
            stack.enter_context(patch('hml_frontend.subprocess.check_output', return_value='0'))
            stack.enter_context(patch('hml_frontend.wait_for_release', return_value=observed))
            recover_frontend(ops)
            self.assertEqual(json.loads((ops.root / 'candidate.json').read_text())['git_sha'], 'b' * 40)
            self.assertEqual(json.loads((ops.directory / 'journal.json').read_text())['state'], 'anterior-restaurado')
            self.assertEqual((ops.archive / 'journal.json').read_bytes(), prior)
            self.assertEqual((ops.root / 'healthy.json').read_text(), 'baseline original')

    def test_interrupcao_entre_renames_nao_para_servico_e_bloqueia_continuacao(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            ops = self.disk_operations(Path(directory))
            with patch('hml_frontend.clean_sha', return_value='e' * 40), patch('hml_frontend.systemctl'):
                ops.prepare()
                ops.install()
                ops.complete(dict(served_sha='b' * 40))
                unit_before = ops.unit.read_bytes()
                journal_before = (ops.directory / 'journal.json').read_bytes()
                ops.archive = ops.attempt / ('frontend-history-' + 'd' * 32)
                original = Path.rename
                def interrupted(path, target):
                    if path.name.startswith('frontend-preparing-'):
                        raise OSError('interrupção entre renames')
                    return original(path, target)
                with patch.object(Path, 'rename', interrupted), self.assertRaises(OSError):
                    ops.prepare()
            self.assertFalse(ops.directory.exists())
            self.assertEqual(ops.unit.read_bytes(), unit_before)
            self.assertEqual((ops.archive / 'journal.json').read_bytes(), journal_before)
            with self.assertRaisesRegex(ValueError, 'reconciliar'):
                verify_frontend_record(ops.attempt, ops.gate)
            ops.stop = Mock()
            with self.assertRaisesRegex(ValueError, 'reconciliar'):
                replace_frontend(ops)
            ops.stop.assert_not_called()

    def jars(self, directory, changes=None):
        files = {'BOOT-INF/classes/db/migration/public/V1.sql': b'SELECT 1;',
                 'BOOT-INF/classes/exemplo.class': b'class', 'BOOT-INF/lib/sdk.jar': b'sdk',
                 'META-INF/MANIFEST.MF': b'Main-Class: exemplo\n',
                 'BOOT-INF/classes/static/index.html': b'old'}
        paths = []
        for name, entries in [('old.jar', files), ('new.jar', dict(files, **(changes or {
                'BOOT-INF/classes/static/index.html': b'new'})))]:
            path = Path(directory) / name
            with zipfile.ZipFile(path, 'w') as archive:
                for key, value in entries.items():
                    archive.writestr(key, value)
            paths.append(path)
        return paths

    def test_somente_static_pode_mudar(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            require_same_backend(*self.jars(directory))
            for entry in ['BOOT-INF/classes/exemplo.class', 'BOOT-INF/lib/sdk.jar',
                          'META-INF/MANIFEST.MF', 'BOOT-INF/classes/db/migration/public/V1.sql']:
                with self.subTest(entry=entry), self.assertRaises(ValueError):
                    require_same_backend(*self.jars(directory, {entry: b'alterado'}))

    def test_entrada_nova_backend_e_duplicada_recusadas(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            old, new = self.jars(directory, {'BOOT-INF/classes/nova.class': b'nova'})
            with self.assertRaises(ValueError):
                require_same_backend(old, new)
            old, new = self.jars(directory)
            with zipfile.ZipFile(new, 'a') as archive:
                archive.writestr('BOOT-INF/classes/exemplo.class', b'class')
            with self.assertRaises(ValueError):
                require_same_backend(old, new)

    def test_preflight_falho_nao_para_servico(self):
        ops = Mock()
        ops.preflight.side_effect = ValueError('backend diferente')
        with self.assertRaises(ValueError):
            replace_frontend(ops)
        ops.stop.assert_not_called()
        ops.prepare.assert_not_called()

    def test_intencao_antecede_parada_e_sucesso_nao_promove(self):
        ops = Mock()
        replace_frontend(ops)
        self.assertEqual([c[0] for c in ops.method_calls],
                         ['preflight', 'prepare', 'stop', 'install', 'start', 'verify_new', 'complete'])
        ops.migrate.assert_not_called()
        ops.restore_database.assert_not_called()
        ops.promote.assert_not_called()

    def test_falha_apos_parada_retorna_so_binario(self):
        for step in ('stop', 'install', 'start', 'verify_new', 'complete'):
            with self.subTest(step=step):
                ops = Mock()
                getattr(ops, step).side_effect = [ValueError('falha'), None]
                with self.assertRaises(ValueError):
                    replace_frontend(ops)
                ops.restore_service.assert_called_once()
                ops.verify_old.assert_called_once()
                ops.complete_return.assert_called_once()
                ops.restore_database.assert_not_called()

    def test_falha_retorno_deixa_pendencia_e_para_servico(self):
        ops = Mock()
        ops.verify_old.side_effect = ValueError('health')
        with self.assertRaises(ValueError):
            recover_frontend(ops)
        ops.complete_return.assert_not_called()
        self.assertEqual(ops.stop.call_count, 2)
        ops.mark_pending.assert_called_once()

    def test_falha_persistencia_da_recuperacao_ainda_para_candidato(self):
        ops = Mock()
        ops.mark_pending.side_effect = OSError('disco cheio')
        with self.assertRaises(OSError):
            recover_frontend(ops)
        ops.stop.assert_called_once()
        ops.complete_return.assert_not_called()

    def test_preparacao_falha_nao_publica_marcador_irrecuperavel(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            ops = self.disk_operations(Path(directory))
            with patch('hml_frontend.install_artifact', side_effect=OSError('disco')), self.assertRaises(OSError):
                ops.prepare()
            self.assertFalse(ops.directory.exists())
            self.assertEqual(ops.unit.read_text(), ops.old_service)

    def test_candidato_concluido_nao_aceito_ainda_permite_retorno_binario(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            ops = self.disk_operations(Path(directory))
            with patch('hml_frontend.clean_sha', return_value='e' * 40):
                ops.prepare()
            with self.assertRaisesRegex(ValueError, 'pendente'):
                verify_frontend_record(ops.attempt, ops.gate)
            ops.complete(dict(served_sha='b' * 40))
            verify_frontend_record(ops.attempt, ops.gate)
            with self.assertRaisesRegex(ValueError, 'diverge'):
                verify_frontend_record(ops.attempt, ops.old_state)
            ops.load()
            (ops.directory / 'next.service').write_text('alterado')
            with self.assertRaisesRegex(ValueError, 'unidade|Unidade'):
                ops.load()

    def disk_operations(self, root):
        old, new = self.jars(root)
        ops = Replacement.__new__(Replacement)
        ops.root, ops.repo = root, root / 'source'
        ops.attempt = root / 'maintenance-releases' / ('c' * 32)
        ops.attempt.mkdir(parents=True)
        ops.directory = ops.attempt / 'frontend-replacement'
        ops.old_release = root / 'releases' / ('a' * 40)
        ops.old_release.mkdir(parents=True)
        (ops.old_release / 'app.jar').write_bytes(old.read_bytes())
        ops.runtime = 'RM_STAGE=hml\n'
        (ops.old_release / 'runtime.env').write_text(ops.runtime)
        (ops.old_release / 'runtime.env').chmod(0o600)
        ops.old_service = 'ExecStart=java -jar ' + str(ops.old_release / 'app.jar') + '\n'
        ops.unit = root / 'hml.service'
        ops.unit.write_text(ops.old_service)
        (root / 'healthy.json').write_text('baseline original')
        ops.old_state = dict(stage='hml', attempt=str(ops.attempt), state='health-aprovado-e2e-pendente',
                             git_sha='a' * 40, artifact_sha256=artifact_hash(old), healthy_hash=artifact_hash(root / 'healthy.json'))
        ops.old_candidate = dict(ops.old_state, maintenance_attempt=str(ops.attempt))
        ops.gate = dict(git_sha='b' * 40, artifact_sha256=artifact_hash(new), checks='backend+frontend')
        ops.release = root / 'releases' / ops.gate['git_sha']
        ops.artifact = new
        ops.rehearsal = root / 'rehearsal.json'
        ops.rehearsal.write_text('{}')
        ops.db = dict(candidate_oid='123', original_oid='456', ledger_sha256='d' * 64)
        ops.database = Mock(return_value=ops.db)
        ops.verify_runtime_configuration = Mock()
        return ops

    def test_preparacao_e_recuperacao_em_disco_sem_restaurar_banco(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            ops = self.disk_operations(Path(directory))
            baseline = (ops.root / 'healthy.json').read_bytes()
            with patch('hml_frontend.clean_sha', return_value='e' * 40):
                ops.prepare()
            self.assertEqual(ops.unit.read_text(), ops.old_service)
            self.assertEqual(json.loads((ops.attempt / 'state.json').read_text())['state'], 'frontend-troca-pendente')
            # Simula processo perdido DEPOIS da troca de unidade; recuperação relê journal real.
            with patch('hml_frontend.systemctl'):
                ops.install()
            ops.load()
            observed = dict(served_sha='a' * 40, artifact_sha256=ops.old_state['artifact_sha256'], health='UP', pid=123)
            with patch('hml_frontend.subprocess.check_output', return_value='0'), patch('hml_frontend.systemctl'), patch('hml_frontend.wait_for_release', return_value=observed):
                recover_frontend(ops)
            self.assertEqual(ops.unit.read_text(), ops.old_service)
            self.assertEqual(json.loads((ops.directory / 'journal.json').read_text())['state'], 'anterior-restaurado')
            self.assertEqual(json.loads((ops.root / 'candidate.json').read_text())['git_sha'], 'a' * 40)
            self.assertEqual((ops.root / 'healthy.json').read_bytes(), baseline)
            with self.assertRaisesRegex(ValueError, 'pendente'):
                ops.load()

    def test_publicacao_parcial_retorna_registros_e_unidade_anteriores(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            ops = self.disk_operations(Path(directory))
            with patch('hml_frontend.clean_sha', return_value='e' * 40):
                ops.prepare()
            observed = dict(served_sha='b' * 40, artifact_sha256=ops.gate['artifact_sha256'], health='UP', pid=456)
            from hml_frontend import durable_journal
            def fail_once(path, record):
                if path == ops.attempt / 'state.json' and record['state'] == 'health-aprovado-e2e-pendente':
                    raise OSError('disco')
                durable_journal(path, record)
            with patch('hml_frontend.durable_journal', side_effect=fail_once), self.assertRaises(OSError):
                ops.complete(observed)
            ops.load()
            old = dict(observed, served_sha='a' * 40, artifact_sha256=ops.old_state['artifact_sha256'])
            with patch('hml_frontend.subprocess.check_output', return_value='0'), patch('hml_frontend.systemctl'), patch('hml_frontend.wait_for_release', return_value=old):
                recover_frontend(ops)
            self.assertEqual(json.loads((ops.attempt / 'state.json').read_text())['git_sha'], 'a' * 40)
            self.assertEqual((ops.attempt / 'candidate.service').read_text(), ops.old_service)

    def test_oid_alterado_e_runtime_corrompido_recusam_recuperacao(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            ops = self.disk_operations(Path(directory))
            with patch('hml_frontend.clean_sha', return_value='e' * 40):
                ops.prepare()
            ops.database = Mock(return_value=dict(ops.db, candidate_oid='999'))
            with self.assertRaisesRegex(ValueError, 'Banco'):
                ops.load()
            ops.database = Mock(return_value=ops.db)
            (ops.old_release / 'runtime.env').write_text('alterado')
            with self.assertRaisesRegex(ValueError, 'anterior'):
                ops.load()

    def test_ambiente_efetivo_apos_start_precisa_coincidir(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            ops = self.disk_operations(Path(directory))
            del ops.verify_runtime_configuration
            ops.runtime = 'RM_STAGE=hml\nRM_DB_URL=jdbc:postgresql://127.0.0.1:55432/rm_hml\nRM_DB_USER=rm_hml_app\n'
            (ops.old_release / 'runtime.env').write_text(ops.runtime)
            with patch('hml_frontend.clean_sha', return_value='e' * 40):
                ops.prepare()
            original = Path.read_bytes
            observed = dict(served_sha='a' * 40, artifact_sha256=ops.old_state['artifact_sha256'], pid=123)
            for valid in (True, False):
                def content(path):
                    if str(path) == '/proc/123/environ':
                        text = ops.runtime if valid else ops.runtime.replace('rm_hml\n', 'rm_test\n')
                        return text.replace('\n', '\0').encode()
                    return original(path)
                with patch.object(Path, 'read_bytes', content):
                    if valid:
                        ops.verify_runtime_configuration(observed)
                    else:
                        with self.assertRaisesRegex(ValueError, 'Banco|Ambiente'):
                            ops.verify_runtime_configuration(observed)


if __name__ == '__main__':
    unittest.main()

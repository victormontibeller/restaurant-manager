"""Testes de coordenação; não substituem execução PostgreSQL/systemd."""
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
from hml_maintenance import Operations, upgrade, rollback, validate_rehearsal


class HmlMaintenanceTest(unittest.TestCase):
    def test_verificacao_de_retorno_falha_para_servico_iniciado(self):
        ops = self.operations()
        ops.verify_previous.side_effect = ValueError('health')
        with self.assertRaises(ValueError):
            rollback(ops)
        self.assertEqual(ops.stop.call_count, 2)
        self.assertEqual([c[0] for c in ops.method_calls][-2:], ['stop', 'save'])
        ops.save.assert_called_with('retorno-pendente')

    def test_retorno_carrega_original_integro_mesmo_sem_jar_candidato(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            root = Path(directory)
            attempt = root / 'attempt'; attempt.mkdir()
            previous = root / 'releases' / ('a' * 40) / 'app.jar'
            previous.parent.mkdir(parents=True)
            previous.write_text('original')
            (previous.parent / 'runtime.env').write_text('fixture')
            (root / 'healthy.json').write_text('baseline')
            (attempt / 'previous.service').write_text('unit')
            from release_support import artifact_hash
            record = dict(stage='hml', attempt=str(attempt), git_sha='b' * 40,
                          previous_sha='a' * 40, runner_sha='c' * 40, state='health-aprovado-e2e-pendente',
                          previous_hash=artifact_hash(previous), artifact_sha256='d' * 64,
                          healthy_hash=artifact_hash(root / 'healthy.json'),
                          previous_runtime_hash=artifact_hash(previous.parent / 'runtime.env'),
                          previous_unit_hash=artifact_hash(attempt / 'previous.service'))
            (attempt / 'state.json').write_text(json.dumps(record))
            ops = Operations.__new__(Operations)
            ops.root, ops.attempt, ops.swap = root, attempt, None
            with patch('hml_maintenance.private_runtime_path', side_effect=Path), patch('hml_maintenance.private_config', return_value={}), patch('hml_maintenance.previous_artifact', return_value=previous):
                ops.load()
            self.assertEqual(ops.record['previous_sha'], 'a' * 40)

    def operations(self):
        ops = Mock()
        ops.snapshot.return_value = {'tables': {'public.empresa': {'rows': 0}}, 'metadata': {'schema': 'fixture'}}
        ops.verify_candidate.return_value = {'served_sha': 'a' * 40}
        return ops

    def test_ordem_para_escritores_antes_de_copiar_e_migrar(self):
        ops = self.operations()
        upgrade(ops)
        self.assertEqual([c[0] for c in ops.method_calls], [
            'preflight', 'save', 'stop', 'snapshot', 'save_snapshot', 'clone',
            'snapshot', 'compare_clone', 'migrate', 'install', 'start',
            'verify_candidate', 'save'])
        ops.save.assert_called_with('health-aprovado-e2e-pendente', {'served_sha': 'a' * 40})
        ops.promote.assert_not_called()

    def test_preflight_falho_nao_para_servico(self):
        ops = self.operations()
        ops.preflight.side_effect = ValueError('configuração')
        with self.assertRaises(ValueError):
            upgrade(ops)
        ops.stop.assert_not_called()
        ops.clone.assert_not_called()

    def test_migration_falha_retorna_banco_antes_de_subir_binario_anterior(self):
        ops = self.operations()
        ops.migrate.side_effect = RuntimeError('migration')
        with self.assertRaises(RuntimeError):
            upgrade(ops)
        names = [c[0] for c in ops.method_calls]
        self.assertLess(names.index('restore_database'), names.index('restore_service'))
        self.assertLess(names.index('restore_service'), names.index('verify_previous'))
        ops.save.assert_called_with('original-restaurado')
        ops.install.assert_not_called()

    def test_falha_health_tambem_retorna_sem_promover(self):
        ops = self.operations()
        ops.verify_candidate.side_effect = ValueError('health')
        with self.assertRaises(ValueError):
            upgrade(ops)
        ops.restore_database.assert_called_once()
        ops.verify_previous.assert_called_once()
        ops.promote.assert_not_called()

    def test_retorno_falho_nao_inicia_binario_incompativel(self):
        ops = self.operations()
        ops.restore_database.side_effect = ValueError('OID')
        with self.assertRaises(ValueError):
            rollback(ops)
        ops.restore_service.assert_not_called()
        ops.start.assert_not_called()
        ops.save.assert_called_with('retorno-pendente')

    def test_snapshot_divergente_impede_subir_original(self):
        ops = self.operations()
        ops.compare_original.side_effect = ValueError('inventário')
        with self.assertRaises(ValueError):
            rollback(ops)
        ops.restore_service.assert_not_called()
        ops.verify_previous.assert_not_called()

    def test_falha_da_parada_nao_mexe_no_banco(self):
        ops = self.operations()
        ops.stop.side_effect = RuntimeError('systemd')
        with self.assertRaises(RuntimeError):
            upgrade(ops)
        ops.clone.assert_not_called()
        ops.restore_database.assert_not_called()

    def test_ensaio_precisa_corresponder_ao_artefato_e_estar_encerrado(self):
        gate = {'git_sha': 'a' * 40, 'artifact_sha256': 'b' * 64}
        receipt = dict(gate, approved=True, exit_code=0, database_restored=True,
                       native_service_stopped=True, clone_equal=True, migration_exit=0)
        validate_rehearsal(receipt, gate)
        for key, value in [('approved', False), ('exit_code', 1), ('database_restored', False),
                           ('native_service_stopped', False), ('clone_equal', False),
                           ('migration_exit', 1), ('artifact_sha256', 'c' * 64), ('git_sha', 'c' * 40),
                           ('cleanup_pending', True)]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_rehearsal(dict(receipt, **{key: value}), gate)


if __name__ == '__main__':
    unittest.main()

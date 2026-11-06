"""Coordenação unitária; não equivale a ensaio PostgreSQL."""
import os
from pathlib import Path
import tempfile
import unittest
from maintenance_database import DatabaseSwap, validate_stage


class FakeAdmin:
    def __init__(self):
        self.databases = {'rm_test': dict(oid=41, owner='rm_test_owner', allowed=True)}
        self.events = []
        self.sessions = 0
        self.fail_copy = False
        self.fail_after_copy = False
        self.wrong_owner = False

    def metadata(self, name):
        return self.databases.get(name)

    def pending(self, stage):
        return [name for name in self.databases if name.startswith('rm_' + stage + '_before_')]

    def connections(self, name):
        return self.sessions

    def set_connections(self, name, allowed):
        self.events.append(('connections', name, allowed))
        self.databases[name]['allowed'] = allowed

    def rename(self, old, new):
        self.events.append(('rename', old, new))
        self.databases[new] = self.databases.pop(old)

    def copy(self, old, new, owner):
        self.events.append(('copy', old, new))
        assert not self.databases[old]['allowed']
        if self.fail_copy:
            raise RuntimeError('Falha injetada')
        self.databases[new] = dict(oid=42, owner=owner, allowed=False)
        if self.fail_after_copy:
            raise RuntimeError('Resposta perdida após CREATE DATABASE')

    def configure(self, name, stage):
        self.events.append(('configure', name, stage))


class MaintenanceDatabaseTest(unittest.TestCase):
    def test_journal_e_privado_mesmo_com_umask_permissiva(self):
        previous = os.umask(0o022)
        try:
            swap = self.swap()
            self.assertEqual((self.root / 'database-swap.json').stat().st_mode & 0o777, 0o600)
            swap.clone()
            DatabaseSwap.resume(self.admin, 'test', self.root)
        finally:
            os.umask(previous)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ['TMPDIR'])
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.admin = FakeAdmin()

    def swap(self):
        return DatabaseSwap(self.admin, 'test', self.root)

    def test_alvos_sao_exatos_sem_producao_ou_nome_arbitrario(self):
        for stage in ('test', 'hml'):
            self.assertEqual(validate_stage(stage), 'rm_' + stage)
        for stage in ('dev', 'prod', 'test ', 'rm_test', "test';--", None):
            with self.assertRaises(ValueError):
                validate_stage(stage)

    def test_copia_preserva_oid_original_e_bloqueia_backup(self):
        swap = self.swap()
        swap.clone()
        self.assertEqual(self.admin.databases[swap.backup]['oid'], 41)
        self.assertFalse(self.admin.databases[swap.backup]['allowed'])
        self.assertEqual(self.admin.databases['rm_test']['oid'], 42)
        self.assertTrue(self.admin.databases['rm_test']['allowed'])
        self.assertLess(self.admin.events.index(('configure', 'rm_test', 'test')),
                        self.admin.events.index(('connections', 'rm_test', True)))
        self.assertEqual(swap.record['state'], 'clone-pronto')

    def test_conexao_restante_recusa_sem_matar_cliente(self):
        swap = self.swap()
        self.admin.sessions = 1
        with self.assertRaises(RuntimeError):
            swap.clone()
        self.assertEqual(set(self.admin.databases), {'rm_test'})
        swap.rollback()
        self.assertTrue(self.admin.databases['rm_test']['allowed'])
        self.assertFalse(any(e[0] in ('copy', 'rename') for e in self.admin.events))

    def test_falha_de_copia_retorna_original_sem_drop(self):
        swap = self.swap()
        self.admin.fail_copy = True
        with self.assertRaises(RuntimeError):
            swap.clone()
        swap.rollback()
        self.assertEqual(self.admin.databases['rm_test']['oid'], 41)
        self.assertTrue(self.admin.databases['rm_test']['allowed'])
        self.assertEqual(swap.record['state'], 'original-restaurado')

    def test_retorno_preserva_candidato_falho_bloqueado(self):
        swap = self.swap()
        swap.clone()
        swap.rollback()
        self.assertEqual(self.admin.databases['rm_test']['oid'], 41)
        self.assertEqual(self.admin.databases[swap.failed]['oid'], 42)
        self.assertFalse(self.admin.databases[swap.failed]['allowed'])
        self.assertTrue(self.admin.databases['rm_test']['allowed'])
        swap.rollback()  # Read-back permite retorno idempotente.
        self.assertEqual(self.admin.databases['rm_test']['oid'], 41)

    def test_oid_desconhecido_nao_pode_ser_renomeado_no_retorno(self):
        swap = self.swap()
        swap.clone()
        self.admin.databases['rm_test']['oid'] = 99
        with self.assertRaises(ValueError):
            swap.rollback()
        self.assertEqual(self.admin.databases['rm_test']['oid'], 99)
        self.assertFalse(swap.failed in self.admin.databases)

    def test_proprietario_divergente_recusado_antes_de_escrever(self):
        self.admin.databases['rm_test']['owner'] = 'outro'
        with self.assertRaises(ValueError):
            self.swap()
        self.assertEqual(self.admin.events, [])

    def test_nomes_colidentes_preservados(self):
        swap = self.swap()
        self.admin.databases[swap.backup] = dict(oid=88, owner='rm_test_owner', allowed=False)
        with self.assertRaises(ValueError):
            swap.clone()
        self.assertEqual(self.admin.databases['rm_test']['oid'], 41)
        self.assertTrue(self.admin.databases['rm_test']['allowed'])

    def test_sessao_no_candidato_impede_retorno_sem_descartar_escritor(self):
        swap = self.swap()
        swap.clone()
        self.admin.sessions = 1
        with self.assertRaises(RuntimeError):
            swap.rollback()
        self.assertEqual(self.admin.databases['rm_test']['oid'], 42)
        self.assertFalse(self.admin.databases['rm_test']['allowed'])
        self.assertEqual(self.admin.databases[swap.backup]['oid'], 41)


    def test_nova_tentativa_recusa_clone_abandonado(self):
        swap = self.swap()
        swap.clone()
        other = self.root / 'other'
        other.mkdir()
        with self.assertRaises(ValueError):
            DatabaseSwap(self.admin, 'test', other)
        self.assertEqual(self.admin.databases[swap.backup]['oid'], 41)

    def test_ledger_pendente_recusa_nova_execucao(self):
        import json
        from maintenance_database import assert_no_pending
        attempt = self.root / 'previous'; attempt.mkdir()
        (attempt / 'database-swap.json').write_text(json.dumps({'stage': 'test', 'state': 'copiando'}))
        with self.assertRaises(ValueError):
            assert_no_pending(self.root, 'test')
        (attempt / 'database-swap.json').write_text(json.dumps({'stage': 'test', 'state': 'original-restaurado'}))
        assert_no_pending(self.root, 'test')

    def test_copia_com_resposta_perdida_preserva_ambos_e_exige_reconciliacao(self):
        swap = self.swap()
        self.admin.fail_after_copy = True
        with self.assertRaises(RuntimeError):
            swap.clone()
        self.assertEqual(swap.record['state'], 'clone-incerto-reconciliar')
        with self.assertRaises(ValueError):
            swap.rollback()
        self.assertEqual(self.admin.databases[swap.backup]['oid'], 41)
        self.assertFalse(self.admin.databases[swap.backup]['allowed'])
        self.assertFalse(self.admin.databases['rm_test']['allowed'])


    def test_retomada_carrega_oids_sem_repetir_clone(self):
        swap = self.swap()
        swap.clone()
        resumed = DatabaseSwap.resume(self.admin, 'test', self.root)
        self.assertEqual(resumed.record, swap.record)
        resumed.rollback()
        self.assertEqual(self.admin.databases['rm_test']['oid'], 41)
        self.assertEqual(len([e for e in self.admin.events if e[0] == 'copy']), 1)

    def test_retomada_recusa_ledger_de_outro_ambiente(self):
        self.swap().clone()
        with self.assertRaises(ValueError):
            DatabaseSwap.resume(self.admin, 'hml', self.root)

    def test_retomada_preserva_oid_textual_retornado_por_postgresql(self):
        swap = self.swap()
        swap.clone()
        # json_build_object serializa o tipo PostgreSQL oid como string decimal.
        for item in self.admin.databases.values():
            item['oid'] = str(item['oid'])
        swap.record.update(original_oid='41', candidate_oid='42')
        swap.save('clone-pronto')
        resumed = DatabaseSwap.resume(self.admin, 'test', self.root)
        resumed.rollback()
        self.assertEqual(self.admin.databases['rm_test']['oid'], '41')


if __name__ == '__main__':
    unittest.main()

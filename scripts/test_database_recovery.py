import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, MagicMock
import database_recovery

from database_recovery import canonical_constraint, safe_cleanup, validate_source, validate_snapshot, verify_inventory


class DatabaseRecoveryTest(unittest.TestCase):
    def test_manutencao_libera_locks_de_tabela_sem_encerrar_snapshot(self):
        session = MagicMock()
        session.query.side_effect = [['public.empresa'], [], ['a'*64], [], [], ['{"constraints":[]}'], []]
        result = database_recovery.inventory(session, release_table_locks=True)
        self.assertEqual(result['tables']['public.empresa']['rows'], 1)
        queries = [call.args[0] for call in session.query.call_args_list]
        self.assertEqual(queries[1], 'savepoint inventory_table')
        self.assertEqual(queries[3:5], ['rollback to savepoint inventory_table', 'release savepoint inventory_table'])
        self.assertIn("like 't\\_%'", queries[5])
        self.assertFalse(any(q.lower().startswith(('commit', 'begin')) for q in queries))

    def test_inventario_fundacao_nao_inventa_identidade(self):
        session = MagicMock()
        session.query.side_effect = [[], ['{"constraints":[]}'], ['t_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']]
        with self.assertRaises(ValueError):
            database_recovery.inventory(session)
        session.query.side_effect = [[], ['{"constraints":[]}'], ['t_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']]
        result = database_recovery.inventory(session, require_identity=False)
        self.assertEqual(result['tenants'], 1)
        self.assertEqual(result['tenants_with_identity'], 0)

    def test_inventario_importa_snapshot_e_libera_locks_antes_do_dump(self):
        session = MagicMock()
        with patch('database_recovery.Session', return_value=session), patch('database_recovery.inventory', return_value={'fixture': True}):
            result = database_recovery.snapshot_inventory(['psql'], {}, None, '00000003-0000001B-1')
        self.assertEqual(result, {'fixture': True})
        self.assertEqual([c.args[0] for c in session.query.call_args_list], [
            'begin isolation level repeatable read read only', "set transaction snapshot '00000003-0000001B-1'"])
        session.close.assert_called_once()

    def test_inventario_por_schema_nao_agrega_metadados_de_outras_empresas(self):
        session = MagicMock()
        session.query.side_effect = [[], ['{"constraints":[]}'], []]
        database_recovery.inventory(session, schema='t_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
        queries = [c.args[0] for c in session.query.call_args_list]
        self.assertTrue(all('like' not in query.lower() for query in queries))
        self.assertIn("n.nspname='t_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'", queries[0])
        self.assertIn("schema_name='t_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'", queries[-1])

    def test_inventario_com_falha_tambem_libera_locks(self):
        session = MagicMock()
        with patch('database_recovery.Session', return_value=session), patch('database_recovery.inventory', side_effect=RuntimeError):
            with self.assertRaises(RuntimeError):
                database_recovery.snapshot_inventory(['psql'], {}, None, '00000003-0000001B-1')
        session.close.assert_called_once()

    def test_reparse_de_array_preserva_valores_e_casts(self):
        source = "CHECK (x = ANY ((ARRAY['ATIVO'::character varying, 'SUSPENSO'::character varying])::text[]))"
        restored = "CHECK (x = ANY (ARRAY[('ATIVO'::character varying)::text, ('SUSPENSO'::character varying)::text]))"
        self.assertEqual(canonical_constraint(source), restored)
        self.assertNotEqual(canonical_constraint(source.replace('SUSPENSO', 'FALHOU')), restored)
        untouched = "CHECK (x = ANY ((ARRAY['1'::integer])::text[]))"
        self.assertEqual(canonical_constraint(untouched), untouched)
        mime = "CHECK (tipo = ANY ((ARRAY['image/png'::character varying, 'image/jpeg'::character varying])::text[]))"
        normalized = canonical_constraint(mime)
        self.assertIn("('image/png'::character varying)::text", normalized)
        self.assertNotEqual(canonical_constraint(mime.replace('image/png','image/gif')), normalized)
        self.assertNotEqual(canonical_constraint(mime.replace('tipo =','tipo <>')), normalized)

    def test_fonte_somente_teste_e_identidade_exata(self):
        env = dict(RM_STAGE='test', RM_DB_URL='jdbc:postgresql://127.0.0.1:55432/rm_test',
                   RM_MIGRATION_USER='rm_test_owner', RM_DB_USER='rm_test_app')
        validate_source(env)
        for key in env:
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_source(dict(env, **{key: 'rm_hml'}))

    def test_snapshot_nao_aceita_sql_ou_normalizacao(self):
        self.assertEqual(validate_snapshot('00000003-0000001B-1'), '00000003-0000001B-1')
        for value in ['', "abc';commit;--", ' 00000003-0000001B-1', '00000003-0000001B-1\n']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_snapshot(value)

    def test_inventario_exige_dados_e_igualdade_integral(self):
        inventory = {'tables': {'public.empresa': {'rows': 2, 'sha256': 'a'*64},
                               't_a.usuario': {'rows': 1, 'sha256': 'b'*64},
                               't_b.usuario': {'rows': 1, 'sha256': 'c'*64}},
                     'metadata': 'definitions', 'tenants': 2, 'tenants_with_identity': 2}
        verify_inventory(inventory, inventory)
        for changed in [dict(inventory, tenants=1), dict(inventory, metadata='alterado'),
                        dict(inventory, tables={}), dict(inventory, tenants_with_identity=1)]:
            with self.assertRaises(ValueError):
                verify_inventory(inventory, changed)
        with self.assertRaises(ValueError):
            verify_inventory(dict(inventory, tenants=1), dict(inventory, tenants=1))

    def test_falha_de_sessao_nao_impede_parada_e_registro(self):
        class Broken:
            def close(self):
                raise TimeoutError('Fixture')
        stopped = []
        self.assertEqual(safe_cleanup(Broken(), lambda: stopped.append(True)), ['TimeoutError'])
        self.assertEqual(stopped, [True])
        def broken_stop():
            raise OSError('Fixture')
        self.assertEqual(safe_cleanup(Broken(), broken_stop), ['TimeoutError', 'OSError'])


if __name__ == '__main__':
    unittest.main()

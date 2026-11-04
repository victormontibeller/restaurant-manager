import os
from pathlib import Path
import tempfile
import unittest

from database_recovery import canonical_constraint, safe_cleanup, validate_source, validate_snapshot, verify_inventory


class DatabaseRecoveryTest(unittest.TestCase):
    def test_reparse_de_array_preserva_valores_e_casts(self):
        source = "CHECK (x = ANY ((ARRAY['ATIVO'::character varying, 'SUSPENSO'::character varying])::text[]))"
        restored = "CHECK (x = ANY (ARRAY[('ATIVO'::character varying)::text, ('SUSPENSO'::character varying)::text]))"
        self.assertEqual(canonical_constraint(source), restored)
        self.assertNotEqual(canonical_constraint(source.replace('SUSPENSO', 'FALHOU')), restored)
        untouched = "CHECK (x = ANY ((ARRAY['1'::integer])::text[]))"
        self.assertEqual(canonical_constraint(untouched), untouched)

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

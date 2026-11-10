"""Guardas da prova; os resultados de recuperação exigem PostgreSQL/JAR reais."""
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

from prebackup_recovery import (clone_template_sql, restore_schema, stopped_clone,
                               summarize_pool, validate_proxy_request, verify_fixture_inventory, wait_row)


class PrebackupRecoveryTest(unittest.TestCase):
    def exercise(self):
        return SimpleNamespace(process=None, cluster=Path('/private/tmp/clone/cluster'),
            root=Path('/private/tmp/clone'), prebackup_schema='t_'+'a'*32,
            pg=Path('/bin'), socket=Path('/private/tmp/clone/socket'),
            session=MagicMock(), sql=MagicMock(side_effect=[['rm_test|/private/tmp/clone/cluster'],['0']]),
            run_command=MagicMock())

    def test_restore_recusa_escritor_antes_de_qualquer_consulta(self):
        exercise = self.exercise()
        exercise.process = MagicMock()
        with self.assertRaises(ValueError):
            stopped_clone(exercise)
        exercise.sql.assert_not_called()

    def test_restore_recusa_cluster_ou_banco_diferente(self):
        for identity in ['rm_dev|/private/tmp/clone/cluster', 'rm_test|/private/tmp/origem']:
            with self.subTest(identity=identity):
                exercise = self.exercise()
                exercise.sql.side_effect = [[identity]]
                with self.assertRaises(ValueError):
                    stopped_clone(exercise)
                exercise.run_command.assert_not_called()

    def test_restore_recusa_conexao_runtime_restante(self):
        exercise = self.exercise()
        exercise.sql.side_effect = [['rm_test|/private/tmp/clone/cluster'],['1']]
        with self.assertRaises(ValueError):
            stopped_clone(exercise)

    def test_restore_recusa_outro_tenant_ou_arquivo_antes_de_drop(self):
        for schema, archive in [('t_'+'b'*32, Path('/private/tmp/clone/prebackup.dump')),
                                ('t_'+'a'*32, Path('/private/tmp/clone/outro.dump'))]:
            with self.subTest(schema=schema, archive=archive):
                exercise = self.exercise()
                with self.assertRaises(ValueError):
                    restore_schema(exercise, schema, archive, {})
                self.assertFalse(any('drop' in call.args[0] for call in exercise.sql.call_args_list))
                exercise.run_command.assert_not_called()

    def test_restore_confere_inventario_e_encerra_snapshot_quando_diverge(self):
        exercise = self.exercise()
        exercise.sql.side_effect = [['rm_test|/private/tmp/clone/cluster'],['0'],[],[],[]]
        with patch('prebackup_recovery.inventory', return_value={'tables':{}}), \
                patch('prebackup_recovery.verify_fixture_inventory', side_effect=ValueError('Divergente')):
            with self.assertRaises(ValueError):
                restore_schema(exercise, exercise.prebackup_schema, exercise.root/'prebackup.dump', {})
        self.assertEqual(exercise.sql.call_args_list[-1].args, ('rollback',))
        command = exercise.run_command.call_args.args[0]
        self.assertIn('--single-transaction', command)
        self.assertIn('--exit-on-error', command)

    def test_inventario_da_fixture_unica_exige_identidade_e_escopo_exato(self):
        schema = 't_'+'a'*32
        complete = dict(tenants=1, tenants_with_identity=1, tables={schema+'.usuario':{'rows':1}},
                        metadata={'schemas':[{'name':schema}]})
        verify_fixture_inventory(complete, complete, schema)
        for change in [dict(tenants_with_identity=0), dict(tenants=2), dict(tables={}),
                       dict(metadata={}), dict(tables={'public.empresa':{'rows':1}})]:
            value = dict(complete, **change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                verify_fixture_inventory(value, value, schema)
        with self.assertRaises(ValueError):
            verify_fixture_inventory(complete, dict(complete, tables={schema+'.usuario':{'rows':2}}), schema)

    def test_template_exige_schema_exclusivo_e_dump_conhecido(self):
        for schema in ['public','t_template','t_'+'a'*32+';drop schema public', 't_abc']:
            with self.subTest(schema=schema), self.assertRaises(ValueError):
                clone_template_sql('CREATE SCHEMA t_template;', schema)
        with self.assertRaises(ValueError):
            clone_template_sql('CREATE SCHEMA outro;', 't_'+'a'*32)

    def test_template_remapeia_apenas_identificador_completo(self):
        schema = 't_'+'a'*32
        raw = 'CREATE SCHEMA t_template; CREATE TABLE t_template.unidade(id uuid); -- t_template_suffix'
        observed = clone_template_sql(raw, schema)
        self.assertIn('CREATE SCHEMA '+schema+';', observed)
        self.assertIn(schema+'.unidade', observed)
        self.assertIn('t_template_suffix', observed)

    def test_proxy_recusa_rota_payload_e_tamanho_diferentes(self):
        raw = b'{"intencaoId":"ficticio"}'
        validate_proxy_request('/api/v1/pedidos',raw,raw)
        for path, body in [('/api/v1/auth/login',raw),('/api/v1/pedidos',b'outro'),('/api/v1/pedidos',b'a'*65537)]:
            with self.subTest(path=path, size=len(body)), self.assertRaises(ValueError):
                validate_proxy_request(path,body,raw)

    def test_pool_distingue_espera_da_latencia_de_aquisicao(self):
        report = summarize_pool('1000,4,0,4,2,4\n1100,1,3,4,0,4\n')
        self.assertEqual(report['peak_threads_awaiting'],2)
        self.assertEqual(report['samples_with_waiters'],1)
        self.assertEqual(report['peak_active'],4)
        self.assertFalse(report['acquisition_latency_measured'])
        self.assertFalse(report['public_endpoint'])

    def test_pool_sem_amostra_ou_formato_invalido_nao_aprova(self):
        for text in ['', '1000,0,1,1,0,4\n', '1000,0,1,1,0,8\n1100,0,1,1,0,8\n',
                     '1000,0,1,1,0,4\nAVISO\n', '1000,0,1,1,-1,4\n1100,0,1,1,0,4\n']:
            with self.subTest(text=text), self.assertRaises(ValueError):
                summarize_pool(text)

    def test_poll_falha_quando_runtime_proprio_encerra(self):
        exercise = self.exercise()
        exercise.process = MagicMock()
        exercise.process.poll.return_value = 1
        with self.assertRaises(ValueError):
            wait_row(exercise, 'query', lambda r:True, 'Não executado')
        exercise.sql.assert_not_called()


if __name__ == '__main__':
    unittest.main()

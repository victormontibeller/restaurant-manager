"""Guardas do ensaio; aprovação de restore depende da execução PostgreSQL real."""
import json
import os
from pathlib import Path
from types import SimpleNamespace
import runpy
import tempfile
import unittest
from unittest.mock import patch, MagicMock

from local_rehearsal import (REPO, Rehearsal, digest, private_file, read_env, validate_profile,
                            partitioned_inventory, validate_source_manifest, verify_local_listener)
import database_recovery


class LocalRehearsalTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ['TMPDIR'])
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.env = dict(RM_STAGE='test', RM_DB_URL='jdbc:postgresql://127.0.0.1:55432/rm_test',
                        RM_DB_USER='rm_test_app', RM_MIGRATION_USER='rm_test_owner')

    def save_env(self, values):
        path = self.root / 'test.env'
        path.write_text(''.join(f'{key}={value}\n' for key,value in values.items()))
        path.chmod(0o600)
        return path

    def test_alvo_de_origem_exato_sem_dev_hml_ou_host_remoto(self):
        self.assertEqual(read_env(self.save_env(self.env)), self.env)
        for key,value in [('RM_STAGE','hml'), ('RM_DB_USER','rm_dev_app'),
                          ('RM_DB_URL','jdbc:postgresql://example.invalid:55432/rm_test')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                read_env(self.save_env(dict(self.env, **{key:value})))

    def test_env_nao_executa_substituicao_shell(self):
        path = self.save_env(dict(self.env, RM_DB_PASSWORD="'$(touch /arquivo-inexistente)'"))
        self.assertEqual(read_env(path)['RM_DB_PASSWORD'], '$(touch /arquivo-inexistente)')

    def test_arquivo_publico_e_symlink_sao_recusados(self):
        path = self.save_env(self.env)
        path.chmod(0o644)
        with self.assertRaises(ValueError):
            private_file(path)
        path.chmod(0o600)
        link = self.root/'link'
        link.symlink_to(path)
        with self.assertRaises(ValueError):
            private_file(link)

    def test_diretorio_de_saida_recusa_sintaxe_shell_antes_de_escrever(self):
        for name in ['com espaco', 'com;comando', '$(comando)', 'com,virgula', "com'aspas", 'com\nlinha']:
            with self.subTest(name=name), patch('pathlib.Path.mkdir') as mkdir:
                with self.assertRaises(ValueError):
                    Rehearsal(SimpleNamespace(output=self.root/name))
                mkdir.assert_not_called()

    def test_perfil_limita_duracao_concorrencia_e_operacoes(self):
        profile = json.loads((REPO/'scripts/profiles/sprint05-local.json').read_text())
        validate_profile(profile)
        for replacement in [dict(concurrency=9), dict(concurrency=0), dict(duration_seconds=121),
                            dict(pause_seconds=0), dict(operations=['pagamento']), dict(operations=[])]:
            with self.subTest(replacement=replacement), self.assertRaises(ValueError):
                validate_profile(dict(profile, **replacement))

    def test_inventory_particionado_preserva_metadados_e_snapshot(self):
        session = MagicMock()
        session.query.return_value = ['t_a', 't_b']
        def part(session, schema, **kwargs):
            return dict(tables={schema+'.unidade':{'rows':1}}, metadata={'schemas':[{'name':schema}]},
                        tenants=1, tenants_with_identity=1)
        with patch('local_rehearsal.inventory', side_effect=part):
            result = partitioned_inventory(session, ['t_b','t_a'])
        self.assertEqual(result['tenants'],2)
        self.assertEqual(result['metadata']['schemas'],[{'name':'t_a'},{'name':'t_b'}])
        queries = [c.args[0] for c in session.query.call_args_list]
        self.assertEqual(queries.count('rollback to savepoint inventory_schema'),2)
        self.assertFalse(any(q in ('commit','rollback') for q in queries))

    def test_inventory_integral_recusa_empresa_com_schema_ausente(self):
        session = MagicMock()
        session.query.return_value = ['t_a', 't_b', 't_ausente']
        with patch('local_rehearsal.inventory') as inventory, self.assertRaises(ValueError):
            partitioned_inventory(session, ['public', 't_a', 't_b'])
        inventory.assert_not_called()

    def test_inventory_parcial_de_midia_nao_exige_empresas_fora_da_selecao(self):
        session = MagicMock()
        part = dict(tables={}, metadata={}, tenants=1, tenants_with_identity=1)
        with patch('local_rehearsal.inventory', return_value=part), \
                patch('local_rehearsal.validate_tenant_coverage') as coverage:
            partitioned_inventory(session, ['t_a'], require_complete=False)
        coverage.assert_not_called()

    def test_manifesto_recusa_fonte_removida_nova_e_alterada(self):
        repo = self.root / 'repo'
        names = ('backend/src/main/App.java', 'frontend/src/main.ts', 'frontend/public/manifest.webmanifest',
                 'backend/pom.xml', 'frontend/package.json', 'frontend/package-lock.json',
                 'frontend/angular.json', 'frontend/.postcssrc.json', 'frontend/tsconfig.json',
                 'frontend/tsconfig.app.json', 'frontend/tsconfig.e2e.json', 'scripts/build-pwa.cjs')
        for name in names:
            path = repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('original')
        manifest = {name: digest(repo / name) for name in names}
        self.assertEqual(validate_source_manifest(manifest, repo), len(names))
        removed = repo / 'backend/src/main/App.java'
        removed.unlink()
        with self.assertRaises(ValueError):
            validate_source_manifest(manifest, repo)
        removed.write_text('original')
        added = repo / 'frontend/src/new.ts'
        added.write_text('novo')
        with self.assertRaises(ValueError):
            validate_source_manifest(manifest, repo)
        added.unlink()
        for name in names:
            with self.subTest(name=name):
                (repo / name).write_text('alterado')
                with self.assertRaises(ValueError):
                    validate_source_manifest(manifest, repo)
                (repo / name).write_text('original')

    def test_filtro_schema_recusa_injecao_antes_de_consultar(self):
        session = MagicMock()
        with self.assertRaises(ValueError):
            database_recovery.inventory(session, schema="t_a';drop schema public;--")
        session.query.assert_not_called()

    def test_instalacao_linux_recusa_mac_antes_de_escrever(self):
        with patch('platform.system', return_value='Darwin'), patch('pathlib.Path.mkdir') as mkdir:
            with self.assertRaises(SystemExit):
                runpy.run_path(str(REPO/'scripts/bootstrap-database.py'))
        mkdir.assert_not_called()

    def test_listener_recusa_outro_pid_e_bind_publico(self):
        with patch('local_rehearsal.subprocess.run', return_value=MagicMock(returncode=0,stdout='p20\nf17\nn127.0.0.1:8090\n')):
            verify_local_listener(20)
        for output in ['p21\nn127.0.0.1:8090\n','p20\nn*:8090\n','p20\nn127.0.0.1:8091\n']:
            with patch('local_rehearsal.subprocess.run', return_value=MagicMock(returncode=0,stdout=output)):
                with self.subTest(output=output), self.assertRaises(ValueError):
                    verify_local_listener(20)


if __name__ == '__main__':
    unittest.main()

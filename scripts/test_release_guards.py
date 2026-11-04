"""Testes determinísticos das travas, sem substituir ensaio nativo."""
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile
from release_support import private_config, runtime_config, migration_fingerprint, install_artifact, artifact_hash, restore_healthy, UNIT


class ReleaseGuardsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ['TMPDIR'])
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config = self.root / 'private.env'
        self.values = dict(RM_DB_URL='jdbc:postgresql://127.0.0.1:55432/rm_hml',
                           RM_DB_USER='rm_hml_app', RM_DB_PASSWORD='placeholder',
                           RM_MIGRATION_USER='rm_hml_owner', RM_MIGRATION_PASSWORD='placeholder', RM_STAGE='hml')

    def save(self):
        self.config.write_text(''.join(f'{k}={v}\n' for k, v in self.values.items()))
        self.config.chmod(0o600)

    def test_runtime_nao_recebe_migracao_nem_chaves_arbitrarias(self):
        self.values['SPRING_APPLICATION_JSON'] = 'qualquer'
        result = runtime_config(self.values)
        self.assertNotIn('MIGRATION', result)
        self.assertNotIn('SPRING', result)
        self.assertIn('RM_DB_USER=rm_hml_app\n', result)

    def test_config_publica_recusada(self):
        self.save()
        self.config.chmod(0o644)
        with self.assertRaises(ValueError):
            private_config(self.config)

    def test_destino_alheio_recusado(self):
        self.values['RM_DB_URL'] = 'jdbc:postgresql://127.0.0.1:55432/rm_dev'
        self.save()
        with self.assertRaises(ValueError):
            private_config(self.config)

    def test_config_duplicada_recusada(self):
        self.save()
        with self.config.open('a') as out:
            out.write('RM_STAGE=hml\n')
        with self.assertRaises(ValueError):
            private_config(self.config)

    def test_config_valida(self):
        self.save()
        self.assertEqual(private_config(self.config), self.values)

    def test_compatibilidade_nao_confunde_codigo_com_migration(self):
        def artifact(name, sql, code):
            path = self.root / name
            with zipfile.ZipFile(path, 'w') as archive:
                archive.writestr('BOOT-INF/classes/db/migration/public/V1__test.sql', sql)
                archive.writestr('BOOT-INF/classes/App.class', code)
            return migration_fingerprint(path)
        self.assertEqual(artifact('a.jar', 'sql', 'A'), artifact('b.jar', 'sql', 'B'))
        self.assertNotEqual(artifact('c.jar', 'sql', 'C'), artifact('d.jar', 'outro', 'C'))

    def test_sem_migration_nao_e_compativel(self):
        path = self.root / 'empty.jar'
        with zipfile.ZipFile(path, 'w'):
            pass
        with self.assertRaises(ValueError):
            migration_fingerprint(path)

    def test_copia_alterada_nao_e_publicada(self):
        source, target = self.root / 'source.jar', self.root / 'app.jar'
        source.write_bytes(b'original')
        expected = artifact_hash(source)
        source.write_bytes(b'alterado')
        with self.assertRaises(ValueError):
            install_artifact(source, target, expected)
        self.assertFalse(target.exists())

    def test_release_existente_nao_e_sobrescrito(self):
        source, target = self.root / 'source.jar', self.root / 'app.jar'
        source.write_bytes(b'original')
        install_artifact(source, target, artifact_hash(source))
        source.write_bytes(b'alterado')
        with self.assertRaises(ValueError):
            install_artifact(source, target, artifact_hash(source))
        self.assertEqual(target.read_bytes(), b'original')

    def test_marcador_corrompido_para_servico_sem_falsa_recuperacao(self):
        (self.root / 'healthy.json').write_text('invalido')
        with patch('release_support.systemctl') as ctl:
            with self.assertRaises(RuntimeError):
                restore_healthy(self.root, self.root / 'unit', 'fingerprint')
            ctl.assert_called_once_with('stop', UNIT)

    def test_ausencia_de_baseline_nao_aceita_candidato(self):
        with patch('release_support.systemctl') as ctl:
            with self.assertRaises(RuntimeError):
                restore_healthy(self.root, self.root / 'unit', 'fingerprint')
            ctl.assert_called_once_with('stop', UNIT)


if __name__ == '__main__':
    unittest.main()

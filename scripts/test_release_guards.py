"""Testes determinísticos das travas, sem substituir ensaio nativo."""
import os
import json
import socket
import subprocess
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile
import release_support
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
        self.values['RM_HML_PROVISIONING_ENABLED'] = 'true'
        self.values['RM_PLATFORM_HOST'] = 'gestao.localhost'
        result = runtime_config(self.values)
        self.assertNotIn('MIGRATION', result)
        self.assertNotIn('SPRING', result)
        self.assertNotIn('RM_HML_PROVISIONING_ENABLED', result)
        self.assertIn('RM_DB_USER=rm_hml_app\n', result)
        self.assertIn('RM_PLATFORM_HOST=gestao.localhost\n', result)

    def test_deploy_comum_recusa_manutencao_pendente_antes_de_ler_build(self):
        import runpy
        attempt = self.root / 'maintenance-releases' / ('a' * 32)
        attempt.mkdir(parents=True)
        (attempt / 'state.json').write_text(json.dumps({'stage': 'hml', 'state': 'health-aprovado-e2e-pendente'}))
        with patch.dict(os.environ, RM_HOME=str(self.root)), patch('sys.argv', ['deploy-hml.py']), patch('subprocess.check_output', return_value=''):
            with self.assertRaisesRegex(ValueError, 'Manutenção'):
                runpy.run_path(str(Path(__file__).parent / 'deploy-hml.py'), run_name='__main__')

    def test_aceitacao_parcial_nao_libera_deploy(self):
        attempt = self.root / 'maintenance-releases' / ('a' * 32)
        attempt.mkdir(parents=True, mode=0o700)
        evidence=attempt/'identity-evidence.json';evidence.write_text('{}');evidence.chmod(0o600)
        receipt=dict(approved=True,stage='hml',attempt=str(attempt),git_sha='b'*40,
                     artifact_sha256='c'*64,original_oid='1',candidate_oid='2',
                     evidence_sha256=artifact_hash(evidence))
        file=attempt/'acceptance.json';file.write_text(json.dumps(receipt));file.chmod(0o600)
        state=dict(stage='hml',state='identidade-aceita',acceptance_sha256=artifact_hash(file),
                   git_sha=receipt['git_sha'],artifact_sha256=receipt['artifact_sha256'])
        swap=dict(stage='hml',state='identidade-aceita',acceptance_sha256=artifact_hash(file),
                  original_oid='1',candidate_oid='2')
        for name,value in [('state.json',state),('database-swap.json',swap)]:
            (attempt/name).write_text(json.dumps(value))
        release_support.assert_no_hml_maintenance(self.root)
        for key,value in [('state','clone-pronto'),('candidate_oid','3'),('acceptance_sha256','d'*64)]:
            (attempt/'database-swap.json').write_text(json.dumps(dict(swap,**{key:value})))
            with self.subTest(key=key),self.assertRaises(ValueError):
                release_support.assert_no_hml_maintenance(self.root)
        (attempt/'database-swap.json').write_text(json.dumps(swap))
        evidence.write_text('{"alterado":true}')
        with self.assertRaises(ValueError):release_support.assert_no_hml_maintenance(self.root)

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

    def identity_values(self):
        import base64
        certificate = self.root / 'localhost.p12'
        certificate.write_bytes(b'fixture-unitaria-nao-certificado-real')
        certificate.chmod(0o600)
        trust = self.root / 'localhost.pem'
        trust.write_bytes(b'fixture-unitaria-nao-certificado-real')
        trust.chmod(0o600)
        capture = self.root / 'capture'
        capture.mkdir(mode=0o700)
        return dict(self.values, RM_JWT_SECRET='a' * 64, RM_JWT_KEY_ID='v1',
                    RM_EMAIL_SECRET=base64.b64encode(b'b' * 32).decode(),
                    RM_EMAIL_CAPTURE_DIRECTORY=str(capture),
                    SERVER_SSL_KEY_STORE='file:' + str(certificate),
                    SERVER_SSL_KEY_STORE_PASSWORD='placeholder', SERVER_SSL_KEY_STORE_TYPE='PKCS12',
                    RM_TLS_TRUST_CERTIFICATE=str(trust))

    def test_runtime_identidade_preserva_apenas_contrato_explicito(self):
        values = self.identity_values()
        values['SPRING_APPLICATION_JSON'] = 'nao-exportar'
        values['RM_RECOVERY_TEST'] = 'true'
        result = runtime_config(values, identity=True)
        for key in ('RM_JWT_SECRET', 'RM_JWT_KEY_ID', 'RM_EMAIL_SECRET',
                    'RM_EMAIL_CAPTURE_DIRECTORY', 'SERVER_SSL_KEY_STORE',
                    'SERVER_SSL_KEY_STORE_PASSWORD', 'SERVER_SSL_KEY_STORE_TYPE', 'RM_TLS_TRUST_CERTIFICATE'):
            self.assertIn(key + '=' + values[key] + '\n', result)
        for key in ('RM_MIGRATION_PASSWORD', 'RM_MIGRATION_USER', 'SPRING_APPLICATION_JSON', 'RM_RECOVERY_TEST'):
            self.assertNotIn(key + '=', result)

    def test_runtime_identidade_falha_fechado_sem_segredos_ou_tls(self):
        values = self.identity_values()
        for key in ('RM_JWT_SECRET', 'RM_EMAIL_SECRET', 'RM_EMAIL_CAPTURE_DIRECTORY',
                    'SERVER_SSL_KEY_STORE', 'SERVER_SSL_KEY_STORE_PASSWORD', 'SERVER_SSL_KEY_STORE_TYPE'):
            with self.subTest(key=key), self.assertRaises(ValueError):
                runtime_config({k: v for k, v in values.items() if k != key}, identity=True)

    def test_pagamentos_so_exportam_grupo_completo_sem_override_de_provedor(self):
        import base64
        values = dict(self.identity_values(), RM_PAGAMENTOS_SECRET=base64.b64encode(b'p'*32).decode(),
                      RM_PAGAMENTOS_CLIENT_ID='fixture', RM_PAGAMENTOS_CLIENT_SECRET='fixture',
                      RM_PAGAMENTOS_WEBHOOK_SECRET='fixture', RM_PAGAMENTOS_PORTA_PUBLICA='443',
                      RM_PAGAMENTOS_TEST_BASE_URL='http://127.0.0.1:12345')
        result = runtime_config(values, identity=True)
        for key in release_support.PAYMENT_KEYS + ('RM_PAGAMENTOS_PORTA_PUBLICA',):
            self.assertIn(key + '=' + values[key] + '\n', result)
        self.assertNotIn('TEST_BASE_URL', result)
        self.assertNotIn('MIGRATION', result)
        for key in release_support.PAYMENT_KEYS:
            with self.subTest(key=key), self.assertRaises(ValueError):
                runtime_config({k:v for k,v in values.items() if k != key}, identity=True)
        for invalid in [dict(RM_PAGAMENTOS_SECRET='curta'), dict(RM_PAGAMENTOS_PORTA_PUBLICA='0'),
                        dict(RM_PAGAMENTOS_PORTA_PUBLICA='65536'), dict(RM_PAGAMENTOS_CLIENT_SECRET='x\nOVERRIDE=true')]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                runtime_config(dict(values, **invalid), identity=True)
        with self.assertRaises(ValueError):
            runtime_config(values, identity=False)

    def test_runtime_identidade_recusa_chaves_e_arquivos_inseguros(self):
        values = self.identity_values()
        invalid = [dict(RM_JWT_SECRET='curta'), dict(RM_EMAIL_SECRET='invalida'),
                   dict(RM_JWT_KEY_ID='../../arquivo'), dict(RM_JWT_PREVIOUS_KEY_ID='v0'),
                   dict(RM_JWT_PREVIOUS_SECRET='c' * 64),
                   dict(RM_JWT_PREVIOUS_KEY_ID='v1', RM_JWT_PREVIOUS_SECRET='c' * 64),
                   dict(RM_JWT_PREVIOUS_KEY_ID='v0', RM_JWT_PREVIOUS_SECRET='a' * 64),
                   dict(SERVER_SSL_KEY_STORE='https://example.invalid/certificado'),
                   dict(SERVER_SSL_KEY_STORE_TYPE='JKS'), dict(RM_JWT_SECRET='a' * 64 + '\nRM_STAGE=prod')]
        for replacement in invalid:
            with self.subTest(keys=list(replacement)), self.assertRaises(ValueError):
                runtime_config(dict(values, **replacement), identity=True)
        (self.root / 'localhost.p12').chmod(0o644)
        with self.assertRaises(ValueError):
            runtime_config(values, identity=True)

    def test_runtime_identidade_preserva_par_de_rotacao(self):
        values = dict(self.identity_values(), RM_JWT_PREVIOUS_KEY_ID='v0', RM_JWT_PREVIOUS_SECRET='c' * 64)
        result = runtime_config(values, identity=True)
        self.assertIn('RM_JWT_PREVIOUS_KEY_ID=v0\n', result)
        self.assertIn('RM_JWT_PREVIOUS_SECRET=' + 'c' * 64 + '\n', result)

    def test_caminho_em_pai_gravavel_por_terceiros_e_recusado(self):
        shared = self.root / 'shared'
        shared.mkdir(mode=0o777)
        shared.chmod(0o777)
        file = shared / 'private'
        file.write_bytes(b'fixture')
        file.chmod(0o600)
        with self.assertRaises(ValueError):
            release_support.private_runtime_path(str(file))

    def test_caminho_privado_nao_disfarca_origem_com_segmento_pai(self):
        report = self.root / 'report'
        report.mkdir(mode=0o700)
        other = self.root / 'other'
        other.mkdir(mode=0o700)
        image = other / 'capture.png'
        image.write_bytes(b'fixture-nao-imagem-real')
        image.chmod(0o600)
        self.assertEqual(release_support.private_runtime_path(str(image)), image)
        for value, directory in ((report / '..' / 'other' / image.name, False),
                                 (report / '..' / 'other', True)):
            with self.subTest(directory=directory), self.assertRaises(ValueError):
                release_support.private_runtime_path(str(value), directory=directory)

    def test_identidade_nao_pode_ser_verificada_em_http(self):
        jar = self.root / 'identity.jar'
        prefix = 'BOOT-INF/classes/br/com/restaurantmanager/identidade/'
        for name in ('JwtConfiguration.class', 'config/JwtConfiguration.class'):
            with self.subTest(layout=name):
                with zipfile.ZipFile(jar, 'w') as archive:
                    archive.writestr(prefix + name, b'fixture')
                self.assertTrue(release_support.artifact_has_identity(jar))
                with self.assertRaises(ValueError):
                    release_support.runtime_transport(jar, {})
                with self.assertRaises(ValueError):
                    release_support.runtime_transport(jar, {b'SERVER_SSL_KEY_STORE': b'file:/ausente'})
                with self.assertRaises(ValueError):
                    release_support.require_foundation_artifact(jar)

    def test_nome_sem_pacote_exato_nao_identifica_autenticacao(self):
        jar = self.root / 'foundation.jar'
        with zipfile.ZipFile(jar, 'w') as archive:
            archive.writestr('BOOT-INF/classes/outro/JwtConfiguration.class', b'fixture')
        self.assertFalse(release_support.artifact_has_identity(jar))
        release_support.require_foundation_artifact(jar)
        self.assertEqual(release_support.runtime_transport(jar, {}), ('http://127.0.0.1:8088', None))

    def test_grupo_com_terceiros_nao_pode_substituir_configuracao(self):
        from types import SimpleNamespace
        directory = self.root / 'group'
        directory.mkdir(mode=0o770)
        directory.chmod(0o770)
        file = directory / 'private'
        file.write_bytes(b'fixture')
        file.chmod(0o600)
        with patch('release_support.grp.getgrgid', return_value=SimpleNamespace(gr_mem=['terceiro'])):
            with self.assertRaises(ValueError):
                release_support.private_runtime_path(str(file))

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


    def test_sha_nulo_para_servico(self):
        (self.root / 'healthy.json').write_text(json.dumps({'served_sha': None}))
        with patch('release_support.systemctl') as ctl:
            with self.assertRaises(RuntimeError):
                restore_healthy(self.root, self.root / 'unit', 'fingerprint')
            ctl.assert_called_once_with('stop', UNIT)

    def test_jar_corrompido_para_servico(self):
        sha = 'a' * 40
        (self.root / 'healthy.json').write_text(json.dumps({'served_sha': sha}))
        release = self.root / 'releases' / sha
        release.mkdir(parents=True)
        (release / 'app.jar').write_bytes(b'nao-e-zip')
        with patch('release_support.systemctl') as ctl:
            with self.assertRaises(RuntimeError):
                restore_healthy(self.root, self.root / 'unit', 'fingerprint')
            ctl.assert_called_once_with('stop', UNIT)

    def test_socket_real_exige_proprietario_do_processo(self):
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            listener.listen()
            port = listener.getsockname()[1]
            release_support.verify_listener(os.getpid(), port)
            process = subprocess.Popen(['sleep', '15'])
            try:
                with self.assertRaises(ValueError):
                    release_support.verify_listener(process.pid, port)
            finally:
                process.terminate()
                process.wait(timeout=3)


if __name__ == '__main__':
    unittest.main()

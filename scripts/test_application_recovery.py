import base64
import json
import os
from pathlib import Path
import secrets
import tempfile
import unittest
import uuid
from unittest.mock import patch

from application_recovery import private_file, read_bundle, validate_fixture, prepare


class ApplicationRecoveryTest(unittest.TestCase):
    def fixture(self, certificate) -> dict:
        a, b = str(uuid.uuid4()), str(uuid.uuid4())
        return dict(jwt_secret=secrets.token_hex(32), email_secret=base64.b64encode(os.urandom(32)).decode(),
                    tls_file=str(certificate), tls_password=secrets.token_hex(16), accounts=[
            dict(host='a.localhost', empresa_id=a, usuario_id=str(uuid.uuid4()), email='admin@example.invalid', senha=secrets.token_hex(16), perfil='ADMINISTRADOR'),
            dict(host='a.localhost', empresa_id=a, usuario_id=str(uuid.uuid4()), email='cozinha@example.invalid', senha=secrets.token_hex(16), perfil='COZINHA', allowed_unit=str(uuid.uuid4()), forbidden_unit=str(uuid.uuid4())),
            dict(host='b.localhost', empresa_id=b, usuario_id=str(uuid.uuid4()), email='admin@example.invalid', senha=secrets.token_hex(16), perfil='ADMINISTRADOR')])

    def test_massa_exige_duas_empresas_e_restricao_de_filial(self):
        data = self.fixture('/nao-lido')
        validate_fixture(data)
        for mutation in [dict(data, jwt_secret='curta'), dict(data, accounts=data['accounts'][:2]),
                         dict(data, email_secret=base64.b64encode(b'curta').decode())]:
            with self.assertRaises(ValueError):
                validate_fixture(mutation)
        data['accounts'][1]['forbidden_unit'] = data['accounts'][1]['allowed_unit']
        with self.assertRaises(ValueError):
            validate_fixture(data)

    def test_recusa_host_externo_credenciais_reais_e_identificador_sql(self):
        for key, value in [('host', 'internet.example'), ('email', 'pessoa@example.com'),
                           ('empresa_id', "x';drop database rm_test;--")]:
            data = self.fixture('/nao-lido')
            data['accounts'][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_fixture(data)

    def test_backup_e_releitura_nao_dependem_dos_originais(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            root = Path(directory)
            cert = root / 'cert.p12'; cert.write_bytes(os.urandom(64)); cert.chmod(0o600)
            data = self.fixture(cert)
            fixture = root / 'fixture.json'; fixture.write_text(json.dumps(data)); fixture.chmod(0o600)
            attempt = root / 'attempt'; attempt.mkdir(mode=0o700)
            with patch('application_recovery.validate_artifact', return_value={'git_sha': 'a'*40}), \
                    patch('application_recovery.socket.socket'):
                result = prepare(root / 'job', fixture, root, attempt)
            cert.unlink(); fixture.unlink()
            recovered = read_bundle(result['bundle'])
            self.assertEqual(recovered['jwt_secret'], data['jwt_secret'])
            self.assertEqual(recovered['email_secret'], data['email_secret'])
            self.assertEqual(len(Path(recovered['tls_file']).read_bytes()), 64)
            (result['bundle'] / 'runtime.json').write_text('{}')
            with self.assertRaises(ValueError):
                read_bundle(result['bundle'])

    def test_arquivo_privado_recusa_permissao_e_symlink(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            path = Path(directory) / 'private.json'; path.write_text('{}'); path.chmod(0o600)
            self.assertEqual(private_file(path), path)
            path.chmod(0o644)
            with self.assertRaises(ValueError):
                private_file(path)
            path.chmod(0o600)
            link = Path(directory) / 'link'; link.symlink_to(path)
            with self.assertRaises(ValueError):
                private_file(link)


if __name__ == '__main__':
    unittest.main()

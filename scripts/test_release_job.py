"""Guardas de fonte/gate do job; bytes sintéticos não aprovam um release."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from release_support import artifact_hash, durable_artifact


class ReleaseJobTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ['TMPDIR'])
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.job = self.root / 'builds' / 'fixture'
        self.repo = self.root / 'repo'
        checkout = self.job / 'checkout'
        checkout.mkdir(parents=True)
        for name in ('backend/src/main/Test.java', 'frontend/src/app.ts', 'backend/pom.xml',
                     'frontend/package.json', 'frontend/package-lock.json', 'frontend/angular.json',
                     'frontend/tsconfig.json', 'frontend/tsconfig.app.json'):
            p = checkout / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text('fixture-unitaria')
        shutil.copytree(checkout, self.repo)
        subprocess.run(['git', 'init', '-q', str(checkout)], check=True)
        subprocess.run(['git', 'add', '.'], cwd=checkout, check=True)
        subprocess.run(['git', '-c', 'user.name=Teste', '-c', 'user.email=teste@example.invalid',
                        'commit', '-qm', 'fixture'], cwd=checkout, check=True)
        self.sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=checkout, text=True).strip()
        (self.job / 'app.jar').write_bytes(b'fixture-unitaria-nao-release')
        self.gate = dict(git_sha=self.sha, checks='backend+frontend', artifact_sha256=artifact_hash(self.job / 'app.jar'))
        self.result = dict(self.gate, release_gate=True, exit_code=0)
        self.request = dict(git_sha=self.sha)
        self.save()

    def save(self):
        for name, value in [('gate', self.gate), ('result', self.result), ('request', self.request)]:
            (self.job / (name + '.json')).write_text(json.dumps(value))

    def test_fonte_igual_preserva_sha_original_mesmo_com_documentos_novos(self):
        (self.repo / 'README.md').write_text('Documento novo não transforma SHA do JAR.')
        jar, gate = durable_artifact(self.job, self.root, self.repo)
        self.assertEqual(jar, self.job / 'app.jar')
        self.assertEqual(gate, self.gate)

    def test_frontend_divergente_exige_build(self):
        (self.repo / 'frontend/src/app.ts').write_text('alterado')
        with self.assertRaisesRegex(ValueError, 'Fonte compilável'):
            durable_artifact(self.job, self.root, self.repo)

    def test_dependencia_divergente_exige_build(self):
        (self.repo / 'frontend/package-lock.json').write_text('alterado')
        with self.assertRaisesRegex(ValueError, 'Fonte compilável'):
            durable_artifact(self.job, self.root, self.repo)

    def test_gate_resultado_e_request_devem_corresponder(self):
        for target, key, value in [(self.result, 'release_gate', False), (self.result, 'exit_code', 1),
                                    (self.request, 'git_sha', 'a' * 40), (self.gate, 'checks', 'parcial')]:
            old = target[key]
            target[key] = value
            self.save()
            with self.subTest(key=key), self.assertRaises(ValueError):
                durable_artifact(self.job, self.root, self.repo)
            target[key] = old
        self.save()

    def test_artefato_e_checkout_adulterados_recusados(self):
        (self.job / 'app.jar').write_bytes(b'alterado')
        with self.assertRaises(ValueError):
            durable_artifact(self.job, self.root, self.repo)
        (self.job / 'app.jar').write_bytes(b'fixture-unitaria-nao-release')
        (self.job / 'checkout/frontend/src/app.ts').write_text('alterado')
        with self.assertRaises(ValueError):
            durable_artifact(self.job, self.root, self.repo)

    def test_job_fora_do_diretorio_privado_recusado(self):
        with self.assertRaises(ValueError):
            durable_artifact(self.repo, self.root, self.repo)


if __name__ == '__main__':
    unittest.main()

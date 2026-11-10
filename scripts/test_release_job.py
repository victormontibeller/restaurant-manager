"""Guardas de fonte/gate do job; bytes sintéticos não aprovam um release."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from release_support import artifact_hash, durable_artifact
from build_sources import build_source_manifest


class ReleaseJobTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ['TMPDIR'])
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.job = self.root / 'builds' / 'fixture'
        self.repo = self.root / 'repo'
        checkout = self.job / 'checkout'
        checkout.mkdir(parents=True)
        self.inputs = ('backend/src/main/Test.java', 'frontend/src/app.ts',
                     'frontend/public/manifest.webmanifest', 'backend/pom.xml',
                     'backend/mvnw', 'backend/.mvn/wrapper/maven-wrapper.properties',
                     'frontend/package.json', 'frontend/package-lock.json', 'frontend/angular.json',
                     'frontend/.postcssrc.json', 'frontend/tsconfig.json', 'frontend/tsconfig.app.json',
                     'frontend/tsconfig.e2e.json', 'scripts/build-pwa.cjs', 'scripts/pwa-assets.cjs',
                     'scripts/build-release.sh')
        for name in self.inputs:
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

    def test_manifesto_relativo_ordenado_independe_do_local_do_checkout(self):
        manifest = build_source_manifest(self.repo)
        self.assertEqual(list(manifest), sorted(self.inputs))
        self.assertEqual(manifest, build_source_manifest(self.job / 'checkout'))
        self.assertTrue(all(value == artifact_hash(self.repo / name) for name, value in manifest.items()))

    def test_vinculo_em_arquivo_ou_diretorio_e_recusado(self):
        source = self.repo / 'frontend/public/manifest.webmanifest'
        source.unlink()
        source.symlink_to(self.job / 'checkout/frontend/public/manifest.webmanifest')
        with self.assertRaises(ValueError):
            build_source_manifest(self.repo)
        source.unlink()
        source.write_text('fixture-unitaria')
        public = self.repo / 'frontend/public'
        public.rename(self.repo / 'frontend/public-preservado')
        public.symlink_to(self.repo / 'frontend/public-preservado', target_is_directory=True)
        with self.assertRaises(ValueError):
            build_source_manifest(self.repo)

    def test_diretorio_obrigatorio_ausente_e_recusado(self):
        for name in ('backend/src/main', 'frontend/src', 'frontend/public'):
            source = self.repo / name
            saved = source.with_name(source.name + '-preservado')
            with self.subTest(name=name):
                source.rename(saved)
                with self.assertRaises(ValueError):
                    build_source_manifest(self.repo)
                saved.rename(source)

    def test_cada_entrada_alterada_exige_build(self):
        for name in self.inputs:
            path = self.repo / name
            with self.subTest(name=name):
                path.write_text('alterado')
                with self.assertRaisesRegex(ValueError, 'Fonte compilável'):
                    durable_artifact(self.job, self.root, self.repo)
                path.write_text('fixture-unitaria')

    def test_cada_entrada_removida_exige_build(self):
        for name in self.inputs:
            path = self.repo / name
            with self.subTest(name=name):
                path.unlink()
                with self.assertRaises(ValueError):
                    durable_artifact(self.job, self.root, self.repo)
                path.write_text('fixture-unitaria')

    def test_fonte_ou_asset_novo_exige_build(self):
        for directory in ('backend/src/main', 'frontend/src', 'frontend/public'):
            path = self.repo / directory / 'novo'
            with self.subTest(directory=directory):
                path.write_text('novo')
                with self.assertRaisesRegex(ValueError, 'Fonte compilável'):
                    durable_artifact(self.job, self.root, self.repo)
                path.unlink()

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

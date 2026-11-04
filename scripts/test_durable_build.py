"""Testes unitários do registro durável; não aprovam um release."""
import json
import os
import hashlib
import subprocess
from pathlib import Path
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from durable_build import execute_job, exclusive_lock


class DurableBuildTest(unittest.TestCase):
    def test_gate_confere_sha_hash_e_checks(self):
        for invalid in (None, 'git_sha', 'artifact_sha256', 'checks'):
            with self.subTest(invalid=invalid), tempfile.TemporaryDirectory() as directory:
                job = Path(directory)
                checkout = job / 'checkout'
                checkout.mkdir()
                subprocess.run(['git', 'init', '-q', str(checkout)], check=True)
                (checkout / '.gitignore').write_text('backend/target/\n')
                subprocess.run(['git', 'add', '.gitignore'], cwd=checkout, check=True)
                subprocess.run(['git', '-c', 'user.name=Teste', '-c', 'user.email=teste@example.invalid',
                                'commit', '-qm', 'fixture'], cwd=checkout, check=True)
                sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=checkout, text=True).strip()
                # Bytes sintéticos exclusivos do teste unitário, nunca release real.
                jar = checkout / 'backend/target/restaurant-manager-0.1.0-SNAPSHOT.jar'
                jar.parent.mkdir(parents=True)
                jar.write_bytes(b'fixture-unitaria')
                gate = dict(git_sha=sha, artifact_sha256=hashlib.sha256(jar.read_bytes()).hexdigest(),
                            checks='backend+frontend')
                if invalid:
                    gate[invalid] = 'divergente'
                (job / 'request.json').write_text(json.dumps({'git_sha': sha}))
                (job / 'gate.json').write_text(json.dumps(gate))
                real_run = subprocess.run
                def build_only(command, **kwargs):
                    if command == ['bash', 'scripts/build-release.sh']:
                        return SimpleNamespace(returncode=0)
                    return real_run(command, **kwargs)
                with patch('durable_build.subprocess.run', side_effect=build_only):
                    code = execute_job(job)
                result = json.loads((job / 'result.json').read_text())
                self.assertEqual(code == 0, invalid is None)
                self.assertEqual(result['release_gate'], invalid is None)

    def test_lock_recusa_segundo_executor(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'lock'
            with exclusive_lock(path):
                with self.assertRaises(BlockingIOError):
                    with exclusive_lock(path):
                        self.fail('Segundo executor admitido')

    def test_falha_preserva_codigo_log_e_identidade(self):
        with tempfile.TemporaryDirectory() as directory:
            job = Path(directory)
            (job / 'checkout').mkdir()
            (job / 'request.json').write_text(json.dumps({'git_sha': 'a' * 40}))
            with patch('durable_build.subprocess.run') as run:
                run.return_value.returncode = 17
                self.assertEqual(execute_job(job), 17)
            result = json.loads((job / 'result.json').read_text())
            self.assertEqual(result['exit_code'], 17)
            self.assertEqual(result['git_sha'], 'a' * 40)
            self.assertEqual(result['pid'], os.getpid())
            self.assertFalse(result['release_gate'])
            self.assertTrue((job / 'build.log').exists())
            self.assertIn('process_start_ticks', result)

    def test_exit_zero_sem_gate_nao_aprova(self):
        with tempfile.TemporaryDirectory() as directory:
            job = Path(directory)
            (job / 'checkout').mkdir()
            (job / 'request.json').write_text(json.dumps({'git_sha': 'a' * 40}))
            with patch('durable_build.subprocess.run') as run:
                run.return_value.returncode = 0
                self.assertNotEqual(execute_job(job), 0)
            self.assertFalse(json.loads((job / 'result.json').read_text())['release_gate'])

    def test_erro_de_inicio_registra_falha_sem_vazar_excecao(self):
        with tempfile.TemporaryDirectory() as directory:
            job = Path(directory)
            (job / 'checkout').mkdir()
            (job / 'request.json').write_text(json.dumps({'git_sha': 'a' * 40}))
            with patch('durable_build.subprocess.run', side_effect=OSError('valor privado')):
                self.assertNotEqual(execute_job(job), 0)
            text = (job / 'result.json').read_text()
            self.assertNotIn('valor privado', text)
            self.assertFalse(json.loads(text)['release_gate'])


if __name__ == '__main__':
    unittest.main()

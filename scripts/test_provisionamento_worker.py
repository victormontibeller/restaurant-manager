"""Seleção do cliente local sem retirar as guardas do worker real."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    'provisionamento_worker', Path(__file__).with_name('provisionamento-test-worker.py'))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class PostgresClientTest(unittest.TestCase):
    def client(self, environment, system):
        with patch.object(Path, 'is_file', return_value=True), patch.object(worker.os, 'access', return_value=True):
            return worker.postgres_client(Path('/private/project'), environment, system)

    def test_mac_explicit_client_does_not_inject_linux_libraries(self):
        executable, env = self.client({'RM_TEST_PSQL': '/opt/postgres/bin/psql',
                                       'RM_MIGRATION_PASSWORD': 'fixture',
                                       'PGSERVICE': 'unexpected', 'PGOPTIONS': '-c role=other'}, 'Darwin')
        self.assertEqual(executable, '/opt/postgres/bin/psql')
        self.assertEqual({k: v for k, v in env.items() if k.startswith('PG')}, {'PGPASSWORD': 'fixture'})
        self.assertNotIn('LD_LIBRARY_PATH', env)

    def test_linux_retains_installed_toolchain(self):
        executable, env = self.client({'RM_MIGRATION_PASSWORD': 'fixture'}, 'Linux')
        self.assertEqual(executable, '/private/project/toolchains/postgres/usr/lib/postgresql/16/bin/psql')
        self.assertEqual(env['LD_LIBRARY_PATH'], '/private/project/toolchains/postgres/usr/lib/x86_64-linux-gnu')

    def test_missing_relative_wrong_or_unexecutable_client_is_rejected(self):
        for value in (None, 'bin/psql', '/bin/other'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.client({'RM_MIGRATION_PASSWORD': 'fixture', **({'RM_TEST_PSQL': value} if value else {})}, 'Darwin')
        with patch.object(Path, 'is_file', return_value=False), self.assertRaises(ValueError):
            worker.postgres_client(Path('/private/project'), {'RM_TEST_PSQL': '/bin/psql'}, 'Darwin')
        with patch.object(Path, 'is_file', return_value=True), patch.object(worker.os, 'access', return_value=False), self.assertRaises(ValueError):
            worker.postgres_client(Path('/private/project'), {'RM_TEST_PSQL': '/bin/psql'}, 'Darwin')


if __name__ == '__main__':
    unittest.main()

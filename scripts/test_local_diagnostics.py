import copy
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import local_diagnostics as diagnostics

SCHEMA = 't_' + 'a' * 32
ORDER = '11111111-1111-1111-1111-111111111111'


def metrics():
    return {key: {'count': 0, 'oldest_seconds': 0} for key in diagnostics.METRICS}


def sample():
    return {'database': 'rm_test', 'role': 'rm_test_owner', 'port': 55432, 'read_only': 'on',
            'registered': True, 'observed_at': '2026-11-09T12:00:00Z', 'metrics': metrics()}


class DiagnosticsTests(unittest.TestCase):
    def test_each_persisted_failure_has_distinct_alert(self):
        for metric, alert in diagnostics.METRICS.items():
            with self.subTest(metric=metric):
                data = metrics()
                data[metric] = {'count': 1, 'oldest_seconds': 2.5}
                self.assertEqual(diagnostics.alerts_for(data), [alert])
                data[metric] = {'count': 0, 'oldest_seconds': 0}
                self.assertEqual(diagnostics.alerts_for(data), [])

    def test_missing_metric_negative_age_and_wrong_types_fail_closed(self):
        variants = [metrics() for _ in range(5)]
        variants[0].pop('checkout_uncertain')
        variants[1]['jobs_overdue']['count'] = -1
        variants[2]['jobs_overdue']['oldest_seconds'] = -1
        variants[3]['jobs_overdue']['count'] = True
        variants[4]['jobs_overdue']['oldest_seconds'] = 1
        for data in variants:
            with self.subTest(data=data), self.assertRaises(ValueError):
                diagnostics.alerts_for(data)

    def test_backup_failure_never_looks_healthy(self):
        self.assertEqual(diagnostics.alerts_for(metrics(), 'failed'), ['BACKUP_FALHOU'])
        self.assertEqual(diagnostics.alerts_for(metrics(), 'passed'), [])
        with self.assertRaises(ValueError):
            diagnostics.alerts_for(metrics(), 'assumed_success')

    def test_sql_has_only_select_and_validated_identifiers(self):
        query = diagnostics.snapshot_query(SCHEMA, ORDER)
        self.assertTrue(query.startswith('select '))
        self.assertNotIn(';', query)
        self.assertIn('transaction_read_only', query)
        self.assertIn("pedido_id='" + ORDER, query)
        for bad in ('public', 't_bad', SCHEMA + ';drop schema public'):
            with self.assertRaises(ValueError):
                diagnostics.snapshot_query(bad)
        with self.assertRaises(ValueError):
            diagnostics.snapshot_query(SCHEMA, "x' or true")

    def test_valid_snapshot_has_no_secret_payload_and_no_external_approval(self):
        data = sample()
        data['secret'] = 'must not escape'
        result = diagnostics.collect_snapshot(lambda query: json.dumps(data), SCHEMA, 55432, ORDER)
        self.assertNotIn('must not escape', json.dumps(result))
        self.assertEqual(result['alerts'], [])
        for key in ('external_alert_sent', 'operational_supervision_approved', 'linux_homologation'):
            self.assertFalse(result[key])

    def test_other_database_port_role_tenant_or_writable_transaction_refused(self):
        for key, value in [('database', 'production'), ('port', 5432), ('role', 'postgres'),
                           ('registered', False), ('read_only', 'off')]:
            data = sample()
            data[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                diagnostics.collect_snapshot(lambda query: json.dumps(data), SCHEMA, 55432)

    def test_failure_and_recovery_are_distinguished_without_changing_inputs(self):
        data = sample()
        data['metrics']['checkout_uncertain'] = {'count': 1, 'oldest_seconds': 10}
        before = copy.deepcopy(data)
        result = diagnostics.collect_snapshot(lambda query: json.dumps(data), SCHEMA, 55432)
        self.assertEqual(result['alerts'], ['PAGAMENTO_INCERTO'])
        self.assertEqual(data, before)
        data['metrics']['checkout_uncertain'] = {'count': 0, 'oldest_seconds': 0}
        self.assertEqual(diagnostics.collect_snapshot(lambda query: json.dumps(data), SCHEMA, 55432)['alerts'], [])

    def test_backup_requires_exact_missing_output_path_failure(self):
        for failure, approved in [('missing_output', True), ('authentication', False), ('connection', False)]:
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                exercise = SimpleNamespace(root=root, cluster=root / 'cluster', pg=Path('/fake/pg'),
                    socket=root / 'socket', schema=SCHEMA, env={'LC_ALL': 'pt_BR'}, record={})
                exercise.sql = lambda query: ['rm_test|' + str(exercise.cluster) + '|55433']

                def failed_dump(command, **kwargs):
                    self.assertEqual(kwargs['env']['LC_ALL'], 'C')
                    if failure == 'missing_output':
                        error = ('pg_dump: error: could not open output file "' + command[-1]
                                 + '": No such file or directory\n').encode()
                    else:
                        error = ('pg_dump: error: ' + failure + ' failed\n').encode()
                    return SimpleNamespace(returncode=1, stderr=error)

                with patch.object(diagnostics.subprocess, 'run', side_effect=failed_dump), \
                        patch.object(diagnostics, 'capture_diagnostics', return_value={'alerts': ['BACKUP_FALHOU']}):
                    if approved:
                        result = diagnostics.prove_failed_backup(exercise)
                        self.assertFalse(result['dump_created'])
                        self.assertEqual(result['alert'], 'BACKUP_FALHOU')
                    else:
                        with self.assertRaises(ValueError):
                            diagnostics.prove_failed_backup(exercise)
                self.assertTrue((root / 'backup-failure.stderr').is_file())


if __name__ == '__main__':
    unittest.main()

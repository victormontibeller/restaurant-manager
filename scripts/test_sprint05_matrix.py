"""Negativos do gate: ausência, instabilidade e evidência de outro candidato falham."""
import copy
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zipfile

from build_sources import BUILD_FILES, build_source_manifest
import sprint05_matrix as matrix


def report(pairs=None):
    pairs = pairs or [('S04-UI01', 'chromium-desktop')]
    return {'errors': [], 'config': {'workers': 1},
            'stats': {'expected': len(pairs), 'unexpected': 0, 'skipped': 0, 'flaky': 0},
            'suites': [{'specs': [
                {'title': scenario + ': jornada fictícia', 'tests': [{'projectName': project,
                  'status': 'expected', 'expectedStatus': 'passed',
                  'results': [{'status': 'passed', 'retry': 0, 'errors': []}]}]}
                for scenario, project in pairs]}]}


def binding():
    return {'runtime': {'git_sha': 'a' * 40, 'artifact_sha256': 'b' * 64, 'pid': 123,
                        'started_at': 'Mon Nov 9 10:00:00 2026', 'port': 8089,
                        'command_sha256': 'c' * 64},
            'inputs': {'source': 'd' * 64}, 'plan_sha256': 'e' * 64}


def receipt(pairs=None):
    pairs = pairs or [('S04-UI01', 'chromium-desktop')]
    frozen = binding()
    return {'status': 'passed', 'exit_code': 0, 'binding_sha256': matrix.object_digest(frozen),
            'runtime_before': copy.deepcopy(frozen['runtime']),
            'runtime_after': copy.deepcopy(frozen['runtime']), 'pairs': [list(pair) for pair in pairs]}


class ReportTests(unittest.TestCase):
    def test_expected_inventory_includes_real_provisioning_worker(self):
        self.assertEqual(len(matrix.SCENARIO_FAMILY), 84)
        self.assertEqual(len(matrix.EXPECTED), len(matrix.SCENARIO_FAMILY) * len(matrix.PROJECTS))
        self.assertEqual(set(matrix.coverage_catalog()), set(matrix.SCENARIO_FAMILY))
        for scenario in ('S01-UI29', 'S01-UI31', 'S04-UI10'):
            for project in matrix.PROJECTS:
                self.assertIn((scenario, project), matrix.EXPECTED)
        delivery = matrix.coverage_catalog()['S04-UI10']
        self.assertEqual(delivery['surfaces'], ['T16'])
        self.assertEqual(set(delivery['actors']), {'EXPEDICAO', 'ADMINISTRADOR'})

    def test_all_pairs_accepted(self):
        self.assertEqual(matrix.report_pairs(report(sorted(matrix.EXPECTED))), matrix.EXPECTED)

    def test_rejects_each_nonpassing_outcome(self):
        for status in ('skipped', 'failed', 'timedOut', 'interrupted'):
            with self.subTest(status=status):
                data = report()
                data['suites'][0]['specs'][0]['tests'][0]['results'][0]['status'] = status
                with self.assertRaises(matrix.EvidenceError):
                    matrix.report_pairs(data)

    def test_rejects_retry_even_when_passed(self):
        data = report()
        data['suites'][0]['specs'][0]['tests'][0]['results'][0]['retry'] = 1
        with self.assertRaises(matrix.EvidenceError):
            matrix.report_pairs(data)

    def test_rejects_failed_first_attempt_followed_by_pass(self):
        data = report()
        data['suites'][0]['specs'][0]['tests'][0]['results'].insert(0, {'status': 'failed', 'retry': 0})
        with self.assertRaises(matrix.EvidenceError):
            matrix.report_pairs(data)

    def test_rejects_unexpected_status_expected_failure_and_missing_result(self):
        for key, value in [('status', 'flaky'), ('expectedStatus', 'failed'), ('results', [])]:
            with self.subTest(key=key):
                data = report()
                data['suites'][0]['specs'][0]['tests'][0][key] = value
                with self.assertRaises(matrix.EvidenceError):
                    matrix.report_pairs(data)

    def test_rejects_global_error_duplicate_unknown_and_empty(self):
        cases = [report(), report(), report(), {'suites': []}]
        cases[0]['errors'] = [{'message': 'Global setup failed'}]
        cases[1]['suites'][0]['specs'] *= 2
        cases[2]['suites'][0]['specs'][0]['title'] = 'S04-UI99: ausente'
        for data in cases:
            with self.subTest(data=data):
                with self.assertRaises(matrix.EvidenceError):
                    matrix.report_pairs(data)

    def test_rejects_missing_stats_wrong_count_and_skip_count(self):
        for stats in ({}, {'expected': 2, 'unexpected': 0, 'skipped': 0, 'flaky': 0},
                      {'expected': 1, 'unexpected': 0, 'skipped': 1, 'flaky': 0}):
            data = report()
            data['stats'] = stats
            with self.assertRaises(matrix.EvidenceError):
                matrix.report_pairs(data)

    def test_inventory_accepts_unexecuted_results_but_not_unknown_cases(self):
        data = report()
        data['suites'][0]['specs'][0]['tests'][0]['results'] = []
        self.assertEqual(len(matrix.report_pairs(data, False)), 1)
        with self.assertRaises(matrix.EvidenceError):
            matrix.report_pairs(data)


class BindingTests(unittest.TestCase):
    def test_manifesto_compartilhado_vincula_pwa_postcss_e_assets_ao_build(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory).resolve()
            for name in (*BUILD_FILES, 'backend/src/main/App.java', 'frontend/src/main.ts',
                         'frontend/public/manifest.webmanifest'):
                path = repo / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('original')
            with patch.object(matrix, 'REPO', repo):
                manifest = matrix.application_fingerprints()
                self.assertEqual(manifest, {str(repo / name): checksum
                                           for name, checksum in build_source_manifest(repo).items()})
                for name in ('scripts/pwa-assets.cjs', 'scripts/build-pwa.cjs',
                             'frontend/.postcssrc.json', 'frontend/public/manifest.webmanifest'):
                    path = repo / name
                    with self.subTest(name=name):
                        path.write_text('alterado')
                        self.assertNotEqual(matrix.application_fingerprints(), manifest)
                        path.write_text('original')
                (repo / 'README.md').write_text('Documentação posterior.')
                self.assertEqual(matrix.application_fingerprints(), manifest)
                (repo / 'scripts/pwa-assets.cjs').unlink()
                with self.assertRaises(matrix.EvidenceError):
                    matrix.application_fingerprints()

    def test_valid_receipt(self):
        self.assertEqual(matrix.check_receipt(receipt(), report(), binding()),
                         {('S04-UI01', 'chromium-desktop')})

    def test_rejects_different_sha_jar_pid_start_or_command(self):
        for key in ('git_sha', 'artifact_sha256', 'pid', 'started_at', 'command_sha256'):
            for side in ('runtime_before', 'runtime_after'):
                with self.subTest(key=key, side=side):
                    row = receipt()
                    row[side][key] = 'divergente'
                    with self.assertRaises(matrix.EvidenceError):
                        matrix.check_receipt(row, report(), binding())

    def test_rejects_other_manifest_missing_case_failure_and_running(self):
        for key, value in [('binding_sha256', 'outro'), ('pairs', []), ('status', 'running'), ('exit_code', 1)]:
            row = receipt()
            row[key] = value
            with self.assertRaises(matrix.EvidenceError):
                matrix.check_receipt(row, report(), binding())

    def test_rejects_unrelated_report(self):
        with self.assertRaises(matrix.EvidenceError):
            matrix.check_receipt(receipt(), report([('S03-UI01', 'chromium-desktop')]), binding())

    def test_freeze_detects_pid_reuse_and_input_change(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            with patch.object(matrix, 'verify_pwa_artifact'), \
                    patch.object(matrix, 'observe_runtime', return_value=binding()['runtime']), \
                    patch.object(matrix, 'input_fingerprints', return_value={'source': 'original'}):
                matrix.frozen({'artifact': {'path': '/unused/app.jar'}}, output, True)
                matrix.frozen({'artifact': {'path': '/unused/app.jar'}}, output)
                with patch.object(matrix, 'input_fingerprints', return_value={'source': 'alterado'}):
                    with self.assertRaises(matrix.EvidenceError):
                        matrix.frozen({'artifact': {'path': '/unused/app.jar'}}, output)
                modified = dict(binding()['runtime'], started_at='outro início')
                with patch.object(matrix, 'observe_runtime', return_value=modified):
                    with self.assertRaises(matrix.EvidenceError):
                        matrix.frozen({'artifact': {'path': '/unused/app.jar'}}, output)

    def test_pair_overrides_cannot_silently_mix_fixtures(self):
        plan = {'suites': {'pedidos': {'env': {'RM_BASE_URL': 'https://sprint03.localhost:8089'}}},
                'pair_env': {'S03-UI01:chromium-desktop': {'RM_PEDIDOS_FIXTURE': '/one'},
                             'S03-UI02:chromium-desktop': {'RM_PEDIDOS_FIXTURE': '/two'}}}
        with self.assertRaises(matrix.EvidenceError):
            matrix.pair_environment(plan, 'pedidos', [('S03-UI01', 'chromium-desktop'),
                                                     ('S03-UI02', 'chromium-desktop')])
        self.assertEqual(matrix.pair_environment(plan, 'pedidos', [('S03-UI01', 'chromium-desktop')])
                         ['RM_PEDIDOS_FIXTURE'], '/one')

    def test_rejects_remote_http_and_credential_destinations(self):
        for url in ('https://example.com:8089', 'http://a.localhost:8089',
                    'https://user:pass@a.localhost:8089', 'https://a.localhost:8088',
                    'https://a.localhost:8089/?token=secret'):
            with self.subTest(url=url):
                with self.assertRaises(matrix.EvidenceError):
                    matrix.pair_environment({'suites': {'foundation': {'env': {'RM_BASE_URL': url}}}},
                                            'foundation', [])

    def test_runtime_requires_actual_java_listener_on_loopback(self):
        with tempfile.TemporaryDirectory() as directory:
            jar = Path(directory).resolve() / 'app.jar'
            jar.write_bytes(b'candidato de teste')
            jar.chmod(0o600)
            plan = {'git_sha': 'a' * 40, 'artifact': {'path': str(jar), 'sha256': matrix.digest(jar)},
                    'runtime': {'pid': 123, 'port': 8089}}
            fields = ['/jdk/bin/java', 'Mon Nov 9 10:00:00 2026', '/jdk/bin/java -jar ' + str(jar)]
            for listener, allowed in [('p123\nf4\nn127.0.0.1:8089\n', True),
                                      ('p123\nf4\nn*:8089\n', False),
                                      ('p456\nf4\nn127.0.0.1:8089\n', False)]:
                calls = [SimpleNamespace(returncode=0, stdout=value) for value in [*fields, listener]]
                with patch.object(matrix.subprocess, 'run', side_effect=calls):
                    if allowed:
                        self.assertEqual(matrix.observe_runtime(plan)['pid'], 123)
                    else:
                        with self.assertRaises(matrix.EvidenceError):
                            matrix.observe_runtime(plan)
            jar.write_bytes(b'outro candidato')
            with self.assertRaises(matrix.EvidenceError):
                matrix.observe_runtime(plan)

    def test_pwa_dist_must_match_complete_packaged_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            build = root / 'dist/restaurant-manager/browser'
            build.mkdir(parents=True)
            files = {'index.html': b'<html>candidato</html>', 'sw.js': b'worker'}
            for name, content in files.items():
                (build / name).write_bytes(content)
            jar = root / 'app.jar'
            with zipfile.ZipFile(jar, 'w') as archive:
                for name, content in files.items():
                    archive.writestr('BOOT-INF/classes/static/' + name, content)
            with patch.object(matrix, 'FRONTEND', root):
                matrix.verify_pwa_artifact(jar)
                (build / 'sw.js').write_bytes(b'worker de outro build')
                with self.assertRaises(matrix.EvidenceError):
                    matrix.verify_pwa_artifact(jar)
                (build / 'sw.js').write_bytes(files['sw.js'])
                (build / 'extra.js').write_bytes(b'arquivo nao empacotado')
                with self.assertRaises(matrix.EvidenceError):
                    matrix.verify_pwa_artifact(jar)


class ConsolidationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.output = Path(self.temporary.name)
        self.frozen_patch = patch.object(matrix, 'frozen', return_value=binding())
        self.inventory_patch = patch.object(matrix, 'check_inventory')
        self.frozen_patch.start()
        self.inventory_patch.start()

    def tearDown(self):
        self.inventory_patch.stop()
        self.frozen_patch.stop()
        self.temporary.cleanup()

    def add_report(self, pairs, name='batch'):
        folder = self.output / 'runs' / name
        folder.mkdir(parents=True)
        matrix.write_json(folder / 'results.json', report(pairs))
        row = receipt(pairs)
        row['report_sha256'] = matrix.digest(folder / 'results.json')
        matrix.write_json(folder / 'receipt.json', row)
        return folder

    def test_missing_case_is_pending_not_approved(self):
        self.add_report(sorted(matrix.EXPECTED)[:-1])
        result = matrix.consolidate({}, self.output)
        self.assertFalse(result['automated_approved'])
        self.assertEqual(len(result['missing']), 1)

    def test_all_automation_still_does_not_approve_visual_linux_or_pilot(self):
        self.add_report(sorted(matrix.EXPECTED))
        result = matrix.consolidate({}, self.output)
        self.assertTrue(result['automated_approved'])
        for field in ('approved', 'visual_approved', 'linux_homologation', 'external_services_approved',
                      'pilot_approved', 'production_approved'):
            self.assertIs(result[field], False)
        self.assertTrue((self.output / 'index.html').is_file())

    def test_modified_report_and_duplicate_batch_block_gate(self):
        folder = self.add_report(sorted(matrix.EXPECTED))
        (folder / 'results.json').write_text('{}')
        result = matrix.consolidate({}, self.output)
        self.assertFalse(result['automated_approved'])
        self.assertEqual(len(result['problems']), 1)
        self.add_report(sorted(matrix.EXPECTED), 'other')
        result = matrix.consolidate({}, self.output)
        self.assertFalse(result['automated_approved'])
        self.assertEqual(result['passed'], len(matrix.EXPECTED))

    def test_duplicate_passing_reports_block_gate(self):
        self.add_report(sorted(matrix.EXPECTED))
        self.add_report(sorted(matrix.EXPECTED), 'duplicate')
        self.assertFalse(matrix.consolidate({}, self.output)['automated_approved'])


class VisualTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.path = Path(self.temporary.name) / 'capture.png'
        self.path.write_bytes(b'captura exclusiva do teste unitario, nunca evidencia da aplicacao')
        self.catalog = matrix.coverage_catalog()
        self.pair_coverage = {pair: self.catalog[pair[0]] for pair in matrix.EXPECTED}
        self.screenshots = {}
        self.review = {'reviewer': 'Revisor de teste', 'entries': []}
        for surface in sorted(matrix.SURFACES):
            scenario = next(s for s, c in self.catalog.items() if surface in c['surfaces'])
            for project in ('chromium-desktop', 'chromium-mobile'):
                shot = self.path.with_name(surface + '-' + project + '.png')
                shot.write_bytes(self.path.read_bytes() + surface.encode() + project.encode())
                pair = (scenario, project)
                self.screenshots[str(shot)] = {'sha256': matrix.digest(shot), 'pairs': {pair}}
                self.review['entries'].append({'surface': surface, 'project': project, 'pair': list(pair),
                                              'path': str(shot), 'sha256': matrix.digest(shot),
                                              'approved': True, 'notes': 'Observação visual da tela de teste.'})

    def tearDown(self):
        self.temporary.cleanup()

    def test_complete_visual_mapping(self):
        self.assertTrue(matrix.check_visual(self.review, self.screenshots, self.pair_coverage))

    def test_rejects_missing_surface_reviewer_rejection_and_empty_notes(self):
        mutations = [lambda r: r['entries'].pop(), lambda r: r.update(reviewer=''),
                     lambda r: r['entries'][0].update(approved=False),
                     lambda r: r['entries'][0].update(notes='')]
        for mutate in mutations:
            row = copy.deepcopy(self.review)
            mutate(row)
            with self.assertRaises(matrix.EvidenceError):
                matrix.check_visual(row, self.screenshots, self.pair_coverage)

    def test_rejects_modified_or_unregistered_capture(self):
        self.review['entries'][0]['sha256'] = 'other'
        with self.assertRaises(matrix.EvidenceError):
            matrix.check_visual(self.review, self.screenshots, self.pair_coverage)
        self.review['entries'][0]['path'] = str(self.path)
        with self.assertRaises(matrix.EvidenceError):
            matrix.check_visual(self.review, self.screenshots, self.pair_coverage)

    def test_rejects_capture_from_other_pair(self):
        entry = self.review['entries'][0]
        self.screenshots[entry['path']]['pairs'] = {('S04-UI08', 'chromium-desktop')}
        with self.assertRaises(matrix.EvidenceError):
            matrix.check_visual(self.review, self.screenshots, self.pair_coverage)


if __name__ == '__main__':
    unittest.main()

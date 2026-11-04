"""Contrato de cobertura independente dos contadores agregados do Playwright."""
import copy
from pathlib import Path
import unittest
from unittest.mock import patch
import release_support


class EvidenceGuardsTest(unittest.TestCase):
    def report(self):
        specs = []
        for project in ('chromium-desktop', 'chromium-mobile', 'chromium-tablet', 'firefox-desktop', 'webkit-desktop'):
            for scenario in ('S00-UI01', 'S00-UI02', 'S00-UI03', 'S00-API01'):
                specs.append({'title': scenario + ': cenário', 'tests': [{
                    'projectName': project, 'expectedStatus': 'passed', 'status': 'expected',
                    'results': [{'status': 'passed', 'retry': 0, 'errors': []}]}]})
        return {'errors': [], 'stats': {'expected': 20, 'unexpected': 0, 'flaky': 0, 'skipped': 0},
                'suites': [{'specs': specs}]}

    def test_cobertura_completa_aceita(self):
        self.assertEqual(len(release_support.verify_e2e_coverage(self.report())), 20)

    def test_contador_verde_nao_substitui_cenario_ausente(self):
        report = self.report()
        report['suites'][0]['specs'].pop()
        with self.assertRaises(ValueError):
            release_support.verify_e2e_coverage(report)

    def test_repetido_nao_substitui_outro_cenario(self):
        report = self.report()
        specs = report['suites'][0]['specs']
        specs[-1] = copy.deepcopy(specs[0])
        with self.assertRaises(ValueError):
            release_support.verify_e2e_coverage(report)

    def test_falha_esperada_retry_e_erro_global_nao_aprovam(self):
        for mutation in ('expectedFailure', 'retry', 'errors'):
            report = self.report()
            test = report['suites'][0]['specs'][0]['tests'][0]
            if mutation == 'expectedFailure':
                test['expectedStatus'] = 'failed'
                test['results'][0]['status'] = 'failed'
            elif mutation == 'retry':
                test['results'].append(copy.deepcopy(test['results'][0]))
            else:
                report['errors'] = [{'message': 'falha global'}]
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                release_support.verify_e2e_coverage(report)

    def test_checkout_sujo_e_head_alterado_recusados(self):
        for outputs in (['a' * 40, ' M teste'], ['b' * 40, '']):
            with patch('release_support.subprocess.check_output', side_effect=outputs):
                with self.assertRaises(ValueError):
                    release_support.clean_sha(Path('.'), 'a' * 40)

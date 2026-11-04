"""Evidências sintéticas destas unidades não aprovam release real."""
import copy
import unittest
from identity_evidence import collect_coverage, validate_binding, validate_visual, EXPECTED


def report(keys):
    return {'errors': [], 'stats': {'expected': len(keys), 'unexpected': 0, 'skipped': 0, 'flaky': 0},
            'suites': [{'specs': [{'title': scenario + ': fixture', 'tests': [{'projectName': project,
                'expectedStatus': 'passed', 'status': 'expected',
                'results': [{'status': 'passed', 'retry': 0, 'errors': []}]}]}]}
                       for project, scenario in keys]}


class IdentityEvidenceTest(unittest.TestCase):
    def test_cobertura_exata_sem_somar_duplicatas(self):
        keys = sorted(EXPECTED)
        self.assertEqual(collect_coverage([report(keys[:30]), report(keys[30:])]), keys)
        for reports in ([report(keys[:-1])], [report(keys), report(keys[:1])],
                        [report(keys + [('browser-desconhecido', 'S01-UI01')])]):
            with self.subTest(reports=len(reports)), self.assertRaises(ValueError):
                collect_coverage(reports)

    def test_falha_skip_retry_flaky_e_totais_falsos_nao_aprovam(self):
        good = report(sorted(EXPECTED))
        for field, value in [('status', 'skipped'), ('retry', 1), ('errors', [{'message': 'erro'}])]:
            data = copy.deepcopy(good)
            data['suites'][0]['specs'][0]['tests'][0]['results'][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                collect_coverage([data])
        for key in ('unexpected', 'flaky', 'skipped', 'expected'):
            data = copy.deepcopy(good); data['stats'][key] += 1
            with self.subTest(key=key), self.assertRaises(ValueError):
                collect_coverage([data])
        for edit in ('expectedStatus', 'status', 'results'):
            data = copy.deepcopy(good)
            test = data['suites'][0]['specs'][0]['tests'][0]
            test[edit] = [] if edit == 'results' else 'skipped'
            with self.assertRaises(ValueError): collect_coverage([data])

    def test_vinculo_exige_mesmo_artefato_e_termino_aprovado(self):
        gate = {'git_sha': 'a' * 40, 'artifact_sha256': 'b' * 64}
        receipt = dict(gate, approved=True, exit_code=0)
        validate_binding(receipt, gate)
        for key, value in [('git_sha', 'c' * 40), ('artifact_sha256', 'c' * 64),
                           ('approved', False), ('exit_code', 1)]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_binding(dict(receipt, **{key: value}), gate)

    def test_visual_nao_aceita_flag_sem_capturas_ou_surface_pendente(self):
        from identity_evidence import SURFACES
        entries = [{'surface': s, 'layout': layout, 'approved': True,
                    'path': '/private/'+s+'-'+layout+'.png', 'sha256': 'a' * 64,
                    'notes': 'Fixture unitária; não houve inspeção real.'}
                   for s in SURFACES for layout in ('mobile', 'desktop')]
        validate_visual(entries)
        for invalid in ([], entries[:-1], entries + entries[:1],
                        [dict(e, approved=False) for e in entries],
                        [dict(e,path='/private/mesma.png') for e in entries]):
            with self.assertRaises(ValueError): validate_visual(invalid)

    def test_banco_diferente_nao_reaproveita_smoke_do_mesmo_jar(self):
        from identity_evidence import validate_database_binding
        database=dict(attempt='/private/attempt',candidate_oid='2',original_oid='1',database='rm_hml')
        validate_database_binding({'database':database},database)
        for key,value in [('attempt','/private/other'),('candidate_oid','3'),('database','rm_test')]:
            with self.subTest(key=key),self.assertRaises(ValueError):
                validate_database_binding({'database':dict(database,**{key:value})},database)
        with self.assertRaises(ValueError):validate_database_binding({},database)

    def test_captura_exige_cenario_e_projeto_correspondentes(self):
        from pathlib import Path
        from identity_evidence import validate_visual_origin
        directory=Path('/private/report')
        image=directory/'artifacts/login-S01-UI01-fixture-chromium-mobile/login.png'
        entry=dict(path=str(image),surface='login',layout='mobile')
        covered=[('chromium-mobile','S01-UI01')]
        validate_visual_origin(entry,directory,covered)
        for changes in ({'surface':'cadastro'},{'layout':'desktop'},
                        {'path':str(image).replace('S01-UI01','S01-UI02')}):
            with self.assertRaises(ValueError):validate_visual_origin(dict(entry,**changes),directory,covered)
        with self.assertRaises(ValueError):validate_visual_origin(entry,directory,[])


if __name__ == '__main__': unittest.main()

"""Evidências sintéticas destas unidades não aprovam release real."""
import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from identity_evidence import collect_coverage, validate_binding, validate_visual, EXPECTED


def report(keys):
    return {'errors': [], 'stats': {'expected': len(keys), 'unexpected': 0, 'skipped': 0, 'flaky': 0},
            'suites': [{'specs': [{'title': scenario + ': fixture', 'tests': [{'projectName': project,
                'expectedStatus': 'passed', 'status': 'expected',
                'results': [{'status': 'passed', 'retry': 0, 'errors': []}]}]}]}
                       for project, scenario in keys]}


class IdentityEvidenceTest(unittest.TestCase):
    def test_bundle_bloqueado_ou_sem_revisao_nao_chega_ao_runtime(self):
        from identity_evidence import check_bundle
        base = dict(scope='sprint-01-regressao-identidade', job='/private/job',
                    blocking_findings=[], acceptance_authorized=True)
        variants = [dict(base, blocking_findings=[{'id': 'instabilidade', 'status': 'aberto'}]),
                    dict(base, acceptance_authorized=False), dict(base, acceptance_authorized=1),
                    dict(base, blocking_findings=None), dict(base, blocking_findings={})]
        variants.extend({k: v for k, v in base.items() if k != missing}
                        for missing in ('blocking_findings', 'acceptance_authorized'))
        with tempfile.TemporaryDirectory() as folder:
            bundle = Path(folder) / 'bundle.json'
            for manifest in variants:
                bundle.write_text(json.dumps(manifest))
                with self.subTest(manifest=manifest), \
                        patch('identity_evidence.private_runtime_path', side_effect=Path), \
                        patch('identity_evidence.durable_artifact', side_effect=AssertionError('Não acessar runtime.')) as artifact:
                    with self.assertRaisesRegex(ValueError, 'bloqueado|revisão'):
                        check_bundle(bundle, Path('/private'), Path('/repo'))
                    artifact.assert_not_called()
            bundle.write_text(json.dumps(base))
            with patch('identity_evidence.private_runtime_path', side_effect=Path), \
                    patch('identity_evidence.durable_artifact', side_effect=ValueError('Gate do artefato ainda obrigatório.')) as artifact:
                with self.assertRaisesRegex(ValueError, 'Gate do artefato'):
                    check_bundle(bundle, Path('/private'), Path('/repo'))
                artifact.assert_called_once()

    def visual_entries(self):
        from identity_evidence import SURFACES
        complements = {
            'convites': ('convites-contexto.png', 'convites-reautenticacao.png',
                'convites-cadastro-viewport.png', 'convites-criar-viewport.png',
                'convites-consulta.png', 'convites-paginacao.png'),
            'plataforma': ('saas-erro.png', 'saas-estado-consulta.png',
                'saas-metadados.png', 'saas-paginacao.png')}
        entries = [{'surface': s, 'layout': layout, 'approved': True,
                    'path': '/private/'+s+'-'+layout+'.png', 'sha256': 'a' * 64,
                    'notes': 'Fixture unitária; não houve inspeção real.'}
                   for s in SURFACES for layout in ('mobile', 'desktop')]
        for entry in entries:
            entry['complements'] = [dict(path='/private/'+entry['layout']+'/'+name,
                sha256='b' * 64, approved=True, notes='Fixture sintética.')
                for name in complements.get(entry['surface'], ())]
        return entries

    def test_complementos_visuais_exigem_cobertura_e_inspecao(self):
        entries = self.visual_entries()
        validate_visual(entries)
        for mutation in ('ausente', 'duplicado', 'reprovado', 'sem-hash', 'sem-nota', 'arquivo-errado'):
            changed = copy.deepcopy(entries)
            entry = next(e for e in changed if e['surface'] == 'convites')
            if mutation == 'ausente': entry['complements'].pop()
            elif mutation == 'duplicado': entry['complements'].append(entry['complements'][0])
            elif mutation == 'reprovado': entry['complements'][0]['approved'] = False
            elif mutation == 'sem-hash': entry['complements'][0]['sha256'] = ''
            elif mutation == 'sem-nota': entry['complements'][0]['notes'] = ''
            else: entry['complements'][0]['path'] = '/private/inventado.png'
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                validate_visual(changed)

    def test_complementos_verificam_arquivo_hash_e_origem(self):
        from identity_evidence import validate_visual_files, VISUAL_TARGETS
        directory = Path('/private/report')
        entries = self.visual_entries()
        covered = []
        for entry in entries:
            scenario, filename = VISUAL_TARGETS[entry['surface']]
            project = 'chromium-' + entry['layout']
            folder = directory / 'artifacts' / (scenario + '-fixture-' + project)
            entry['path'] = str(folder / filename)
            for extra in entry['complements']:
                extra['path'] = str(folder / Path(extra['path']).name)
                extra['sha256'] = 'a' * 64
            covered.append((project, scenario))
        with patch('identity_evidence.private_runtime_path', side_effect=Path), \
                patch('identity_evidence.artifact_hash', return_value='a' * 64) as digest:
            validate_visual_files(entries, [(directory, covered)])
            self.assertEqual(digest.call_count, 46)
            for mutation in ('hash', 'cenario', 'layout', 'fora-relatorio', 'arquivo-ausente'):
                changed = copy.deepcopy(entries)
                extra = next(e for e in changed if e['surface'] == 'convites')['complements'][0]
                if mutation == 'hash': extra['sha256'] = 'b' * 64
                elif mutation == 'cenario': extra['path'] = extra['path'].replace('S01-UI18', 'S01-UI19')
                elif mutation == 'layout': extra['path'] = extra['path'].replace('chromium-mobile', 'chromium-tablet')
                elif mutation == 'fora-relatorio': extra['path'] = extra['path'].replace('/private/report/', '/private/outro/')
                else:
                    digest.side_effect = lambda p: (_ for _ in ()).throw(FileNotFoundError()) if str(p) == extra['path'] else 'a' * 64
                with self.subTest(mutation=mutation), self.assertRaises((ValueError, FileNotFoundError)):
                    validate_visual_files(changed, [(directory, covered)])
                digest.side_effect = None

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
        entries = self.visual_entries()
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

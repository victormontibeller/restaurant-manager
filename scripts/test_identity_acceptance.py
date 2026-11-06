"""Coordenação de aceitação: fixtures não representam promoção real."""
import unittest
import json
import os
from pathlib import Path
import tempfile
from typing import Any
from unittest.mock import Mock, patch
from identity_acceptance import accept, Acceptance
from maintenance_database import DatabaseSwap, durable_journal
from release_support import verify_hml_acceptance


class IdentityAcceptanceTest(unittest.TestCase):
    def test_manifesto_bloqueado_recusado_pelo_preflight_real_sem_escritas(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            root=Path(directory);attempt=root/'maintenance-releases'/('a'*32)
            attempt.mkdir(parents=True,mode=0o700)
            state=dict(stage='hml',attempt=str(attempt),state='health-aprovado-e2e-pendente')
            durable_journal(attempt/'state.json',state)
            bundle=root/'bundle.json'
            durable_journal(bundle,dict(scope='sprint-01-regressao-identidade',
                blocking_findings=[{'id':'instabilidade'}],acceptance_authorized=False))
            ops=Acceptance(root,root,attempt,bundle,None)
            with patch.object(ops,'prepare') as prepare,patch.object(ops,'publish') as publish:
                with self.assertRaisesRegex(ValueError,'Manifesto bloqueado'):
                    accept(ops)
                prepare.assert_not_called();publish.assert_not_called()
            self.assertEqual(json.loads((attempt/'state.json').read_text()),state)
            self.assertFalse((root/'healthy.json').exists())

    def test_preflight_falho_nao_publica_baseline(self):
        ops=Mock();ops.preflight.side_effect=ValueError('matriz incompleta')
        with self.assertRaises(ValueError): accept(ops)
        ops.prepare.assert_not_called();ops.publish.assert_not_called()

    def test_publicacao_so_depois_de_guarda_e_registro_duravel(self):
        ops=Mock();accept(ops)
        self.assertEqual([c[0] for c in ops.method_calls],['preflight','prepare','publish','verify_published','complete'])
        ops.stop.assert_not_called();ops.rollback.assert_not_called()

    def test_falha_parcial_nao_fecha_ledger_nem_retorna_banco_antigo(self):
        for step in ('prepare','publish','verify_published'):
            ops=Mock();getattr(ops,step).side_effect=OSError('injetada')
            with self.subTest(step=step),self.assertRaises(OSError): accept(ops)
            ops.complete.assert_not_called();ops.rollback.assert_not_called()

    def test_finalizacao_real_retomavel_apos_cada_escrita_falha(self):
        for failed in ('acceptance.json','database-swap.json','candidate.json','state.json'):
            with self.subTest(failed=failed),tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
                root=Path(directory);attempt=root/'attempt';attempt.mkdir(mode=0o700)
                ops=Acceptance(root,root,attempt,root/'bundle',None)
                ops.state=dict(stage='hml',state='aceitacao-pendente',git_sha='a'*40,artifact_sha256='b'*64)
                intent:dict[str,Any]=dict(original_oid='1',candidate_oid='2')
                ops.intent=intent
                durable_journal(attempt/'state.json',ops.state)
                durable_journal(attempt/'identity-evidence.json',{'fixture':True})
                swap=DatabaseSwap.__new__(DatabaseSwap);swap.attempt=attempt
                record:dict[str,Any]=dict(stage='hml',state='clone-pronto',original_oid='1',candidate_oid='2')
                swap.record=record
                ops.swap=swap
                def fault(path,data):
                    if path.name==failed:raise OSError('injetada antes de '+failed)
                    durable_journal(path,data)
                with patch('identity_acceptance.durable_journal',side_effect=fault),patch('maintenance_database.durable_journal',side_effect=fault):
                    with self.assertRaises(OSError):ops.complete()
                self.assertEqual(json.loads((attempt/'state.json').read_text())['state'],'aceitacao-pendente')
                ops.complete()
                verify_hml_acceptance(attempt)
                self.assertEqual(json.loads((root/'candidate.json').read_text())['state'],'identidade-aceita')


if __name__=='__main__': unittest.main()

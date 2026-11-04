import copy
import json
import os
from pathlib import Path
import tempfile
import unittest
import uuid
from unittest.mock import patch

import hml_accounts as subject


class HmlAccountsTest(unittest.TestCase):
    def data(self):
        accounts = [dict(host='hml'+s+'.localhost', empresa_id=str(uuid.uuid4()),
                         usuario_id=str(uuid.uuid4()), unit=str(uuid.uuid4()),
                         email='admin@example.invalid', perfil='ADMINISTRADOR') for s in ('a','b')]
        accounts[0]['second_unit'] = str(uuid.uuid4())
        return dict(stage='hml', smoke_api_approved=True, git_sha='a'*40,
                    artifact_sha256='b'*64, accounts=accounts)

    def test_seed_rejects_wrong_artifact_stage_or_tenant(self):
        data = self.data()
        gate = {k:data[k] for k in ('git_sha','artifact_sha256')}
        self.assertEqual(subject.validate_seed(data,gate),data['accounts'][0])
        for key,value in [('stage','test'),('smoke_api_approved',False),('git_sha','c'*40)]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                subject.validate_seed(dict(data,**{key:value}),gate)
        bad = copy.deepcopy(data)
        bad['accounts'][1]['empresa_id'] = bad['accounts'][0]['empresa_id']
        with self.assertRaises(ValueError):subject.validate_seed(bad,gate)
        bad = copy.deepcopy(data)
        bad['accounts'][0]['second_unit'] = bad['accounts'][0]['unit']
        with self.assertRaises(ValueError):subject.validate_seed(bad,gate)

    def test_plan_has_distinct_intentions_and_restricted_profiles(self):
        accounts = subject.plan(self.data()['accounts'][0])
        self.assertEqual(len(accounts),7)
        self.assertEqual(len({a['intention'] for a in accounts}),7)
        self.assertEqual([a['perfil'] for a in accounts].count('CLIENTE'),2)
        self.assertNotIn('ADMINISTRADOR',[a['perfil'] for a in accounts])
        self.assertTrue(all(a['allowed_unit'] != a['forbidden_unit'] for a in accounts))

    def test_journal_never_follows_temporary_symlink(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as tmp:
            root=Path(tmp); target=root/'fixture.json'; victim=root/'other'
            victim.write_text('preservar')
            # Ambos nomes usados pelos escritores do projeto ficam hostis.
            target.with_suffix('.json.new').symlink_to(victim)
            target.with_suffix('.new').symlink_to(victim)
            with self.assertRaises((OSError,ValueError)):
                subject.atomic_json(target,{'accounts':[]})
            self.assertEqual(victim.read_text(),'preservar')

    def test_journal_is_private_and_fsynced(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as tmp:
            target=Path(tmp)/'fixture.json'
            previous=os.umask(0o022)
            try:
                with patch('os.fsync',wraps=os.fsync) as sync:
                    subject.atomic_json(target,{'approved':False})
                    self.assertGreaterEqual(sync.call_count,2)
                self.assertEqual(target.stat().st_mode & 0o777,0o600)
                self.assertEqual(json.loads(target.read_text()),{'approved':False})
            finally:os.umask(previous)

    def test_capture_does_not_accept_other_tenant_or_subject(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as tmp:
            root=Path(tmp); file=root/'mail.txt'
            account=dict(email='test@example.invalid',empresa_id=str(uuid.uuid4()))
            text='Para: '+account['email']+'\nAssunto: Convite de funcionário\nEmpresa: '+account['empresa_id']+'\nCódigo: '+'a'*43+'\n'
            file.write_text(text);file.chmod(0o600)
            self.assertEqual(subject.capture_code(root,account,'Convite de funcionário',0),'a'*43)
            with self.assertRaises(TimeoutError):subject.capture_code(root,account,'Criar conta de cliente',0)
            with self.assertRaises(TimeoutError):subject.capture_code(root,dict(account,empresa_id=str(uuid.uuid4())),'Convite de funcionário',0)

    def test_runtime_requires_exact_database_and_artifact(self):
        gate={'artifact_sha256':'a'*64}
        env={b'RM_DB_URL':b'jdbc:postgresql://127.0.0.1:55432/rm_hml',b'RM_DB_USER':b'rm_hml_app',b'RM_STAGE':b'hml'}
        subject.validate_runtime(gate,gate,env)
        for key in env:
            with self.subTest(key=key),self.assertRaises(ValueError):
                subject.validate_runtime(gate,gate,dict(env,**{}) | {key:b'outro'})
        with self.assertRaises(ValueError):subject.validate_runtime({'artifact_sha256':'b'*64},gate,env)


if __name__ == '__main__':unittest.main()

import copy
import unittest
import json
import os
from pathlib import Path
import tempfile
from unittest.mock import patch
from typing import Any
import hml_identity_smoke as subject
from hml_identity_smoke import PROJECTS, SCENARIOS, coverage


class SmokeCoverageTest(unittest.TestCase):
    def test_runner_records_process_separately_and_preserves_failure(self):
        with tempfile.TemporaryDirectory(dir=os.environ['TMPDIR']) as directory:
            root=Path(directory); fixture=root/'fixture.json'; report=root/'report'
            gate=dict(git_sha='a'*40,artifact_sha256='b'*64)
            fixture.write_text(json.dumps(dict(stage='hml',approved=True,**gate)))
            (root/'healthy.json').write_text('{}')
            before=dict(served_sha=gate['git_sha'],artifact_sha256=gate['artifact_sha256'],health='UP',pid=os.getpid())
            with patch.dict(os.environ,RM_HOME=str(root)), patch('sys.argv',['smoke','--job',str(root/'job'),'--fixture',str(fixture),'--report',str(report)]), \
                 patch.object(subject,'clean_sha',return_value='c'*40), patch.object(subject,'durable_artifact',return_value=(root/'app.jar',gate)), \
                 patch.object(subject,'private_file',return_value=fixture),patch.object(subject,'verify',return_value=before), \
                 patch.object(subject,'validate_runtime'),patch.object(subject.subprocess,'run',side_effect=RuntimeError('injetada')):
                self.assertEqual(subject.main(),1)
            record=json.loads((report/'release-evidence.json').read_text())
            self.assertEqual(record['pid'],before['pid'])
            self.assertEqual(record['runner_pid'],os.getpid())
            self.assertFalse(record['approved'])
            self.assertEqual(record['error_type'],'RuntimeError')

    def fixture(self) -> dict[str, Any]:
        return dict(suites=[dict(specs=[dict(title=s+': cenário fictício unitário', tests=[
            dict(projectName=p, status='expected', expectedStatus='passed',
                 results=[dict(status='passed', retry=0, errors=[])]) for p in PROJECTS]) for s in SCENARIOS])],
            errors=[], stats=dict(expected=50, skipped=0, unexpected=0, flaky=0))

    def test_exact_cross_product(self):
        self.assertEqual(len(coverage(self.fixture())),50)

    def test_missing_duplicate_and_extra_rejected(self):
        for change in ('missing','duplicate','extra'):
            data=self.fixture(); specs=data['suites'][0]['specs']
            if change=='missing':specs.pop()
            elif change=='duplicate':specs.append(copy.deepcopy(specs[0]))
            else:specs[0]['tests'][0]['projectName']='outro'
            with self.subTest(change=change),self.assertRaises(ValueError):coverage(data)

    def test_skip_retry_flaky_expected_failure_and_error_rejected(self):
        for field,value in [('status','flaky'),('expectedStatus','failed')]:
            data=self.fixture();data['suites'][0]['specs'][0]['tests'][0][field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):coverage(data)
        for field,value in [('status','skipped'),('retry',1),('errors',[{'message':'falha'}])]:
            data=self.fixture();data['suites'][0]['specs'][0]['tests'][0]['results'][0][field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):coverage(data)
        data=self.fixture();data['errors']=[{'message':'erro global'}]
        with self.assertRaises(ValueError):coverage(data)

    def test_declared_totals_do_not_override_enumerated_results(self):
        data=self.fixture();data['stats']['expected']=49
        with self.assertRaises(ValueError):coverage(data)


if __name__=='__main__':unittest.main()

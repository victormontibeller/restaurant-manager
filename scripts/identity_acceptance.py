"""Aceita o baseline de identidade já servido; NÃO conclui a Sprint/projeto.

Nenhuma migration, reinício, rename ou exclusão de banco. Mantém o original
bloqueado e o baseline anterior. Falha parcial fica pendente e permite retomar
somente a mesma intenção; jamais restaura silenciosamente dados anteriores.
"""
import argparse
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re

from hml_maintenance import immutable_text
from identity_evidence import check_bundle, require
from maintenance_database import Admin, DatabaseSwap, durable_journal
from release_support import UNIT, artifact_hash, clean_sha, private_runtime_path, previous_artifact, verify


def accept(ops):
    ops.preflight()
    ops.prepare()
    ops.publish()
    ops.verify_published()
    ops.complete()


class Acceptance:
    def __init__(self, root, repo, attempt, bundle, log):
        self.root, self.repo, self.attempt, self.bundle, self.log = root, repo, attempt, bundle, log

    def preflight(self):
        require(self.attempt.parent == self.root / 'maintenance-releases'
                and re.fullmatch('[0-9a-f]{32}', self.attempt.name), 'Tentativa fora do registro hml.')
        self.state = json.loads(private_runtime_path(str(self.attempt / 'state.json')).read_text())
        require(self.state.get('stage') == 'hml' and self.state.get('attempt') == str(self.attempt)
                and self.state.get('state') in ('health-aprovado-e2e-pendente', 'aceitacao-pendente', 'identidade-aceita'),
                'Tentativa não está elegível para esta aceitação.')
        self.evidence = check_bundle(self.bundle, self.root, self.repo)
        require(all(self.state[k] == self.evidence[k] for k in ('git_sha', 'artifact_sha256')),
                'Matriz não pertence ao candidato desta tentativa.')
        self.release = self.root / 'releases' / self.state['git_sha']
        unit = Path.home() / '.config/systemd/user' / UNIT
        self.service = unit.read_text()
        require(self.service == (self.attempt / 'candidate.service').read_text()
                and previous_artifact(self.root, self.service) == self.release / 'app.jar',
                'Unidade atual diverge do candidato validado.')
        admin = Admin(self.root, self.log)
        admin.verify_policy('rm_hml', 'hml')
        self.swap = DatabaseSwap.resume(admin, 'hml', self.attempt)
        require(self.evidence['database'] == dict(attempt=str(self.attempt), database='rm_hml',
                candidate_oid=self.swap.record['candidate_oid'], original_oid=self.swap.record['original_oid']),
                'Smoke não foi executado no banco desta tentativa.')
        require(self.swap.record['state'] in ('clone-pronto', 'identidade-aceita'), 'Troca de banco não está concluída.')
        require(self.swap.confirm('rm_hml', self.swap.record['candidate_oid'])['allowed'] is True,
                'Banco candidato não está disponível.')
        require(self.swap.confirm(self.swap.backup, self.swap.record['original_oid'])['allowed'] is False
                and admin.connections(self.swap.backup) == 0, 'Original não está preservado/bloqueado.')
        before = self.attempt / 'healthy-before-acceptance.json'
        intention = self.attempt / 'acceptance-intent.json'
        self.healthy = dict(served_sha=self.evidence['served_sha'], artifact_sha256=self.evidence['artifact_sha256'],
                            health='UP', scope='sprint-01-identidade-disponivel',
                            acceptance_attempt=str(self.attempt), bundle_sha256=self.evidence['bundle_sha256'],
                            sprint_complete=False)
        self.intent = dict(healthy=self.healthy, previous_healthy_hash=self.state['healthy_hash'],
                           runtime_hash=artifact_hash(self.release / 'runtime.env'),
                           service_sha256=artifact_hash(unit), candidate_oid=self.swap.record['candidate_oid'],
                           original_oid=self.swap.record['original_oid'])
        if intention.exists():
            require(json.loads(private_runtime_path(str(intention)).read_text()) == self.intent,
                    'Intenção de aceitação divergente; preservar e reconciliar.')
            require(artifact_hash(private_runtime_path(str(before))) == self.state['healthy_hash'],
                    'Baseline anterior preservado diverge.')
            current = json.loads((self.root / 'healthy.json').read_text())
            require(artifact_hash(self.root / 'healthy.json') == self.state['healthy_hash']
                    or current == self.healthy, 'Outro baseline foi publicado; não sobrescrever.')
        else:
            require(self.state['state'] == 'health-aprovado-e2e-pendente'
                    and self.swap.record['state'] == 'clone-pronto'
                    and artifact_hash(self.root / 'healthy.json') == self.state['healthy_hash'],
                    'Baseline mudou antes da aceitação.')

    def prepare(self):
        backup = self.attempt / 'healthy-before-acceptance.json'
        if not backup.exists():
            immutable_text(backup, (self.root / 'healthy.json').read_text())
        require(artifact_hash(backup) == self.state['healthy_hash'], 'Cópia do baseline anterior diverge.')
        durable_journal(self.attempt / 'acceptance-intent.json', self.intent)
        self.state.update(state='aceitacao-pendente')
        durable_journal(self.attempt / 'state.json', self.state)
        durable_journal(self.attempt / 'identity-evidence.json', self.evidence)

    def publish(self):
        require(verify(self.root, self.state['git_sha']) == {
            k: self.evidence[k] for k in ('served_sha', 'artifact_sha256', 'health', 'pid')},
            'Runtime mudou antes da publicação.')
        immutable_text(self.release / 'validated.service', self.service)
        durable_journal(self.root / 'healthy.json', self.healthy)

    def verify_published(self):
        require(json.loads((self.root / 'healthy.json').read_text()) == self.healthy
                and (self.release / 'validated.service').read_text() == self.service,
                'Publicação não confirmada por leitura.')
        observed = verify(self.root, self.state['git_sha'])
        require(observed['artifact_sha256'] == self.healthy['artifact_sha256'], 'Runtime divergente após publicação.')

    def complete(self):
        receipt = dict(self.intent, approved=True, stage='hml', state='identidade-aceita',
                       attempt=str(self.attempt), git_sha=self.state['git_sha'],
                       artifact_sha256=self.state['artifact_sha256'],
                       evidence_sha256=artifact_hash(self.attempt / 'identity-evidence.json'),
                       finished_at=datetime.now(timezone.utc).isoformat(), sprint_complete=False)
        durable_journal(self.attempt / 'acceptance.json', receipt)
        digest = artifact_hash(self.attempt / 'acceptance.json')
        self.swap.record['acceptance_sha256'] = digest
        self.swap.save('identidade-aceita')
        terminal = dict(self.state, state='identidade-aceita', acceptance_sha256=digest)
        candidate = dict(terminal, maintenance_attempt=str(self.attempt))
        durable_journal(self.root / 'candidate.json', candidate)
        require(json.loads((self.root / 'candidate.json').read_text()) == candidate,
                'Registro do candidato não confirmado; aceitação permanece pendente.')
        durable_journal(self.attempt / 'state.json', terminal)
        require(json.loads((self.attempt / 'state.json').read_text()) == terminal,
                'Registro terminal não confirmado.')
        self.state = terminal


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--attempt', type=Path, required=True)
    parser.add_argument('--bundle', type=Path, required=True)
    args = parser.parse_args()
    root = Path(os.environ.get('RM_HOME', Path.home() / '.local/share/restaurant-manager')).resolve()
    repo = Path(__file__).resolve().parents[1]
    runner_sha = clean_sha(repo)
    attempt = private_runtime_path(str(args.attempt), directory=True)
    bundle = private_runtime_path(str(args.bundle))
    with (root / 'deploy.lock').open('a') as lock, (attempt / 'acceptance.log').open('ab') as log:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        ops = Acceptance(root, repo, attempt, bundle, log)
        accept(ops)
        clean_sha(repo, runner_sha)
        from release_support import assert_no_hml_maintenance
        assert_no_hml_maintenance(root)
        print(json.dumps(dict(accepted_sha=ops.state['git_sha'], attempt=str(attempt),
                              healthy_promoted=True, sprint_complete=False)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

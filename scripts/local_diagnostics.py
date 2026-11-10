"""Diagnóstico local somente leitura; não instala monitor nem envia alertas.

Agrega estados persistidos sem nomes, payloads, tokens, credenciais ou conteúdo
de e-mail. Limiares são do ensaio fictício, não metas operacionais acordadas.
O chamador comprova o cluster próprio e fornece uma transação READ ONLY.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import uuid

from release_support import atomic_json

METRICS = {
    'jobs_overdue': 'JOB_ATRASADO',
    'jobs_blocked': 'JOB_BLOQUEADO',
    'email_failed': 'EMAIL_FALHOU',
    'email_retry': 'EMAIL_RETRY_PENDENTE',
    'notifications_failed': 'NOTIFICACAO_FALHOU',
    'checkout_uncertain': 'PAGAMENTO_INCERTO',
    'refund_uncertain': 'DEVOLUCAO_INCERTA',
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def alerts_for(metrics, backup_status='not_observed'):
    require(set(metrics) == set(METRICS), 'Diagnóstico incompleto: todas as métricas são obrigatórias.')
    alerts = []
    for key, value in metrics.items():
        require(set(value) == {'count', 'oldest_seconds'} and type(value['count']) is int
                and value['count'] >= 0 and type(value['oldest_seconds']) in (int, float)
                and 0 <= value['oldest_seconds'] < 10 ** 12,
                'Métrica ausente, negativa ou inválida.')
        require(value['count'] != 0 or value['oldest_seconds'] == 0,
                'Idade sem registros correspondentes.')
        if value['count']:
            alerts.append(METRICS[key])
    require(backup_status in ('passed', 'failed', 'not_observed'), 'Estado do backup inválido.')
    if backup_status == 'failed':
        alerts.append('BACKUP_FALHOU')
    return alerts


def snapshot_query(schema, order_id=None):
    require(isinstance(schema, str) and re.fullmatch(r't_[0-9a-f]{32}', schema), 'Schema fictício inválido.')
    order = str(uuid.UUID(order_id)) if order_id else None
    order_filter = " and pedido_id='" + order + "'::uuid" if order else ''
    refund_filter = (" and cobranca_id in (select id from " + schema + ".cobranca where pedido_id='"
                     + order + "'::uuid)") if order else ''
    table_conditions = {
        'jobs_overdue': ('pedido_deadline_trabalho',
                        'not bloqueado and proximo_em<now() and (lease_ate is null or lease_ate<now())' + order_filter,
                        'proximo_em'),
        'jobs_blocked': ('pedido_deadline_trabalho', 'bloqueado' + order_filter, 'proximo_em'),
        'email_failed': ('email_identidade', "estado='FALHOU'", 'proxima_em'),
        'email_retry': ('email_identidade', "estado='PENDENTE' and tentativas>0", 'proxima_em'),
        'notifications_failed': ('notificacao_operacional', "estado='FALHOU'" + order_filter, 'criada_em'),
        'checkout_uncertain': ('pagamento_checkout', "estado in ('EM_RECONCILIACAO','BLOQUEADO')" + order_filter, 'criado_em'),
        'refund_uncertain': ('devolucao', "estado in ('EM_RECONCILIACAO','FALHOU')" + refund_filter, 'criada_em'),
    }
    metrics = []
    for key, (table, condition, timestamp) in table_conditions.items():
        metrics.append("'" + key + "',(select json_build_object('count',count(*),'oldest_seconds',"
                       + "coalesce(greatest(0,extract(epoch from (now()-min(" + timestamp + ")))),0)) from "
                       + schema + '.' + table + ' where ' + condition + ')')
    return ("select json_build_object('database',current_database(),'role',current_user,"
            "'port',current_setting('port')::int,'read_only',current_setting('transaction_read_only'),"
            "'registered',exists(select 1 from public.empresa where schema_name='" + schema + "'),"
            "'observed_at',transaction_timestamp(),'metrics',json_build_object(" + ','.join(metrics) + '))')


def collect_snapshot(read_query, schema, expected_port, order_id=None, backup_status='not_observed'):
    """read_query recebe SELECT e retorna JSON; precisa executar em READ ONLY."""
    require(expected_port in (55432, 55433), 'Porta fora dos ambientes locais de teste.')
    raw = read_query(snapshot_query(schema, order_id))
    if isinstance(raw, list):
        require(len(raw) == 1, 'Consulta de diagnóstico ambígua.')
        raw = raw[0]
    data = json.loads(raw)
    require(data.get('database') == 'rm_test' and data.get('port') == expected_port
            and data.get('read_only') == 'on' and data.get('registered') is True,
            'Consulta não pertence ao banco/tenant de teste ou não é somente leitura.')
    if expected_port == 55432:
        require(data.get('role') == 'rm_test_owner', 'Papel do banco de teste recusado.')
    metrics = data.get('metrics', {})
    alerts = alerts_for(metrics, backup_status)
    return {'scope': 'diagnostico-local-ficticio', 'schema': schema, 'order_id': order_id,
            'observed_at': data['observed_at'], 'read_only': True, 'metrics': metrics, 'alerts': alerts,
            'backup_status': backup_status, 'external_alert_sent': False,
            'operational_supervision_approved': False, 'linux_homologation': False,
            'threshold_note': 'Contagem positiva indica estado a investigar; não define SLA nem responsável.'}


def capture_diagnostics(exercise, label, schema=None, order_id=None, backup_status='not_observed'):
    require(re.fullmatch('[a-z0-9-]{1,64}', label), 'Identificador de diagnóstico inválido.')
    schema = schema or exercise.schema
    require(schema in {exercise.schema, getattr(exercise, 'prebackup_schema', None)},
            'Diagnóstico limitado aos tenants próprios do ensaio.')
    require(exercise.sql("select current_database(),current_setting('data_directory'),current_setting('port')")
            == ['rm_test|' + str(exercise.cluster) + '|55433'], 'Cluster efetivo não é o clone próprio.')
    output = exercise.root / ('diagnostics-' + label + '.json')
    require(not output.exists(), 'Diagnóstico anterior deve ser preservado.')
    exercise.sql('begin isolation level repeatable read read only')
    try:
        result = collect_snapshot(exercise.sql, schema, 55433, order_id, backup_status)
    finally:
        exercise.sql('rollback')
    result.update(artifact_sha256=exercise.args.jar_sha256,
                  pid=exercise.process.pid if exercise.process is not None else None)
    atomic_json(output, result)
    exercise.record.setdefault('diagnostics', []).append({
        'label': label, 'file': output.name, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        'alerts': result['alerts'], 'read_only': True})
    return result


def prove_failed_backup(exercise):
    """Falha real de destino do pg_dump, sem limpar/mudar banco ou dumps válidos."""
    require(exercise.sql("select current_database(),current_setting('data_directory'),current_setting('port')")
            == ['rm_test|' + str(exercise.cluster) + '|55433'], 'Backup negativo limitado ao clone próprio.')
    missing = exercise.root / ('backup-destino-inexistente-' + uuid.uuid4().hex)
    require(not missing.exists(), 'Destino negativo deveria ser inexistente.')
    destination = missing / 'database.dump'
    result = subprocess.run([str(exercise.pg / 'pg_dump'), '-h', str(exercise.socket), '-p', '55433',
                             '-d', 'rm_test', '-Fc', '-n', exercise.schema, '-f', str(destination)],
                            env={**exercise.env, 'LC_ALL': 'C'}, stdout=subprocess.DEVNULL,
                            stderr=subprocess.PIPE, timeout=30)
    log = exercise.root / 'backup-failure.stderr'
    require(not log.exists(), 'Diagnóstico de backup anterior deve ser preservado.')
    with log.open('xb') as handle:
        log.chmod(0o600)
        handle.write(result.stderr)
    require(result.returncode != 0 and not destination.exists()
            and b'could not open output file' in result.stderr
            and str(destination).encode() in result.stderr
            and b'No such file or directory' in result.stderr,
            'Falha de destino do backup não foi demonstrada; outro erro não aprova o ensaio.')
    diagnostics = capture_diagnostics(exercise, 'backup-falhou', backup_status='failed')
    require('BACKUP_FALHOU' in diagnostics['alerts'], 'Falha do backup não foi diagnosticada.')
    exercise.record['backup_failure'] = {'injection': 'destino privado inexistente', 'exit_code': result.returncode,
        'dump_created': False, 'database_mutated': False, 'alert': 'BACKUP_FALHOU',
        'external_alert_sent': False, 'valid_backups_preserved': True,
        'cause': 'pg_dump recusou abrir o arquivo no diretório inexistente',
        'stderr_sha256': hashlib.sha256(log.read_bytes()).hexdigest()}
    return exercise.record['backup_failure']

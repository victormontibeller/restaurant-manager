-- O payload de criação não muda durante retries da mesma intenção.
alter table pagamento_checkout add column retorno_url varchar(2000);
alter table pagamento_checkout add column prazo_segundos integer check (prazo_segundos between 1 and 86400);
update pagamento_checkout set estado='BLOQUEADO',ultima_falha='SnapshotCheckoutAusente'
where retorno_url is null and externo_id is null and estado not in ('CONFIRMADO','RECUSADO');

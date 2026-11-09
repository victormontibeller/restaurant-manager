alter table pedido add column alerta_segundos_snapshot integer not null default 120 check (alerta_segundos_snapshot>0);
alter table pedido add column expiracao_segundos_snapshot integer not null default 300 check (expiracao_segundos_snapshot>alerta_segundos_snapshot);
alter table pedido add column pago_online boolean not null default false;
alter table pedido add column pagamento_expira_em timestamptz;
alter table pedido add column aguardando_aceite_em timestamptz;
update pedido set aguardando_aceite_em=criado_em where canal<>'MESA';
do $$ declare c record; begin
    for c in select conname from pg_constraint where conrelid='pedido'::regclass and contype='c'
        and pg_get_constraintdef(oid) like '%alertar_em%' and pg_get_constraintdef(oid) like '%expirar_em%'
    loop execute format('alter table pedido drop constraint %I',c.conname); end loop;
end $$;
alter table pedido add constraint pedido_relogios_check check (
    (canal='MESA' and not pago_online and alertar_em is null and expirar_em is null and aguardando_aceite_em is null)
    or (canal<>'MESA' and (
        (aguardando_aceite_em is not null and alertar_em is not null and expirar_em is not null and alertar_em>aguardando_aceite_em and expirar_em>alertar_em)
        or (pago_online and aguardando_aceite_em is null and alertar_em is null and expirar_em is null)
    ))
);
alter table pedido add constraint pedido_pagamento_check check (not pago_online or (canal<>'MESA' and pagamento_expira_em is not null));
create table mp_conexao (
    id uuid primary key,
    vendedor varchar(100) not null unique,
    credencial text not null,
    expira_em timestamptz not null,
    ativa boolean not null default true,
    reautorizar boolean not null default false,
    versao bigint not null default 0,
    lease_id uuid,
    lease_ate timestamptz
);
create unique index mp_conexao_ativa on mp_conexao(ativa) where ativa;
create table mp_oauth (
    id uuid primary key,
    state_hash varchar(64) not null unique,
    verificador text not null,
    redirect_uri varchar(500) not null,
    ator_id uuid not null references usuario(id),
    sessao_id uuid not null references sessao(id),
    expira_em timestamptz not null,
    estado varchar(24) not null check (estado in ('CRIADO','PROCESSANDO','CONCLUIDO','REAUTORIZAR')),
    lease_id uuid,
    lease_ate timestamptz
);
create table pagamento_checkout (
    id uuid primary key,
    pedido_id uuid not null references pedido(id),
    conexao_id uuid not null references mp_conexao(id),
    valor numeric(14,2) not null check (valor>0),
    externo_id varchar(100) unique,
    enviado boolean not null default false,
    checkout_url varchar(2000),
    estado varchar(24) not null check (estado in ('SOLICITADO','AGUARDANDO','CONFIRMADO','RECUSADO','EM_RECONCILIACAO','BLOQUEADO')),
    criado_em timestamptz not null,
    proximo_em timestamptz not null,
    tentativas integer not null default 0,
    lease_id uuid,
    lease_ate timestamptz,
    ultima_falha varchar(100),
    unique(id,pedido_id)
);
create unique index pagamento_pedido_ativo on pagamento_checkout(pedido_id) where estado in ('SOLICITADO','AGUARDANDO','EM_RECONCILIACAO','BLOQUEADO');
alter table financeiro_intencao alter column ator_id drop not null;
alter table recebimento drop constraint recebimento_metodo_check;
alter table recebimento add constraint recebimento_metodo_check check (metodo in ('DINHEIRO','CARTAO','PIX','ONLINE'));
alter table recebimento add column checkout_id uuid references pagamento_checkout(id);
alter table recebimento add column transacao_externa varchar(100) unique;
alter table devolucao drop constraint devolucao_estado_check;
alter table devolucao add constraint devolucao_estado_check check (estado in ('SOLICITADA','EM_PROCESSAMENTO','CONFIRMADA','EM_RECONCILIACAO','FALHOU'));
alter table devolucao add column checkout_id uuid references pagamento_checkout(id);
alter table devolucao add column externo_id varchar(100) unique;
alter table devolucao add column proximo_em timestamptz not null default now();
alter table devolucao add column lease_id uuid;
alter table devolucao add column lease_ate timestamptz;
alter table devolucao add column tentativas integer not null default 0;
alter table devolucao add column ultima_falha varchar(100);
-- Toda devolução ainda não confirmada conserva sua reserva, inclusive falha terminal.
alter table devolucao drop constraint devolucao_check;
alter table devolucao add constraint devolucao_confirmacao_check check ((estado='CONFIRMADA')=(confirmada_em is not null));
revoke all on mp_conexao,mp_oauth,pagamento_checkout from public;
grant select,insert,update on mp_conexao,mp_oauth,pagamento_checkout to ${runtimeRole};

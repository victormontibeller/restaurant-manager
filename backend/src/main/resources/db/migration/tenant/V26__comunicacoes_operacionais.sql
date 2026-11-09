create table notificacao_operacional (
    id uuid primary key,
    unidade_id uuid not null references unidade(id),
    pedido_id uuid not null references pedido(id),
    referencia uuid not null,
    tipo varchar(60) not null,
    estado varchar(16) not null default 'PENDENTE' check (estado in ('PENDENTE','CAPTURADO','FALHOU')),
    conteudo text,
    tentativas integer not null default 0 check (tentativas between 0 and 5),
    proximo_em timestamptz not null default now(),
    lease_id uuid,
    lease_ate timestamptz,
    ultima_falha varchar(100),
    criada_em timestamptz not null default now(),
    unique(pedido_id,tipo,referencia)
);
revoke all on notificacao_operacional from public;
grant select,insert,update on notificacao_operacional to ${runtimeRole};
insert into permissao_perfil(perfil,acao) values ('GERENTE','pagamento.reconciliar') on conflict do nothing;

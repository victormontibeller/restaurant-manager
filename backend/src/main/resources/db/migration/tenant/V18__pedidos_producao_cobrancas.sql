create table pedido (
    id uuid primary key,
    unidade_id uuid not null references unidade(id),
    comanda_id uuid,
    usuario_id uuid references usuario(id),
    participante_id uuid references participante_mesa(id),
    autoria varchar(16) not null check (autoria in ('CLIENTE','FUNCIONARIO','PARTICIPANTE')),
    canal varchar(12) not null check (canal in ('DELIVERY','RETIRADA','MESA')),
    estado varchar(24) not null check (estado in ('AGUARDANDO_ACEITE','NA_FILA','EM_PREPARO','PRONTO','CONCLUIDO','CANCELADO')),
    versao bigint not null default 0 check (versao >= 0),
    criado_em timestamptz not null,
    primeiro_preparo_em timestamptz,
    alertar_em timestamptz,
    expirar_em timestamptz,
    alertado boolean not null default false,
    observacao varchar(500) not null default '',
    linhas jsonb not null check (jsonb_typeof(linhas) = 'array' and jsonb_array_length(linhas) between 1 and 50),
    endereco jsonb,
    payload text not null,
    unique (id, unidade_id),
    foreign key (comanda_id, unidade_id) references comanda(id, unidade_id),
    check ((usuario_id is not null) <> (participante_id is not null)),
    check ((autoria = 'PARTICIPANTE') = (participante_id is not null)),
    check ((canal = 'MESA') = (comanda_id is not null)),
    check ((canal = 'DELIVERY') = (endereco is not null)),
    check ((canal = 'MESA' and alertar_em is null and expirar_em is null)
        or (canal <> 'MESA' and alertar_em > criado_em and expirar_em > alertar_em))
);
create index pedido_fila on pedido(unidade_id, estado, criado_em, id);
create index pedido_cliente on pedido(usuario_id, criado_em desc, id);
create index pedido_participante on pedido(participante_id, criado_em desc, id);
create index pedido_comanda on pedido(comanda_id, estado);
create index pedido_deadline on pedido(expirar_em, alertar_em) where estado = 'AGUARDANDO_ACEITE';

create table unidade_producao (
    id uuid primary key,
    pedido_id uuid not null references pedido(id),
    linha_id uuid not null,
    ordinal integer not null check (ordinal > 0),
    estado varchar(16) not null check (estado in ('NA_FILA','EM_PREPARO','PRONTO','CANCELADO')),
    iniciado_em timestamptz,
    concluido_em timestamptz,
    unique(pedido_id, linha_id, ordinal),
    unique(id, pedido_id),
    check (estado <> 'EM_PREPARO' or iniciado_em is not null),
    check (estado <> 'PRONTO' or (iniciado_em is not null and concluido_em is not null)),
    check (concluido_em is null or concluido_em >= iniciado_em)
);
create index unidade_producao_pedido on unidade_producao(pedido_id, id);

create table pedido_historico (
    sequencia bigint generated always as identity primary key,
    pedido_id uuid not null references pedido(id),
    tipo varchar(60) not null,
    motivo varchar(500) not null,
    ator_id uuid,
    ocorrido_em timestamptz not null
);
create index pedido_historico_pedido on pedido_historico(pedido_id, sequencia);

create table pedido_comando (
    id uuid primary key,
    pedido_id uuid not null references pedido(id),
    ator_id uuid not null,
    acao varchar(80) not null,
    payload text not null,
    criado_em timestamptz not null default now()
);
create table solicitacao_cancelamento (
    id uuid primary key,
    pedido_id uuid not null references pedido(id),
    motivo varchar(500) not null,
    estado varchar(12) not null check (estado in ('PENDENTE','APROVADA','REJEITADA')),
    criada_em timestamptz not null,
    decidida_em timestamptz
);
create unique index solicitacao_cancelamento_pendente on solicitacao_cancelamento(pedido_id) where estado = 'PENDENTE';

create table prazo_aceite_empresa (
    id smallint primary key check (id = 1),
    versao bigint not null default 0 check (versao >= 0),
    alerta_segundos integer not null default 120,
    expiracao_segundos integer not null default 300,
    check (alerta_segundos > 0 and alerta_segundos < expiracao_segundos and expiracao_segundos <= 86400)
);
insert into prazo_aceite_empresa(id) values (1);
create table prazo_aceite_unidade (
    unidade_id uuid primary key references unidade(id),
    versao bigint not null default 0 check (versao >= 0),
    alerta_segundos integer,
    expiracao_segundos integer,
    check ((alerta_segundos is null and expiracao_segundos is null)
        or (alerta_segundos > 0 and alerta_segundos < expiracao_segundos and expiracao_segundos <= 86400))
);

create table cobranca (
    id uuid primary key,
    unidade_id uuid not null references unidade(id),
    pedido_id uuid unique,
    comanda_id uuid unique,
    pago_confirmado numeric(14,2) not null default 0 check (pago_confirmado >= 0),
    devolvido_confirmado numeric(14,2) not null default 0 check (devolvido_confirmado >= 0 and devolvido_confirmado <= pago_confirmado),
    pendencia_financeira boolean not null default false,
    foreign key (pedido_id, unidade_id) references pedido(id, unidade_id),
    foreign key (comanda_id, unidade_id) references comanda(id, unidade_id),
    check ((pedido_id is null) <> (comanda_id is null))
);
create table cobranca_parcela (
    id uuid primary key,
    cobranca_id uuid not null references cobranca(id),
    pedido_id uuid not null references pedido(id),
    unidade_producao_id uuid unique,
    tipo varchar(8) not null check (tipo in ('UNIDADE','TAXA')),
    original numeric(14,2) not null check (original >= 0),
    abatido numeric(14,2) not null default 0 check (abatido >= 0 and abatido <= original),
    foreign key (unidade_producao_id, pedido_id) references unidade_producao(id, pedido_id),
    check ((tipo = 'UNIDADE') = (unidade_producao_id is not null))
);
create index cobranca_parcela_cobranca on cobranca_parcela(cobranca_id);
create index cobranca_parcela_pedido on cobranca_parcela(pedido_id);
create table ajuste_cobranca (
    id uuid primary key,
    intencao_id uuid not null,
    parcela_id uuid not null references cobranca_parcela(id),
    valor numeric(14,2) not null check (valor > 0),
    motivo varchar(500) not null,
    criado_em timestamptz not null,
    unique (intencao_id, parcela_id)
);

REVOKE ALL ON pedido, unidade_producao, pedido_historico, pedido_comando, solicitacao_cancelamento, prazo_aceite_empresa, prazo_aceite_unidade, cobranca, cobranca_parcela, ajuste_cobranca FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON pedido, unidade_producao, pedido_historico, pedido_comando, solicitacao_cancelamento, prazo_aceite_empresa, prazo_aceite_unidade, cobranca, cobranca_parcela, ajuste_cobranca TO ${runtimeRole};
GRANT USAGE ON SEQUENCE pedido_historico_sequencia_seq TO ${runtimeRole};
REVOKE UPDATE ON pedido_historico, pedido_comando, ajuste_cobranca FROM ${runtimeRole};

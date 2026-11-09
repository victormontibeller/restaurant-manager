create table financeiro_intencao (
    id uuid primary key,
    cobranca_id uuid not null references cobranca(id),
    ator_id uuid not null references usuario(id),
    acao varchar(32) not null,
    payload text not null,
    criado_em timestamptz not null default now()
);
create table recebimento (
    id uuid primary key references financeiro_intencao(id),
    cobranca_id uuid not null references cobranca(id),
    metodo varchar(16) not null check (metodo in ('DINHEIRO','CARTAO','PIX')),
    valor numeric(14,2) not null check (valor > 0),
    entregue numeric(14,2) not null check (entregue >= valor),
    confirmado_em timestamptz not null default now(),
    unique (id, cobranca_id),
    check (metodo = 'DINHEIRO' or entregue = valor)
);
create table devolucao (
    id uuid primary key references financeiro_intencao(id),
    cobranca_id uuid not null references cobranca(id),
    recebimento_id uuid not null,
    valor numeric(14,2) not null check (valor > 0),
    motivo varchar(500) not null,
    estado varchar(24) not null check (estado in ('SOLICITADA','CONFIRMADA')),
    criada_em timestamptz not null default now(),
    confirmada_em timestamptz,
    foreign key (recebimento_id,cobranca_id) references recebimento(id,cobranca_id),
    check ((estado = 'CONFIRMADA') = (confirmada_em is not null))
);
create index recebimento_cobranca on recebimento(cobranca_id,confirmado_em);
create index devolucao_cobranca on devolucao(cobranca_id,estado);
revoke all on financeiro_intencao,recebimento,devolucao from public;
grant select,insert on financeiro_intencao,recebimento to ${runtimeRole};
grant select,insert,update on devolucao to ${runtimeRole};

alter table pedido drop constraint pedido_estado_check;
alter table pedido add constraint pedido_estado_check check (estado in ('AGUARDANDO_PAGAMENTO','AGUARDANDO_ACEITE','NA_FILA','EM_PREPARO','PRONTO','EM_ENTREGA','CONCLUIDO','CANCELADO'));
create table ocorrencia_entrega (
    pedido_id uuid primary key references pedido(id),
    motivo varchar(500) not null,
    estado varchar(24) not null check (estado in ('PENDENTE','NOVA_TENTATIVA','CANCELAMENTO')),
    devolver_taxa boolean,
    registrada_em timestamptz not null,
    decidida_em timestamptz,
    decisao varchar(500)
);
create table endereco_cliente (
    id uuid primary key,
    usuario_id uuid not null references usuario(id),
    versao bigint not null default 0 check (versao >= 0),
    descricao varchar(100) not null,
    endereco jsonb not null check (jsonb_typeof(endereco)='object'),
    ativo boolean not null default true
);
create index endereco_cliente_usuario on endereco_cliente(usuario_id,id);
revoke all on ocorrencia_entrega,endereco_cliente from public;
grant select,insert,update on ocorrencia_entrega,endereco_cliente to ${runtimeRole};

insert into permissao_perfil(perfil,acao)
select perfil,acao from (values ('GERENTE','entrega.registrar_ocorrencia'),('EXPEDICAO','entrega.registrar_ocorrencia'),('GERENTE','entrega.decidir_ocorrencia')) novas(perfil,acao)
on conflict do nothing;

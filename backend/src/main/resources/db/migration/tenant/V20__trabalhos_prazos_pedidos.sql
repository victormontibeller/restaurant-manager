create table pedido_deadline_trabalho (
    pedido_id uuid primary key references pedido(id),
    proximo_em timestamptz not null,
    lease_id uuid,
    lease_ate timestamptz,
    tentativas integer not null default 0 check (tentativas between 0 and 5),
    bloqueado boolean not null default false,
    ultima_falha varchar(100),
    check ((lease_id is null) = (lease_ate is null))
);
create index pedido_deadline_trabalho_fila on pedido_deadline_trabalho(proximo_em)
    where not bloqueado;
insert into pedido_deadline_trabalho(pedido_id,proximo_em)
    select id,case when alertado then expirar_em else alertar_em end
    from pedido where estado='AGUARDANDO_ACEITE';
REVOKE ALL ON pedido_deadline_trabalho FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON pedido_deadline_trabalho TO ${runtimeRole};

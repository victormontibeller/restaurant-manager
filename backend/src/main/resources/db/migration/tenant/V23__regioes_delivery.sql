create table delivery_config (
    unidade_id uuid primary key references unidade(id),
    versao bigint not null check (versao > 0),
    checkout_segundos integer not null default 900 check (checkout_segundos between 60 and 86400),
    regioes jsonb not null check (jsonb_typeof(regioes) = 'array' and jsonb_array_length(regioes) <= 100)
);
revoke all on delivery_config from public;
grant select,insert,update on delivery_config to ${runtimeRole};

alter table pedido add column entrega jsonb;

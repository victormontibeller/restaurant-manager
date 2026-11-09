create table mp_recurso (
    recurso varchar(100) primary key,
    empresa_id uuid not null references empresa(id)
);
create table mp_inbox (
    id uuid primary key,
    recurso varchar(100) not null,
    criado_em timestamptz not null default now(),
    processado_em timestamptz
);
create index mp_inbox_pendente on mp_inbox(recurso) where processado_em is null;
revoke all on mp_recurso,mp_inbox from public;
grant select,insert on mp_recurso to ${runtimeRole};
grant select,insert,update on mp_inbox to ${runtimeRole};

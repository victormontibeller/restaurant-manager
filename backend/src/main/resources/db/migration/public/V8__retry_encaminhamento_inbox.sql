alter table mp_inbox add column tentativas integer not null default 0 check (tentativas >= 0);
alter table mp_inbox add column proximo_em timestamptz not null default now();
alter table mp_inbox add column ultima_falha varchar(100);

create index mp_inbox_proxima_tentativa on mp_inbox(proximo_em,criado_em,id)
    where processado_em is null;

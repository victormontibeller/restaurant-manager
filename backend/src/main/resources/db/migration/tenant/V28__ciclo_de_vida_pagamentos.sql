-- A tentativa corrente conserva a unicidade; históricos podem reconciliar
-- pagamentos tardios sem voltar a criar uma cobrança.
alter table pagamento_checkout add column substituida boolean not null default false;
with ordenadas as (
    select id,row_number() over (
        partition by pedido_id
        order by (estado in ('SOLICITADO','AGUARDANDO','EM_RECONCILIACAO','BLOQUEADO')) desc,
            criado_em desc,id desc
    ) as posicao
    from pagamento_checkout
)
update pagamento_checkout c set substituida=true
from ordenadas o where o.id=c.id and o.posicao>1;

drop index pagamento_pedido_ativo;
create unique index pagamento_pedido_ativo on pagamento_checkout(pedido_id)
    where not substituida and estado in ('SOLICITADO','AGUARDANDO','EM_RECONCILIACAO','BLOQUEADO');

-- OAuth é transitório e não deve impedir a retenção da sessão que o autorizou.
-- A conexão, os pagamentos e a auditoria têm ciclos de vida independentes.
alter table mp_oauth drop constraint mp_oauth_sessao_id_fkey;
alter table mp_oauth add constraint mp_oauth_sessao_id_fkey
    foreign key (sessao_id) references sessao(id) on delete cascade;

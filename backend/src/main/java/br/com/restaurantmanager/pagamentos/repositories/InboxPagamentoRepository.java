package br.com.restaurantmanager.pagamentos.repositories;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Locale;
import java.util.UUID;

@Repository
public class InboxPagamentoRepository {
    private final JdbcTemplate jdbc;

    public InboxPagamentoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void registrar(UUID id, String recurso) {
        jdbc.update(
                "insert into public.mp_inbox(id,recurso) values (?,?) on conflict(id) do nothing",
                id,
                recurso.toLowerCase(Locale.ROOT));
    }

    public void encaminhar() {
        var eventos =
                jdbc.query(
                        """
select i.id,i.recurso,e.schema_name from public.mp_inbox i join public.mp_recurso r on r.recurso=i.recurso
join public.empresa e on e.id=r.empresa_id where i.processado_em is null
order by i.criado_em,i.id limit 50 for update of i skip locked
""",
                        (r, n) ->
                                new Evento(
                                        r.getObject(1, UUID.class),
                                        r.getString(2),
                                        r.getString(3)));
        for (var evento : eventos) {
            if (!evento.schema().matches("t_[a-f0-9]{32}"))
                throw new IllegalStateException("Mapeamento interno inválido.");
            int alterados =
                    jdbc.update(
                            "update "
                                    + evento.schema()
                                    + ".pagamento_checkout set"
                                    + " estado='EM_RECONCILIACAO',tentativas=0,proximo_em=now()"
                                    + " where lower(externo_id)=? and lease_id is null",
                            evento.recurso());
            if (alterados > 0)
                jdbc.update(
                        "update public.mp_inbox set processado_em=now() where id=?", evento.id());
        }
    }

    private record Evento(UUID id, String recurso, String schema) {}
}

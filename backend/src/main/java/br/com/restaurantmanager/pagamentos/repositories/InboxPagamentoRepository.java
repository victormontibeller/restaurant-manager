package br.com.restaurantmanager.pagamentos.repositories;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
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

    public List<UUID> pendentes() {
        return jdbc.query(
                "select id from public.mp_inbox where processado_em is null and proximo_em<=now()"
                        + " order by proximo_em,criado_em,id limit 50",
                (r, n) -> r.getObject(1, UUID.class));
    }

    public void encaminhar(UUID id) {
        var recursos =
                jdbc.query(
                        "select recurso from public.mp_inbox where id=? and processado_em is null"
                                + " and proximo_em<=now() for update skip locked",
                        (r, n) -> r.getString(1),
                        id);
        if (recursos.isEmpty()) return;
        String recurso = recursos.getFirst();
        var schemas =
                jdbc.query(
                        "select e.schema_name from public.mp_recurso r join public.empresa e"
                                + " on e.id=r.empresa_id where r.recurso=?",
                        (r, n) -> r.getString(1),
                        recurso);
        if (schemas.isEmpty()) {
            adiar(id, "RecursoNaoMapeado");
            return;
        }
        String schema = schemas.getFirst();
        if (!schema.matches("t_[a-f0-9]{32}"))
            throw new IllegalStateException("Mapeamento interno inválido.");
        int alterados =
                jdbc.update(
                        "update "
                                + schema
                                + ".pagamento_checkout set"
                                + " estado='EM_RECONCILIACAO',tentativas=0,proximo_em=now()"
                                + " where lower(externo_id)=? and lease_id is null",
                        recurso);
        if (alterados == 0) {
            adiar(id, "CheckoutIndisponivel");
            return;
        }
        jdbc.update(
                "update public.mp_inbox set processado_em=now(),ultima_falha=null where id=?", id);
    }

    public void adiar(UUID id, String tipo) {
        jdbc.update(
                "update public.mp_inbox set tentativas=least(tentativas,2147483646)+1,"
                        + " proximo_em=now()+(least(tentativas,29)+1)*interval '30 seconds',ultima_falha=?"
                        + " where id=? and processado_em is null and proximo_em<=now()",
                tipo,
                id);
    }
}

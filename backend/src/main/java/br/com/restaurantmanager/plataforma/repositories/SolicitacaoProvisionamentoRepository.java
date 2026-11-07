package br.com.restaurantmanager.plataforma.repositories;

import br.com.restaurantmanager.plataforma.dtos.IdentidadePlataforma;
import br.com.restaurantmanager.plataforma.dtos.PedidoProvisionamento;
import br.com.restaurantmanager.plataforma.dtos.RegistroSolicitacaoProvisionamento;
import br.com.restaurantmanager.plataforma.dtos.ResumoSolicitacaoProvisionamento;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SolicitacaoProvisionamentoRepository {
    private final JdbcTemplate jdbc;

    public SolicitacaoProvisionamentoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void bloquear(UUID id) {
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            try (var statement = connection.prepareStatement("select pg_advisory_xact_lock(hashtextextended(?,7240101))")) {
                statement.setString(1, id.toString());
                statement.execute();
            }
            return null;
        });
    }

    public RegistroSolicitacaoProvisionamento buscar(UUID id) {
        return jdbc.query("select id,operador_id,nome,host,unidade_nome,administrador_email,administrador_senha_hash,estado,versao,ultima_falha from public.solicitacao_provisionamento where id=?",
                        (r, n) -> new RegistroSolicitacaoProvisionamento(
                                r.getObject(1, UUID.class), r.getObject(2, UUID.class), r.getString(3),
                                r.getString(4), r.getString(5), r.getString(6), r.getString(7),
                                r.getString(8), r.getLong(9), r.getString(10)),
                        id)
                .stream().findFirst().orElse(null);
    }

    public boolean bloquearReserva() {
        return Boolean.TRUE.equals(jdbc.queryForObject("select pg_try_advisory_xact_lock(7240100)", Boolean.class));
    }

    public boolean ocupado(UUID id, String host) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from public.empresa where id=?) or exists(select 1 from public.dominio where host=?)",
                Boolean.class, id, host));
    }

    public boolean inserir(PedidoProvisionamento pedido, UUID operador, String hash) {
        return jdbc.update("insert into public.solicitacao_provisionamento(id,operador_id,nome,host,unidade_nome,administrador_email,administrador_senha_hash) values (?,?,?,?,?,?,?) on conflict do nothing",
                pedido.id(), operador, pedido.nome(), pedido.host(), pedido.unidade(), pedido.email(), hash) == 1;
    }

    public void auditar(UUID id, IdentidadePlataforma ator, String evento, long versao) {
        jdbc.update("insert into public.auditoria_solicitacao_provisionamento(id,solicitacao_id,operador_id,sessao_id,evento,versao) values (?,?,?,?,?,?)",
                UUID.randomUUID(), id, ator.usuarioId(), ator.sessaoId(), evento, versao);
    }

    public boolean retomar(UUID id, long versao) {
        return jdbc.update("update public.solicitacao_provisionamento set estado='SOLICITADO',versao=versao+1,ultima_falha=null,atualizado_em=clock_timestamp() where id=? and versao=? and estado='FALHOU'",
                id, versao) == 1;
    }

    public List<ResumoSolicitacaoProvisionamento> listar(int pagina) {
        return jdbc.query("select id,nome,host,estado,versao,ultima_falha from public.solicitacao_provisionamento order by criado_em desc,id limit 50 offset ?",
                (r, n) -> new ResumoSolicitacaoProvisionamento(r.getObject(1, UUID.class), r.getString(2),
                        r.getString(3), r.getString(4), r.getLong(5), r.getString(6)),
                pagina * 50);
    }
}

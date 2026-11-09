package br.com.restaurantmanager.pedidos.repositories;

import br.com.restaurantmanager.carrinho.dtos.SnapshotLinha;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.pedidos.dtos.HistoricoPedido;
import br.com.restaurantmanager.pedidos.dtos.SolicitacaoCancelamento;
import br.com.restaurantmanager.pedidos.dtos.UnidadeProducao;
import br.com.restaurantmanager.pedidos.models.EstadoPedido;
import br.com.restaurantmanager.pedidos.models.EstadoProducao;
import br.com.restaurantmanager.pedidos.models.OrdenacaoPedidos;
import br.com.restaurantmanager.pedidos.models.PedidoRegistro;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.Session;
import org.hibernate.query.NativeQuery;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
public class PedidoRepository {
    private static final String COLUNAS = """
            id, unidade_id, comanda_id, usuario_id, participante_id, autoria, canal, estado,
            versao, criado_em, primeiro_preparo_em, alertar_em, expirar_em, alertado,
            observacao, cast(linhas as text), payload
            """;
    private final EntityManager em;
    private final ObjectMapper mapper;

    public PedidoRepository(EntityManager em, ObjectMapper mapper) {
        this.em = em;
        this.mapper = mapper;
    }

    public void bloquearIntencao(UUID id) {
        consulta("select 1 from pg_advisory_xact_lock(hashtextextended(:chave, 3))", Integer.class)
                .setParameter("chave", id.toString()).getSingleResult();
    }

    public Optional<PedidoRegistro> consultar(UUID id, boolean bloquear) {
        return consulta("select " + COLUNAS + " from pedido where id = :id" + (bloquear ? " for update" : ""), Object[].class)
                .setParameter("id", id).getResultStream().findFirst().map(this::pedido);
    }

    public List<UUID> listar(UUID unidade, UUID usuario, UUID participante, int pagina, boolean cozinha) {
        return listar(unidade, usuario, participante, pagina, cozinha, null, null, OrdenacaoPedidos.RECENTES);
    }

    public List<UUID> listar(UUID unidade, UUID usuario, UUID participante, int pagina, boolean cozinha,
            List<EstadoPedido> estados, CanalAtendimento canal, OrdenacaoPedidos ordenacao) {
        String filtro = unidade != null ? "unidade_id = :dono" : usuario != null ? "usuario_id = :dono and autoria = 'CLIENTE'" : "participante_id = :dono";
        if (cozinha) filtro += " and estado in ('NA_FILA','EM_PREPARO','PRONTO')";
        boolean filtrarEstados = estados != null && !estados.isEmpty();
        if (filtrarEstados) filtro += " and estado in (:estados)";
        if (canal != null) filtro += " and canal = :canal";
        String direcao = ordenacao == OrdenacaoPedidos.ANTIGOS ? "asc" : "desc";
        var query = consulta("select id from pedido where " + filtro + " order by criado_em " + direcao + ", id", UUID.class)
                .setParameter("dono", unidade != null ? unidade : usuario != null ? usuario : participante);
        if (filtrarEstados) query.setParameterList("estados", estados.stream().map(Enum::name).distinct().toList());
        if (canal != null) query.setParameter("canal", canal.name());
        return query.setFirstResult(pagina * 50).setMaxResults(51).getResultList();
    }

    public void criar(EnviarPedido entrada, UUID usuario, UUID participante, String autoria,
            List<SnapshotLinha> linhas, Instant agora, int alerta, int expiracao, String payload) {
        boolean mesa = entrada.canal() == CanalAtendimento.MESA;
        em.createNativeQuery("""
                insert into pedido(id,unidade_id,comanda_id,usuario_id,participante_id,autoria,canal,
                    estado,criado_em,alertar_em,expirar_em,observacao,linhas,endereco,payload)
                values (:id,:unidade,:comanda,:usuario,:participante,:autoria,:canal,:estado,
                    :agora,:alerta,:expiracao,:observacao,cast(:linhas as jsonb),cast(:endereco as jsonb),:payload)
                """).setParameter("id", entrada.intencaoId()).setParameter("unidade", entrada.unidadeId())
                .setParameter("comanda", entrada.comandaId()).setParameter("usuario", usuario)
                .setParameter("participante", participante).setParameter("autoria", autoria)
                .setParameter("canal", entrada.canal().name()).setParameter("estado", mesa ? "NA_FILA" : "AGUARDANDO_ACEITE")
                .setParameter("agora", agora).setParameter("alerta", mesa ? null : agora.plusSeconds(alerta))
                .setParameter("expiracao", mesa ? null : agora.plusSeconds(expiracao))
                .setParameter("observacao", entrada.observacao() == null ? "" : entrada.observacao().strip())
                .setParameter("linhas", json(linhas)).setParameter("endereco", entrada.endereco() == null ? null : json(entrada.endereco()))
                .setParameter("payload", payload).executeUpdate();
        for (SnapshotLinha linha : linhas) {
            for (int ordinal = 1; ordinal <= linha.quantidade(); ordinal++) {
                em.createNativeQuery("""
                        insert into unidade_producao(id,pedido_id,linha_id,ordinal,estado)
                        values (:id,:pedido,:linha,:ordinal,'NA_FILA')
                        """).setParameter("id", UUID.randomUUID()).setParameter("pedido", entrada.intencaoId())
                        .setParameter("linha", linha.id()).setParameter("ordinal", ordinal).executeUpdate();
            }
        }
    }

    public List<UnidadeProducao> unidades(UUID pedido) {
        return consulta("""
                select id,linha_id,estado,iniciado_em,concluido_em from unidade_producao
                where pedido_id=:pedido order by id
                """, Object[].class).setParameter("pedido", pedido).getResultStream()
                .map(l -> new UnidadeProducao((UUID) l[0], (UUID) l[1], EstadoProducao.valueOf((String) l[2]), instante(l[3]), instante(l[4])))
                .toList();
    }

    public void alterarUnidade(UUID id, EstadoProducao estado, Instant agora) {
        String instante = switch (estado) {
            case EM_PREPARO -> ", iniciado_em = :agora";
            case PRONTO -> ", concluido_em = :agora";
            default -> "";
        };
        var query = em.createNativeQuery("update unidade_producao set estado=:estado" + instante + " where id=:id")
                .setParameter("estado", estado.name()).setParameter("id", id);
        if (!instante.isEmpty()) query.setParameter("agora", agora);
        query.executeUpdate();
    }

    public void alterarEstado(UUID id, EstadoPedido estado, Instant primeiroPreparo) {
        em.createNativeQuery("""
                update pedido set estado=:estado,versao=versao+1,
                    primeiro_preparo_em=coalesce(primeiro_preparo_em,:primeiro) where id=:id
                """).setParameter("estado", estado.name()).setParameter("primeiro", primeiroPreparo)
                .setParameter("id", id).executeUpdate();
    }

    public List<HistoricoPedido> historico(UUID pedido) {
        return consulta("select tipo,motivo,ocorrido_em from pedido_historico where pedido_id=:id order by sequencia", Object[].class)
                .setParameter("id", pedido).getResultStream()
                .map(l -> new HistoricoPedido((String) l[0], (String) l[1], instante(l[2]))).toList();
    }

    public void historico(UUID pedido, UUID ator, String tipo, String motivo, Instant agora) {
        em.createNativeQuery("""
                insert into pedido_historico(pedido_id,tipo,motivo,ator_id,ocorrido_em)
                values (:pedido,:tipo,:motivo,:ator,:agora)
                """).setParameter("pedido", pedido).setParameter("tipo", tipo).setParameter("motivo", motivo)
                .setParameter("ator", ator).setParameter("agora", agora).executeUpdate();
    }

    public Optional<Object[]> comando(UUID id) {
        return consulta("select pedido_id,ator_id,acao,payload from pedido_comando where id=:id", Object[].class)
                .setParameter("id", id).getResultStream().findFirst();
    }

    public void comando(UUID id, UUID pedido, UUID ator, String acao, String payload) {
        em.createNativeQuery("insert into pedido_comando(id,pedido_id,ator_id,acao,payload) values (:id,:pedido,:ator,:acao,:payload)")
                .setParameter("id", id).setParameter("pedido", pedido).setParameter("ator", ator)
                .setParameter("acao", acao).setParameter("payload", payload).executeUpdate();
    }

    public List<SolicitacaoCancelamento> solicitacoes(UUID pedido) {
        return consulta("select id,motivo,estado,criada_em from solicitacao_cancelamento where pedido_id=:id order by criada_em,id", Object[].class)
                .setParameter("id", pedido).getResultStream().map(l -> new SolicitacaoCancelamento(
                        (UUID) l[0], (String) l[1], (String) l[2], instante(l[3]))).toList();
    }

    public void solicitar(UUID id, UUID pedido, String motivo, Instant agora) {
        em.createNativeQuery("insert into solicitacao_cancelamento(id,pedido_id,motivo,estado,criada_em) values (:id,:pedido,:motivo,'PENDENTE',:agora)")
                .setParameter("id", id).setParameter("pedido", pedido).setParameter("motivo", motivo).setParameter("agora", agora).executeUpdate();
    }

    public void decidir(UUID id, boolean aprovada, Instant agora) {
        em.createNativeQuery("update solicitacao_cancelamento set estado=:estado,decidida_em=:agora where id=:id")
                .setParameter("estado", aprovada ? "APROVADA" : "REJEITADA").setParameter("agora", agora)
                .setParameter("id", id).executeUpdate();
    }

    public boolean existePendenteComanda(UUID comanda) {
        return consulta("select exists(select 1 from pedido where comanda_id=:id and estado not in ('CONCLUIDO','CANCELADO'))", Boolean.class)
                .setParameter("id", comanda).getSingleResult();
    }

    public List<UUID> vencidos(Instant agora) {
        return consulta("""
                select id from pedido where estado='AGUARDANDO_ACEITE'
                and (expirar_em<=:agora or (not alertado and alertar_em<=:agora)) order by expirar_em,id
                """, UUID.class).setParameter("agora", agora).setMaxResults(50).getResultList();
    }

    public void marcarAlerta(UUID pedido) {
        em.createNativeQuery("update pedido set alertado=true where id=:id").setParameter("id", pedido).executeUpdate();
    }

    public String json(Object objeto) {
        return mapper.writeValueAsString(objeto);
    }

    private PedidoRegistro pedido(Object[] l) {
        return new PedidoRegistro((UUID) l[0], (UUID) l[1], (UUID) l[2], (UUID) l[3], (UUID) l[4],
                (String) l[5], CanalAtendimento.valueOf((String) l[6]), EstadoPedido.valueOf((String) l[7]),
                ((Number) l[8]).longValue(), instante(l[9]), instante(l[10]), instante(l[11]), instante(l[12]),
                (Boolean) l[13], (String) l[14], List.of(mapper.readValue((String) l[15], SnapshotLinha[].class)), (String) l[16]);
    }

    private static Instant instante(Object valor) {
        if (valor == null) return null;
        if (valor instanceof Instant instante) return instante;
        if (valor instanceof OffsetDateTime offset) return offset.toInstant();
        return ((Timestamp) valor).toInstant();
    }

    private <T> NativeQuery<T> consulta(String sql, Class<T> tipo) {
        return em.unwrap(Session.class).createNativeQuery(sql, tipo);
    }
}

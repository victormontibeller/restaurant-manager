package br.com.restaurantmanager.mesas.repositories;

import br.com.restaurantmanager.mesas.dtos.AtendimentoPersistido;
import br.com.restaurantmanager.mesas.dtos.CodigoAtendimento;
import br.com.restaurantmanager.mesas.dtos.ContextoComanda;
import br.com.restaurantmanager.mesas.dtos.IntencaoCriacaoMesa;
import br.com.restaurantmanager.mesas.dtos.MesaResumo;
import br.com.restaurantmanager.mesas.dtos.SolicitacaoMesa;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class MesaRepository {
    private static final String MESA = "select m.id,m.unidade_id,m.nome,m.ativa,m.versao,a.id,c.id,c.estado,c.versao from mesa m "
            + "left join atendimento a on a.mesa_id=m.id and a.encerrado_em is null left join comanda c on c.atendimento_id=a.id ";
    private final EntityManager em;

    public MesaRepository(EntityManager em) {
        this.em = em;
    }

    public void bloquearIntencao(UUID id) {
        em.createNativeQuery("select pg_advisory_xact_lock(:chave)")
                .setParameter("chave", id.getMostSignificantBits()).getSingleResult();
    }

    public MesaResumo mesa(UUID id, boolean bloquear) {
        if (bloquear) {
            var existente = em.createNativeQuery("select id from mesa where id=:id for update")
                    .setParameter("id", id).getResultList();
            if (existente.isEmpty()) return null;
        }
        // O join precisa de um snapshot posterior à espera do lock: outro atendente
        // pode ter confirmado um atendimento enquanto esta transação aguardava.
        var row = primeiro(em.createNativeQuery(MESA + "where m.id=:id").setParameter("id", id));
        return row == null ? null : mesa(row);
    }

    public List<MesaResumo> listar(UUID unidade, int pagina) {
        return linhas(em.createNativeQuery(MESA + "where m.unidade_id=:unidade order by m.nome,m.id")
                .setParameter("unidade", unidade).setFirstResult(pagina * 50).setMaxResults(50))
                .stream().map(this::mesa).toList();
    }

    public boolean nomeUsado(UUID unidade, String nome, UUID exceto) {
        return !em.createNativeQuery("select id from mesa where unidade_id=:unidade and nome=:nome and id<>:id")
                .setParameter("unidade", unidade).setParameter("nome", nome).setParameter("id", exceto).getResultList().isEmpty();
    }

    public IntencaoCriacaoMesa intencaoCriacao(UUID id) {
        var row = primeiro(em.createNativeQuery("select autor_criacao,nome_criacao from mesa where id=:id").setParameter("id", id));
        return row == null ? null : new IntencaoCriacaoMesa(uuid(row[0]), row[1] == null ? null : row[1].toString());
    }

    public void criar(UUID id, UUID unidade, String nome, UUID autor) {
        em.createNativeQuery("insert into mesa(id,unidade_id,nome,nome_criacao,autor_criacao) values (:id,:unidade,:nome,:nome,:autor)")
                .setParameter("id", id).setParameter("unidade", unidade).setParameter("nome", nome).setParameter("autor", autor).executeUpdate();
    }

    public void alterar(UUID id, String nome, boolean ativa) {
        em.createNativeQuery("update mesa set nome=:nome,ativa=:ativa,versao=versao+1 where id=:id")
                .setParameter("id", id).setParameter("nome", nome).setParameter("ativa", ativa).executeUpdate();
    }

    public AtendimentoPersistido porIntencao(UUID intencao) {
        var row = primeiro(em.createNativeQuery("select a.id,a.mesa_id,a.unidade_id,a.autor_id,c.id,c.versao "
                        + "from atendimento a join comanda c on c.atendimento_id=a.id where a.intencao_id=:id")
                .setParameter("id", intencao));
        return row == null ? null : new AtendimentoPersistido(uuid(row[0]), uuid(row[1]), uuid(row[2]), uuid(row[3]), uuid(row[4]), numero(row[5]));
    }

    public void abrir(UUID atendimento, UUID comanda, UUID mesa, UUID unidade, UUID intencao, UUID autor,
            String hash, Instant agora) {
        em.createNativeQuery("insert into atendimento(id,mesa_id,unidade_id,intencao_id,autor_id,codigo_hash,codigo_expira_em,aberto_em) "
                        + "values (:id,:mesa,:unidade,:intencao,:autor,:hash,:expira,:agora)")
                .setParameter("id", atendimento).setParameter("mesa", mesa).setParameter("unidade", unidade)
                .setParameter("intencao", intencao).setParameter("autor", autor).setParameter("hash", hash)
                .setParameter("expira", agora.plusSeconds(43200)).setParameter("agora", agora).executeUpdate();
        em.createNativeQuery("insert into comanda(id,atendimento_id,unidade_id) values (:id,:atendimento,:unidade)")
                .setParameter("id", comanda).setParameter("atendimento", atendimento).setParameter("unidade", unidade).executeUpdate();
    }

    public ContextoComanda comanda(UUID id, boolean bloquear) {
        var row = primeiro(em.createNativeQuery("select id,unidade_id,atendimento_id,estado,versao from comanda where id=:id"
                        + (bloquear ? " for update" : ""))
                .setParameter("id", id));
        return row == null ? null : new ContextoComanda(uuid(row[0]), uuid(row[1]), uuid(row[2]), row[3].toString(), numero(row[4]));
    }

    public MesaResumo mesaDaComanda(UUID id) {
        var row = primeiro(em.createNativeQuery("select m.id,m.unidade_id,m.nome,m.ativa,m.versao,a.id,c.id,c.estado,c.versao "
                        + "from comanda c join atendimento a on a.id=c.atendimento_id join mesa m on m.id=a.mesa_id where c.id=:id")
                .setParameter("id", id));
        return row == null ? null : mesa(row);
    }

    public CodigoAtendimento codigo(UUID mesa) {
        var row = primeiro(em.createNativeQuery("select a.id,c.id,a.unidade_id,a.codigo_hash,a.codigo_expira_em "
                        + "from atendimento a join comanda c on c.atendimento_id=a.id where a.mesa_id=:mesa and a.encerrado_em is null")
                .setParameter("mesa", mesa));
        return row == null ? null : new CodigoAtendimento(uuid(row[0]), uuid(row[1]), uuid(row[2]), row[3].toString(), instante(row[4]));
    }

    public void alterarCodigo(UUID atendimento, String hash, Instant expira) {
        em.createNativeQuery("update atendimento set codigo_hash=:hash,codigo_expira_em=:expira where id=:id")
                .setParameter("id", atendimento).setParameter("hash", hash).setParameter("expira", expira).executeUpdate();
        em.createNativeQuery("update comanda set versao=versao+1 where atendimento_id=:id")
                .setParameter("id", atendimento).executeUpdate();
    }

    public void estado(UUID comanda, String estado) {
        em.createNativeQuery("update comanda set estado=:estado,versao=versao+1 where id=:id")
                .setParameter("id", comanda).setParameter("estado", estado).executeUpdate();
    }

    public void encerrar(UUID atendimento, Instant agora) {
        em.createNativeQuery("update atendimento set encerrado_em=:agora where id=:id")
                .setParameter("id", atendimento).setParameter("agora", agora).executeUpdate();
        em.createNativeQuery("update sessao_mesa set revogada_em=:agora where revogada_em is null and participante_id in "
                        + "(select id from participante_mesa where atendimento_id=:id)")
                .setParameter("id", atendimento).setParameter("agora", agora).executeUpdate();
    }

    public void auditar(UUID ator, UUID recurso, String tipo, String antes, String depois) {
        em.createNativeQuery("insert into auditoria_acesso(id,ator_id,recurso_id,evento,antes,depois,ocorrido_em) "
                        + "values (:id,:ator,:recurso,:tipo,:antes,:depois,:agora)")
                .setParameter("id", UUID.randomUUID()).setParameter("ator", ator).setParameter("recurso", recurso)
                .setParameter("tipo", tipo).setParameter("antes", antes).setParameter("depois", depois)
                .setParameter("agora", Instant.now()).executeUpdate();
    }

    public SolicitacaoMesa solicitacao(UUID id) {
        return solicitacaoPor("s.id", id);
    }

    public SolicitacaoMesa solicitacaoPorIntencao(UUID id) {
        return solicitacaoPor("s.intencao_id", id);
    }

    public UUID autorSolicitacao(UUID id) {
        var ids = em.createNativeQuery("select participante_id from solicitacao_mesa where id=:id", UUID.class)
                .setParameter("id", id).getResultList();
        return ids.isEmpty() ? null : (UUID) ids.getFirst();
    }

    private SolicitacaoMesa solicitacaoPor(String campo, UUID id) {
        var row = primeiro(em.createNativeQuery(consultaSolicitacao() + " where " + campo + "=:id").setParameter("id", id));
        return row == null ? null : solicitacao(row);
    }

    public List<SolicitacaoMesa> solicitacoes(UUID unidade, int pagina) {
        return linhas(em.createNativeQuery(consultaSolicitacao() + " where c.unidade_id=:unidade order by s.criada_em desc,s.id")
                .setParameter("unidade", unidade).setFirstResult(pagina * 50).setMaxResults(50)).stream().map(this::solicitacao).toList();
    }

    public void solicitar(UUID id, UUID intencao, UUID comanda, UUID participante, String tipo) {
        em.createNativeQuery("insert into solicitacao_mesa(id,intencao_id,comanda_id,participante_id,tipo,criada_em) "
                        + "values (:id,:intencao,:comanda,:participante,:tipo,:agora)")
                .setParameter("id", id).setParameter("intencao", intencao).setParameter("comanda", comanda)
                .setParameter("participante", participante).setParameter("tipo", tipo).setParameter("agora", Instant.now()).executeUpdate();
    }

    public void atender(UUID id, UUID ator) {
        em.createNativeQuery("update solicitacao_mesa set estado='ATENDIDA',atendida_por=:ator,atendida_em=:agora,versao=versao+1 where id=:id")
                .setParameter("id", id).setParameter("ator", ator).setParameter("agora", Instant.now()).executeUpdate();
    }

    private String consultaSolicitacao() {
        return "select s.id,s.comanda_id,m.nome,s.tipo,s.estado,s.criada_em,s.versao from solicitacao_mesa s "
                + "join comanda c on c.id=s.comanda_id join atendimento a on a.id=c.atendimento_id join mesa m on m.id=a.mesa_id";
    }

    private SolicitacaoMesa solicitacao(Object[] r) {
        return new SolicitacaoMesa(uuid(r[0]), uuid(r[1]), r[2].toString(), r[3].toString(), r[4].toString(), instante(r[5]), numero(r[6]));
    }

    private MesaResumo mesa(Object[] r) {
        return new MesaResumo(uuid(r[0]), uuid(r[1]), r[2].toString(), (Boolean) r[3], numero(r[4]), uuid(r[5]), uuid(r[6]), r[7] == null ? null : r[7].toString(), r[8] == null ? null : numero(r[8]));
    }

    private Object[] primeiro(Query query) {
        var rows = linhas(query.setMaxResults(1));
        return rows.isEmpty() ? null : rows.getFirst();
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> linhas(Query query) {
        return query.getResultList();
    }

    private static UUID uuid(Object value) {
        return value == null ? null : UUID.fromString(value.toString());
    }

    private static long numero(Object value) {
        return ((Number) value).longValue();
    }

    static Instant instante(Object value) {
        if (value == null) return null;
        if (value instanceof Instant instant) return instant;
        if (value instanceof OffsetDateTime date) return date.toInstant();
        return ((Timestamp) value).toInstant();
    }
}

package br.com.restaurantmanager.plataforma;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Registro público explícito; nunca abre um schema empresarial. */
@Repository
public class PlataformaRepository {
    private final JdbcTemplate jdbc;
    public PlataformaRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    record Usuario(UUID id,String hash,boolean ativo) {
        @Override public String toString() { return "UsuarioPlataforma[protegido]"; }
    }
    record Sessao(UUID id,UUID usuario,Instant expira,Instant revogada) {
        boolean valida(Instant agora) { return revogada==null && expira.isAfter(agora); }
    }
    record Refresh(UUID sessao,Instant usado) {}
    public record Empresa(UUID id,String nome,String estado,long versao,List<String> dominios) {}
    Usuario usuarioPorEmail(String email) {
        return jdbc.query("select id,senha_hash,ativo from public.usuario_plataforma where email=? for share",(r,n)->new Usuario(r.getObject(1,UUID.class),r.getString(2),r.getBoolean(3)),email).stream().findFirst().orElse(null);
    }
    boolean ativo(UUID id) { return Boolean.TRUE.equals(jdbc.query("select ativo from public.usuario_plataforma where id=?",(r,n)->r.getBoolean(1),id).stream().findFirst().orElse(false)); }
    int tentativa(String chave,Instant agora) {
        return jdbc.queryForObject("insert into public.limite_plataforma(chave,tentativas,inicio_em) values (?,1,?) on conflict(chave) do update set tentativas=case when limite_plataforma.inicio_em < excluded.inicio_em - interval '15 minutes' then 1 else limite_plataforma.tentativas+1 end,inicio_em=case when limite_plataforma.inicio_em < excluded.inicio_em - interval '15 minutes' then excluded.inicio_em else limite_plataforma.inicio_em end returning tentativas",Integer.class,chave,Timestamp.from(agora));
    }
    void limparTentativas(String chave) { jdbc.update("delete from public.limite_plataforma where chave=?",chave); }
    Sessao criar(UUID usuario,Instant agora) {
        var s=new Sessao(UUID.randomUUID(),usuario,agora.plusSeconds(43200),null);
        jdbc.update("insert into public.sessao_plataforma(id,usuario_id,criada_em,expira_em) values (?,?,?,?)",s.id(),usuario,Timestamp.from(agora),Timestamp.from(s.expira()));return s;
    }
    Sessao sessao(UUID id,boolean lock) {
        return jdbc.query("select id,usuario_id,expira_em,revogada_em from public.sessao_plataforma where id=?"+(lock?" for update":""),
                (r,n)->new Sessao(r.getObject(1,UUID.class),r.getObject(2,UUID.class),r.getTimestamp(3).toInstant(),r.getTimestamp(4)==null?null:r.getTimestamp(4).toInstant()),id).stream().findFirst().orElse(null);
    }
    Refresh refresh(String hash) {
        return jdbc.query("select sessao_id,usado_em from public.refresh_plataforma where hash=?",(r,n)->new Refresh(r.getObject(1,UUID.class),r.getTimestamp(2)==null?null:r.getTimestamp(2).toInstant()),hash).stream().findFirst().orElse(null);
    }
    void novoRefresh(String hash,UUID sessao) { jdbc.update("insert into public.refresh_plataforma(hash,sessao_id) values (?,?)",hash,sessao); }
    void consumir(String hash,Instant agora) { jdbc.update("update public.refresh_plataforma set usado_em=? where hash=?",Timestamp.from(agora),hash); }
    void revogar(UUID id,Instant agora) { jdbc.update("update public.sessao_plataforma set revogada_em=coalesce(revogada_em,?) where id=?",Timestamp.from(agora),id); }
    void auditar(UUID usuario,String evento) { jdbc.update("insert into public.auditoria_plataforma(id,usuario_id,evento) values (?,?,?)",UUID.randomUUID(),usuario,evento); }
    List<Empresa> empresas(int pagina) {
        return jdbc.query("select e.id,e.nome,e.estado,e.versao,array(select d.host from public.dominio d where d.empresa_id=e.id order by d.host) as dominios from public.empresa e order by e.id limit 50 offset ?",
                (r,n)->new Empresa(r.getObject(1,UUID.class),r.getString(2),r.getString(3),r.getLong(4),List.of((String[])r.getArray(5).getArray())),pagina*50);
    }
    int expurgar(Instant agora) {
        int sessoes=jdbc.update("delete from public.sessao_plataforma where id in (select id from public.sessao_plataforma where expira_em < ? order by expira_em limit 100 for update skip locked)",Timestamp.from(agora.minusSeconds(86400)));
        int limites=jdbc.update("delete from public.limite_plataforma where chave in (select chave from public.limite_plataforma where inicio_em < ? order by inicio_em limit 100 for update skip locked)",Timestamp.from(agora.minusSeconds(86400)));
        return sessoes+limites;
    }
}

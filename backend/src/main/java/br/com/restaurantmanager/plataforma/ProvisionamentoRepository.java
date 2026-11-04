package br.com.restaurantmanager.plataforma;

import br.com.restaurantmanager.tenancy.Migrations;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Map;
import java.util.UUID;

/** Persistência de infraestrutura privilegiada, fora do pool/runtime HTTP. */
final class ProvisionamentoRepository {
    private final Map<String, String> env;

    ProvisionamentoRepository(Map<String, String> env) {
        this.env = Map.copyOf(env);
    }

    Connection abrirComLock() throws SQLException {
        String stage = env.get("RM_STAGE");
        // Homologação continua bloqueada até manutenção/backup de migrations comprovados.
        if (!java.util.List.of("dev", "test").contains(stage == null ? "" : stage)
                || !("jdbc:postgresql://127.0.0.1:55432/rm_" + stage).equals(env.get("RM_DB_URL"))
                || !("rm_" + stage + "_owner").equals(env.get("RM_MIGRATION_USER"))
                || !("rm_" + stage + "_app").equals(env.get("RM_DB_USER"))) {
            throw new IllegalArgumentException("Destino de provisionamento recusado.");
        }
        var c = DriverManager.getConnection(env.get("RM_DB_URL"), env.get("RM_MIGRATION_USER"), env.get("RM_MIGRATION_PASSWORD"));
        try {
            Migrations.verifyIdentity(c, "rm_" + stage, "rm_" + stage + "_owner");
            try (var s = c.createStatement(); var r = s.executeQuery("select pg_try_advisory_lock(7240100)")) {
                r.next();
                if (!r.getBoolean(1)) throw new IllegalStateException("Outro migrador ou provisionador está ativo.");
            }
            return c;
        } catch (SQLException | RuntimeException failure) {
            c.close();
            throw failure;
        }
    }

    Registro buscar(Connection c, UUID id) throws SQLException {
        try (var s = c.prepareStatement("select e.nome,e.schema_name,e.estado,p.host,p.unidade_nome,p.administrador_email,p.administrador_senha_hash from public.empresa e join public.provisionamento p on p.empresa_id=e.id where e.id=?")) {
            s.setObject(1, id);
            try (var r = s.executeQuery()) {
                if (!r.next()) return null;
                return new Registro(id, r.getString(1), r.getString(2), r.getString(3), r.getString(4), r.getString(5), r.getString(6), r.getString(7));
            }
        }
    }

    void reservar(Connection c, ProvisionamentoService.Pedido p, String hash) throws SQLException {
        try (var s = c.prepareStatement("insert into public.empresa(id,nome,schema_name,estado) values (?,?,?,'PROVISIONANDO')")) {
            s.setObject(1, p.id()); s.setString(2, p.nome()); s.setString(3, schema(p.id())); s.executeUpdate();
        }
        try (var s = c.prepareStatement("insert into public.dominio(host,empresa_id) values (?,?)")) {
            s.setString(1, p.host()); s.setObject(2, p.id()); s.executeUpdate();
        }
        try (var s = c.prepareStatement("insert into public.provisionamento(empresa_id,host,unidade_nome,administrador_email,administrador_senha_hash) values (?,?,?,?,?)")) {
            s.setObject(1, p.id()); s.setString(2, p.host()); s.setString(3, p.unidade()); s.setString(4, p.email()); s.setString(5, hash); s.executeUpdate();
        }
        auditar(c, p.id(), "RESERVADO");
    }

    void migrar(Connection guard, Registro r) throws SQLException {
        if (!r.schema().equals(schema(r.id()))) throw new IllegalStateException("Schema empresarial divergente.");
        Migrations.migrateTenant(guard, env, r.schema());
    }

    void ativar(Connection c, Registro r) throws SQLException {
        String schema = schema(r.id());
        try (var s = c.prepareStatement("insert into " + schema + ".unidade(id,nome) values (?,?)")) {
            s.setObject(1, UUID.randomUUID()); s.setString(2, r.unidade()); s.executeUpdate();
        }
        try (var s = c.prepareStatement("insert into " + schema + ".usuario(id,email,senha_hash,perfil) values (?,?,?,'ADMINISTRADOR')")) {
            s.setObject(1, UUID.randomUUID()); s.setString(2, r.email()); s.setString(3, r.hash()); s.executeUpdate();
        }
        try (var s = c.prepareStatement("update public.empresa set estado='ATIVO',versao=versao+1 where id=? and estado in ('PROVISIONANDO','FALHOU')")) {
            s.setObject(1, r.id());
            if (s.executeUpdate() != 1) throw new IllegalStateException("Estado de provisionamento conflitante.");
        }
        try (var s = c.prepareStatement("update public.provisionamento set ultima_falha=null,atualizado_em=now() where empresa_id=?")) {
            s.setObject(1, r.id()); s.executeUpdate();
        }
        auditar(c, r.id(), "ATIVADO");
    }

    void falhar(Connection c, UUID id, String codigo) throws SQLException {
        try (var s = c.prepareStatement("update public.empresa set estado='FALHOU',versao=versao+1 where id=? and estado in ('PROVISIONANDO','FALHOU')")) {
            s.setObject(1, id); s.executeUpdate();
        }
        try (var s = c.prepareStatement("update public.provisionamento set ultima_falha=?,atualizado_em=now() where empresa_id=?")) {
            s.setString(1, codigo); s.setObject(2, id); s.executeUpdate();
        }
        auditar(c, id, "FALHOU");
    }

    private void auditar(Connection c, UUID id, String evento) throws SQLException {
        try (var s = c.prepareStatement("insert into public.auditoria_provisionamento(id,empresa_id,evento) values (?,?,?)")) {
            s.setObject(1, UUID.randomUUID()); s.setObject(2, id); s.setString(3, evento); s.executeUpdate();
        }
    }

    static String schema(UUID id) { return "t_" + id.toString().replace("-", ""); }
    SolicitacaoProvisionamentoRepository.Registro solicitacao(Connection c,UUID id) throws SQLException {
        try(var s=c.prepareStatement("select id,operador_id,nome,host,unidade_nome,administrador_email,administrador_senha_hash,estado,versao,ultima_falha from public.solicitacao_provisionamento where id=?")) {
            s.setObject(1,id);try(var r=s.executeQuery()) {
                if(!r.next())return null;
                return new SolicitacaoProvisionamentoRepository.Registro(r.getObject(1,UUID.class),r.getObject(2,UUID.class),r.getString(3),r.getString(4),r.getString(5),r.getString(6),r.getString(7),r.getString(8),r.getLong(9),r.getString(10));
            }
        }
    }
    boolean reservadoNaFila(Connection c,UUID id,String host) throws SQLException {
        try(var s=c.prepareStatement("select exists(select 1 from public.solicitacao_provisionamento where id=? or host=?)")) {
            s.setObject(1,id);s.setString(2,host);try(var r=s.executeQuery()){r.next();return r.getBoolean(1);}
        }
    }
    void finalizarSolicitacao(Connection c,UUID id,String estado,String falha) throws SQLException {
        try(var s=c.prepareStatement("update public.solicitacao_provisionamento set estado=?,versao=versao+1,ultima_falha=?,atualizado_em=clock_timestamp() where id=? and estado='SOLICITADO'")) {
            s.setString(1,estado);s.setString(2,falha);s.setObject(3,id);s.executeUpdate();
        }
    }
    record Registro(UUID id, String nome, String schema, String estado, String host, String unidade, String email, String hash) {
        @Override public String toString() { return "Provisionamento[" + id + "," + estado + "]"; }
    }
}

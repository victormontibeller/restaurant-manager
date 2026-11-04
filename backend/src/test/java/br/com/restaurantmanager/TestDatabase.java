package br.com.restaurantmanager;

import java.sql.DriverManager;
import java.util.Map;
import org.flywaydb.core.Flyway;

/** Massa exclusiva de integração, sem DROP/TRUNCATE nem limpeza de homologação. */
final class TestDatabase {
    private TestDatabase() {}
    static void prepare() throws Exception {
        String url = System.getenv("RM_DB_URL");
        if (!"jdbc:postgresql://127.0.0.1:55432/rm_test".equals(url)
                || !"rm_test_owner".equals(System.getenv("RM_MIGRATION_USER"))
                || !"rm_test_app".equals(System.getenv("RM_DB_USER"))) {
            throw new IllegalStateException("Alvo de teste não autorizado.");
        }
        try (var c = DriverManager.getConnection(url, System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
             var s = c.createStatement();
             var r = s.executeQuery("select current_database(),current_user,inet_server_port(),host(inet_server_addr())")) {
            r.next();
            if (!r.getString(1).equals("rm_test") || !r.getString(2).equals("rm_test_owner")
                    || r.getInt(3) != 55432 || !r.getString(4).equals("127.0.0.1")) {
                throw new IllegalStateException("Conexão efetiva não autorizada.");
            }
        }
        migrate("public", "public");
        for (String letter : new String[]{"a", "b"}) {
            String schema = "t_" + letter.repeat(32);
            migrate(schema, "tenant");
            try (var c = DriverManager.getConnection(url, System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
                 var s = c.createStatement()) {
                String id = letter.repeat(8) + "-" + letter.repeat(4) + "-" + letter.repeat(4) + "-" + letter.repeat(4) + "-" + letter.repeat(12);
                s.execute("insert into public.empresa(id,nome,schema_name,estado) values ('"+id+"','Empresa fictícia "+letter+"','"+schema+"','ATIVO') on conflict do nothing");
                s.execute("insert into public.dominio(host,empresa_id) values ('"+letter+".localhost','"+id+"') on conflict do nothing");
                s.execute("insert into "+schema+".unidade(id,nome) values ('11111111-1111-1111-1111-111111111111','"+letter.toUpperCase()+"1') on conflict do nothing");
                if (letter.equals("a")) s.execute("insert into "+schema+".unidade(id,nome) values ('22222222-2222-2222-2222-222222222222','A2') on conflict do nothing");
            }
        }
        br.com.restaurantmanager.tenancy.Migrations.run(System.getenv());
    }
    static void migrate(String schema, String location) {
        Flyway.configure().dataSource(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"))
                .defaultSchema(schema).schemas(schema).locations("classpath:db/migration/" + location)
                .placeholders(Map.of("runtimeRole", System.getenv("RM_DB_USER")))
                .cleanDisabled(true).load().migrate();
    }
}

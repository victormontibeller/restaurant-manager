package br.com.restaurantmanager.tenancy;

import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TenantRepository {
    private final JdbcTemplate jdbc;
    public TenantRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Optional<String> activeSchemaForHost(String host) {
        return jdbc.query("select e.schema_name from public.dominio d join public.empresa e on e.id=d.empresa_id where d.host=? and e.estado='ATIVO'",
                (rs, row) -> rs.getString(1), host).stream().findFirst();
    }
}

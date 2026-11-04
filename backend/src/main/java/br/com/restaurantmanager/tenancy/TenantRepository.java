package br.com.restaurantmanager.tenancy;

import java.util.Optional;
import java.util.List;
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
    public List<String> schemasParaManutencao(String depoisDe) {
        return jdbc.query("select schema_name from public.empresa where estado in ('ATIVO','SUSPENSO') and schema_name > ? order by schema_name limit 50",
                (rs, row) -> rs.getString(1), depoisDe);
    }
}

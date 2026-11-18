package br.com.restaurantmanager.shared;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;

/** Representações de timestamptz devolvidas pelo driver e pelo provedor JPA. */
public final class InstantesSql {
    private InstantesSql() {}

    public static Instant ler(Object valor) {
        if (valor == null) return null;
        if (valor instanceof Instant instante) return instante;
        if (valor instanceof OffsetDateTime data) return data.toInstant();
        return ((Timestamp) valor).toInstant();
    }
}

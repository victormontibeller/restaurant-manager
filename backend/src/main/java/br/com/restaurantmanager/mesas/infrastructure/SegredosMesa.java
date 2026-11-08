package br.com.restaurantmanager.mesas.infrastructure;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

public final class SegredosMesa {
    private static final SecureRandom RANDOM = new SecureRandom();

    private SegredosMesa() {}

    public static String codigo() {
        String alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        StringBuilder codigo = new StringBuilder();
        for (int indice = 0; indice < 10; indice++) {
            codigo.append(alfabeto.charAt(RANDOM.nextInt(32)));
        }
        return codigo.toString();
    }

    public static String refresh() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hash(String valor) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException("SHA-256 indisponível.", erro);
        }
    }

    public static UUID empresa() {
        String schema = TenantScope.current();
        if (schema == null || !schema.matches("t_[a-f0-9]{32}")) {
            throw AuthFailure.invalid();
        }
        String id = schema.substring(2);
        return UUID.fromString(id.substring(0, 8) + "-" + id.substring(8, 12) + "-"
                + id.substring(12, 16) + "-" + id.substring(16, 20) + "-" + id.substring(20));
    }
}

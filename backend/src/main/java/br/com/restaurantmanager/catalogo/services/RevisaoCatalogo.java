package br.com.restaurantmanager.catalogo.services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class RevisaoCatalogo {
    private final ObjectMapper mapper;

    public RevisaoCatalogo(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public String gerar(Object... valores) {
        try {
            byte[] payload = mapper.writeValueAsString(valores).getBytes(StandardCharsets.UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(payload));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponível.", ex);
        }
    }
}

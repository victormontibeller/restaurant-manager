package br.com.restaurantmanager.pagamentos.infrastructure;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.tenancy.context.TenantScope;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** Credenciais cifradas por empresa e conexão; chave exclusiva fora do banco/Git. */
@Component
public class ProtecaoPagamento {
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public ProtecaoPagamento(
            @Value("${rm.pagamentos.secret:${RM_PAGAMENTOS_SECRET:}}") String secret) {
        if (secret.isEmpty()) {
            key = null;
            return;
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException error) {
            throw new IllegalStateException("Chave de pagamento inválida.");
        }
        if (bytes.length != 32) {
            throw new IllegalStateException("Chave de pagamento inválida.");
        }
        key = new SecretKeySpec(bytes, "AES");
        Arrays.fill(bytes, (byte) 0);
    }

    public void exigirConfiguracao() {
        if (key == null) {
            throw new AuthFailure(
                    503,
                    "PAGAMENTO_INDISPONIVEL",
                    "Integração de pagamentos indisponível neste ambiente.");
        }
    }

    public String cifrar(UUID id, String text) {
        exigirConfiguracao();
        try {
            byte[] iv = new byte[12];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            cipher.updateAAD(contexto(id));
            byte[] encoded = cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));
            byte[] result = Arrays.copyOf(iv, iv.length + encoded.length);
            System.arraycopy(encoded, 0, result, iv.length, encoded.length);
            return Base64.getEncoder().encodeToString(result);
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("Falha de proteção da credencial.");
        }
    }

    public String decifrar(UUID id, String text) {
        exigirConfiguracao();
        if (text == null) {
            throw new IllegalStateException("Credencial de pagamento inválida.");
        }
        try {
            byte[] encoded = Base64.getDecoder().decode(text);
            if (encoded.length < 28) {
                throw new IllegalArgumentException();
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, encoded, 0, 12));
            cipher.updateAAD(contexto(id));
            return new String(
                    cipher.doFinal(encoded, 12, encoded.length - 12), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException error) {
            throw new IllegalStateException("Credencial de pagamento inválida.");
        }
    }

    private byte[] contexto(UUID id) {
        String tenant = TenantScope.current();
        if (!tenant.matches("t_[a-f0-9]{32}")) {
            throw new IllegalStateException("Comunicação requer empresa.");
        }
        return (tenant + ":" + id).getBytes(StandardCharsets.UTF_8);
    }
}

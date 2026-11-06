package br.com.restaurantmanager.identidade;

import br.com.restaurantmanager.tenancy.TenantScope;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Protege conteúdo recuperável da outbox; chave exclusiva fora do banco/Git. */
@Component
public class ProtecaoEmail {
    static final class ConteudoInvalido extends IllegalStateException {
        ConteudoInvalido() { super("Conteúdo de comunicação inválido."); }
    }
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();
    public ProtecaoEmail(@Value("${rm.email.secret:${RM_EMAIL_SECRET:}}") String secret) {
        if (secret.isEmpty()) { key=null; return; }
        byte[] bytes;
        try { bytes=Base64.getDecoder().decode(secret); }
        catch (IllegalArgumentException error) { throw new IllegalStateException("Chave de comunicação inválida."); }
        if (bytes.length!=32) throw new IllegalStateException("Chave de comunicação inválida.");
        key=new SecretKeySpec(bytes,"AES"); Arrays.fill(bytes,(byte)0);
    }
    public void exigirConfiguracao() {
        if (key==null) throw new AuthFailure(503,"COMUNICACAO_INDISPONIVEL","Recuperação indisponível neste ambiente.");
    }
    String cifrar(UUID id,String text) {
        exigirConfiguracao();
        try {
            byte[] iv=new byte[12]; random.nextBytes(iv);
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE,key,new GCMParameterSpec(128,iv));
            cipher.updateAAD(contexto(id));
            byte[] encoded=cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));
            byte[] result=Arrays.copyOf(iv,iv.length+encoded.length);
            System.arraycopy(encoded,0,result,iv.length,encoded.length);
            return Base64.getEncoder().encodeToString(result);
        } catch (GeneralSecurityException error) { throw new IllegalStateException("Falha de proteção da comunicação."); }
    }
    String decifrar(UUID id,String text) {
        exigirConfiguracao();
        if(text==null) throw new ConteudoInvalido();
        try {
            byte[] encoded=Base64.getDecoder().decode(text);
            if(encoded.length<28) throw new IllegalArgumentException();
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,encoded,0,12));
            cipher.updateAAD(contexto(id));
            return new String(cipher.doFinal(encoded,12,encoded.length-12),StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException error) { throw new ConteudoInvalido(); }
    }
    private byte[] contexto(UUID id) {
        String tenant=TenantScope.current();
        if(!tenant.matches("t_[a-f0-9]{32}")) throw new IllegalStateException("Comunicação requer empresa.");
        return (tenant+":"+id).getBytes(StandardCharsets.UTF_8);
    }
}

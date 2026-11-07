package br.com.restaurantmanager.identidade.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.exceptions.ConteudoEmailInvalido;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProtecaoEmailTest {
    private String chave() { byte[] key=new byte[32];new SecureRandom().nextBytes(key);return Base64.getEncoder().encodeToString(key); }
    @Test void cifraAutenticadaVinculaEmpresaEIdentificador() {
        var protecao=new ProtecaoEmail(chave());var id=UUID.randomUUID();String text=UUID.randomUUID().toString();String encoded;
        try(var scope=TenantScope.open("t_"+"a".repeat(32))) {
            encoded=protecao.cifrar(id,text);
            assertThat(encoded).doesNotContain(text);assertThat(protecao.decifrar(id,encoded)).isEqualTo(text);
            assertThat(protecao.cifrar(id,text)).isNotEqualTo(encoded);
            assertThatThrownBy(()->protecao.decifrar(UUID.randomUUID(),encoded)).hasMessage("Conteúdo de comunicação inválido.");
            assertThatThrownBy(()->new ProtecaoEmail(chave()).decifrar(id,encoded)).hasMessage("Conteúdo de comunicação inválido.");
        }
        try(var scope=TenantScope.open("t_"+"b".repeat(32))) {
            assertThatThrownBy(()->protecao.decifrar(id,encoded)).hasMessage("Conteúdo de comunicação inválido.");
        }
        assertThatThrownBy(()->protecao.cifrar(id,text)).hasMessage("Comunicação requer empresa.");
    }
    @Test void configuracaoAusenteOuInvalidaNaoRevelaMaterial() {
        assertThatThrownBy(()->new ProtecaoEmail("").exigirConfiguracao()).isInstanceOf(AuthFailure.class);
        for(String secret:new String[]{"invalida",Base64.getEncoder().encodeToString(new byte[16])}) {
            assertThatThrownBy(()->new ProtecaoEmail(secret)).hasMessage("Chave de comunicação inválida.");
        }
        assertThatThrownBy(()->new CapturaEmail("relativo","test")).hasMessage("Diretório privado de captura inválido.");
        assertThatThrownBy(()->new CapturaEmail(Path.of(System.getProperty("user.home")).resolve("captura").toString(),"prod")).hasMessage("Diretório privado de captura inválido.");
    }
    @Test void conteudoNuloTambemEhCorrupcaoTerminal() {
        try(var scope=TenantScope.open("t_"+"a".repeat(32))) {
            assertThatThrownBy(()->new ProtecaoEmail(chave()).decifrar(UUID.randomUUID(),null))
                    .isInstanceOf(ConteudoEmailInvalido.class).hasMessage("Conteúdo de comunicação inválido.");
        }
    }
    @Test void capturaRecusaDestinoDivergenteESimbolico() throws Exception {
        Path root=Files.createTempDirectory(Path.of(System.getenv().getOrDefault("TMPDIR",System.getProperty("java.io.tmpdir"))),"rm-email-");
        var captura=new CapturaEmail(root.toString(),"test");var id=UUID.randomUUID();
        try(var scope=TenantScope.open("t_"+"a".repeat(32))) {
            captura.entregar(id,"Mensagem fictícia");captura.entregar(id,"Mensagem fictícia");
            assertThatThrownBy(()->captura.entregar(id,"Divergente")).hasMessage("Captura divergente.");
            var link=UUID.randomUUID();Files.createSymbolicLink(root.resolve(TenantScope.current()).resolve(link+".txt"),root.resolve(TenantScope.current()).resolve(id+".txt"));
            assertThatThrownBy(()->captura.entregar(link,"Mensagem fictícia")).hasMessage("Captura divergente.");
        }
    }
}

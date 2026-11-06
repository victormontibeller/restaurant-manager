package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.plataforma.ProvisionamentoCommand;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ProvisionamentoCommandTest {
    private Path file;
    private String password;

    @BeforeEach void prepare() throws Exception {
        file = Files.createTempFile(Path.of(System.getenv("TMPDIR")), "rm-provision-", ".properties");
        password = UUID.randomUUID().toString();
        Files.writeString(file, "id=" + UUID.randomUUID() + "\nnome=Empresa fictícia\nhost=ficticia.localhost\nunidade=Unidade inicial\nemail=admin@example.invalid\nsenha=" + password + "\n");
        Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
    }

    @AfterEach void cleanup() throws Exception { Files.deleteIfExists(file); }

    @Test void leUtf8SemExporSenhaNoDto() throws Exception {
        var pedido = ProvisionamentoCommand.lerPedido(file);
        assertThat(pedido.nome()).isEqualTo("Empresa fictícia");
        assertThat(pedido.senha().equals(password)).isTrue();
        assertThat(pedido.toString()).doesNotContain(password);
    }

    @Test void arquivoPublicoRecusado() throws Exception {
        Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-r--r--"));
        assertThatThrownBy(() -> ProvisionamentoCommand.lerPedido(file)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void campoDesconhecidoOuDuplicadoRecusado() throws Exception {
        String original = Files.readString(file);
        for (String extra : new String[]{"schema=t_arbitrario\n", "email=outro@example.invalid\n"}) {
            Files.writeString(file, original + extra);
            assertThatThrownBy(() -> ProvisionamentoCommand.lerPedido(file)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test void linkSimbolicoRecusado() throws Exception {
        Path link = file.resolveSibling(file.getFileName() + ".link");
        try {
            Files.createSymbolicLink(link, file);
            assertThatThrownBy(() -> ProvisionamentoCommand.lerPedido(link)).isInstanceOf(IllegalArgumentException.class);
        } finally { Files.deleteIfExists(link); }
    }
}

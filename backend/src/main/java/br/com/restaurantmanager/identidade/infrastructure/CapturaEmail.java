package br.com.restaurantmanager.identidade.infrastructure;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Transporte apenas de captura privada. Nunca envia e-mail externo. */
@Component
public class CapturaEmail {
    private final Path root;

    public CapturaEmail(@Value("${rm.email.capture-directory:${RM_EMAIL_CAPTURE_DIRECTORY:}}") String directory,
            @Value("${rm.stage:dev}") String stage) {
        if (directory.isEmpty()) {
            root = null;
            return;
        }
        Path path = Path.of(directory).normalize();
        if (!Set.of("dev", "test", "hml").contains(stage) || !path.isAbsolute() || path.startsWith(Path.of("").toAbsolutePath())) {
            throw new IllegalStateException("Diretório privado de captura inválido.");
        }
        root = path;
    }
    public void exigirConfiguracao() {
        if (root == null) {
            throw new AuthFailure(503, "COMUNICACAO_INDISPONIVEL", "Recuperação indisponível neste ambiente.");
        }
    }

    public void entregar(UUID id, String text) throws IOException {
        exigirConfiguracao();
        String tenant = TenantScope.current();
        if (!tenant.matches("t_[a-f0-9]{32}")) {
            throw new IllegalStateException("Captura requer empresa.");
        }
        Path directory = root.resolve(tenant);
        prepararDiretorio(root);
        prepararDiretorio(directory);
        Path target = directory.resolve(id + ".txt");
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        if (Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
            if (!Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)
                    || !Files.getPosixFilePermissions(target).equals(PosixFilePermissions.fromString("rw-------"))
                    || !MessageDigest.isEqual(Files.readAllBytes(target), bytes)) {
                throw new IOException("Captura divergente.");
            }
            return;
        }
        Path temporary = Files.createTempFile(directory, "captura-", ".part",
                PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        try {
            try (var channel = FileChannel.open(temporary, StandardOpenOption.WRITE)) {
                ByteBuffer buffer = ByteBuffer.wrap(bytes);
                while (buffer.hasRemaining()) channel.write(buffer);
                channel.force(true);
            }
            Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE);
            try (var channel = FileChannel.open(directory, StandardOpenOption.READ)) {
                channel.force(true);
            }
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    public void expurgar() throws IOException {
        if (root == null) {
            return;
        }
        String tenant = TenantScope.current();
        if (!tenant.matches("t_[a-f0-9]{32}")) {
            throw new IllegalStateException("Captura requer empresa.");
        }
        Path directory = root.resolve(tenant);
        if (!Files.exists(directory, LinkOption.NOFOLLOW_LINKS)) {
            return;
        }
        prepararDiretorio(root);
        prepararDiretorio(directory);
        var limite = Instant.now().minusSeconds(86400);
        try (var files = Files.list(directory)) {
            for (Path file : files.filter(p -> p.getFileName().toString().matches("[a-f0-9-]{36}\\.txt|captura-[a-zA-Z0-9-]+\\.part"))
                    .filter(p -> Files.isRegularFile(p, LinkOption.NOFOLLOW_LINKS)).filter(p -> {
                        try {
                            return Files.getLastModifiedTime(p, LinkOption.NOFOLLOW_LINKS).toInstant().isBefore(limite);
                        } catch (IOException error) {
                            throw new UncheckedIOException(error);
                        }
                    }).limit(100).toList()) {
                Files.deleteIfExists(file);
            }
        }
    }

    private void prepararDiretorio(Path path) throws IOException {
        Files.createDirectories(path, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------")));
        if (!Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS) || !Files.getPosixFilePermissions(path).equals(PosixFilePermissions.fromString("rwx------"))) {
            throw new IOException("Captura exige diretório privado.");
        }
    }
}

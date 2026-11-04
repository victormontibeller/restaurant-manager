package br.com.restaurantmanager.plataforma;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.UUID;

/** Entrada administrativa local; nenhum segredo em argumentos, saída ou logs. */
public final class ProvisionamentoCommand {
    private ProvisionamentoCommand() {}

    public static void executar(String[] args, Map<String, String> env) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Uso: --provisionar arquivo-privado ou --retomar-provisionamento UUID.");
        var service = new ProvisionamentoService(env);
        ProvisionamentoService.Resultado result;
        if (args[0].equals("--retomar-provisionamento")) {
            result = service.concluir(UUID.fromString(args[1]));
        } else if (args[0].equals("--provisionar")) {
            var p = lerPedido(Path.of(args[1]));
            result = service.provisionar(p);
        } else {
            throw new IllegalArgumentException("Comando de provisionamento inválido.");
        }
        System.out.println("Provisionamento " + result.id() + ": " + result.estado());
    }

    public static ProvisionamentoService.Pedido lerPedido(Path path) throws Exception {
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) || Files.isSymbolicLink(path)
                || Files.size(path) > 16384
                || !Files.getPosixFilePermissions(path).equals(Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE))) {
            throw new IllegalArgumentException("Pedido deve ser arquivo privado 0600 de até 16 KiB, sem link simbólico.");
        }
        var p = new Properties() {
            @Override public synchronized Object put(Object key, Object value) {
                if (containsKey(key)) throw new IllegalArgumentException("Campo duplicado no pedido.");
                return super.put(key, value);
            }
        };
        try (var reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) { p.load(reader); }
        if (!p.stringPropertyNames().equals(Set.of("id", "nome", "host", "unidade", "email", "senha"))) {
            throw new IllegalArgumentException("Campos ausentes ou desconhecidos no pedido.");
        }
        return new ProvisionamentoService.Pedido(UUID.fromString(p.getProperty("id")), p.getProperty("nome"),
                p.getProperty("host"), p.getProperty("unidade"), p.getProperty("email"), p.getProperty("senha"));
    }
}

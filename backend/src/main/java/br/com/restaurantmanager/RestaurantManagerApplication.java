package br.com.restaurantmanager;

import br.com.restaurantmanager.tenancy.Migrations;
import java.util.Arrays;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class RestaurantManagerApplication {
    public static void main(String[] args) {
        if (args.length > 0 && (args[0].equals("--provisionar") || args[0].equals("--retomar-provisionamento") || args[0].equals("--processar-solicitacao"))) {
            try {
                br.com.restaurantmanager.plataforma.ProvisionamentoCommand.executar(args, System.getenv());
            } catch (Exception failure) {
                System.err.println("Provisionamento interrompido. Verifique alvo, pedido privado e registro persistido. Tipo: " + failure.getClass().getSimpleName());
                System.exit(1);
            }
            return;
        }
        if (Arrays.asList(args).contains("--migrate-only")) {
            try {
                Migrations.run(System.getenv());
            } catch (Exception failure) {
                System.err.println("Migração interrompida; candidato não deve ser promovido. Tipo: " + failure.getClass().getSimpleName());
                System.exit(1);
            }
            return;
        }
        SpringApplication.run(RestaurantManagerApplication.class, args);
    }
}

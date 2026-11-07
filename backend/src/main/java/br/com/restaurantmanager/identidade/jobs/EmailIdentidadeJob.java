package br.com.restaurantmanager.identidade.jobs;

import br.com.restaurantmanager.identidade.infrastructure.CapturaEmail;
import br.com.restaurantmanager.identidade.services.EmailIdentidadeService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.services.TenantService;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@ConditionalOnProperty(name = "rm.email.agendado", havingValue = "true", matchIfMissing = true)
public class EmailIdentidadeJob {
    private static final Logger LOG = LoggerFactory.getLogger(EmailIdentidadeJob.class);
    private final TenantService tenants;
    private final EmailIdentidadeService service;
    private final CapturaEmail captura;

    public EmailIdentidadeJob(TenantService tenants, EmailIdentidadeService service, CapturaEmail captura) {
        this.tenants = tenants;
        this.service = service;
        this.captura = captura;
    }

    @Scheduled(initialDelay = 30000, fixedDelay = 10000)
    public void executar() {
        if (!TenantScope.current().equals("__none__")) {
            throw new IllegalStateException("Worker requer contexto neutro.");
        }
        String cursor = "";
        while (true) {
            var schemas = tenants.schemasParaManutencao(cursor);
            if (schemas.isEmpty()) {
                return;
            }
            for (String schema : schemas) {
                try (var scope = TenantScope.open(schema)) {
                    service.expurgar();
                    try {
                        captura.expurgar();
                    } catch (IOException failure) {
                        LOG.warn("Expurgo de capturas pendente: tenant={}", schema);
                    }
                    for (int item = 0;item < 20;item++) {
                        var entrega = service.preparar();
                        if (entrega == null) {
                            break;
                        }
                        if (entrega.lease() == null) {
                            continue;
                        }
                        boolean sucesso = false;
                        try {
                            captura.entregar(entrega.id(), entrega.conteudo());
                            sucesso = true;
                        } catch (IOException | RuntimeException failure) {
                            LOG.warn("Captura de identidade pendente: tenant={}, id={}", schema, entrega.id());
                        }
                        service.concluir(entrega.id(), entrega.lease(), sucesso);
                    }
                } catch (RuntimeException failure) {
                    LOG.warn("Comunicação de identidade pendente: tenant={}, tipo={}", schema, failure.getClass().getSimpleName());
                }
            }
            cursor = schemas.getLast();
        }
    }
}

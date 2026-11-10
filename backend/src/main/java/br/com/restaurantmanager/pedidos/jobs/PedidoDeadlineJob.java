package br.com.restaurantmanager.pedidos.jobs;

import br.com.restaurantmanager.pedidos.services.PedidoDeadlineService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.services.TenantService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@ConditionalOnProperty(name = "rm.pedidos.agendado", havingValue = "true", matchIfMissing = true)
public class PedidoDeadlineJob {
    private static final Logger LOG = LoggerFactory.getLogger(PedidoDeadlineJob.class);
    private final TenantService tenants;
    private final PedidoDeadlineService service;

    public PedidoDeadlineJob(TenantService tenants, PedidoDeadlineService service) {
        this.tenants = tenants;
        this.service = service;
    }

    @Scheduled(initialDelay = 5000, fixedDelay = 1000, scheduler = "pedidoDeadlineScheduler")
    public void executar() {
        if (!TenantScope.current().equals("__none__")) throw new IllegalStateException("Worker requer contexto neutro.");
        String cursor = "";
        while (true) {
            var schemas = tenants.schemasParaManutencao(cursor);
            if (schemas.isEmpty()) return;
            for (String schema : schemas) {
                try (var scope = TenantScope.open(schema)) {
                    for (int indice = 0; indice < 50; indice++) {
                        var trabalho = service.reivindicar();
                        if (trabalho == null) break;
                        try {
                            service.processar(trabalho);
                        } catch (RuntimeException erro) {
                            service.falhar(trabalho, erro.getClass().getSimpleName());
                        }
                    }
                } catch (RuntimeException erro) {
                    LOG.warn("Prazos de pedidos pendentes: tipo={}", erro.getClass().getSimpleName());
                }
            }
            cursor = schemas.getLast();
        }
    }
}

package br.com.restaurantmanager.comunicacoes.jobs;

import br.com.restaurantmanager.comunicacoes.services.NotificacaoService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.services.TenantService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@ConditionalOnProperty(
        name = "rm.comunicacoes.agendado",
        havingValue = "true",
        matchIfMissing = true)
public class NotificacaoJob {
    private static final Logger LOG = LoggerFactory.getLogger(NotificacaoJob.class);
    private final NotificacaoService service;
    private final TenantService tenants;

    public NotificacaoJob(NotificacaoService service, TenantService tenants) {
        this.service = service;
        this.tenants = tenants;
    }

    @Scheduled(initialDelay = 5000, fixedDelay = 5000)
    public void executar() {
        if (!TenantScope.current().equals("__none__"))
            throw new IllegalStateException("Worker de comunicação requer contexto neutro.");
        String cursor = "";
        while (true) {
            var schemas = tenants.schemasParaManutencao(cursor);
            if (schemas.isEmpty()) return;
            for (String schema : schemas) {
                try (var scope = TenantScope.open(schema)) {
                    for (int i = 0; i < 20; i++) if (!service.processarProxima()) break;
                } catch (RuntimeException erro) {
                    LOG.warn("Falha na fila de comunicação: {}", erro.getClass().getSimpleName());
                }
            }
            cursor = schemas.getLast();
        }
    }
}

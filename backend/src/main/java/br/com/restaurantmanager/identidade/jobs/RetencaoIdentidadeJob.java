package br.com.restaurantmanager.identidade.jobs;

import br.com.restaurantmanager.identidade.services.RetencaoIdentidadeService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.repositories.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@ConditionalOnProperty(name = "rm.auth.retencao-agendada", havingValue = "true", matchIfMissing = true)
public class RetencaoIdentidadeJob {
    private static final Logger LOG = LoggerFactory.getLogger(RetencaoIdentidadeJob.class);
    private final TenantRepository tenants;
    private final RetencaoIdentidadeService service;

    public RetencaoIdentidadeJob(TenantRepository tenants, RetencaoIdentidadeService service) {
        this.tenants = tenants;
        this.service = service;
    }

    @Scheduled(initialDelay = 60000, fixedDelay = 600000)
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
                    for (int lote = 0; lote < 10; lote++) {
                        var resultado = service.executarLote();
                        if (resultado.sessoes() > 0 || resultado.limites() > 0) {
                            LOG.info("Retenção de identidade concluída: tenant={}, sessoes={}, limites={}", schema, resultado.sessoes(), resultado.limites());
                        }
                        if (resultado.sessoes() < 100 && resultado.limites() < 100) {
                            break;
                        }
                        if (lote == 9) {
                            LOG.warn("Retenção de identidade com backlog: tenant={}", schema);
                        }
                    }
                } catch (RuntimeException failure) {
                    // Não registrar SQL, parâmetros, tokens ou mensagem da exceção.
                    String identificador = schema != null && schema.matches("t_[a-f0-9]{32}") ? schema : "invalido";
                    LOG.warn("Retenção de identidade pendente: tenant={}, tipo={}", identificador, failure.getClass().getSimpleName());
                }
            }
            cursor = schemas.getLast();
        }
    }
}

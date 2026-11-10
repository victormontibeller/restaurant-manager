package br.com.restaurantmanager.pagamentos.jobs;

import br.com.restaurantmanager.financeiro.services.DevolucaoOnlineService;
import br.com.restaurantmanager.pagamentos.services.CheckoutService;
import br.com.restaurantmanager.pagamentos.services.InboxPagamentoService;
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
@ConditionalOnProperty(name = "rm.pagamentos.agendado", havingValue = "true", matchIfMissing = true)
public class CheckoutJob {
    private static final Logger LOG = LoggerFactory.getLogger(CheckoutJob.class);
    private final TenantService tenants;
    private final CheckoutService service;
    private final InboxPagamentoService inbox;
    private final DevolucaoOnlineService devolucoes;

    public CheckoutJob(
            TenantService tenants,
            CheckoutService service,
            InboxPagamentoService inbox,
            DevolucaoOnlineService devolucoes) {
        this.tenants = tenants;
        this.service = service;
        this.inbox = inbox;
        this.devolucoes = devolucoes;
    }

    @Scheduled(initialDelay = 5000, fixedDelay = 1000)
    public void executar() {
        if (!TenantScope.current().equals("__none__"))
            throw new IllegalStateException("Worker financeiro requer contexto neutro.");
        try {
            inbox.encaminhar();
        } catch (RuntimeException erro) {
            // Uma falha global da inbox não abandona intenções já persistidas nos tenants.
            LOG.warn(
                    "Encaminhamento da inbox de pagamentos pendente: tipo={}",
                    erro.getClass().getSimpleName());
        }
        String cursor = "";
        while (true) {
            var schemas = tenants.schemasParaManutencao(cursor);
            if (schemas.isEmpty()) return;
            for (String schema : schemas) {
                try (var scope = TenantScope.open(schema)) {
                    for (int i = 0; i < 20; i++) {
                        var trabalho = service.reivindicar();
                        if (trabalho == null) break;
                        try {
                            service.processar(trabalho);
                        } catch (RuntimeException erro) {
                            service.falhar(trabalho, erro);
                        }
                    }
                    for (int i = 0; i < 20; i++) {
                        var trabalho = devolucoes.reivindicar();
                        if (trabalho == null) break;
                        try {
                            devolucoes.processar(trabalho);
                        } catch (RuntimeException erro) {
                            devolucoes.falhar(trabalho, erro);
                        }
                    }
                } catch (RuntimeException erro) {
                    LOG.warn(
                            "Reconciliação de pagamentos pendente: tipo={}",
                            erro.getClass().getSimpleName());
                }
            }
            cursor = schemas.getLast();
        }
    }
}

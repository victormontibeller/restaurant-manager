package br.com.restaurantmanager.pagamentos.jobs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.restaurantmanager.financeiro.services.DevolucaoOnlineService;
import br.com.restaurantmanager.pagamentos.services.CheckoutService;
import br.com.restaurantmanager.pagamentos.services.InboxPagamentoService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.services.TenantService;

import org.junit.jupiter.api.Test;

import java.util.List;

class CheckoutJobTest {
    @Test
    void indisponibilidadeDaInboxNaoAbandonaCheckoutsEDevolucoesPersistidos() {
        var tenants = mock(TenantService.class);
        var checkouts = mock(CheckoutService.class);
        var inbox = mock(InboxPagamentoService.class);
        var devolucoes = mock(DevolucaoOnlineService.class);
        String schema = "t_" + "a".repeat(32);
        when(tenants.schemasParaManutencao("")).thenReturn(List.of(schema));
        when(tenants.schemasParaManutencao(schema)).thenReturn(List.of());
        doThrow(new IllegalStateException("Falha simulada na consulta da inbox.")).when(inbox).encaminhar();
        when(checkouts.reivindicar()).thenAnswer(invocacao -> {
            assertThat(TenantScope.current()).isEqualTo(schema);
            return null;
        });
        when(devolucoes.reivindicar()).thenAnswer(invocacao -> {
            assertThat(TenantScope.current()).isEqualTo(schema);
            return null;
        });

        new CheckoutJob(tenants, checkouts, inbox, devolucoes).executar();

        verify(checkouts).reivindicar();
        verify(devolucoes).reivindicar();
        assertThat(TenantScope.current()).isEqualTo("__none__");
    }
}

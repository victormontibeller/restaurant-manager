package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import br.com.restaurantmanager.pedidos.jobs.PedidoDeadlineJob;
import br.com.restaurantmanager.pedidos.services.PedidoDeadlineService;
import br.com.restaurantmanager.shared.config.AgendamentoConfiguration;
import br.com.restaurantmanager.tenancy.services.TenantService;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

class AgendamentoPedidosTest {
    @Test
    void prazoExecutaMesmoQuandoSchedulerComumAguardaOperacaoExterna() throws Exception {
        var inicioIo = new CountDownLatch(1);
        var liberarIo = new CountDownLatch(1);
        var prazoExecutado = new CountDownLatch(1);
        var threadPrazo = new AtomicReference<String>();
        var tenants = mock(TenantService.class);
        when(tenants.schemasParaManutencao("")).thenAnswer(chamada -> {
            threadPrazo.set(Thread.currentThread().getName());
            prazoExecutado.countDown();
            return List.of();
        });
        try (var contexto = new AnnotationConfigApplicationContext()) {
            contexto.register(AgendamentoConfiguration.class, PedidoDeadlineJob.class);
            contexto.registerBean(TenantService.class, () -> tenants);
            contexto.registerBean(PedidoDeadlineService.class, () -> mock(PedidoDeadlineService.class));
            contexto.refresh();
            var comum = contexto.getBean("taskScheduler", ThreadPoolTaskScheduler.class);
            comum.execute(() -> {
                inicioIo.countDown();
                try {
                    liberarIo.await(15, TimeUnit.SECONDS);
                } catch (InterruptedException interrompida) {
                    Thread.currentThread().interrupt();
                }
            });
            try {
                assertThat(inicioIo.await(2, TimeUnit.SECONDS)).isTrue();
                assertThat(prazoExecutado.await(10, TimeUnit.SECONDS)).isTrue();
                assertThat(liberarIo.getCount()).isEqualTo(1);
                assertThat(threadPrazo.get()).startsWith("rm-pedido-prazos-");
            } finally {
                liberarIo.countDown();
            }
        }
    }
}

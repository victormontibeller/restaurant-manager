package br.com.restaurantmanager.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Chamadas externas não ocupam a thread responsável pelos prazos dos pedidos. */
@Configuration(proxyBeanMethods = false)
public class AgendamentoConfiguration {
    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        return scheduler("rm-manutencao-");
    }

    @Bean
    public ThreadPoolTaskScheduler pedidoDeadlineScheduler() {
        return scheduler("rm-pedido-prazos-");
    }

    private ThreadPoolTaskScheduler scheduler(String prefixo) {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix(prefixo);
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(15);
        return scheduler;
    }
}

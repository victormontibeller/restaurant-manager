package br.com.restaurantmanager.identidade.jobs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.restaurantmanager.identidade.dtos.ResultadoRetencao;
import br.com.restaurantmanager.identidade.services.RetencaoIdentidadeService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.services.TenantService;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

class RetencaoIdentidadeJobTest {
    @Test @ExtendWith(OutputCaptureExtension.class)
    void lotesCheiosContinuamComLimiteEAdvertenciaSemImpedirOutroTenant(CapturedOutput output) {
        var tenants = mock(TenantService.class);
        var service = mock(RetencaoIdentidadeService.class);
        String a = "t_" + "a".repeat(32), b = "t_" + "b".repeat(32);
        when(tenants.schemasParaManutencao("")).thenReturn(List.of(a, b));
        when(tenants.schemasParaManutencao(b)).thenReturn(List.of());
        var visitados = new ArrayList<String>();
        when(service.executarLote()).thenAnswer(call -> {
            visitados.add(TenantScope.current());
            return new ResultadoRetencao(TenantScope.current().equals(a) ? 100 : 0, 0);
        });
        new RetencaoIdentidadeJob(tenants, service).executar();
        assertThat(visitados).hasSize(11);
        assertThat(visitados.subList(0, 10)).containsOnly(a);
        assertThat(visitados.getLast()).isEqualTo(b);
        assertThat(output).contains("Retenção de identidade com backlog: tenant=" + a);
        assertThat(TenantScope.current()).isEqualTo("__none__");
    }
    @Test @ExtendWith(OutputCaptureExtension.class)
    void falhaIdentificaTenantSemPublicarMensagemDaExcecao(CapturedOutput output) {
        var tenants = mock(TenantService.class);
        var service = mock(RetencaoIdentidadeService.class);
        String a = "t_" + "a".repeat(32);
        when(tenants.schemasParaManutencao("")).thenReturn(List.of(a));
        when(tenants.schemasParaManutencao(a)).thenReturn(List.of());
        when(service.executarLote()).thenThrow(new IllegalStateException("conteudo-protegido"));
        new RetencaoIdentidadeJob(tenants, service).executar();
        assertThat(output).contains("Retenção de identidade pendente: tenant=" + a).doesNotContain("conteudo-protegido");
    }
    @Test void erroEmUmTenantLimpaThreadEPermitePaginaSeguinte() {
        var tenants = mock(TenantService.class);
        var service = mock(RetencaoIdentidadeService.class);
        String a = "t_" + "a".repeat(32), b = "t_" + "b".repeat(32);
        when(tenants.schemasParaManutencao("")).thenReturn(List.of(a));
        when(tenants.schemasParaManutencao(a)).thenReturn(List.of(b));
        when(tenants.schemasParaManutencao(b)).thenReturn(List.of());
        var visitados = new ArrayList<String>();
        when(service.executarLote()).thenAnswer(call -> {
            visitados.add(TenantScope.current());
            if (TenantScope.current().equals(a)) throw new IllegalStateException("Falha controlada");
            return new ResultadoRetencao(1, 1);
        });
        new RetencaoIdentidadeJob(tenants, service).executar();
        assertThat(visitados).containsExactly(a, b);
        assertThat(TenantScope.current()).isEqualTo("__none__");
        verify(tenants).schemasParaManutencao(b);
    }
    @Test void naoAceitaContextoHerdadoNemRemoveContextoDoChamador() {
        var job = new RetencaoIdentidadeJob(mock(TenantService.class), mock(RetencaoIdentidadeService.class));
        String a = "t_" + "a".repeat(32);
        try (var scope = TenantScope.open(a)) {
            assertThatThrownBy(job::executar).isInstanceOf(IllegalStateException.class);
            assertThat(TenantScope.current()).isEqualTo(a);
        }
        assertThat(TenantScope.current()).isEqualTo("__none__");
    }
}

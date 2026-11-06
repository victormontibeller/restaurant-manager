package br.com.restaurantmanager.unidades;

import br.com.restaurantmanager.identidade.AcessosService;
import br.com.restaurantmanager.identidade.AuthFailure;
import br.com.restaurantmanager.identidade.IdentidadeAtual;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FuncionamentoUnidadeService {
    private final FuncionamentoUnidadeRepository repository;
    private final AcessosService acessos;

    public FuncionamentoUnidadeService(FuncionamentoUnidadeRepository repository, AcessosService acessos) {
        this.repository = repository;
        this.acessos = acessos;
    }

    public record Horario(
            @NotNull CanalAtendimento canal,
            @NotNull @Min(1) @Max(7) Integer diaSemana,
            @NotNull @Pattern(regexp = "(?:[01][0-9]|2[0-3]):[0-5][0-9]") String inicio,
            @NotNull @Pattern(regexp = "(?:(?:[01][0-9]|2[0-3]):[0-5][0-9]|24:00)") String fim) {}

    public record Detalhe(UUID unidadeId, long versao, String fuso, long versaoUnidade,
            List<CanalAtendimento> canais, List<Horario> horarios) {}

    public record CanalPublico(CanalAtendimento canal, boolean habilitado, boolean aberto) {}

    public record Publico(UUID unidadeId, String nome, String fuso, Instant consultadoEm,
            List<CanalPublico> canais, List<Horario> horarios) {}

    @Transactional
    public Detalhe consultar(IdentidadeAtual ator, UUID unidade) {
        acessos.autorizarAdministrador(ator, false);
        var consulta = obter(unidade);
        return detalhe(consulta, consulta.funcionamento());
    }

    @Transactional
    public Detalhe alterar(IdentidadeAtual ator, UUID unidade, long versao, long versaoUnidade,
            List<CanalAtendimento> canais, List<Horario> horarios) {
        // Serializa com equipe, sessões e cadastro da unidade e revalida a reautenticação.
        acessos.autorizarAdministrador(ator, true);
        var consulta = obter(unidade);
        if (consulta.versaoUnidade() != versaoUnidade) {
            throw new AuthFailure(409, "CONFLITO", "O cadastro ou o fuso da unidade mudou. Consulte novamente o funcionamento antes de salvar.");
        }
        var atual = consulta.funcionamento();
        if (atual.versao() != versao) {
            throw new AuthFailure(409, "CONFLITO", "O funcionamento foi alterado. Recarregue antes de salvar.");
        }
        if (horarios == null || horarios.size() > 84 || horarios.stream().anyMatch(h -> h == null)) {
            throw new AuthFailure(400, "ENTRADA_INVALIDA", "Informe no máximo 84 horários válidos por unidade.");
        }
        var solicitado = new FuncionamentoUnidade(versao, canais, horarios.stream()
                .map(h -> HorarioFuncionamento.criar(h.canal(), h.diaSemana(), h.inicio(), h.fim()))
                .toList());
        if (atual.mesmoConteudo(solicitado)) {
            return detalhe(consulta, atual);
        }

        var novo = new FuncionamentoUnidade(Math.incrementExact(versao), solicitado.canais(), solicitado.horarios());
        repository.salvar(unidade, novo, atual.versao());
        acessos.auditarConfiguracao(ator, unidade, "FUNCIONAMENTO_UNIDADE_ALTERADO", atual.toString(), novo.toString());
        return detalhe(consulta, novo);
    }

    @Transactional(readOnly = true)
    public Publico consultarPublico(UUID unidade) {
        var consulta = obter(unidade);
        if (!consulta.ativa()) {
            throw inexistente();
        }
        var funcionamento = consulta.funcionamento();
        Instant agora = Instant.now();
        ZoneId fuso = ZoneId.of(consulta.fuso());
        var canais = Arrays.stream(CanalAtendimento.values())
                .map(canal -> new CanalPublico(canal, funcionamento.habilitado(canal),
                        funcionamento.habilitado(canal) && funcionamento.horarios().stream()
                                .anyMatch(h -> h.canal() == canal && h.contem(agora, fuso))))
                .toList();
        return new Publico(unidade, consulta.nome(), consulta.fuso(), agora, canais, horarios(funcionamento));
    }

    private FuncionamentoUnidadeRepository.Consulta obter(UUID unidade) {
        return repository.consultar(unidade).orElseThrow(FuncionamentoUnidadeService::inexistente);
    }

    private Detalhe detalhe(FuncionamentoUnidadeRepository.Consulta consulta, FuncionamentoUnidade funcionamento) {
        return new Detalhe(consulta.unidadeId(), funcionamento.versao(), consulta.fuso(),
                consulta.versaoUnidade(), funcionamento.canais(), horarios(funcionamento));
    }

    private List<Horario> horarios(FuncionamentoUnidade funcionamento) {
        return funcionamento.horarios().stream()
                .map(h -> new Horario(h.canal(), h.diaSemana(), h.inicio(), h.fim()))
                .toList();
    }

    private static AuthFailure inexistente() {
        return new AuthFailure(404, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado.");
    }
}

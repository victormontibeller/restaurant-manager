package br.com.restaurantmanager.unidades.services;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.unidades.dtos.CanalPublicoUnidade;
import br.com.restaurantmanager.unidades.dtos.ConsultaFuncionamentoUnidade;
import br.com.restaurantmanager.unidades.dtos.DetalheFuncionamentoUnidade;
import br.com.restaurantmanager.unidades.dtos.FuncionamentoPublicoUnidade;
import br.com.restaurantmanager.unidades.dtos.HorarioUnidade;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import br.com.restaurantmanager.unidades.models.FuncionamentoUnidade;
import br.com.restaurantmanager.unidades.models.HorarioFuncionamento;
import br.com.restaurantmanager.unidades.repositories.FuncionamentoUnidadeRepository;
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

    @Transactional
    public DetalheFuncionamentoUnidade consultar(IdentidadeAtual ator, UUID unidade) {
        acessos.autorizarAdministrador(ator, false);
        var consulta = obter(unidade);
        return detalhe(consulta, consulta.funcionamento());
    }

    @Transactional
    public DetalheFuncionamentoUnidade alterar(IdentidadeAtual ator, UUID unidade, long versao, long versaoUnidade,
            List<CanalAtendimento> canais, List<HorarioUnidade> horarios) {
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
    public FuncionamentoPublicoUnidade consultarPublico(UUID unidade) {
        var consulta = obter(unidade);
        if (!consulta.ativa()) {
            throw inexistente();
        }
        var funcionamento = consulta.funcionamento();
        Instant agora = Instant.now();
        ZoneId fuso = ZoneId.of(consulta.fuso());
        var canais = Arrays.stream(CanalAtendimento.values())
                .map(canal -> new CanalPublicoUnidade(canal, funcionamento.habilitado(canal),
                        funcionamento.habilitado(canal) && funcionamento.horarios().stream()
                                .anyMatch(h -> h.canal() == canal && h.contem(agora, fuso))))
                .toList();
        return new FuncionamentoPublicoUnidade(unidade, consulta.nome(), consulta.fuso(), agora, canais, horarios(funcionamento));
    }

    private ConsultaFuncionamentoUnidade obter(UUID unidade) {
        return repository.consultar(unidade).orElseThrow(FuncionamentoUnidadeService::inexistente);
    }

    private DetalheFuncionamentoUnidade detalhe(ConsultaFuncionamentoUnidade consulta, FuncionamentoUnidade funcionamento) {
        return new DetalheFuncionamentoUnidade(consulta.unidadeId(), funcionamento.versao(), consulta.fuso(),
                consulta.versaoUnidade(), funcionamento.canais(), horarios(funcionamento));
    }

    private List<HorarioUnidade> horarios(FuncionamentoUnidade funcionamento) {
        return funcionamento.horarios().stream()
                .map(h -> new HorarioUnidade(h.canal(), h.diaSemana(), h.inicio(), h.fim()))
                .toList();
    }

    private static AuthFailure inexistente() {
        return new AuthFailure(404, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado.");
    }
}

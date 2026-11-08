package br.com.restaurantmanager.mesas.services;

import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.mesas.dtos.AberturaAtendimento;
import br.com.restaurantmanager.mesas.dtos.AlterarMesa;
import br.com.restaurantmanager.mesas.dtos.CriarMesa;
import br.com.restaurantmanager.mesas.dtos.MesaResumo;
import br.com.restaurantmanager.mesas.exceptions.ErrosMesa;
import br.com.restaurantmanager.mesas.infrastructure.SegredosMesa;
import br.com.restaurantmanager.mesas.repositories.MesaRepository;
import br.com.restaurantmanager.tenancy.services.TenantService;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import br.com.restaurantmanager.unidades.services.FuncionamentoUnidadeService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MesaService {
    private final MesaRepository repository;
    private final AcessosService acessos;
    private final TenantService tenants;
    private final ComandaService comandas;
    private final EventoOperacionalService eventos;
    private final FuncionamentoUnidadeService funcionamento;

    public MesaService(MesaRepository repository, AcessosService acessos, TenantService tenants,
            ComandaService comandas, EventoOperacionalService eventos, FuncionamentoUnidadeService funcionamento) {
        this.repository = repository;
        this.acessos = acessos;
        this.tenants = tenants;
        this.comandas = comandas;
        this.eventos = eventos;
        this.funcionamento = funcionamento;
    }

    @Transactional
    public List<MesaResumo> listar(IdentidadeAtual ator, UUID unidade, int pagina) {
        pagina(pagina);
        acessos.autorizarOperacaoExistente(ator, Acao.PEDIDO_CONSULTAR, unidade);
        return repository.listar(unidade, pagina);
    }

    @Transactional
    public MesaResumo criar(IdentidadeAtual ator, CriarMesa pedido) {
        tenants.exigirNovasOperacoes();
        acessos.autorizarAdministrador(ator, true);
        acessos.autorizar(ator, Acao.PEDIDO_CRIAR, pedido.unidadeId());
        String nome = nome(pedido.nome());
        var existente = repository.mesa(pedido.id(), true);
        if (existente != null) {
            var original = repository.intencaoCriacao(pedido.id());
            if (!existente.unidadeId().equals(pedido.unidadeId()) || !nome.equals(original.nome())
                    || !ator.usuarioId().equals(original.autorId())) {
                throw ErrosMesa.conflito("O identificador da mesa já foi utilizado com outros dados.");
            }
            return existente;
        }
        if (repository.nomeUsado(pedido.unidadeId(), nome, pedido.id())) {
            throw ErrosMesa.conflito("Já existe uma mesa com esse nome nesta unidade.");
        }
        repository.criar(pedido.id(), pedido.unidadeId(), nome, ator.usuarioId());
        repository.auditar(ator.usuarioId(), pedido.id(), "MESA_CRIADA", "INEXISTENTE", "ATIVA");
        eventos.registrar(pedido.unidadeId(), "MESA_CRIADA", null, null, null, null);
        return repository.mesa(pedido.id(), false);
    }

    @Transactional
    public MesaResumo alterar(IdentidadeAtual ator, UUID id, AlterarMesa pedido) {
        acessos.autorizarAdministrador(ator, true);
        var atual = exigirMesa(id, true);
        acessos.autorizarOperacaoExistente(ator, Acao.PEDIDO_CRIAR, atual.unidadeId());
        if (atual.versao() != pedido.versao()) throw ErrosMesa.conflito("A mesa mudou. Recarregue antes de salvar.");
        String nome = nome(pedido.nome());
        if (!pedido.ativa() && atual.atendimentoId() != null) {
            throw ErrosMesa.conflito("Encerre o atendimento antes de desativar a mesa.");
        }
        if (repository.nomeUsado(atual.unidadeId(), nome, id)) {
            throw ErrosMesa.conflito("Já existe uma mesa com esse nome nesta unidade.");
        }
        if (atual.nome().equals(nome) && atual.ativa() == pedido.ativa()) return atual;
        repository.alterar(id, nome, pedido.ativa());
        repository.auditar(ator.usuarioId(), id, "MESA_ALTERADA", Boolean.toString(atual.ativa()), Boolean.toString(pedido.ativa()));
        eventos.registrar(atual.unidadeId(), "MESA_ALTERADA", null, atual.comandaId(), null, null);
        return repository.mesa(id, false);
    }

    @Transactional
    public AberturaAtendimento abrir(IdentidadeAtual ator, UUID mesaId, UUID intencao) {
        tenants.exigirNovasOperacoes();
        var referencia = exigirMesa(mesaId, false);
        acessos.autorizar(ator, Acao.PEDIDO_CRIAR, referencia.unidadeId());
        repository.bloquearIntencao(intencao);
        var anterior = repository.porIntencao(intencao);
        if (anterior != null) {
            if (!anterior.mesaId().equals(mesaId) || !anterior.autorId().equals(ator.usuarioId())) {
                throw ErrosMesa.conflito("Esta intenção de atendimento já foi usada com outros dados.");
            }
            return new AberturaAtendimento(anterior.id(), anterior.comandaId(), mesaId, anterior.unidadeId(), null, anterior.versao());
        }
        var mesa = exigirMesa(mesaId, true);
        acessos.autorizar(ator, Acao.PEDIDO_CRIAR, mesa.unidadeId());
        if (!mesa.ativa()) throw ErrosMesa.conflito("A mesa está desativada.");
        if (mesa.atendimentoId() != null) throw ErrosMesa.conflito("A mesa já possui um atendimento aberto.");
        boolean aberto = funcionamento.consultarPublico(mesa.unidadeId()).canais().stream()
                .anyMatch(c -> c.canal() == CanalAtendimento.MESA && c.aberto());
        if (!aberto) throw ErrosMesa.regra("A unidade está fechada para atendimento de mesa.");
        UUID atendimento = UUID.randomUUID();
        UUID comanda = UUID.randomUUID();
        String codigo = SegredosMesa.codigo();
        repository.abrir(atendimento, comanda, mesaId, mesa.unidadeId(), intencao, ator.usuarioId(),
                SegredosMesa.hash(atendimento + ":" + codigo), Instant.now());
        repository.auditar(ator.usuarioId(), atendimento, "ATENDIMENTO_ABERTO", "INEXISTENTE", "ABERTA");
        eventos.registrar(mesa.unidadeId(), "ATENDIMENTO_ABERTO", null, comanda, null, null);
        return new AberturaAtendimento(atendimento, comanda, mesaId, mesa.unidadeId(), codigo, 0);
    }

    @Transactional
    public AberturaAtendimento codigo(IdentidadeAtual ator, UUID mesaId, long versao) {
        var mesa = exigirMesa(mesaId, false);
        acessos.autorizarOperacaoExistente(ator, Acao.PEDIDO_CRIAR, mesa.unidadeId());
        if (mesa.comandaId() == null) throw ErrosMesa.conflito("A mesa não possui atendimento aberto.");
        var comanda = comandas.bloquear(mesa.comandaId());
        if (comanda.versao() != versao) throw ErrosMesa.conflito("O atendimento mudou. Consulte a comanda antes de gerar o código.");
        comandas.exigirAberta(comanda);
        String codigo = SegredosMesa.codigo();
        repository.alterarCodigo(comanda.atendimentoId(), SegredosMesa.hash(comanda.atendimentoId() + ":" + codigo), Instant.now().plusSeconds(43200));
        repository.auditar(ator.usuarioId(), comanda.atendimentoId(), "CODIGO_MESA_ROTACIONADO", "ANTERIOR", "NOVO");
        eventos.registrar(mesa.unidadeId(), "CODIGO_MESA_ROTACIONADO", null, comanda.id(), null, null);
        return new AberturaAtendimento(comanda.atendimentoId(), comanda.id(), mesaId, mesa.unidadeId(), codigo, comanda.versao() + 1);
    }

    private MesaResumo exigirMesa(UUID id, boolean bloquear) {
        var mesa = repository.mesa(id, bloquear);
        if (mesa == null) throw ErrosMesa.inexistente();
        return mesa;
    }

    private String nome(String valor) {
        if (valor == null || valor.strip().isEmpty() || valor.strip().length() > 80 || valor.codePoints().anyMatch(Character::isISOControl)) {
            throw ErrosMesa.regra("Informe um nome de mesa com até 80 caracteres, sem caracteres de controle.");
        }
        return valor.strip();
    }

    static void pagina(int pagina) {
        if (pagina < 0 || pagina > 10000) throw ErrosMesa.regra("Página inválida.");
    }
}

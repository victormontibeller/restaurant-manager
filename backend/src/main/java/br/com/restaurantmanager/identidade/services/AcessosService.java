package br.com.restaurantmanager.identidade.services;

import br.com.restaurantmanager.identidade.dtos.AcessosEfetivos;
import br.com.restaurantmanager.identidade.dtos.DescricaoAcao;
import br.com.restaurantmanager.identidade.dtos.FuncionarioResumo;
import br.com.restaurantmanager.identidade.dtos.MatrizAcessos;
import br.com.restaurantmanager.identidade.dtos.UnidadePermitida;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.models.PoliticaAcesso;
import br.com.restaurantmanager.identidade.models.Usuario;
import br.com.restaurantmanager.identidade.repositories.AcessosRepository;
import br.com.restaurantmanager.unidades.models.Unidade;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AcessosService {
    static final List<String> PERFIS = List.of("GERENTE", "ATENDIMENTO", "CAIXA", "COZINHA", "EXPEDICAO");
    private final AcessosRepository repository;

    public AcessosService(AcessosRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public MatrizAcessos matriz(IdentidadeAtual ator) {
        var politica = repository.politica(false);
        administrador(ator, false);
        return matrizAtual(politica);
    }

    @Transactional
    public MatrizAcessos atualizarMatriz(IdentidadeAtual ator, long versao, String perfil, Set<String> acoes) {
        var politica = repository.politica(true);
        administrador(ator, true);
        if (!PERFIS.contains(perfil)) {
            throw invalido("Perfil não configurável.");
        }
        if (politica.getVersao() != versao) {
            throw conflito("A matriz foi alterada. Recarregue antes de salvar.");
        }
        var novas = new TreeSet<String>();
        for (String codigo : acoes) {
            var acao = Acao.obter(codigo);
            novas.add(codigo);
            if (acao.dependencia() != null) {
                novas.add(acao.dependencia());
            }
        }
        var antes = repository.permissoes(perfil);
        repository.substituirPermissoes(perfil, novas);
        repository.incrementarPolitica(politica);
        repository.auditar(ator.usuarioId(), null, "MATRIZ_" + perfil, antes.toString(), novas.toString());
        return matrizAtual(politica);
    }

    @Transactional
    public List<FuncionarioResumo> equipe(IdentidadeAtual ator, int pagina) {
        repository.politica(false);
        administrador(ator, false);
        if (pagina < 0 || pagina > 10000) {
            throw invalido("Página inválida.");
        }
        return repository.equipe(pagina).stream().map(this::resumo).toList();
    }

    @Transactional
    public FuncionarioResumo atualizarFuncionario(
            IdentidadeAtual ator,
            UUID id,
            long versao,
            String perfil,
            boolean ativo,
            Set<UUID> unidades) {
        repository.politica(true);
        administrador(ator, true);
        if (!PERFIS.contains(perfil) && !perfil.equals("ADMINISTRADOR")) {
            throw invalido("Perfil de funcionário inválido.");
        }
        Usuario alvo = repository.usuario(id);
        if (alvo == null || alvo.getPerfil().equals("CLIENTE")) {
            throw inexistente();
        }
        if (alvo.getVersao() != versao) {
            throw conflito("O funcionário foi alterado. Recarregue antes de salvar.");
        }
        if (perfil.equals("ADMINISTRADOR") && !unidades.isEmpty()) {
            throw invalido("Administrador cobre todas as unidades; não informe vínculos individuais.");
        }
        Set<UUID> validas = new HashSet<>(repository.unidadesAtivas().stream().map(Unidade::getId).toList());
        // Inativar unidade não pode impedir revogar o funcionário. Vínculos já
        // existentes podem permanecer/remover-se, sem novas concessões inativas.
        validas.addAll(repository.unidades(id));
        if (!validas.containsAll(unidades)) {
            throw inexistente();
        }
        if (alvo.isAtivo() && alvo.getPerfil().equals("ADMINISTRADOR") && (!ativo || !perfil.equals("ADMINISTRADOR")) && repository.administradores() <= 1) {
            throw conflito("Mantenha pelo menos um Administrador ativo.");
        }
        String antes = estado(alvo, repository.unidades(id));
        boolean revogar = alvo.isAtivo() && !ativo;
        alvo.alterarAcessos(perfil, ativo, Instant.now());
        repository.substituirUnidades(id, unidades);
        if (revogar) {
            repository.revogarSessoes(id);
        }
        repository.auditar(ator.usuarioId(), id, "FUNCIONARIO_ALTERADO", antes, estado(alvo, unidades.stream().sorted().toList()));
        repository.flush();
        return resumo(alvo);
    }

    @Transactional
    public AcessosEfetivos efetivo(IdentidadeAtual ator) {
        var politica = repository.politica(false);
        var usuario = funcionario(ator);
        var acoes = usuario.getPerfil().equals("ADMINISTRADOR") ? Acao.catalogo().stream().map(DescricaoAcao::codigo).toList() : repository.permissoes(usuario.getPerfil());
        return new AcessosEfetivos(usuario.getPerfil(), politica.getVersao(), acoes, unidadesDo(usuario));
    }

    @Transactional
    public List<UnidadePermitida> unidades(IdentidadeAtual ator) {
        repository.politica(false);
        return unidadesDo(funcionario(ator));
    }

    @Transactional
    public UnidadePermitida unidade(IdentidadeAtual ator, UUID id) {
        return unidades(ator).stream().filter(u -> u.id().equals(id)).findFirst().orElseThrow(AcessosService::inexistente);
    }

    /** Chamado dentro da transação do caso de uso: lock compartilhado impede revogação no meio da escrita. */

    @Transactional(propagation = Propagation.MANDATORY)
    public void autorizarAdministrador(IdentidadeAtual ator, boolean escrita) {
        repository.politica(escrita);
        administrador(ator, escrita);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void auditarConfiguracao(IdentidadeAtual ator, UUID recurso, String evento, String antes, String depois) {
        autorizarAdministrador(ator, true);
        repository.auditar(ator.usuarioId(), recurso, evento, antes, depois);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void autorizar(IdentidadeAtual ator, Acao acao, UUID unidade) {
        repository.politica(false);
        Usuario user = funcionario(ator);
        if (!user.getPerfil().equals("ADMINISTRADOR") && !repository.permissoes(user.getPerfil()).contains(acao.codigo())) {
            throw negado();
        }
        if (acao.escopo().equals("UNIDADE")) {
            if (unidade == null || unidadesDo(user).stream().noneMatch(u -> u.id().equals(unidade))) {
                throw inexistente();
            }
        } else if (unidade != null) throw invalido("Ação de escopo empresarial não recebe unidade.");
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void autorizarCliente(IdentidadeAtual ator) {
        repository.politica(false);
        if (!usuarioAtual(ator).getPerfil().equals("CLIENTE")) {
            throw negado();
        }
    }

    private Usuario usuarioAtual(IdentidadeAtual ator) {
        if (ator == null || !ator.empresaId().equals(IdentidadeService.empresaAtual())) {
            throw AuthFailure.invalid();
        }
        var session = repository.sessao(ator.sessaoId());
        var user = repository.usuario(ator.usuarioId());
        if (session == null || !session.getUsuarioId().equals(ator.usuarioId()) || !session.valida(Instant.now()) || user == null || !user.isAtivo()) {
            throw AuthFailure.invalid();
        }
        return user;
    }

    private Usuario funcionario(IdentidadeAtual ator) {
        Usuario user = usuarioAtual(ator);
        if (!user.getPerfil().equals("ADMINISTRADOR") && !PERFIS.contains(user.getPerfil())) {
            throw negado();
        }
        return user;
    }

    private void administrador(IdentidadeAtual ator, boolean sensivel) {
        if (!funcionario(ator).getPerfil().equals("ADMINISTRADOR")) {
            throw negado();
        }
        if (sensivel) {
            Instant reautenticada = repository.sessao(ator.sessaoId()).getReautenticadaEm();
            if (reautenticada == null || reautenticada.isBefore(Instant.now().minusSeconds(300))) {
                throw new AuthFailure(403, "REAUTENTICACAO_NECESSARIA", "Confirme sua senha antes de alterar acessos.");
            }
        }
    }

    private List<UnidadePermitida> unidadesDo(Usuario usuario) {
        var permitidas = repository.unidades(usuario.getId());
        return repository.unidadesAtivas().stream().filter(u -> usuario.getPerfil().equals("ADMINISTRADOR") || permitidas.contains(u.getId()))
                .map(u -> new UnidadePermitida(u.getId(), u.getNome(), u.getFuso())).toList();
    }

    private MatrizAcessos matrizAtual(PoliticaAcesso politica) {
        var perfis = new LinkedHashMap<String, List<String>>();
        for (String perfil : PERFIS) perfis.put(perfil, repository.permissoes(perfil));
        return new MatrizAcessos(politica.getVersao(), Acao.catalogo(), perfis);
    }

    private FuncionarioResumo resumo(Usuario u) {
        return new FuncionarioResumo(u.getId(), u.getEmail(), u.getPerfil(), u.isAtivo(), u.getVersao(), repository.unidades(u.getId()));
    }

    private String estado(Usuario u, List<UUID> unidades) {
        return u.getPerfil() + ":" + u.isAtivo() + ":" + unidades;
    }

    private static AuthFailure negado() {
        return new AuthFailure(403, "ACESSO_NEGADO", "Acesso negado.");
    }

    private static AuthFailure inexistente() {
        return new AuthFailure(404, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado.");
    }

    private static AuthFailure conflito(String mensagem) {
        return new AuthFailure(409, "CONFLITO", mensagem);
    }

    private static AuthFailure invalido(String mensagem) {
        return new AuthFailure(400, "ENTRADA_INVALIDA", mensagem);
    }
}

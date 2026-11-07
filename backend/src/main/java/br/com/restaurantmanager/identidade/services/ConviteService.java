package br.com.restaurantmanager.identidade.services;

import br.com.restaurantmanager.identidade.dtos.ConviteResumo;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.infrastructure.CapturaEmail;
import br.com.restaurantmanager.identidade.infrastructure.ProtecaoEmail;
import br.com.restaurantmanager.identidade.models.ConviteFuncionario;
import br.com.restaurantmanager.identidade.models.EmailIdentidade;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.models.Usuario;
import br.com.restaurantmanager.identidade.repositories.AcessosRepository;
import br.com.restaurantmanager.identidade.repositories.ConviteRepository;
import br.com.restaurantmanager.identidade.repositories.IdentidadeRepository;
import br.com.restaurantmanager.identidade.repositories.RecuperacaoRepository;
import br.com.restaurantmanager.unidades.models.Unidade;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConviteService {
    private final ConviteRepository repository;
    private final AcessosService acessos;
    private final AcessosRepository politica;
    private final IdentidadeRepository identidades;
    private final RecuperacaoRepository mensagens;
    private final ProtecaoEmail protecao;
    private final CapturaEmail captura;
    private final ConfirmacaoLimitadaService confirmacoes;
    private final SecureRandom random = new SecureRandom();
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);

    public ConviteService(ConviteRepository repository, AcessosService acessos, AcessosRepository politica, IdentidadeRepository identidades,
            RecuperacaoRepository mensagens, ProtecaoEmail protecao, CapturaEmail captura, ConfirmacaoLimitadaService confirmacoes) {
        this.repository = repository;
        this.acessos = acessos;
        this.politica = politica;
        this.identidades = identidades;
        this.mensagens = mensagens;
        this.protecao = protecao;
        this.captura = captura;
        this.confirmacoes = confirmacoes;
    }

    @Transactional(timeout = 10)
    public ConviteResumo criar(IdentidadeAtual ator, UUID id, String email, String perfil, Set<UUID> unidades) {
        acessos.autorizarAdministrador(ator, true);
        String address = email.toLowerCase(Locale.ROOT);
        String vinculos = unidades.stream().sorted().map(UUID::toString).collect(Collectors.joining(","));
        var existente = repository.obter(id);
        if (existente != null) {
            if (!existente.getAutorId().equals(ator.usuarioId()) || !existente.getEmail().equals(address)
                    || !existente.getPerfil().equals(perfil) || !existente.getUnidades().equals(vinculos)) {
                throw new AuthFailure(409, "CONFLITO", "Esta intenção pertence a outro convite. Consulte o resultado antes de criar outra.");
            }
            return resumo(existente);
        }
        protecao.exigirConfiguracao();
        captura.exigirConfiguracao();
        if (!AcessosService.PERFIS.contains(perfil) && !perfil.equals("ADMINISTRADOR")) {
            throw new AuthFailure(400, "ENTRADA_INVALIDA", "Perfil de funcionário inválido.");
        }
        if (perfil.equals("ADMINISTRADOR") && !unidades.isEmpty()) {
            throw new AuthFailure(400, "ENTRADA_INVALIDA", "Administrador cobre todas as unidades; não informe vínculos individuais.");
        }
        if (!unidadesAtivas().containsAll(unidades)) {
            throw inexistente();
        }
        if (identidades.porEmail(address).isPresent()) {
            throw new AuthFailure(409, "CONFLITO", "Este endereço já possui conta. O convite não altera contas existentes.");
        }
        Instant agora = Instant.now();
        if (repository.recentes(ator.usuarioId(), agora.minusSeconds(900)) >= 30) {
            throw new AuthFailure(429, "LIMITE_TENTATIVAS", "Limite de convites atingido. Aguarde quinze minutos.");
        }
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var convite = ConviteFuncionario.criar(id, ator.usuarioId(), address, perfil, vinculos,
                IdentidadeService.hash(raw), agora);
        repository.salvar(convite);
        UUID mensagem = UUID.randomUUID();
        String conteudo = "Para: " + address + "\nAssunto: Convite de funcionário\nEmpresa: "
                + IdentidadeService.empresaAtual() + "\nPerfil: " + perfil
                + "\nNa mesma página da empresa, escolha Aceitar convite de funcionário. Defina sua senha somente após conferir o convite. Não compartilhe o código.\nCódigo: "
                + raw + "\nVálido até: " + convite.getExpiraEm()
                + "\nSe não reconhece o convite, ignore esta mensagem.\n";
        mensagens.salvar(EmailIdentidade.criar(mensagem, "CONVITE", protecao.cifrar(mensagem, conteudo),
                convite.getExpiraEm()));
        politica.auditar(ator.usuarioId(), id, "CONVITE_CRIADO", "INEXISTENTE", perfil + ":" + vinculos);
        return resumo(convite);
    }

    @Transactional(timeout = 10)
    public List<ConviteResumo> listar(IdentidadeAtual ator, int pagina) {
        acessos.autorizarAdministrador(ator, false);
        if (pagina < 0 || pagina > 10000) {
            throw new AuthFailure(400, "ENTRADA_INVALIDA", "Página inválida.");
        }
        return repository.listar(pagina).stream().map(this::resumo).toList();
    }

    @Transactional(timeout = 10)
    public ConviteResumo obter(IdentidadeAtual ator, UUID id) {
        acessos.autorizarAdministrador(ator, false);
        return resumo(exigir(id));
    }

    @Transactional(timeout = 10)
    public ConviteResumo revogar(IdentidadeAtual ator, UUID id) {
        acessos.autorizarAdministrador(ator, true);
        var convite = repository.bloquear(id);
        if (convite == null) {
            throw inexistente();
        }
        if (convite.getAceitoEm() != null) {
            throw new AuthFailure(409, "CONFLITO", "Convite aceito. Gerencie o funcionário para alterar seu acesso.");
        }
        if (convite.getRevogadoEm() == null) {
            convite.revogar(Instant.now());
            politica.auditar(ator.usuarioId(), id, "CONVITE_REVOGADO", "NAO_REVOGADO", "REVOGADO");
        }
        return resumo(convite);
    }

    public void aceitar(String codigo, String senha, String origem) {
        if (!PoliticaSenha.novaSenhaValida(senha)) {
            throw new AuthFailure(422, "SENHA_INVALIDA", "Use pelo menos 12 caracteres e no máximo 72 bytes na senha.");
        }
        confirmacoes.executar("convite-confirmar:" + origem, () -> aceitarTransacao(codigo, senha));
    }

    private void aceitarTransacao(String raw, String senha) {
        politica.politica(true);
        var convite = repository.codigo(IdentidadeService.hash(raw));
        Instant agora = Instant.now();
        if (convite == null || !convite.estado(agora).equals("PENDENTE")) {
            throw invalido();
        }
        var autor = identidades.usuario(convite.getAutorId());
        if (autor == null || !autor.isAtivo() || !autor.getPerfil().equals("ADMINISTRADOR")
                || identidades.porEmail(convite.getEmail()).isPresent()
                || !unidadesAtivas().containsAll(convite.vinculos())) {
            throw invalido();
        }
        Usuario user = Usuario.criarVerificado(convite.getEmail(), passwords.encode(senha), convite.getPerfil(), agora);
        identidades.salvar(user);
        politica.flush();
        politica.substituirUnidades(user.getId(), Set.copyOf(convite.vinculos()));
        convite.aceitar(agora);
        repository.revogarOutros(convite.getEmail(), convite.getId(), agora);
        politica.auditar(user.getId(), convite.getId(), "CONVITE_ACEITO", "PENDENTE", user.getId() + ":" + user.getPerfil());
    }

    private Set<UUID> unidadesAtivas() {
        return politica.unidadesAtivas().stream().map(Unidade::getId).collect(Collectors.toSet());
    }

    private ConviteFuncionario exigir(UUID id) {
        var c = repository.obter(id);
        if (c == null) {
            throw inexistente();
        }
        return c;
    }

    private ConviteResumo resumo(ConviteFuncionario c) {
        return new ConviteResumo(c.getId(), c.getEmail(), c.getPerfil(), c.vinculos(), c.estado(Instant.now()), c.getExpiraEm());
    }

    private static AuthFailure inexistente() {
        return new AuthFailure(404, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado.");
    }

    private static AuthFailure invalido() {
        return new AuthFailure(422, "CONVITE_INVALIDO", "Convite inválido, expirado, revogado ou já utilizado. Confira o login ou solicite outro convite ao Administrador.");
    }
}

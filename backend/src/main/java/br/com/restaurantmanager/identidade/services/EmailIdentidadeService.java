package br.com.restaurantmanager.identidade.services;

import br.com.restaurantmanager.identidade.dtos.EntregaEmail;
import br.com.restaurantmanager.identidade.exceptions.ConteudoEmailInvalido;
import br.com.restaurantmanager.identidade.infrastructure.ProtecaoEmail;
import br.com.restaurantmanager.identidade.models.CadastroCliente;
import br.com.restaurantmanager.identidade.models.EmailIdentidade;
import br.com.restaurantmanager.identidade.models.RecuperacaoSenha;
import br.com.restaurantmanager.identidade.models.Usuario;
import br.com.restaurantmanager.identidade.models.VerificacaoEmail;
import br.com.restaurantmanager.identidade.repositories.CadastroClienteRepository;
import br.com.restaurantmanager.identidade.repositories.ConviteRepository;
import br.com.restaurantmanager.identidade.repositories.IdentidadeRepository;
import br.com.restaurantmanager.identidade.repositories.RecuperacaoRepository;
import br.com.restaurantmanager.identidade.repositories.VerificacaoEmailRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailIdentidadeService {
    private final RecuperacaoRepository repository;
    private final IdentidadeRepository identidades;
    private final ProtecaoEmail protecao;
    private final CadastroClienteRepository cadastros;
    private final ConviteRepository convites;
    private final VerificacaoEmailRepository verificacoes;
    private final SecureRandom random = new SecureRandom();

    public EmailIdentidadeService(
            RecuperacaoRepository repository,
            IdentidadeRepository identidades,
            ProtecaoEmail protecao,
            CadastroClienteRepository cadastros,
            ConviteRepository convites,
            VerificacaoEmailRepository verificacoes) {
        this.repository = repository;
        this.identidades = identidades;
        this.protecao = protecao;
        this.cadastros = cadastros;
        this.convites = convites;
        this.verificacoes = verificacoes;
    }

    @Transactional(timeout = 10)
    public EntregaEmail preparar() {
        identidades.bloquearAlteracoesDeAcesso();
        Instant agora = Instant.now();
        var pendentes = repository.proximo(agora);
        if (pendentes.isEmpty()) {
            return null;
        }
        EmailIdentidade email = pendentes.getFirst();
        if (!email.getExpiraEm().isAfter(agora)) {
            finalizar(email, "EXPIRADO");
            return new EntregaEmail(email.getId(), null, null);
        }
        if (email.getTentativas() >= 5) {
            finalizar(email, "FALHOU");
            return new EntregaEmail(email.getId(), null, null);
        }
        try {
            return prepararConteudo(email, agora);
        } catch (ConteudoEmailInvalido failure) {
            finalizar(email, "FALHOU");
            return new EntregaEmail(email.getId(), null, null);
        }
    }

    private EntregaEmail prepararConteudo(EmailIdentidade email, Instant agora) {
        if (email.getTipo().equals("VERIFICAR")) {
            String address = protecao.decifrar(email.getId(), email.getConteudoCifrado());
            Usuario usuario = identidades.porEmail(address).orElse(null);
            if (usuario == null || !usuario.isAtivo() || usuario.isEmailVerificado()) {
                finalizar(email, "IGNORADO");
                return new EntregaEmail(email.getId(), null, null);
            }
            byte[] bytes = new byte[32];
            random.nextBytes(bytes);
            String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            verificacoes.salvar(VerificacaoEmail.criar(IdentidadeService.hash(raw), usuario.getId(),
                    usuario.getEmail(), email.getExpiraEm()));
            String conteudo = "Para: " + usuario.getEmail() + "\nAssunto: Verificar e-mail\nEmpresa: "
                    + IdentidadeService.empresaAtual()
                    + "\nNa mesma página da empresa, escolha Verificar e-mail existente e cole o código. Sua senha e seu perfil não serão alterados. Não compartilhe este código.\nCódigo: "
                    + raw + "\nVálido até: " + email.getExpiraEm()
                    + "\nSe não solicitou, ignore esta mensagem.\n";
            email.prepararConteudo("VERIFICACAO", protecao.cifrar(email.getId(), conteudo));
        }
        if (email.getTipo().equals("CADASTRO_SOLICITADO")) {
            String address = protecao.decifrar(email.getId(), email.getConteudoCifrado());
            if (identidades.porEmail(address).isPresent()) {
                finalizar(email, "IGNORADO");
                return new EntregaEmail(email.getId(), null, null);
            }
            byte[] bytes = new byte[32];
            random.nextBytes(bytes);
            String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            cadastros.salvar(CadastroCliente.criar(IdentidadeService.hash(raw), address, email.getExpiraEm()));
            String conteudo = "Para: " + address + "\nAssunto: Criar conta de cliente\nEmpresa: "
                    + IdentidadeService.empresaAtual()
                    + "\nNa mesma página da empresa, escolha Criar conta de cliente, cole o código e defina sua senha. Não compartilhe este código.\nCódigo: "
                    + raw + "\nVálido até: " + email.getExpiraEm()
                    + "\nSe não solicitou, ignore esta mensagem.\n";
            email.prepararConteudo("CADASTRO", protecao.cifrar(email.getId(), conteudo));
        }
        if (email.getTipo().equals("SOLICITACAO")) {
            String address = protecao.decifrar(email.getId(), email.getConteudoCifrado());
            Usuario usuario = identidades.porEmail(address).orElse(null);
            if (usuario == null || !usuario.isAtivo()) {
                finalizar(email, "IGNORADO");
                return new EntregaEmail(email.getId(), null, null);
            }
            byte[] bytes = new byte[32];
            random.nextBytes(bytes);
            String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            repository.salvar(RecuperacaoSenha.criar(IdentidadeService.hash(raw), usuario.getId(), email.getExpiraEm()));
            String conteudo = "Para: " + usuario.getEmail() + "\nAssunto: Recuperar senha\nEmpresa: "
                    + IdentidadeService.empresaAtual()
                    + "\nNa mesma página da empresa, escolha Recuperar senha e cole o código abaixo. Não compartilhe este código.\nCódigo: "
                    + raw + "\nVálido até: " + email.getExpiraEm()
                    + "\nSe não solicitou, ignore esta mensagem.\n";
            email.prepararConteudo("RECUPERACAO", protecao.cifrar(email.getId(), conteudo));
        }
        if (!Set.of("RECUPERACAO", "AVISO", "CADASTRO", "CONVITE", "VERIFICACAO").contains(email.getTipo())) {
            finalizar(email, "FALHOU");
            return new EntregaEmail(email.getId(), null, null);
        }
        email.iniciarProcessamento(agora);
        return new EntregaEmail(email.getId(), email.getLease(),
                protecao.decifrar(email.getId(), email.getConteudoCifrado()));
    }

    @Transactional(timeout = 10)
    public void concluir(UUID id, UUID lease, boolean sucesso) {
        EmailIdentidade email = repository.email(id);
        if (email == null || !"PROCESSANDO".equals(email.getEstado()) || !lease.equals(email.getLease())) {
            return;
        }
        if (sucesso) {
            finalizar(email, "CAPTURADO");
        } else {
            if (email.getTentativas() >= 5) {
                finalizar(email, "FALHOU");
            } else {
                email.agendarNovaTentativa(Instant.now());
            }
        }
    }

    @Transactional(timeout = 10)
    public void expurgar() {
        Instant limite = Instant.now().minusSeconds(86400);
        repository.expurgar(limite);
        cadastros.expurgar(limite);
        convites.expurgar(limite);
        verificacoes.expurgar(limite);
    }

    private void finalizar(EmailIdentidade email, String estado) {
        email.finalizar(estado);
    }
}

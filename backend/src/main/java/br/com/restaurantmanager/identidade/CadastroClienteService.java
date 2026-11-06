package br.com.restaurantmanager.identidade;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CadastroClienteService {
    private final IdentidadeRepository identidades;
    private final AcessosRepository acessos;
    private final CadastroClienteRepository repository;
    private final RecuperacaoRepository mensagens;
    private final ProtecaoEmail protecao;
    private final CapturaEmail captura;
    private final ConfirmacaoLimitadaService confirmacoes;
    private final BCryptPasswordEncoder passwords=new BCryptPasswordEncoder(12);
    public CadastroClienteService(IdentidadeRepository identidades,AcessosRepository acessos,CadastroClienteRepository repository,
            RecuperacaoRepository mensagens,ProtecaoEmail protecao,CapturaEmail captura,ConfirmacaoLimitadaService confirmacoes) {
        this.identidades=identidades;this.acessos=acessos;this.repository=repository;
        this.mensagens=mensagens;this.protecao=protecao;this.captura=captura;
        this.confirmacoes=confirmacoes;
    }
    @Transactional(noRollbackFor=AuthFailure.class,timeout=10)
    public void solicitar(String email,String origem) {
        protecao.exigirConfiguracao();captura.exigirConfiguracao();
        Instant agora=Instant.now();String normalized=email.toLowerCase(Locale.ROOT);
        limitar("cadastro-origem:"+origem,30,agora);
        limitar("cadastro-email:"+normalized,3,agora);
        UUID id=UUID.randomUUID();
        mensagens.salvar(new EmailIdentidade(id,"CADASTRO_SOLICITADO",protecao.cifrar(id,normalized),agora.plusSeconds(900)));
    }
    public void confirmar(String raw,String senha,String origem) {
        protecao.exigirConfiguracao();captura.exigirConfiguracao();
        if(!PoliticaSenha.novaSenhaValida(senha)) {
            throw new AuthFailure(422,"SENHA_INVALIDA","Use pelo menos 12 caracteres e no máximo 72 bytes na senha.");
        }
        confirmacoes.executar("cadastro-confirmar:"+origem,()->confirmarTransacao(raw,senha));
    }
    private void confirmarTransacao(String raw,String senha) {
        // Limitador já confirmado em transação separada; política sempre precede o código.
        acessos.politica(true);
        CadastroCliente codigo=repository.codigo(IdentidadeService.hash(raw));
        Instant agora=Instant.now();
        if(codigo==null || codigo.consumidoEm!=null || !codigo.expiraEm.isAfter(agora)
                || identidades.porEmail(codigo.email).isPresent()) throw invalido();
        // Nenhuma senha ou conta existe antes da prova de posse do endereço.
        Usuario usuario=new Usuario();usuario.id=UUID.randomUUID();usuario.email=codigo.email;
        usuario.senhaHash=passwords.encode(senha);usuario.perfil="CLIENTE";
        usuario.ativo=true;usuario.emailVerificado=true;usuario.alteradoEm=agora;
        identidades.salvar(usuario);
        repository.consumirTodos(codigo.email,agora);
        acessos.auditar(usuario.id,usuario.id,"CLIENTE_CADASTRADO","INEXISTENTE","CLIENTE_EMAIL_VERIFICADO");
        // Qualquer falha nesta transação reverte criação, consumo e auditoria.
    }
    private void limitar(String chave,int max,Instant agora) {
        if(identidades.tentativa(IdentidadeService.hash(chave),agora)>max) throw new AuthFailure(429,"LIMITE_TENTATIVAS","Muitas tentativas. Aguarde quinze minutos.");
    }
    private AuthFailure invalido() {
        return new AuthFailure(422,"CADASTRO_INVALIDO","Código inválido, expirado ou já utilizado. Se já possui conta, entre ou recupere a senha.");
    }
}

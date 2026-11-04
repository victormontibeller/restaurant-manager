package br.com.restaurantmanager.identidade;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VerificacaoEmailService {
    private final IdentidadeRepository identidades;
    private final AcessosRepository acessos;
    private final VerificacaoEmailRepository repository;
    private final RecuperacaoRepository mensagens;
    private final ProtecaoEmail protecao;
    private final CapturaEmail captura;
    private final ConfirmacaoLimitadaService confirmacoes;
    public VerificacaoEmailService(IdentidadeRepository identidades,AcessosRepository acessos,VerificacaoEmailRepository repository,
            RecuperacaoRepository mensagens,ProtecaoEmail protecao,CapturaEmail captura,ConfirmacaoLimitadaService confirmacoes) {
        this.identidades=identidades;this.acessos=acessos;this.repository=repository;
        this.mensagens=mensagens;this.protecao=protecao;this.captura=captura;this.confirmacoes=confirmacoes;
    }
    @Transactional(noRollbackFor=AuthFailure.class,timeout=10)
    public void solicitar(String email,String origem) {
        protecao.exigirConfiguracao();captura.exigirConfiguracao();
        Instant agora=Instant.now();String normalized=email.toLowerCase(Locale.ROOT);
        limitar("verificacao-origem:"+origem,30,agora);
        limitar("verificacao-email:"+normalized,3,agora);
        UUID id=UUID.randomUUID();
        mensagens.salvar(new EmailIdentidade(id,"VERIFICAR",protecao.cifrar(id,normalized),agora.plusSeconds(900)));
    }
    public void confirmar(String raw,String origem) {
        protecao.exigirConfiguracao();captura.exigirConfiguracao();
        confirmacoes.executar("verificacao-confirmar:"+origem,()->confirmarTransacao(raw));
    }
    private void confirmarTransacao(String raw) {
        acessos.politica(true);
        VerificacaoEmail codigo=repository.codigo(IdentidadeService.hash(raw));
        Instant agora=Instant.now();
        if(codigo==null || codigo.consumidoEm!=null || !codigo.expiraEm.isAfter(agora))throw invalido();
        Usuario usuario=identidades.usuario(codigo.usuarioId);
        if(usuario==null || !usuario.ativo || usuario.emailVerificado || !usuario.email.equals(codigo.email))throw invalido();
        usuario.emailVerificado=true;usuario.alteradoEm=agora;
        repository.consumirTodos(usuario.id,agora);
        acessos.auditar(usuario.id,usuario.id,"EMAIL_VERIFICADO","EMAIL_NAO_VERIFICADO","EMAIL_VERIFICADO");
    }
    private void limitar(String chave,int max,Instant agora) {
        if(identidades.tentativa(IdentidadeService.hash(chave),agora)>max)
            throw new AuthFailure(429,"LIMITE_TENTATIVAS","Muitas tentativas. Aguarde quinze minutos.");
    }
    private AuthFailure invalido() {
        return new AuthFailure(422,"VERIFICACAO_INVALIDA","Código inválido, expirado ou já utilizado. Entre na conta para conferir o e-mail ou solicite outro código.");
    }
}

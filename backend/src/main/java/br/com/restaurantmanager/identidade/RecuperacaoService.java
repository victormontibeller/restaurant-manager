package br.com.restaurantmanager.identidade;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecuperacaoService {
    private final IdentidadeRepository identidades;
    private final AcessosRepository acessos;
    private final RecuperacaoRepository repository;
    private final ProtecaoEmail protecao;
    private final CapturaEmail captura;
    private final ConfirmacaoLimitadaService confirmacoes;
    private final BCryptPasswordEncoder passwords=new BCryptPasswordEncoder(12);
    public RecuperacaoService(IdentidadeRepository identidades,AcessosRepository acessos,RecuperacaoRepository repository,ProtecaoEmail protecao,CapturaEmail captura,ConfirmacaoLimitadaService confirmacoes) {
        this.identidades=identidades; this.acessos=acessos; this.repository=repository; this.protecao=protecao; this.captura=captura;
        this.confirmacoes=confirmacoes;
    }
    @Transactional(noRollbackFor=AuthFailure.class)
    public void solicitar(String email,String origem) {
        protecao.exigirConfiguracao(); captura.exigirConfiguracao();
        Instant agora=Instant.now();
        String normalized=email.strip().toLowerCase(Locale.ROOT);
        limitar("recuperacao-origem:"+origem,30,agora);
        limitar("recuperacao-email:"+normalized,3,agora);
        // A consulta da conta só ocorre no worker: mesma resposta e caminho síncrono para todos.
        UUID id=UUID.randomUUID();
        repository.salvar(new EmailIdentidade(id,"SOLICITACAO",protecao.cifrar(id,normalized),agora.plusSeconds(900)));
    }
    public void confirmar(String raw,String senha,String origem) {
        protecao.exigirConfiguracao(); captura.exigirConfiguracao();
        if(!PoliticaSenha.novaSenhaValida(senha)) {
            throw new AuthFailure(422,"SENHA_INVALIDA","Use pelo menos 12 caracteres e no máximo 72 bytes na senha.");
        }
        confirmacoes.executar("recuperacao-confirmar:"+origem,()->confirmarTransacao(raw,senha));
    }
    private void confirmarTransacao(String raw,String senha) {
        // A quota foi confirmada e liberada antes da política/token/sessão.
        acessos.politica(true);
        RecuperacaoSenha token=repository.token(IdentidadeService.hash(raw));
        Instant agora=Instant.now(); // Esperar política/token não prorroga validade.
        if(token==null || token.consumidoEm!=null || !token.expiraEm.isAfter(agora)) throw invalido();
        Usuario usuario=identidades.usuario(token.usuarioId);
        if(usuario==null || !usuario.ativo) throw invalido();
        usuario.senhaHash=passwords.encode(senha); usuario.alteradoEm=agora;
        repository.consumirTodos(usuario.id,agora);
        acessos.revogarSessoes(usuario.id);
        acessos.auditar(usuario.id,usuario.id,"SENHA_RECUPERADA","CREDENCIAL_ANTERIOR","SESSOES_REVOGADAS");
        UUID id=UUID.randomUUID();
        repository.salvar(new EmailIdentidade(id,"AVISO",protecao.cifrar(id,
                "Para: "+usuario.email+"\nAssunto: Senha alterada\nSua senha foi alterada. Todas as sessões anteriores foram encerradas. Se não reconhece a ação, contate o suporte do restaurante.\n"),agora.plusSeconds(86400)));
    }
    private void limitar(String chave,int max,Instant agora) {
        if(identidades.tentativa(IdentidadeService.hash(chave),agora)>max) throw new AuthFailure(429,"LIMITE_TENTATIVAS","Muitas tentativas. Aguarde quinze minutos.");
    }
    private AuthFailure invalido() { return new AuthFailure(422,"RECUPERACAO_INVALIDA","Código inválido, expirado ou já utilizado. Solicite uma nova recuperação."); }
}

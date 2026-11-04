package br.com.restaurantmanager.identidade;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailIdentidadeService {
    private final RecuperacaoRepository repository;
    private final IdentidadeRepository identidades;
    private final ProtecaoEmail protecao;
    private final CadastroClienteRepository cadastros;
    private final SecureRandom random=new SecureRandom();
    public EmailIdentidadeService(RecuperacaoRepository repository,IdentidadeRepository identidades,ProtecaoEmail protecao,CadastroClienteRepository cadastros) {
        this.repository=repository; this.identidades=identidades; this.protecao=protecao; this.cadastros=cadastros;
    }
    public record Entrega(UUID id,UUID lease,String conteudo) {
        @Override public String toString() { return "Entrega[protegida]"; }
    }
    @Transactional(timeout=10)
    public Entrega preparar() {
        identidades.bloquearAlteracoesDeAcesso();
        Instant agora=Instant.now();
        var pendentes=repository.proximo(agora);
        if(pendentes.isEmpty()) return null;
        EmailIdentidade email=pendentes.getFirst();
        if(!email.expiraEm.isAfter(agora)) { finalizar(email,"EXPIRADO"); return new Entrega(email.id,null,null); }
        if(email.tentativas>=5) { finalizar(email,"FALHOU"); return new Entrega(email.id,null,null); }
        try { return prepararConteudo(email,agora); }
        catch(ProtecaoEmail.ConteudoInvalido failure) {
            finalizar(email,"FALHOU");
            return new Entrega(email.id,null,null);
        }
    }
    private Entrega prepararConteudo(EmailIdentidade email,Instant agora) {
        if(email.tipo.equals("CADASTRO_SOLICITADO")) {
            String address=protecao.decifrar(email.id,email.conteudoCifrado);
            if(identidades.porEmail(address).isPresent()) { finalizar(email,"IGNORADO"); return new Entrega(email.id,null,null); }
            byte[] bytes=new byte[32]; random.nextBytes(bytes);
            String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            cadastros.salvar(new CadastroCliente(IdentidadeService.hash(raw),address,email.expiraEm));
            email.tipo="CADASTRO";
            email.conteudoCifrado=protecao.cifrar(email.id,"Para: "+address+"\nAssunto: Criar conta de cliente\nEmpresa: "+IdentidadeService.empresaAtual()
                    +"\nNa mesma página da empresa, escolha Criar conta de cliente, cole o código e defina sua senha. Não compartilhe este código.\nCódigo: "+raw
                    +"\nVálido até: "+email.expiraEm+"\nSe não solicitou, ignore esta mensagem.\n");
        }
        if(email.tipo.equals("SOLICITACAO")) {
            String address=protecao.decifrar(email.id,email.conteudoCifrado);
            Usuario usuario=identidades.porEmail(address).orElse(null);
            if(usuario==null || !usuario.ativo) { finalizar(email,"IGNORADO"); return new Entrega(email.id,null,null); }
            byte[] bytes=new byte[32]; random.nextBytes(bytes);
            String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            repository.salvar(new RecuperacaoSenha(IdentidadeService.hash(raw),usuario.id,email.expiraEm));
            email.tipo="RECUPERACAO";
            email.conteudoCifrado=protecao.cifrar(email.id,"Para: "+usuario.email+"\nAssunto: Recuperar senha\nEmpresa: "+IdentidadeService.empresaAtual()
                    +"\nNa mesma página da empresa, escolha Recuperar senha e cole o código abaixo. Não compartilhe este código.\nCódigo: "+raw
                    +"\nVálido até: "+email.expiraEm+"\nSe não solicitou, ignore esta mensagem.\n");
        }
        if(!java.util.Set.of("RECUPERACAO","AVISO","CADASTRO").contains(email.tipo)) {
            finalizar(email,"FALHOU"); return new Entrega(email.id,null,null);
        }
        email.estado="PROCESSANDO"; email.tentativas++; email.lease=UUID.randomUUID(); email.proximaEm=agora.plusSeconds(120);
        return new Entrega(email.id,email.lease,protecao.decifrar(email.id,email.conteudoCifrado));
    }
    @Transactional(timeout=10)
    public void concluir(UUID id,UUID lease,boolean sucesso) {
        EmailIdentidade email=repository.email(id);
        if(email==null || !"PROCESSANDO".equals(email.estado) || !lease.equals(email.lease)) return;
        if(sucesso) finalizar(email,"CAPTURADO");
        else {
            if(email.tentativas>=5) finalizar(email,"FALHOU");
            else { email.estado="PENDENTE"; email.proximaEm=Instant.now().plusSeconds(30L*email.tentativas); email.lease=null; }
        }
    }
    @Transactional(timeout=10)
    public void expurgar() {
        Instant limite=Instant.now().minusSeconds(86400);
        repository.expurgar(limite);cadastros.expurgar(limite);
    }
    private void finalizar(EmailIdentidade email,String estado) {
        email.estado=estado; email.conteudoCifrado=null; email.lease=null;
    }
}

package br.com.restaurantmanager.identidade;

import br.com.restaurantmanager.unidades.Unidade;
import java.nio.charset.StandardCharsets;
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
    private final SecureRandom random=new SecureRandom();
    private final BCryptPasswordEncoder passwords=new BCryptPasswordEncoder(12);
    public ConviteService(ConviteRepository repository,AcessosService acessos,AcessosRepository politica,IdentidadeRepository identidades,
            RecuperacaoRepository mensagens,ProtecaoEmail protecao,CapturaEmail captura,ConfirmacaoLimitadaService confirmacoes) {
        this.repository=repository;this.acessos=acessos;this.politica=politica;this.identidades=identidades;
        this.mensagens=mensagens;this.protecao=protecao;this.captura=captura;this.confirmacoes=confirmacoes;
    }
    public record Resumo(UUID id,String email,String perfil,List<UUID> unidades,String estado,Instant expiraEm) {}
    @Transactional(timeout=10)
    public Resumo criar(IdentidadeAtual ator,UUID id,String email,String perfil,Set<UUID> unidades) {
        acessos.autorizarAdministrador(ator,true);
        String address=email.toLowerCase(Locale.ROOT);
        String vinculos=unidades.stream().sorted().map(UUID::toString).collect(Collectors.joining(","));
        var existente=repository.obter(id);
        if(existente!=null) {
            if(!existente.autorId.equals(ator.usuarioId())||!existente.email.equals(address)||!existente.perfil.equals(perfil)||!existente.unidades.equals(vinculos)) {
                throw new AuthFailure(409,"CONFLITO","Esta intenção pertence a outro convite. Consulte o resultado antes de criar outra.");
            }
            return resumo(existente);
        }
        protecao.exigirConfiguracao();captura.exigirConfiguracao();
        if(!AcessosService.PERFIS.contains(perfil)&&!perfil.equals("ADMINISTRADOR"))throw new AuthFailure(400,"ENTRADA_INVALIDA","Perfil de funcionário inválido.");
        if(perfil.equals("ADMINISTRADOR")&&!unidades.isEmpty())throw new AuthFailure(400,"ENTRADA_INVALIDA","Administrador cobre todas as unidades; não informe vínculos individuais.");
        if(!unidadesAtivas().containsAll(unidades))throw inexistente();
        if(identidades.porEmail(address).isPresent())throw new AuthFailure(409,"CONFLITO","Este endereço já possui conta. O convite não altera contas existentes.");
        Instant agora=Instant.now();
        if(repository.recentes(ator.usuarioId(),agora.minusSeconds(900))>=30)throw new AuthFailure(429,"LIMITE_TENTATIVAS","Limite de convites atingido. Aguarde quinze minutos.");
        byte[] bytes=new byte[32];random.nextBytes(bytes);String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var convite=new ConviteFuncionario();convite.id=id;convite.autorId=ator.usuarioId();convite.email=address;convite.perfil=perfil;convite.unidades=vinculos;
        convite.codigoHash=IdentidadeService.hash(raw);convite.criadoEm=agora;convite.expiraEm=agora.plusSeconds(900);repository.salvar(convite);
        UUID mensagem=UUID.randomUUID();
        mensagens.salvar(new EmailIdentidade(mensagem,"CONVITE",protecao.cifrar(mensagem,"Para: "+address+"\nAssunto: Convite de funcionário\nEmpresa: "+IdentidadeService.empresaAtual()
                +"\nPerfil: "+perfil+"\nNa mesma página da empresa, escolha Aceitar convite de funcionário. Defina sua senha somente após conferir o convite. Não compartilhe o código.\nCódigo: "+raw
                +"\nVálido até: "+convite.expiraEm+"\nSe não reconhece o convite, ignore esta mensagem.\n"),convite.expiraEm));
        politica.auditar(ator.usuarioId(),id,"CONVITE_CRIADO","INEXISTENTE",perfil+":"+vinculos);
        return resumo(convite);
    }
    @Transactional(timeout=10)
    public List<Resumo> listar(IdentidadeAtual ator,int pagina) {
        acessos.autorizarAdministrador(ator,false);
        if(pagina<0||pagina>10000)throw new AuthFailure(400,"ENTRADA_INVALIDA","Página inválida.");
        return repository.listar(pagina).stream().map(this::resumo).toList();
    }
    @Transactional(timeout=10)
    public Resumo obter(IdentidadeAtual ator,UUID id) {
        acessos.autorizarAdministrador(ator,false);return resumo(exigir(id));
    }
    @Transactional(timeout=10)
    public Resumo revogar(IdentidadeAtual ator,UUID id) {
        acessos.autorizarAdministrador(ator,true);var convite=repository.bloquear(id);
        if(convite==null)throw inexistente();
        if(convite.aceitoEm!=null)throw new AuthFailure(409,"CONFLITO","Convite aceito. Gerencie o funcionário para alterar seu acesso.");
        if(convite.revogadoEm==null){convite.revogadoEm=Instant.now();politica.auditar(ator.usuarioId(),id,"CONVITE_REVOGADO","NAO_REVOGADO","REVOGADO");}
        return resumo(convite);
    }
    public void aceitar(String codigo,String senha,String origem) {
        if(senha.length()<12||senha.getBytes(StandardCharsets.UTF_8).length>72)throw new AuthFailure(422,"SENHA_INVALIDA","Use pelo menos 12 caracteres e no máximo 72 bytes na senha.");
        confirmacoes.executar("convite-confirmar:"+origem,()->aceitarTransacao(codigo,senha));
    }
    private void aceitarTransacao(String raw,String senha) {
        politica.politica(true);var convite=repository.codigo(IdentidadeService.hash(raw));Instant agora=Instant.now();
        if(convite==null||!convite.estado(agora).equals("PENDENTE"))throw invalido();
        var autor=identidades.usuario(convite.autorId);
        if(autor==null||!autor.ativo||!autor.perfil.equals("ADMINISTRADOR")||identidades.porEmail(convite.email).isPresent()
                ||!unidadesAtivas().containsAll(convite.vinculos()))throw invalido();
        Usuario user=new Usuario();user.id=UUID.randomUUID();user.email=convite.email;user.senhaHash=passwords.encode(senha);
        user.perfil=convite.perfil;user.ativo=true;user.emailVerificado=true;user.alteradoEm=agora;identidades.salvar(user);politica.flush();
        politica.substituirUnidades(user.id,Set.copyOf(convite.vinculos()));convite.aceitoEm=agora;
        repository.revogarOutros(convite.email,convite.id,agora);
        politica.auditar(user.id,convite.id,"CONVITE_ACEITO","PENDENTE",user.id+":"+user.perfil);
    }
    private Set<UUID> unidadesAtivas(){return politica.unidadesAtivas().stream().map(Unidade::getId).collect(Collectors.toSet());}
    private ConviteFuncionario exigir(UUID id){var c=repository.obter(id);if(c==null)throw inexistente();return c;}
    private Resumo resumo(ConviteFuncionario c){return new Resumo(c.id,c.email,c.perfil,c.vinculos(),c.estado(Instant.now()),c.expiraEm);}
    private static AuthFailure inexistente(){return new AuthFailure(404,"RECURSO_NAO_ENCONTRADO","Recurso não encontrado.");}
    private static AuthFailure invalido(){return new AuthFailure(422,"CONVITE_INVALIDO","Convite inválido, expirado, revogado ou já utilizado. Confira o login ou solicite outro convite ao Administrador.");}
}

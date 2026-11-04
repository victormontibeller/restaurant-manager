package br.com.restaurantmanager.unidades;

import br.com.restaurantmanager.identidade.AcessosService;
import br.com.restaurantmanager.identidade.AuthFailure;
import br.com.restaurantmanager.identidade.IdentidadeAtual;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfiguracaoUnidadeService {
    private final UnidadeRepository repository;
    private final AcessosService acessos;
    public ConfiguracaoUnidadeService(UnidadeRepository repository,AcessosService acessos) {
        this.repository=repository;this.acessos=acessos;
    }
    public record Detalhe(UUID id,String nome,String fuso,boolean ativa,long versao) {}
    @Transactional
    public List<Detalhe> listar(IdentidadeAtual ator,int pagina) {
        acessos.autorizarAdministrador(ator,false);
        if(pagina<0||pagina>10000) throw new AuthFailure(400,"ENTRADA_INVALIDA","Página inválida.");
        return repository.findAllByOrderByNomeAscIdAsc(PageRequest.of(pagina,50)).stream().map(this::dto).toList();
    }
    @Transactional
    public Detalhe consultar(IdentidadeAtual ator,UUID id) {
        acessos.autorizarAdministrador(ator,false);return dto(obter(id));
    }
    @Transactional
    public Detalhe criar(IdentidadeAtual ator,UUID id,String nome,String fuso,boolean ativa) {
        acessos.autorizarAdministrador(ator,true);validar(nome,fuso);
        String payload=ator.usuarioId()+"\n"+estado(nome,fuso,ativa);
        var existente=repository.findById(id);
        if(existente.isPresent()) {
            if(!payload.equals(existente.get().getCriacaoPayload())) throw conflito("Identificador já utilizado por outra intenção. Recarregue para conferir o cadastro.");
            return dto(existente.get());
        }
        var unidade=new Unidade(id,nome.strip(),fuso,ativa,payload);
        repository.saveAndFlush(unidade);
        acessos.auditarConfiguracao(ator,id,"UNIDADE_CRIADA","INEXISTENTE",estado(unidade));
        return dto(unidade);
    }
    @Transactional
    public Detalhe alterar(IdentidadeAtual ator,UUID id,long versao,String nome,String fuso,boolean ativa) {
        // Mesmo lock da equipe: não atribuir unidade enquanto sua inativação está em curso.
        acessos.autorizarAdministrador(ator,true);validar(nome,fuso);
        var unidade=obter(id);
        if(unidade.getVersao()!=versao) throw conflito("A unidade foi alterada. Recarregue antes de salvar.");
        String antes=estado(unidade);
        unidade.alterar(nome.strip(),fuso,ativa);
        repository.flush();
        acessos.auditarConfiguracao(ator,id,"UNIDADE_ALTERADA",antes,estado(unidade));
        return dto(unidade);
    }
    private Unidade obter(UUID id) {return repository.findById(id).orElseThrow(()->new AuthFailure(404,"RECURSO_NAO_ENCONTRADO","Recurso não encontrado."));}
    private void validar(String nome,String fuso) {
        if(nome==null||nome.isBlank()||nome.length()>120||nome.codePoints().anyMatch(Character::isISOControl)) throw new AuthFailure(400,"ENTRADA_INVALIDA","Informe um nome de unidade entre 1 e 120 caracteres, sem caracteres de controle.");
        if(fuso==null||!ZoneId.getAvailableZoneIds().contains(fuso)) throw new AuthFailure(422,"FUSO_INVALIDO","Informe um fuso IANA válido, como America/Sao_Paulo.");
    }
    private String estado(String nome,String fuso,boolean ativa) {return nome.strip()+"\n"+fuso+"\n"+ativa;}
    private String estado(Unidade unidade) {return estado(unidade.getNome(),unidade.getFuso(),unidade.isAtiva());}
    private Detalhe dto(Unidade u) {return new Detalhe(u.getId(),u.getNome(),u.getFuso(),u.isAtiva(),u.getVersao());}
    private static AuthFailure conflito(String mensagem) {return new AuthFailure(409,"CONFLITO",mensagem);}
}

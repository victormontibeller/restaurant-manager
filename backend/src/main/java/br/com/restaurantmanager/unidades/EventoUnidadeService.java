package br.com.restaurantmanager.unidades;

import br.com.restaurantmanager.identidade.Acao;
import br.com.restaurantmanager.identidade.AcessosService;
import br.com.restaurantmanager.identidade.AuthFailure;
import br.com.restaurantmanager.identidade.IdentidadeAtual;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventoUnidadeService {
    private final EventoUnidadeRepository eventos;
    private final UnidadeRepository unidades;
    private final AcessosService acessos;
    public EventoUnidadeService(EventoUnidadeRepository eventos,UnidadeRepository unidades,AcessosService acessos) {
        this.eventos=eventos;this.unidades=unidades;this.acessos=acessos;
    }
    public record Atual(UUID id,String nome,String fuso,String versao) {}
    public record Evento(String versao,String tipo,String nome,String fuso,boolean ativa,Instant ocorridoEm) {}
    public record Pagina(Atual unidade,List<Evento> eventos,String proximo,boolean temMais) {}
    @Transactional(timeout=10)
    public Pagina consultar(IdentidadeAtual ator,UUID unidade,long depois) {
        // Mesmo lock dos escritores: ordem de commit não pode pular uma versão ainda invisível.
        acessos.autorizar(ator,Acao.UNIDADE_ACOMPANHAR,unidade);
        if(depois < -1) throw new AuthFailure(400,"CURSOR_INVALIDO","Informe um cursor a partir de -1.");
        var atual=unidades.findById(unidade).orElseThrow(()->new AuthFailure(404,"RECURSO_NAO_ENCONTRADO","Recurso não encontrado."));
        if(depois>atual.getVersao()) throw new AuthFailure(409,"CURSOR_ADIANTADO","A versão não pertence ao estado atual. Reinicie a consulta desta unidade.");
        var encontrados=eventos.apos(unidade,depois);
        boolean mais=encontrados.size()>50;
        var pagina=encontrados.stream().limit(50).map(e->new Evento(Long.toString(e.versao),e.tipo,e.nome,e.fuso,e.ativa,e.ocorridoEm)).toList();
        String proximo=mais?pagina.getLast().versao():Long.toString(atual.getVersao());
        return new Pagina(new Atual(atual.getId(),atual.getNome(),atual.getFuso(),Long.toString(atual.getVersao())),pagina,proximo,mais);
    }
}

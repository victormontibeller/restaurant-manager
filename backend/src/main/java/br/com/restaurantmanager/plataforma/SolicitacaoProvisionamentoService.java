package br.com.restaurantmanager.plataforma;

import br.com.restaurantmanager.identidade.AuthFailure;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SolicitacaoProvisionamentoService {
    private final PlataformaService plataforma;
    private final PlataformaRepository identidade;
    private final SolicitacaoProvisionamentoRepository repository;
    private final BCryptPasswordEncoder passwords=new BCryptPasswordEncoder(12);
    private final DominioPlataforma dominio;
    public SolicitacaoProvisionamentoService(PlataformaService plataforma,PlataformaRepository identidade,
            SolicitacaoProvisionamentoRepository repository,@Value(DominioPlataforma.CONFIGURACAO) String platformHost) {
        this.plataforma=plataforma;this.identidade=identidade;this.repository=repository;this.dominio=new DominioPlataforma(platformHost);
    }
    public record Resumo(UUID id,String nome,String host,String estado,long versao,String ultimaFalha) {}
    public Resumo solicitar(PlataformaService.Identidade ator,ProvisionamentoService.Pedido p) {
        return plataforma.executar(()->{
            plataforma.autorizar(ator,true);
            try{ProvisionamentoService.validar(p);}catch(IllegalArgumentException failure){throw new AuthFailure(400,"ENTRADA_INVALIDA",failure.getMessage());}
            if(dominio.reservado(p.host()))throw new AuthFailure(409,"DOMINIO_RESERVADO","Domínio indisponível para empresa.");
            repository.bloquear(p.id());plataforma.autorizar(ator,true);
            var existente=repository.buscar(p.id());
            if(existente!=null) {
                if(!existente.operador().equals(ator.usuarioId()) || !existente.nome().equals(p.nome()) || !existente.host().equals(p.host())
                        || !existente.unidade().equals(p.unidade()) || !existente.email().equals(p.email()) || !passwords.matches(p.senha(),existente.hash()))throw conflito();
                return resumo(existente);
            }
            if(identidade.tentativa("provisionar:"+ator.usuarioId(),Instant.now())>10)
                throw new AuthFailure(429,"LIMITE_TENTATIVAS","Limite de dez solicitações em quinze minutos. Aguarde.");
            String hash=passwords.encode(p.senha());plataforma.autorizar(ator,true);
            // Mesmo lock do CLI/worker: um domínio não pode ganhar duas reservas.
            // A API não aguarda uma migração longa mantendo locks de identidade.
            if(!repository.bloquearReserva())throw new AuthFailure(409,"PROVISIONADOR_OCUPADO","Provisionador ocupado. Consulte ou reenvie a mesma intenção mais tarde.");
            if(repository.ocupado(p.id(),p.host()))throw conflito();
            if(!repository.inserir(p,ator.usuarioId(),hash))throw conflito();
            repository.auditar(p.id(),ator,"SOLICITADO",0);return resumo(repository.buscar(p.id()));
        });
    }
    public List<Resumo> listar(PlataformaService.Identidade ator,int pagina) {
        return plataforma.executar(()->{plataforma.autorizar(ator,false);if(pagina<0||pagina>10000)throw new AuthFailure(400,"PAGINA_INVALIDA","Página inválida.");return repository.listar(pagina);});
    }
    public Resumo consultar(PlataformaService.Identidade ator,UUID id) {
        return plataforma.executar(()->{plataforma.autorizar(ator,false);return resumo(localizar(id));});
    }
    public Resumo retomar(PlataformaService.Identidade ator,UUID id,long versao) {
        return plataforma.executar(()->{
            plataforma.autorizar(ator,true);repository.bloquear(id);plataforma.autorizar(ator,true);localizar(id);
            if(!repository.retomar(id,versao))throw conflito();
            repository.auditar(id,ator,"RETOMADA",versao+1);return resumo(repository.buscar(id));
        });
    }
    private SolicitacaoProvisionamentoRepository.Registro localizar(UUID id) {
        var registro=repository.buscar(id);if(registro==null)throw new AuthFailure(404,"RECURSO_NAO_ENCONTRADO","Solicitação não encontrada.");return registro;
    }
    private static Resumo resumo(SolicitacaoProvisionamentoRepository.Registro r) {return new Resumo(r.id(),r.nome(),r.host(),r.estado(),r.versao(),r.falha());}
    private static AuthFailure conflito() {return new AuthFailure(409,"CONFLITO_PROVISIONAMENTO","Identificador, domínio, dados ou versão conflitantes. Consulte a solicitação antes de repetir.");}
}

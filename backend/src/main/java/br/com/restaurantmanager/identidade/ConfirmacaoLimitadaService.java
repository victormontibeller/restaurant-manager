package br.com.restaurantmanager.identidade;

import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Confirmações públicas não disputam a política empresarial depois de exceder a quota. */
@Service
public class ConfirmacaoLimitadaService {
    private final IdentidadeRepository identidades;
    private final TransactionTemplate transacoes;
    public ConfirmacaoLimitadaService(IdentidadeRepository identidades,PlatformTransactionManager manager) {
        this.identidades=identidades;this.transacoes=new TransactionTemplate(manager);this.transacoes.setTimeout(10);
    }
    @Transactional(propagation=Propagation.NEVER)
    public void executar(String chave,Runnable confirmacao) {
        // Duas transações sequenciais, sem conexão/lock retido entre elas.
        Integer tentativas=transacoes.execute(status->identidades.tentativa(IdentidadeService.hash(chave),Instant.now()));
        if(tentativas==null)throw new IllegalStateException("Limite de confirmação indisponível.");
        if(tentativas>30)throw new AuthFailure(429,"LIMITE_TENTATIVAS","Muitas tentativas. Aguarde quinze minutos.");
        transacoes.executeWithoutResult(status->confirmacao.run());
    }
}

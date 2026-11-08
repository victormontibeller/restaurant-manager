package br.com.restaurantmanager.pedidos.services;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.pedidos.dtos.AlterarPrazos;
import br.com.restaurantmanager.pedidos.dtos.PrazosAceite;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.repositories.PrazosAceiteRepository;
import br.com.restaurantmanager.unidades.services.FuncionamentoUnidadeService;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PrazosAceiteService {
    private final PrazosAceiteRepository repository;
    private final AcessosService acessos;
    private final FuncionamentoUnidadeService funcionamento;

    public PrazosAceiteService(PrazosAceiteRepository repository, AcessosService acessos, FuncionamentoUnidadeService funcionamento) {
        this.repository = repository;
        this.acessos = acessos;
        this.funcionamento = funcionamento;
    }

    @Transactional
    public PrazosAceite consultar(IdentidadeAtual ator, UUID unidade) {
        acessos.autorizarAdministrador(ator, false);
        if (unidade != null) funcionamento.consultar(ator, unidade);
        return repository.consultar(unidade);
    }

    @Transactional
    public PrazosAceite alterar(IdentidadeAtual ator, UUID unidade, AlterarPrazos pedido) {
        acessos.autorizarAdministrador(ator, true);
        if (unidade != null) funcionamento.consultar(ator, unidade);
        if (pedido.alertaSegundos() <= 0 || pedido.expiracaoSegundos() <= pedido.alertaSegundos()
                || pedido.expiracaoSegundos() > 86400 || (unidade == null && pedido.herdar())) {
            throw ErrosPedido.regra("O alerta deve ser positivo e anterior à expiração, limitada a 24 horas.");
        }
        PrazosAceite antes = repository.consultar(unidade);
        if (antes.versao() != pedido.versao()) throw ErrosPedido.conflito("Os prazos foram alterados. Recarregue antes de salvar.");
        PrazosAceite novos = new PrazosAceite(antes.versao() + 1, pedido.alertaSegundos(), pedido.expiracaoSegundos(), pedido.herdar());
        repository.salvar(unidade, novos);
        acessos.auditarConfiguracao(ator, unidade, "PRAZOS_ACEITE_ALTERADOS", antes.toString(), novos.toString());
        return repository.consultar(unidade);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public PrazosAceite paraEntrada(UUID unidade) {
        return repository.consultar(unidade);
    }
}

package br.com.restaurantmanager.delivery.services;

import br.com.restaurantmanager.delivery.dtos.EnderecoCliente;
import br.com.restaurantmanager.delivery.repositories.EnderecoClienteRepository;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(timeout = 20)
public class EnderecoClienteService {
    private final EnderecoClienteRepository repository;
    private final AcessosService acessos;

    public EnderecoClienteService(EnderecoClienteRepository repository, AcessosService acessos) {
        this.repository = repository;
        this.acessos = acessos;
    }

    public List<EnderecoCliente> listar(IdentidadeAtual ator, int pagina) {
        acessos.autorizarCliente(ator);
        if (pagina < 0 || pagina > 10000) throw ErrosPedido.regra("Página inválida.");
        return repository.listar(ator.usuarioId(), pagina);
    }

    public EnderecoCliente salvar(IdentidadeAtual ator, EnderecoCliente entrada) {
        repository.bloquear(entrada.id());
        acessos.autorizarCliente(ator);
        var atual = repository.consultar(entrada.id(), ator.usuarioId());
        if (atual.isEmpty() && repository.existe(entrada.id())) throw ErrosPedido.inexistente();
        if (entrada.descricao().chars().anyMatch(Character::isISOControl))
            throw ErrosPedido.regra("Descrição contém caracteres inválidos.");
        long versao = atual.map(EnderecoCliente::versao).orElse(0L);
        // Uma repetição equivalente recupera o estado salvo após perda de resposta.
        if (atual.isPresent()
                && atual.get().descricao().equals(entrada.descricao())
                && atual.get().endereco().equals(entrada.endereco())
                && atual.get().ativo() == entrada.ativo()) return atual.get();
        if (entrada.versao() != versao)
            throw ErrosPedido.conflito("O endereço mudou. Recarregue antes de salvar.");
        var novo =
                new EnderecoCliente(
                        entrada.id(),
                        versao + 1,
                        entrada.descricao(),
                        entrada.endereco(),
                        entrada.ativo());
        repository.salvar(ator.usuarioId(), novo);
        return novo;
    }
}

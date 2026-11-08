package br.com.restaurantmanager.carrinho.services;

import br.com.restaurantmanager.carrinho.dtos.Calcular;
import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.carrinho.dtos.Resumo;
import br.com.restaurantmanager.catalogo.exceptions.ErrosCatalogo;
import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.catalogo.services.CatalogoPublicoService;
import br.com.restaurantmanager.catalogo.services.RevisaoCatalogo;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CarrinhoService {
    private final CatalogoPublicoService catalogo;
    private final CalculadoraCarrinho calculadora;
    private final RevisaoCatalogo revisoes;

    public CarrinhoService(CatalogoPublicoService catalogo, CalculadoraCarrinho calculadora, RevisaoCatalogo revisoes) {
        this.catalogo = catalogo;
        this.calculadora = calculadora;
        this.revisoes = revisoes;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Resumo calcular(Calcular pedido) {
        return calcularAtual(pedido);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void bloquearParaPedido() {
        catalogo.bloquearParaPedido();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Resumo calcularParaPedido(Calcular pedido) {
        catalogo.bloquearParaPedido();
        return calcularAtual(pedido);
    }

    private Resumo calcularAtual(Calcular pedido) {
        var ids = new HashSet<UUID>();
        pedido.linhas().forEach(linha -> {
            if (!ids.add(linha.id())) throw ErrosCatalogo.regra("Cada linha do carrinho deve ter um identificador próprio.");
        });
        // Toda a cotação usa o mesmo snapshot PostgreSQL: composição, preços e funcionamento.
        var contexto = catalogo.paraCarrinho(pedido.unidadeId(), pedido.canal(), pedido.linhas().stream().map(Linha::produtoId).toList());
        if (!contexto.aberto()) {
            throw ErrosCatalogo.regra("A unidade está fechada para este canal. O carrinho não pode ser confirmado agora.");
        }
        var linhas = pedido.linhas().stream().map(linha -> calculadora.calcular(linha, contexto.produtos().get(linha.produtoId()))).toList();
        BigDecimal total = linhas.stream().map(linha -> new BigDecimal(linha.subtotal())).reduce(Dinheiro.ZERO, BigDecimal::add);
        String revisao = revisoes.gerar(contexto.revisao(), pedido.unidadeId(), pedido.canal(), linhas);
        return new Resumo(pedido.unidadeId(), pedido.canal(), "BRL", revisao, !revisao.equals(pedido.revisaoAnterior()),
                linhas, Dinheiro.texto(total), Dinheiro.texto(total));
    }
}

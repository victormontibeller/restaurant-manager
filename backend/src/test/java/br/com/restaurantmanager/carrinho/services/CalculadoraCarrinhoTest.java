package br.com.restaurantmanager.carrinho.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.carrinho.dtos.Escolha;
import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.carrinho.dtos.SelecaoAdicional;
import br.com.restaurantmanager.catalogo.dtos.Adicional;
import br.com.restaurantmanager.catalogo.dtos.GrupoPublico;
import br.com.restaurantmanager.catalogo.dtos.OpcaoPublica;
import br.com.restaurantmanager.catalogo.dtos.ProdutoPublico;
import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.catalogo.models.TipoProduto;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CalculadoraCarrinhoTest {
    private final CalculadoraCarrinho calculadora = new CalculadoraCarrinho();
    private final UUID produtoId = UUID.randomUUID();
    private final UUID grupoId = UUID.randomUUID();
    private final UUID opcaoId = UUID.randomUUID();
    private final UUID extraId = UUID.randomUUID();

    @Test
    void comboMultiplicaAcrescimoEAdicionalPorComponenteEQuantidadeComercial() {
        var produto = combo(1, 2, 2, true);
        var selecao = new Escolha(grupoId, opcaoId, 2, List.of(new SelecaoAdicional(extraId, 1)));

        var snapshot = calculadora.calcular(linha(3, List.of(selecao)), produto);

        assertThat(snapshot.precoBase()).isEqualTo("30.00");
        assertThat(snapshot.precoUnitario()).isEqualTo("46.00");
        assertThat(snapshot.subtotal()).isEqualTo("138.00");
        assertThat(snapshot.escolhas().getFirst().total()).isEqualTo("16.00");
        assertThat(snapshot.escolhas().getFirst().adicionais().getFirst().total()).isEqualTo("3.00");
    }

    @Test
    void configuracoesDistintasDaMesmaOpcaoMantemSnapshotsEContagemSomada() {
        var comExtra = new Escolha(grupoId, opcaoId, 1, List.of(new SelecaoAdicional(extraId, 1)));
        var semExtra = new Escolha(grupoId, opcaoId, 1, List.of());

        var snapshot = calculadora.calcular(linha(2, List.of(comExtra, semExtra)), combo(2, 2, 2, true));

        assertThat(snapshot.precoUnitario()).isEqualTo("43.00");
        assertThat(snapshot.subtotal()).isEqualTo("86.00");
        assertThat(snapshot.escolhas()).hasSize(2);
        assertThat(snapshot.escolhas().getFirst().adicionais()).hasSize(1);
        assertThat(snapshot.escolhas().getLast().adicionais()).isEmpty();
        assertThatThrownBy(() -> calculadora.calcular(linha(1, List.of(comExtra, semExtra)), combo(1, 2, 1, true)))
                .isInstanceOf(AuthFailure.class).hasMessageContaining("limite da opção");
    }

    @Test
    void exemploComDuasOpcoesECadaAcrescimoResultaEmQuarenta() {
        var primeira = combo(2, 2, 1, true);
        var bebidaId = UUID.randomUUID();
        var bebida = new OpcaoPublica(bebidaId, UUID.randomUUID(), "Bebida", "2.00", 1, List.of(), true, List.of());
        var opcoes = List.of(primeira.grupos().getFirst().opcoes().getFirst(), bebida);
        var produto = produto(TipoProduto.COMBO, "30.00", List.of(), List.of(new GrupoPublico(grupoId, "Escolhas", 2, 2, opcoes)));
        var escolhas = List.of(new Escolha(grupoId, opcaoId, 1, List.of(new SelecaoAdicional(extraId, 1))),
                new Escolha(grupoId, bebidaId, 1, List.of()));

        var snapshot = calculadora.calcular(linha(2, escolhas), produto);

        assertThat(snapshot.precoUnitario()).isEqualTo("40.00");
        assertThat(snapshot.subtotal()).isEqualTo("80.00");
    }

    @Test
    void gruposMinimosEMaximosSaoValidadosPorUnidadeComercial() {
        var escolha = new Escolha(grupoId, opcaoId, 2, List.of());
        assertThatThrownBy(() -> calculadora.calcular(linha(99, List.of()), combo(1, 2, 2, true)))
                .isInstanceOf(AuthFailure.class).hasMessageContaining("limites do grupo");
        assertThatThrownBy(() -> calculadora.calcular(linha(1, List.of(escolha)), combo(0, 1, 2, true)))
                .isInstanceOf(AuthFailure.class).hasMessageContaining("limites do grupo");
    }

    @Test
    void opcaoIndisponivelNaoEsubstituidaNemCobrada() {
        var escolha = new Escolha(grupoId, opcaoId, 1, List.of());
        assertThatThrownBy(() -> calculadora.calcular(linha(1, List.of(escolha)), combo(1, 2, 2, false)))
                .isInstanceOf(AuthFailure.class).hasMessageContaining("Escolha outra opção explicitamente");
    }

    @Test
    void referenciaAlheiaEAdicionaisDuplicadosOuExcessivosSaoRecusados() {
        var produto = combo(1, 2, 2, true);
        for (var escolhas : List.of(
                List.of(new Escolha(UUID.randomUUID(), opcaoId, 1, List.of())),
                List.of(new Escolha(grupoId, UUID.randomUUID(), 1, List.of())),
                List.of(new Escolha(grupoId, opcaoId, 1, List.of(new SelecaoAdicional(UUID.randomUUID(), 1)))))) {
            assertThatThrownBy(() -> calculadora.calcular(linha(1, escolhas), produto))
                    .isInstanceOfSatisfying(AuthFailure.class, ex -> assertThat(ex.status()).isEqualTo(404));
        }
        var duplicado = List.of(new SelecaoAdicional(extraId, 1), new SelecaoAdicional(extraId, 1));
        assertThatThrownBy(() -> calculadora.calcular(linha(1, List.of(new Escolha(grupoId, opcaoId, 1, duplicado))), produto))
                .isInstanceOf(AuthFailure.class).hasMessageContaining("Não repita");
        assertThatThrownBy(() -> calculadora.calcular(linha(1, List.of(new Escolha(grupoId, opcaoId, 1,
                List.of(new SelecaoAdicional(extraId, 3))))), produto))
                .isInstanceOf(AuthFailure.class).hasMessageContaining("limite permitido");
    }

    @Test
    void simplesUsaPrecisaoDecimalSemArredondamentoEConfigIncompativelERecusada() {
        var extra = new Adicional(extraId, "Extra", "0.20", 2, true);
        var produto = produto(TipoProduto.SIMPLES, "0.10", List.of(extra), List.of());
        var linha = new Linha(UUID.randomUUID(), produtoId, 3, List.of(new SelecaoAdicional(extraId, 1)), List.of());
        assertThat(calculadora.calcular(linha, produto).subtotal()).isEqualTo("0.90");
        assertThatThrownBy(() -> calculadora.calcular(linha(1, List.of(new Escolha(grupoId, opcaoId, 1, List.of()))), produto))
                .isInstanceOf(AuthFailure.class).hasMessageContaining("Produto simples");
        assertThatThrownBy(() -> calculadora.calcular(linha, combo(1, 2, 2, true)))
                .isInstanceOf(AuthFailure.class).hasMessageContaining("opções permitidas");
    }

    @Test
    void dinheiroRejeitaPrecisaoNegativosNotacaoCientificaEVariosFormatos() {
        for (String invalido : List.of("1.001", "-1", "1000000", "NaN", "1e2", "1,00", " 1.00", "01.00", ".5")) {
            assertThatThrownBy(() -> Dinheiro.ler(invalido)).isInstanceOf(AuthFailure.class);
        }
        assertThat(Dinheiro.texto(Dinheiro.ler("999999.99"))).isEqualTo("999999.99");
        assertThat(Dinheiro.texto(Dinheiro.ler("0"))).isEqualTo("0.00");
    }

    private ProdutoPublico combo(int minimo, int maximo, int limite, boolean disponivel) {
        var extra = new Adicional(extraId, "Queijo", "3.00", 2, true);
        var opcao = new OpcaoPublica(opcaoId, UUID.randomUUID(), "Hambúrguer", "5.00", limite, List.of(extraId), disponivel, List.of(extra));
        return produto(TipoProduto.COMBO, "30.00", List.of(), List.of(new GrupoPublico(grupoId, "Lanches", minimo, maximo, List.of(opcao))));
    }

    private ProdutoPublico produto(TipoProduto tipo, String preco, List<Adicional> adicionais, List<GrupoPublico> grupos) {
        return new ProdutoPublico(produtoId, 0, "Produto", "", UUID.randomUUID(), tipo, false, null, preco, true, adicionais, grupos);
    }

    private Linha linha(int quantidade, List<Escolha> escolhas) {
        return new Linha(UUID.randomUUID(), produtoId, quantidade, List.of(), escolhas);
    }
}

package br.com.restaurantmanager.pedidos.dtos;

import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record EnviarPedido(
        @NotNull UUID intencaoId,
        @NotNull UUID unidadeId,
        @NotNull CanalAtendimento canal,
        UUID comandaId,
        @NotNull @Pattern(regexp = "[a-f0-9]{64}") String revisao,
        @NotNull @Size(min = 1, max = 50) List<@NotNull @Valid Linha> linhas,
        @Size(max = 500) String observacao,
        @Valid EnderecoEntrega endereco,
        @Pattern(regexp = "[a-f0-9]{64}") String revisaoDelivery,
        @Pattern(regexp = "PRESENCIAL|ONLINE") String pagamento) {
    public EnviarPedido {
        pagamento = pagamento == null ? "PRESENCIAL" : pagamento;
    }

    public EnviarPedido(
            UUID intencaoId,
            UUID unidadeId,
            CanalAtendimento canal,
            UUID comandaId,
            String revisao,
            List<Linha> linhas,
            String observacao,
            EnderecoEntrega endereco,
            String revisaoDelivery) {
        this(
                intencaoId,
                unidadeId,
                canal,
                comandaId,
                revisao,
                linhas,
                observacao,
                endereco,
                revisaoDelivery,
                "PRESENCIAL");
    }

    public EnviarPedido(
            UUID intencaoId,
            UUID unidadeId,
            CanalAtendimento canal,
            UUID comandaId,
            String revisao,
            List<Linha> linhas,
            String observacao,
            EnderecoEntrega endereco) {
        this(intencaoId, unidadeId, canal, comandaId, revisao, linhas, observacao, endereco, null);
    }
}

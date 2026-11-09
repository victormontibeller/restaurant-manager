package br.com.restaurantmanager.pagamentos.infrastructure;

import br.com.restaurantmanager.pagamentos.dtos.CredencialPagamento;
import br.com.restaurantmanager.pagamentos.dtos.SituacaoProvedor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface GatewayPagamento {
    String autorizacao(String state, String desafio, String retorno);

    CredencialPagamento autorizar(String code, String verificador, String retorno);

    CredencialPagamento renovar(CredencialPagamento anterior);

    SituacaoProvedor criar(
            CredencialPagamento credencial, UUID intencao, String valor, int prazo, String retorno);

    void cancelar(CredencialPagamento credencial, String externoId, UUID intencao);

    SituacaoProvedor consultar(CredencialPagamento credencial, String externoId);

    List<SituacaoProvedor> buscar(CredencialPagamento credencial, UUID intencao, Instant inicio);

    SituacaoProvedor devolver(
            CredencialPagamento credencial,
            String externoId,
            String transacaoId,
            String valor,
            UUID intencao);
}

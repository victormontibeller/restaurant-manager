package br.com.restaurantmanager.delivery.dtos;

import br.com.restaurantmanager.pedidos.dtos.EnderecoEntrega;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record EnderecoCliente(
        @NotNull UUID id,
        @Min(0) long versao,
        @NotBlank @Size(max = 100) String descricao,
        @NotNull @Valid EnderecoEntrega endereco,
        boolean ativo) {}

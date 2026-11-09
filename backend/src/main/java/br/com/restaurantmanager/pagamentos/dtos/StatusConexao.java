package br.com.restaurantmanager.pagamentos.dtos;

import java.time.Instant;
import java.util.UUID;

public record StatusConexao(UUID id, String vendedor, boolean reautorizar, Instant expiraEm) {}

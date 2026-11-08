package br.com.restaurantmanager.eventos.dtos;

import java.time.Instant;
import java.util.UUID;

public record EventoOperacionalResposta(String id, String tipo, UUID pedidoId, UUID comandaId, Instant ocorridoEm) {}

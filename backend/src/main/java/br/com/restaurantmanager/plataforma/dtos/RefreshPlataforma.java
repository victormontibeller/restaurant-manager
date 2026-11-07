package br.com.restaurantmanager.plataforma.dtos;

import java.time.Instant;
import java.util.UUID;

public record RefreshPlataforma(UUID sessao, Instant usado) {}

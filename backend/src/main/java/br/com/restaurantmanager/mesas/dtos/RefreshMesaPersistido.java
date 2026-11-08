package br.com.restaurantmanager.mesas.dtos;

import java.time.Instant;
import java.util.UUID;

public record RefreshMesaPersistido(UUID sessaoId, Instant usadoEm) {}

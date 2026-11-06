package br.com.restaurantmanager.identidade;

import java.util.UUID;

/** Identidade mínima; permissões e vínculos são consultados em cada operação. */
public record IdentidadeAtual(UUID usuarioId, UUID sessaoId, UUID empresaId, String perfil, boolean emailVerificado) {}

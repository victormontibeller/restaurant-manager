package br.com.restaurantmanager.mesas.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record AutorizarMesa(@NotNull UUID mesaId, @Pattern(regexp = "[A-Z2-7]{10}") @NotNull String codigo) {
    @Override
    public String toString() {
        return "AutorizarMesa[protegido]";
    }
}

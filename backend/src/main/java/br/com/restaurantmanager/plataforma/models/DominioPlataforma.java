package br.com.restaurantmanager.plataforma.models;

/** Origem SaaS reservada, compartilhada pelo HTTP e pelos comandos privilegiados. */
public record DominioPlataforma(String host) {
    public static final String PADRAO = "plataforma.localhost";
    public static final String CONFIGURACAO = "${rm.platform.host:" + PADRAO + "}";

    public DominioPlataforma {
        if (host == null || !host.matches("[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?")) {
            throw new IllegalArgumentException("Domínio SaaS inválido.");
        }
    }

    public boolean reservado(String dominio) {
        return host.equalsIgnoreCase(dominio);
    }

    public void exigirDisponivel(String dominio) {
        if (reservado(dominio)) {
            throw new IllegalArgumentException("Domínio indisponível para empresa.");
        }
    }
}

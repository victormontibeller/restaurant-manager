package br.com.restaurantmanager.plataforma;

/** Origem SaaS reservada, compartilhada pelo HTTP e pelos comandos privilegiados. */
record DominioPlataforma(String host) {
    static final String PADRAO = "plataforma.localhost";
    static final String CONFIGURACAO = "${rm.platform.host:" + PADRAO + "}";

    DominioPlataforma {
        if (host == null || !host.matches("[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?")) {
            throw new IllegalArgumentException("Domínio SaaS inválido.");
        }
    }

    boolean reservado(String dominio) { return host.equalsIgnoreCase(dominio); }

    void exigirDisponivel(String dominio) {
        if (reservado(dominio)) throw new IllegalArgumentException("Domínio indisponível para empresa.");
    }
}

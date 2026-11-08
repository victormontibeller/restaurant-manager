CREATE TABLE fluxo_operacional (
    chave varchar(140) PRIMARY KEY,
    unidade_id uuid NOT NULL REFERENCES unidade(id),
    sequencia bigint NOT NULL DEFAULT 0 CHECK (sequencia >= 0)
);
CREATE TABLE evento_operacional (
    fluxo varchar(140) NOT NULL REFERENCES fluxo_operacional(chave),
    sequencia bigint NOT NULL CHECK (sequencia > 0),
    tipo varchar(80) NOT NULL,
    pedido_id uuid REFERENCES pedido(id),
    comanda_id uuid REFERENCES comanda(id),
    ocorrido_em timestamptz NOT NULL,
    PRIMARY KEY (fluxo, sequencia)
);
REVOKE ALL ON fluxo_operacional, evento_operacional FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON fluxo_operacional TO ${runtimeRole};
GRANT SELECT, INSERT ON evento_operacional TO ${runtimeRole};

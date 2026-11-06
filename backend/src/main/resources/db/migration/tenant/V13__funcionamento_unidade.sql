-- Horários semanais próprios da unidade; nenhum canal é habilitado por migração.
CREATE TABLE funcionamento_unidade (
    unidade_id uuid PRIMARY KEY REFERENCES unidade(id),
    versao bigint NOT NULL CHECK (versao >= 0),
    delivery boolean NOT NULL DEFAULT false,
    retirada boolean NOT NULL DEFAULT false,
    mesa boolean NOT NULL DEFAULT false
);

CREATE TABLE horario_unidade (
    unidade_id uuid NOT NULL REFERENCES funcionamento_unidade(unidade_id),
    canal varchar(8) NOT NULL CHECK (canal IN ('DELIVERY', 'RETIRADA', 'MESA')),
    dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    inicio_minuto smallint NOT NULL CHECK (inicio_minuto BETWEEN 0 AND 1439),
    fim_minuto smallint NOT NULL CHECK (fim_minuto BETWEEN 1 AND 2880),
    CHECK (fim_minuto > inicio_minuto AND fim_minuto - inicio_minuto <= 1440),
    PRIMARY KEY (unidade_id, canal, dia_semana, inicio_minuto)
);

REVOKE ALL ON funcionamento_unidade, horario_unidade FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON funcionamento_unidade TO ${runtimeRole};
GRANT SELECT, INSERT, DELETE ON horario_unidade TO ${runtimeRole};

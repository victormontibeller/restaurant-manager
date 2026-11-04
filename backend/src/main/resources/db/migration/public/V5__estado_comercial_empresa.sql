ALTER TABLE sessao_plataforma ADD COLUMN reautenticada_em timestamptz;

CREATE TABLE auditoria_estado_empresa (
    id uuid PRIMARY KEY,
    empresa_id uuid NOT NULL REFERENCES empresa(id),
    operador_id uuid NOT NULL REFERENCES usuario_plataforma(id),
    sessao_id uuid NOT NULL,
    anterior varchar(20) NOT NULL CHECK (anterior IN ('ATIVO','SUSPENSO')),
    novo varchar(20) NOT NULL CHECK (novo IN ('ATIVO','SUSPENSO') AND novo <> anterior),
    versao bigint NOT NULL CHECK (versao > 0),
    motivo varchar(240) NOT NULL CHECK (length(btrim(motivo)) > 0),
    ocorrido_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (empresa_id,versao)
);
-- A auditoria sobrevive ao expurgo técnico da sessão e não contém credenciais.
REVOKE ALL ON auditoria_estado_empresa FROM PUBLIC;
GRANT INSERT ON auditoria_estado_empresa TO ${runtimeRole};
-- Sem poder alterar domínio, nome, schema ou provisionar pelo runtime.
GRANT UPDATE(estado,versao) ON empresa TO ${runtimeRole};

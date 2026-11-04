CREATE TABLE empresa (
    id uuid PRIMARY KEY,
    nome varchar(120) NOT NULL,
    schema_name varchar(63) NOT NULL UNIQUE CHECK (schema_name ~ '^t_[a-f0-9]{32}$'),
    estado varchar(20) NOT NULL CHECK (estado IN ('PROVISIONANDO','ATIVO','FALHOU','SUSPENSO')),
    versao bigint NOT NULL DEFAULT 0
);
CREATE TABLE dominio (
    host varchar(253) PRIMARY KEY CHECK (host = lower(host)),
    empresa_id uuid NOT NULL REFERENCES empresa(id)
);
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT SELECT ON empresa, dominio TO ${runtimeRole};

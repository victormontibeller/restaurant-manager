CREATE TABLE unidade (
    id uuid PRIMARY KEY,
    nome varchar(120) NOT NULL,
    fuso varchar(60) NOT NULL DEFAULT 'America/Sao_Paulo',
    ativa boolean NOT NULL DEFAULT true,
    versao bigint NOT NULL DEFAULT 0
);
REVOKE ALL ON ALL TABLES IN SCHEMA ${flyway:defaultSchema} FROM PUBLIC;
GRANT USAGE ON SCHEMA ${flyway:defaultSchema} TO ${runtimeRole};
GRANT SELECT, INSERT, UPDATE ON unidade TO ${runtimeRole};

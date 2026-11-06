CREATE TABLE cadastro_cliente (
    hash varchar(64) PRIMARY KEY,
    email varchar(254) NOT NULL CHECK (email=lower(email)),
    expira_em timestamptz NOT NULL,
    consumido_em timestamptz
);
CREATE INDEX cadastro_cliente_email ON cadastro_cliente(email);
CREATE INDEX cadastro_cliente_expiracao ON cadastro_cliente(expira_em,hash);
REVOKE ALL ON cadastro_cliente FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON cadastro_cliente TO ${runtimeRole};
ALTER TABLE email_identidade DROP CONSTRAINT email_identidade_tipo_check;
ALTER TABLE email_identidade ADD CONSTRAINT email_identidade_tipo_check
    CHECK (tipo IN ('SOLICITACAO','RECUPERACAO','AVISO','CADASTRO_SOLICITADO','CADASTRO'));

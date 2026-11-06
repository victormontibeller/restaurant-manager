CREATE TABLE verificacao_email (
    hash varchar(64) PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES usuario(id),
    email varchar(254) NOT NULL CHECK (email=lower(email)),
    expira_em timestamptz NOT NULL,
    consumido_em timestamptz
);
CREATE INDEX verificacao_email_usuario ON verificacao_email(usuario_id);
CREATE INDEX verificacao_email_expiracao ON verificacao_email(expira_em,hash);
REVOKE ALL ON verificacao_email FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON verificacao_email TO ${runtimeRole};
ALTER TABLE email_identidade DROP CONSTRAINT email_identidade_tipo_check;
ALTER TABLE email_identidade ADD CONSTRAINT email_identidade_tipo_check
    CHECK (tipo IN ('SOLICITACAO','RECUPERACAO','AVISO','CADASTRO_SOLICITADO','CADASTRO','CONVITE','VERIFICAR','VERIFICACAO'));

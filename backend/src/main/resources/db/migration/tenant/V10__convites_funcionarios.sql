CREATE TABLE convite_funcionario (
    id uuid PRIMARY KEY,
    autor_id uuid NOT NULL REFERENCES usuario(id),
    email varchar(254) NOT NULL CHECK (email=lower(email)),
    perfil varchar(20) NOT NULL CHECK (perfil IN ('ADMINISTRADOR','GERENTE','ATENDIMENTO','CAIXA','COZINHA','EXPEDICAO')),
    unidades varchar(3700) NOT NULL,
    codigo_hash varchar(64) UNIQUE,
    criado_em timestamptz NOT NULL,
    expira_em timestamptz NOT NULL,
    aceito_em timestamptz,
    revogado_em timestamptz,
    CHECK (aceito_em IS NULL OR revogado_em IS NULL),
    CHECK (perfil <> 'ADMINISTRADOR' OR unidades='')
);
CREATE INDEX convite_funcionario_email ON convite_funcionario(email);
CREATE INDEX convite_funcionario_expiracao ON convite_funcionario(expira_em,id) WHERE codigo_hash IS NOT NULL;
CREATE INDEX convite_funcionario_autor ON convite_funcionario(autor_id,criado_em);
REVOKE ALL ON convite_funcionario FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON convite_funcionario TO ${runtimeRole};
ALTER TABLE email_identidade DROP CONSTRAINT email_identidade_tipo_check;
ALTER TABLE email_identidade ADD CONSTRAINT email_identidade_tipo_check
    CHECK (tipo IN ('SOLICITACAO','RECUPERACAO','AVISO','CADASTRO_SOLICITADO','CADASTRO','CONVITE'));

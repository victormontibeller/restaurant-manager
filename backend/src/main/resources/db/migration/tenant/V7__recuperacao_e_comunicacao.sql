CREATE TABLE recuperacao_senha (
    hash varchar(64) PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES usuario(id),
    expira_em timestamptz NOT NULL,
    consumido_em timestamptz
);
CREATE INDEX recuperacao_usuario ON recuperacao_senha(usuario_id);
CREATE TABLE email_identidade (
    id uuid PRIMARY KEY,
    tipo varchar(20) NOT NULL CHECK (tipo IN ('SOLICITACAO','RECUPERACAO','AVISO')),
    estado varchar(20) NOT NULL CHECK (estado IN ('PENDENTE','PROCESSANDO','CAPTURADO','IGNORADO','EXPIRADO','FALHOU')),
    conteudo_cifrado text,
    expira_em timestamptz NOT NULL,
    proxima_em timestamptz NOT NULL,
    lease uuid,
    tentativas integer NOT NULL DEFAULT 0 CHECK (tentativas BETWEEN 0 AND 5)
);
CREATE INDEX email_identidade_pendente ON email_identidade(estado,proxima_em);
REVOKE ALL ON recuperacao_senha, email_identidade FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON recuperacao_senha, email_identidade TO ${runtimeRole};

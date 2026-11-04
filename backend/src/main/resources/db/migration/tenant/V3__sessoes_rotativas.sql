CREATE TABLE sessao (
    id uuid PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES usuario(id),
    criada_em timestamptz NOT NULL,
    expira_em timestamptz NOT NULL,
    revogada_em timestamptz,
    autenticada_em timestamptz NOT NULL,
    CHECK (expira_em > criada_em)
);
CREATE INDEX sessao_usuario ON sessao(usuario_id);
CREATE TABLE refresh_token (
    hash varchar(64) PRIMARY KEY,
    sessao_id uuid NOT NULL REFERENCES sessao(id),
    usado_em timestamptz
);
CREATE INDEX refresh_sessao ON refresh_token(sessao_id);
CREATE TABLE limite_login (
    chave varchar(64) PRIMARY KEY,
    tentativas integer NOT NULL CHECK (tentativas >= 0),
    inicio_em timestamptz NOT NULL
);
REVOKE ALL ON sessao, refresh_token, limite_login FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON sessao, refresh_token, limite_login TO ${runtimeRole};

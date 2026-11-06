CREATE TABLE usuario_plataforma (
    id uuid PRIMARY KEY,
    email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
    senha_hash varchar(100) NOT NULL,
    ativo boolean NOT NULL DEFAULT true
);
CREATE TABLE sessao_plataforma (
    id uuid PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES usuario_plataforma(id),
    criada_em timestamptz NOT NULL,
    expira_em timestamptz NOT NULL,
    revogada_em timestamptz,
    CHECK (expira_em > criada_em)
);
CREATE INDEX sessao_plataforma_usuario ON sessao_plataforma(usuario_id);
CREATE INDEX sessao_plataforma_expiracao ON sessao_plataforma(expira_em);
CREATE TABLE refresh_plataforma (
    hash varchar(64) PRIMARY KEY CHECK (hash ~ '^[a-f0-9]{64}$'),
    sessao_id uuid NOT NULL REFERENCES sessao_plataforma(id) ON DELETE CASCADE,
    usado_em timestamptz
);
CREATE INDEX refresh_plataforma_sessao ON refresh_plataforma(sessao_id);
CREATE TABLE limite_plataforma (
    chave varchar(64) PRIMARY KEY,
    tentativas integer NOT NULL CHECK (tentativas > 0),
    inicio_em timestamptz NOT NULL
);
CREATE TABLE auditoria_plataforma (
    id uuid PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES usuario_plataforma(id),
    evento varchar(40) NOT NULL CHECK (evento IN ('LOGIN','LOGOUT','REUSO_REFRESH')),
    criado_em timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON usuario_plataforma,sessao_plataforma,refresh_plataforma,limite_plataforma,auditoria_plataforma FROM PUBLIC;
GRANT SELECT ON usuario_plataforma TO ${runtimeRole};
GRANT SELECT,INSERT,UPDATE,DELETE ON sessao_plataforma,refresh_plataforma,limite_plataforma TO ${runtimeRole};
GRANT INSERT ON auditoria_plataforma TO ${runtimeRole};

CREATE TABLE usuario (
    id uuid PRIMARY KEY,
    email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
    senha_hash varchar(100) NOT NULL,
    perfil varchar(20) NOT NULL CHECK (perfil IN ('ADMINISTRADOR','GERENTE','ATENDIMENTO','CAIXA','COZINHA','EXPEDICAO','CLIENTE')),
    ativo boolean NOT NULL DEFAULT true,
    email_verificado boolean NOT NULL DEFAULT false,
    versao bigint NOT NULL DEFAULT 0,
    criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE usuario_unidade (
    usuario_id uuid NOT NULL REFERENCES usuario(id),
    unidade_id uuid NOT NULL REFERENCES unidade(id),
    PRIMARY KEY (usuario_id, unidade_id)
);
CREATE TABLE politica_acesso (
    id integer PRIMARY KEY CHECK (id = 1),
    versao bigint NOT NULL DEFAULT 0
);
INSERT INTO politica_acesso(id) VALUES (1);
CREATE TABLE permissao_perfil (
    perfil varchar(20) NOT NULL CHECK (perfil IN ('GERENTE','ATENDIMENTO','CAIXA','COZINHA','EXPEDICAO')),
    acao varchar(80) NOT NULL,
    PRIMARY KEY (perfil, acao)
);
REVOKE ALL ON usuario, usuario_unidade, politica_acesso, permissao_perfil FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON usuario, politica_acesso TO ${runtimeRole};
GRANT SELECT, INSERT, UPDATE, DELETE ON usuario_unidade, permissao_perfil TO ${runtimeRole};

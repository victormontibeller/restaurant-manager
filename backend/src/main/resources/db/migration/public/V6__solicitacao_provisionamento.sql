-- A API solicita; somente o processo privilegiado cria schemas e ativa empresas.
CREATE TABLE solicitacao_provisionamento (
    id uuid PRIMARY KEY,
    operador_id uuid NOT NULL REFERENCES usuario_plataforma(id),
    nome varchar(120) NOT NULL,
    host varchar(253) NOT NULL UNIQUE,
    unidade_nome varchar(120) NOT NULL,
    administrador_email varchar(254) NOT NULL,
    administrador_senha_hash varchar(100) NOT NULL,
    estado varchar(20) NOT NULL DEFAULT 'SOLICITADO' CHECK (estado IN ('SOLICITADO','CONCLUIDO','FALHOU')),
    versao bigint NOT NULL DEFAULT 0 CHECK (versao >= 0),
    ultima_falha varchar(60),
    criado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    atualizado_em timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX solicitacao_provisionamento_pendente ON solicitacao_provisionamento(criado_em,id) WHERE estado='SOLICITADO';
CREATE TABLE auditoria_solicitacao_provisionamento (
    id uuid PRIMARY KEY,
    solicitacao_id uuid NOT NULL REFERENCES solicitacao_provisionamento(id),
    operador_id uuid NOT NULL REFERENCES usuario_plataforma(id),
    sessao_id uuid NOT NULL,
    evento varchar(20) NOT NULL CHECK (evento IN ('SOLICITADO','RETOMADA')),
    versao bigint NOT NULL,
    ocorrido_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(solicitacao_id,versao)
);
REVOKE ALL ON solicitacao_provisionamento, auditoria_solicitacao_provisionamento FROM PUBLIC;
GRANT SELECT, INSERT ON solicitacao_provisionamento TO ${runtimeRole};
GRANT UPDATE(estado,versao,ultima_falha,atualizado_em) ON solicitacao_provisionamento TO ${runtimeRole};
GRANT INSERT ON auditoria_solicitacao_provisionamento TO ${runtimeRole};
-- Não concede DDL, acesso ao plano privilegiado nem criação direta de empresa/domínio.

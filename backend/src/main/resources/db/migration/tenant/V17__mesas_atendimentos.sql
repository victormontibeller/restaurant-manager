CREATE TABLE mesa (
 id uuid PRIMARY KEY, unidade_id uuid NOT NULL REFERENCES unidade(id),
 nome varchar(80) NOT NULL CHECK (length(trim(nome)) > 0), ativa boolean NOT NULL DEFAULT true,
 versao bigint NOT NULL DEFAULT 0 CHECK (versao >= 0), UNIQUE (id, unidade_id), UNIQUE (unidade_id, nome)
);
CREATE TABLE atendimento (
 id uuid PRIMARY KEY, mesa_id uuid NOT NULL, unidade_id uuid NOT NULL,
 intencao_id uuid NOT NULL UNIQUE, autor_id uuid NOT NULL REFERENCES usuario(id),
 codigo_hash char(64) NOT NULL, codigo_expira_em timestamptz NOT NULL,
 aberto_em timestamptz NOT NULL, encerrado_em timestamptz,
 FOREIGN KEY (mesa_id,unidade_id) REFERENCES mesa(id,unidade_id), UNIQUE (id,unidade_id)
);
CREATE UNIQUE INDEX atendimento_mesa_ativo ON atendimento(mesa_id) WHERE encerrado_em IS NULL;
CREATE TABLE comanda (
 id uuid PRIMARY KEY, atendimento_id uuid NOT NULL UNIQUE, unidade_id uuid NOT NULL,
 estado varchar(20) NOT NULL DEFAULT 'ABERTA' CHECK (estado IN ('ABERTA','EM_FECHAMENTO','FECHADA')),
 versao bigint NOT NULL DEFAULT 0 CHECK (versao >= 0),
 FOREIGN KEY (atendimento_id,unidade_id) REFERENCES atendimento(id,unidade_id), UNIQUE (id,unidade_id)
);
CREATE TABLE participante_mesa (
 id uuid PRIMARY KEY, atendimento_id uuid NOT NULL REFERENCES atendimento(id), criado_em timestamptz NOT NULL,
 UNIQUE (id,atendimento_id)
);
CREATE TABLE sessao_mesa (
 id uuid PRIMARY KEY, participante_id uuid NOT NULL REFERENCES participante_mesa(id),
 expira_em timestamptz NOT NULL, revogada_em timestamptz
);
CREATE TABLE refresh_mesa (
 hash char(64) PRIMARY KEY, sessao_id uuid NOT NULL REFERENCES sessao_mesa(id), usado_em timestamptz
);
CREATE INDEX sessao_mesa_participante ON sessao_mesa(participante_id);
CREATE INDEX refresh_mesa_sessao ON refresh_mesa(sessao_id);
CREATE TABLE tentativa_mesa (
 chave char(64) PRIMARY KEY, inicio timestamptz NOT NULL, quantidade integer NOT NULL CHECK (quantidade > 0)
);
CREATE TABLE solicitacao_mesa (
 id uuid PRIMARY KEY, intencao_id uuid NOT NULL UNIQUE, comanda_id uuid NOT NULL REFERENCES comanda(id),
 participante_id uuid NOT NULL REFERENCES participante_mesa(id),
 tipo varchar(10) NOT NULL CHECK (tipo IN ('AJUDA','CONTA')),
 estado varchar(10) NOT NULL DEFAULT 'PENDENTE' CHECK (estado IN ('PENDENTE','ATENDIDA')),
 criada_em timestamptz NOT NULL, atendida_em timestamptz, atendida_por uuid REFERENCES usuario(id),
 versao bigint NOT NULL DEFAULT 0 CHECK (versao >= 0)
);
CREATE INDEX solicitacao_mesa_comanda ON solicitacao_mesa(comanda_id,estado,criada_em);
REVOKE ALL ON mesa,atendimento,comanda,participante_mesa,sessao_mesa,refresh_mesa,tentativa_mesa,solicitacao_mesa FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON mesa,atendimento,comanda,participante_mesa,sessao_mesa,refresh_mesa,tentativa_mesa,solicitacao_mesa TO ${runtimeRole};

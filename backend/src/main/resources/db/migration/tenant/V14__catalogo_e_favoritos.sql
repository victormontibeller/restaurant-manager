CREATE TABLE catalogo_revisao (
    id smallint PRIMARY KEY CHECK (id = 1),
    versao bigint NOT NULL CHECK (versao >= 0)
);
INSERT INTO catalogo_revisao VALUES (1, 0);

CREATE TABLE categoria (
    id uuid PRIMARY KEY,
    nome varchar(120) NOT NULL CHECK (length(trim(nome)) > 0),
    ativa boolean NOT NULL,
    versao bigint NOT NULL CHECK (versao >= 0),
    criacao_ator uuid NOT NULL REFERENCES usuario(id),
    criacao_payload text NOT NULL
);

-- A configuração de adicionais e grupos pertence ao agregado versionado Produto.
-- Referências dos componentes são validadas na mesma transação serializada de escrita.
CREATE TABLE produto (
    id uuid PRIMARY KEY,
    nome varchar(120) NOT NULL CHECK (length(trim(nome)) > 0),
    descricao varchar(2000) NOT NULL,
    categoria_id uuid NOT NULL REFERENCES categoria(id),
    tipo varchar(8) NOT NULL CHECK (tipo IN ('SIMPLES', 'COMBO')),
    ativo boolean NOT NULL,
    sugerido boolean NOT NULL,
    midia_id uuid,
    versao bigint NOT NULL CHECK (versao >= 0),
    adicionais jsonb NOT NULL CHECK (jsonb_typeof(adicionais) = 'array' AND jsonb_array_length(adicionais) <= 20),
    grupos jsonb NOT NULL CHECK (jsonb_typeof(grupos) = 'array' AND jsonb_array_length(grupos) <= 10),
    criacao_ator uuid NOT NULL REFERENCES usuario(id),
    criacao_payload text NOT NULL,
    CHECK ((tipo = 'SIMPLES' AND jsonb_array_length(grupos) = 0)
        OR (tipo = 'COMBO' AND jsonb_array_length(grupos) >= 1 AND jsonb_array_length(adicionais) = 0))
);
CREATE INDEX produto_categoria ON produto(categoria_id, ativo, nome, id);
CREATE INDEX produto_listagem ON produto(ativo, nome, id);

CREATE TABLE produto_unidade (
    produto_id uuid NOT NULL REFERENCES produto(id),
    unidade_id uuid NOT NULL REFERENCES unidade(id),
    versao bigint NOT NULL CHECK (versao >= 1),
    preco numeric(8,2) NOT NULL CHECK (preco BETWEEN 0 AND 999999.99),
    disponivel boolean NOT NULL,
    delivery boolean NOT NULL,
    retirada boolean NOT NULL,
    mesa boolean NOT NULL,
    PRIMARY KEY (produto_id, unidade_id)
);
CREATE INDEX produto_unidade_unidade ON produto_unidade(unidade_id, produto_id);

CREATE TABLE favorito (
    usuario_id uuid NOT NULL REFERENCES usuario(id),
    produto_id uuid NOT NULL REFERENCES produto(id),
    criado_em timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, produto_id)
);

CREATE TABLE auditoria_catalogo (
    id uuid PRIMARY KEY,
    ator_id uuid NOT NULL REFERENCES usuario(id),
    recurso_id uuid NOT NULL,
    unidade_id uuid REFERENCES unidade(id),
    evento varchar(40) NOT NULL,
    antes jsonb,
    depois jsonb NOT NULL,
    ocorrido_em timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON catalogo_revisao, categoria, produto, produto_unidade, favorito, auditoria_catalogo FROM PUBLIC;
GRANT SELECT, UPDATE ON catalogo_revisao TO ${runtimeRole};
GRANT SELECT, INSERT, UPDATE ON categoria, produto, produto_unidade TO ${runtimeRole};
GRANT SELECT, INSERT, DELETE ON favorito TO ${runtimeRole};
GRANT SELECT, INSERT ON auditoria_catalogo TO ${runtimeRole};

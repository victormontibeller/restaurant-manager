CREATE TABLE evento_unidade (
    id uuid PRIMARY KEY,
    unidade_id uuid NOT NULL REFERENCES unidade(id),
    versao bigint NOT NULL CHECK (versao >= 0),
    tipo varchar(40) NOT NULL CHECK (tipo IN ('UNIDADE_CRIADA','UNIDADE_ALTERADA')),
    nome varchar(120) NOT NULL,
    fuso varchar(60) NOT NULL,
    ativa boolean NOT NULL,
    ocorrido_em timestamptz NOT NULL,
    UNIQUE (unidade_id, versao)
);
REVOKE ALL ON evento_unidade FROM PUBLIC;
GRANT SELECT, INSERT ON evento_unidade TO ${runtimeRole};
-- Só acrescenta a nova ação; não restaura permissões antigas removidas.
INSERT INTO permissao_perfil(perfil,acao)
SELECT perfil,'unidade.acompanhar' FROM (VALUES
 ('GERENTE'),('ATENDIMENTO'),('CAIXA'),('COZINHA'),('EXPEDICAO')
) AS padrao(perfil) ON CONFLICT DO NOTHING;

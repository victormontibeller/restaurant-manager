ALTER TABLE usuario
    ADD COLUMN nome varchar(120) CHECK (nome IS NULL OR (nome = btrim(nome) AND nome <> '' AND nome !~ '[[:cntrl:]]')),
    ADD COLUMN telefone varchar(16) CHECK (telefone IS NULL OR telefone ~ '^[+]?[0-9]{8,15}$');

CREATE TABLE midia (
    id uuid PRIMARY KEY,
    autor_id uuid NOT NULL REFERENCES usuario(id),
    tipo varchar(10) NOT NULL CHECK (tipo IN ('image/png', 'image/jpeg')),
    largura integer NOT NULL CHECK (largura BETWEEN 1 AND 1280),
    altura integer NOT NULL CHECK (altura BETWEEN 1 AND 1280),
    tamanho integer NOT NULL CHECK (tamanho BETWEEN 1 AND 5242880),
    sha256 char(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
    conteudo bytea NOT NULL CHECK (octet_length(conteudo) = tamanho),
    publicada boolean NOT NULL DEFAULT true CHECK (publicada),
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE controle_midia (
    id boolean PRIMARY KEY CHECK (id),
    quantidade integer NOT NULL CHECK (quantidade BETWEEN 0 AND 200),
    bytes bigint NOT NULL CHECK (bytes BETWEEN 0 AND 104857600)
);
INSERT INTO controle_midia VALUES (true, 0, 0);

CREATE TABLE auditoria_midia (
    id uuid PRIMARY KEY,
    midia_id uuid NOT NULL REFERENCES midia(id),
    autor_id uuid NOT NULL REFERENCES usuario(id),
    evento varchar(30) NOT NULL CHECK (evento = 'PUBLICACAO'),
    criado_em timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON midia, controle_midia, auditoria_midia FROM PUBLIC;
GRANT SELECT, INSERT ON midia, auditoria_midia TO ${runtimeRole};
GRANT SELECT, UPDATE ON controle_midia TO ${runtimeRole};

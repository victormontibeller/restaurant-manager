CREATE TABLE provisionamento (
    empresa_id uuid PRIMARY KEY REFERENCES empresa(id),
    host varchar(253) NOT NULL UNIQUE REFERENCES dominio(host),
    unidade_nome varchar(120) NOT NULL,
    administrador_email varchar(254) NOT NULL,
    administrador_senha_hash varchar(100) NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    ultima_falha varchar(60)
);
CREATE TABLE auditoria_provisionamento (
    id uuid PRIMARY KEY,
    empresa_id uuid NOT NULL REFERENCES empresa(id),
    evento varchar(40) NOT NULL CHECK (evento IN ('RESERVADO','ATIVADO','FALHOU')),
    ocorrido_em timestamptz NOT NULL DEFAULT now()
);
-- Apenas o processo privilegiado de provisionamento acessa o plano/credencial hash.
REVOKE ALL ON provisionamento, auditoria_provisionamento FROM PUBLIC;
REVOKE ALL ON provisionamento, auditoria_provisionamento FROM ${runtimeRole};

-- Preserva a intenção original mesmo após edição; cadastros anteriores não são recriados.
ALTER TABLE unidade ADD COLUMN criacao_payload text;
ALTER TABLE unidade ADD CONSTRAINT unidade_nome_preenchido CHECK (length(btrim(nome)) > 0);

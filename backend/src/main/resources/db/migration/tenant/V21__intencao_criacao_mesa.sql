-- Preserva a intenção original de criação mesmo quando o cadastro é editado.
ALTER TABLE mesa ADD COLUMN nome_criacao varchar(80);
ALTER TABLE mesa ADD COLUMN autor_criacao uuid REFERENCES usuario(id);
UPDATE mesa SET nome_criacao=nome WHERE nome_criacao IS NULL;

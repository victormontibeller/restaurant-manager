-- As duas fronteiras têm migrações próprias; a ligação só é instalada após ambas.
-- A referência é local ao schema empresarial e mídia publicada não é excluída pelo runtime.
ALTER TABLE produto ADD CONSTRAINT produto_midia_fk FOREIGN KEY (midia_id) REFERENCES midia(id);

-- FOR SHARE exige UPDATE em ao menos uma coluna. Não conceder escrita de
-- e-mail, senha ou estado ao runtime. O serviço nunca altera o identificador.
GRANT UPDATE(id) ON usuario_plataforma TO ${runtimeRole};

-- A administração assistida também precisa revogar de forma durável:
-- reativar a conta não ressuscita access/refresh anteriores.
CREATE FUNCTION public.revogar_sessoes_operador() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    IF (OLD.ativo AND NOT NEW.ativo) OR OLD.senha_hash IS DISTINCT FROM NEW.senha_hash THEN
        UPDATE public.sessao_plataforma
           SET revogada_em = coalesce(revogada_em, clock_timestamp())
         WHERE usuario_id = OLD.id AND revogada_em IS NULL;
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.revogar_sessoes_operador() FROM PUBLIC;
CREATE TRIGGER revogar_sessoes_operador
BEFORE UPDATE OF ativo,senha_hash ON usuario_plataforma
FOR EACH ROW EXECUTE FUNCTION public.revogar_sessoes_operador();

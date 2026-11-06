-- Expurgo técnico: não remove usuários, política ou auditoria.
CREATE INDEX sessao_expiracao ON sessao(expira_em, id);
CREATE INDEX limite_login_inicio ON limite_login(inicio_em, chave);
GRANT DELETE ON sessao, refresh_token, limite_login TO ${runtimeRole};

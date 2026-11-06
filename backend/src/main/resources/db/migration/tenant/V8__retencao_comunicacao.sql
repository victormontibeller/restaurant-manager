CREATE INDEX recuperacao_expiracao ON recuperacao_senha(expira_em,hash);
CREATE INDEX email_identidade_expiracao ON email_identidade(expira_em,id);

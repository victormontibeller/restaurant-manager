ALTER TABLE sessao ADD COLUMN reautenticada_em timestamptz;
ALTER TABLE usuario ADD COLUMN alterado_em timestamptz;
CREATE TABLE auditoria_acesso (
    id uuid PRIMARY KEY,
    ator_id uuid NOT NULL,
    recurso_id uuid,
    evento varchar(60) NOT NULL,
    antes text NOT NULL,
    depois text NOT NULL,
    ocorrido_em timestamptz NOT NULL
);
REVOKE ALL ON auditoria_acesso FROM PUBLIC;
GRANT SELECT, INSERT ON auditoria_acesso TO ${runtimeRole};
-- Migração executada uma vez; nunca sobrescreve escolhas existentes.
INSERT INTO permissao_perfil(perfil,acao)
SELECT perfil,acao FROM (VALUES
 ('GERENTE','catalogo.consultar'),('GERENTE','catalogo.editar'),('GERENTE','catalogo.alterar_unidade'),
 ('GERENTE','pedido.consultar'),('GERENTE','pedido.criar_assistido'),('GERENTE','pedido.aceitar'),('GERENTE','pedido.recusar'),
 ('GERENTE','cozinha.iniciar'),('GERENTE','cozinha.concluir'),('GERENTE','pedido.servir'),
 ('GERENTE','pedido.retirar'),('GERENTE','pedido.despachar'),('GERENTE','pedido.entregar'),
 ('GERENTE','pedido.cancelar_antes_preparo'),('GERENTE','pedido.cancelar_apos_preparo'),('GERENTE','mesa.atender'),
 ('GERENTE','comanda.iniciar_fechamento'),('GERENTE','comanda.reabrir'),('GERENTE','recebimento.registrar'),
 ('GERENTE','comanda.concluir'),('GERENTE','financeiro.ajustar'),('GERENTE','devolucao.solicitar'),
 ('GERENTE','relatorio.consultar'),('GERENTE','auditoria.consultar'),
 ('ATENDIMENTO','catalogo.consultar'),('ATENDIMENTO','pedido.consultar'),('ATENDIMENTO','pedido.criar_assistido'),
 ('ATENDIMENTO','pedido.aceitar'),('ATENDIMENTO','pedido.recusar'),('ATENDIMENTO','pedido.servir'),
 ('ATENDIMENTO','pedido.cancelar_antes_preparo'),('ATENDIMENTO','mesa.atender'),
 ('CAIXA','catalogo.consultar'),('CAIXA','pedido.consultar'),('CAIXA','comanda.iniciar_fechamento'),
 ('CAIXA','comanda.reabrir'),('CAIXA','recebimento.registrar'),('CAIXA','comanda.concluir'),('CAIXA','relatorio.consultar'),
 ('COZINHA','catalogo.consultar'),('COZINHA','pedido.consultar'),('COZINHA','cozinha.iniciar'),('COZINHA','cozinha.concluir'),
 ('EXPEDICAO','catalogo.consultar'),('EXPEDICAO','pedido.consultar'),('EXPEDICAO','pedido.servir'),
 ('EXPEDICAO','pedido.retirar'),('EXPEDICAO','pedido.despachar'),('EXPEDICAO','pedido.entregar')
) AS padrao(perfil,acao) ON CONFLICT DO NOTHING;

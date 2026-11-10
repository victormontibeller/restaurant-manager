# Revisão geral e limpeza pré-testes — 2026-11-10

**Situação:** implementação e validação em andamento; este registro não aprova
o candidato nem substitui a matriz final. Base `07ae83f`, branch
`codex/revisao-geral-pre-testes`, ambiente Mac com dados fictícios.

## Achados e correções

- Webhook antigo pode conflitar com a nova tentativa e interromper o worker
  financeiro: distinguir checkout substituído, preservar a tentativa corrente,
  revalidar o envio e isolar falhas duráveis da inbox.
- FK de OAuth bloqueia a retenção de sessões: nova migration com exclusão
  conjunta apenas do estado transitório, preservando auditoria e conexão.
- HTTP síncrono financeiro atrasa prazos de pedidos: scheduler dedicado.
- Expedição conserva dados após revogação: autorização reativa e limpeza da
  resposta negada, com cenário novo S04-UI10.
- Cinco rotas da Sprint 4 não recebem shell offline: lista explícita corrigida.
- Relatório pode exibir números de outro intervalo: período retornado pela API
  associado ao resultado, com limpeza ao consultar novamente ou falhar.
- Guardas de build mantêm listas divergentes/incompletas: inventário único de
  fontes, configurações e assets, compartilhado por release, ensaio e matriz.
- Dependência direta `luxon` sem uso removida; fixture de caminhos normalizada
  no Mac. Não houve remoção especulativa de Java, scripts ou evidências.

## Validação e preservação

Os resultados finais, falhas/reexecuções, SHA do candidato e hash do artefato
serão preenchidos somente após execução. Matriz ampliada para 84 cenários em
cinco projetos, total de 420 pares UI/API. Dados privados, logs e credenciais
fictícias permanecem em `/private/tmp/rm-cleanup-20261110`, fora do Git.

Alterações locais anteriores foram registradas antes da implementação e
preservadas. Demonstração 8095, PostgreSQL original e outros projetos não são
alvos de limpeza. Homologação Linux, provedores reais e piloto permanecem
pendentes, conforme o [checkpoint](../25_EXECUTION_STATUS.md).

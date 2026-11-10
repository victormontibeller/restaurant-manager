# Revisão geral e limpeza pré-testes — 2026-11-10

**Situação:** correções implementadas e validação em andamento; este registro não aprova
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
- Diagnóstico isolado `test_invite_layout.cjs` consolidado no teste de templates
  com o Angular real. Preservados e reforçados o caso de e-mail longo em 360 px
  e a revogação por teclado, agora com efeito HTTP e estado final verificados.
- A primeira execução completa encontrou expectativas frágeis na retenção de
  e-mails e sessões da plataforma: uma chamada não alcançava os registros de
  teste atrás de outros lotes antigos. Os testes passam a exigir progresso
  limitado pela contagem inicial, preservando as verificações de exclusão,
  dados recentes e credenciais expiradas.
- Uma rodada local de templates expirou durante suspensão automática do Mac,
  confirmada no registro de energia. O harness passou a registrar erros e tempos
  de bootstrap; os três navegadores passaram na execução dirigida. A rodada
  interrompida foi preservada e não aprova o candidato.

Todos os 84 arquivos TypeScript têm caminho no grafo da aplicação; templates,
estilos, assets e demais dependências revisados possuem consumidores. O fallback
`webkit-local.sh` continua necessário ao runner Linux. Evidências históricas e
o arquivo manual local foram preservados.

## Validação e preservação

Os resultados finais, falhas/reexecuções, SHA do candidato e hash do artefato
serão preenchidos somente após execução. Matriz ampliada para 84 cenários em
cinco projetos, total de 420 pares UI/API. Dados privados, logs e credenciais
fictícias permanecem na raiz privada `rm-cleanup-20261110`, fora do Git.

Alterações locais anteriores foram registradas antes da implementação e
preservadas. Demonstração 8095, PostgreSQL original e outros projetos não são
alvos de limpeza. Homologação Linux, provedores reais e piloto permanecem
pendentes, conforme o [checkpoint](../25_EXECUTION_STATUS.md).

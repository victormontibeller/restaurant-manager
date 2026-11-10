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

Observação visual sem impacto funcional: alguns contadores mantêm o plural
com quantidade um (`1 escolhas`, `1 pedidos`, `1 prontas`). A concordância fica
incluída no próximo candidato, junto à correção de layout abaixo.

A revisão direta de T12 em 360 px reprovou o primeiro candidato: os filtros
de estado e canal lado a lado cortam os valores selecionados (`Em andamento`
e `Todos os canais`). A execução automatizada continua para reunir os demais
diagnósticos, mas não aprova esse candidato. A correção exige novo artefato,
capturas e matriz completa, sem herdar a aprovação da rodada anterior.
T13 também foi reprovada no celular: os botões de paginação das mesas no
pedido assistido quebram a palavra `anteriores` no meio. O ajuste de disposição
entra no mesmo candidato seguinte, preservando rótulos e comportamento.
T08 e T19 foram reprovadas nos dois formatos por clareza: a lista de tentativas
mostra confirmação/reconciliação e uma recusa anterior sem identificar qual
tentativa cada estado descreve. A apresentação será separada em tentativa mais
recente e histórico, preservando os estados reais do servidor e os controles.
Isso não constitui evidência de duplicação ou erro nos valores financeiros.

Rodada 01 encerrada: **384/420 pares executados sem falhas**; os 36 restantes
não foram executados por indisponibilidade de quota e não são aprovados. As
56 capturas foram inspecionadas, com seis reprovações: T12/T13 mobile e T08/T19
desktop/mobile. A consolidação ficou explicitamente reprovada. API 6953 e
simulador 6605 encerrados por identidade; demonstração 32641/8095 e PostgreSQL
59175/55432 preservados.

Correções visuais aplicadas: filtros responsivos, paginação assistida empilhada,
concordância dos contadores e separadores condicionais na expedição. O pagamento
identifica a tentativa mais recente e mantém as anteriores em histórico;
somente a mais recente pode oferecer link de checkout. S03-UI06/S03-UI12 medem
a legibilidade real e S04-UI08 confere histórico, recusa anterior e ausência de
nova cobrança após quitação. A execução nova fica em `rm-cleanup02-20261110`,
sem reutilizar resultados ou capturas da rodada reprovada. Validação pendente.

## Validação e preservação

Build local concluído no commit `66a982511e7bae31dbb43a32c306fe4249c03ea3`,
JAR `ba612c4b323c2afaf26191e6875c37d8b195d0892cca55a3e9104636b7dd46b7`:
464 testes backend sem falhas, erros ou skips; frontend completo e auditorias
npm/Java aprovados. A CI #204 do mesmo commit confirmou 249 testes de scripts
e 464 backend. Esses resultados não aprovam antecipadamente a matriz abaixo.

Os resultados finais, falhas/reexecuções, SHA do candidato e hash do artefato
serão preenchidos somente após execução. Matriz ampliada para 84 cenários em
cinco projetos, total de 420 pares UI/API. Dados privados, logs e credenciais
fictícias permanecem na raiz privada `rm-cleanup-20261110`, fora do Git.

Alterações locais anteriores foram registradas antes da implementação e
preservadas. Demonstração 8095, PostgreSQL original e outros projetos não são
alvos de limpeza. Homologação Linux, provedores reais e piloto permanecem
pendentes, conforme o [checkpoint](../25_EXECUTION_STATUS.md).

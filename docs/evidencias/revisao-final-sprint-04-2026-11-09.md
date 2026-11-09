# Revisão final da Sprint 4 — 2026-11-09

**Resultado:** revisão local aprovada para commit e abertura de PR. Linux/Hermes
e homologação continuam pendentes por solicitação do proprietário; não houve
merge, deploy ou validação externa nesta revisão.

Branch `codex/sprint-04-delivery-pagamentos`, base `7b522e7`, conferida contra
`origin/main`. A organização por domínio/camadas foi preservada. O arquivo manual
preexistente `ambiente-manual-local-2026-11-07.md` permanece fora da entrega.

## Escopo e resultado

Revisados autorização por sessão/tenant/unidade/ação, idempotência e ordem de locks,
recebimentos/troco/ajustes/reservas, cancelamentos e devoluções, snapshots de
pedido/checkout, callbacks OAuth, assinatura/inbox, leases e reconciliação,
expedição, endereços próprios, outbox/captura e agregação dos relatórios. Também
conferidos os consumidores Angular, guardas, descarte de respostas antigas e
preservação de intenções incertas. Não foi identificado achado bloqueante nessa revisão.

As migrações já utilizadas public V7 e tenant V22–V27 foram preservadas. A revisão
não alterou código, contratos ou testes da aplicação; acrescentou este registro
e atualizou a documentação de publicação. As fontes de regras continuam em
[negócio](../20_BUSINESS_RULES.md), [acessos](../11_ACCESS_CONTROL.md),
[integrações](../21_INTEGRATIONS.md) e [API](../08_API_STANDARDS.md).

## Validação e rastreabilidade

JAR local validado:
`6afe9354cac1c402672a0dcedab0be97098650d3f45f5b67bb4fbf96601861de`;
PID observado na matriz **53922**, já encerrado após a execução original.

- Revalidados por hash **517 arquivos de produção e 706 insumos do build**;
  nenhuma divergência em relação à execução local aprovada.
- Revalidados **435 testes backend/63 XML**, zero falhas, erros ou skips; fontes
  backend e 506 entradas de classes/recursos/libs correspondem à regressão executada.
- Relatórios originais revalidados: **405 pares únicos**, 45 Sprint 4 + 65
  pedidos/mesas/cozinha + 295 regressão, todos no mesmo JAR/PID, sem skips,
  retries ou flaky. Nenhum resultado de candidato anterior foi herdado.
- Dois reinícios reais após resposta perdida de cobrança/devolução e **13 capturas**
  já inspecionadas permanecem vinculados ao candidato final.
- Nesta revisão, executados novamente `npm run format:check`, `npm run typecheck`
  e `npm run test:logic`: aprovados, incluindo os 20 grupos de lógica.
- Verificados diff, links locais, âncoras relacionadas e padrões de segredo antes
  da publicação. Os relatórios de testes backend/navegador foram revalidados;
  essas duas suítes não foram executadas novamente nesta revisão sem mudança de código.

Evidências da implementação: [Sprint 4 local](sprint-04-local-2026-11-09.md).
Artefatos privados e snapshot das fontes em
`/Users/mac/.local/share/restaurant-manager-manual/evidencias/sprint04-20261109-6afe9354cac1`.
Logs e prova da revisão em `/private/tmp/rm-sprint04-review-20261109`.
Credenciais fictícias, traces e mensagens capturadas não são publicados no Git.

## Limites mantidos

Mercado Pago foi exercitado com SDK real e provedor HTTP fictício persistente;
e-mail utiliza captura local. Sandbox/habilitação comercial, URLs públicas,
envio real, Linux/homologação, aparelhos físicos, tecnologia assistiva,
restauração operacional e piloto permanecem pendentes. CI do PR é uma etapa
separada e não comprova homologação no Linux.

# Sprint 00 — Fundação

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

**Status:** fundação técnica validada e PR #2 mesclado em 2026-11-04. Merge `fa9e595bd3bb3f1d768a279ac25ee03243c12fb9` conferido no GitHub e remoto; árvore igual ao head aprovado. Revisão independente e dois checks CI aprovados antes do merge. [Evidência dos critérios](evidencias/sprint-00-ciclo-3.md). Não representa conclusão do produto nem novo deploy.

Os resultados verificáveis estão no checkpoint e nas evidências. Itens compostos permanecem abertos enquanto qualquer requisito estiver pendente.

## Entregáveis

- [x] Preflight Linux, checkout/base, Hermes com `openai-codex` autenticado (adaptação vigente), recursos, ferramentas e branch registrados.
- [x] Estrutura backend/frontend conforme P01, versões fixadas, wrappers/lockfiles e comandos reais no README.
- [x] Configuração por ambiente, placeholders, `.gitignore`, health mínimo, logs sem segredos e tratamento padronizado de erros.
- [x] PostgreSQL dedicado, Flyway separado public/tenant e Hibernate validate.
- [x] CI: build, verificações de código/segredos/dependências e testes PostgreSQL reais.
- [x] Pool/tenant comprovado; desenho de transações, idempotência, inbox/outbox e eventos no ADR, sem abstrações vazias.
- [x] Viabilidade SDK Mercado Pago/OAuth/checkout/e-mail/ingresso investigada; limitações registradas, sem serviços reais.
- [x] Retomada pelos ciclos 2 e 3, com checkpoint sanitizado e registros privados.
- [x] Base Playwright e inventário rastreável; ampliar conforme a [estratégia](26_TEST_STRATEGY.md).
- [x] Homologação exclusiva e pipeline nativo com hash/SHA, lock, health e ensaio real de retorno compatível.

## Dependências

Validar P01/P02/P03 e desenho de P08/P09/P10; disponibilizar os documentos no checkout Linux e verificar ferramentas e acesso ao PostgreSQL do host, com bancos exclusivos. Seguir o [guia de execução](24_AGENT_EXECUTION.md). Disponibilidade de provedores não é necessária para compilar a base, mas bloqueios encontrados precisam ser registrados.

## Critérios de aceite

- [x] Checkout limpo compila backend/frontend; nenhum caminho pessoal ou segredo versionado necessário.
- [x] Testes verificam banco/role/host/porta exclusivos antes de mutações; bancos de referência preservados.
- [x] Migration reaplicada sem duplicação; falhas SQL/checksum interrompem sem prontidão falsa.
- [x] Erro/health mínimos testados, sem stack trace/credenciais/dados pessoais na resposta.
- [x] Shell em celular/tablet/desktop, teclado, carregamento e erro/reconexão demonstrados.
- [x] Modelo de jobs/conflitos registrado no ADR; nenhum teste de pagamento alegado.
- [x] Retomada real pelo checkpoint e estado observado, com desenvolvimento e runtime distintos; main/produção preservadas.
- [x] Health falho não promove candidato; retorno nativo conserva último validado. Migration diferente recusada sem manutenção comprovada.

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Arquitetura](02_ARCHITECTURE.md)
- [Engenharia](03_ENGINEERING_RULES.md)
- [Ambientes](22_PRODUCTION_RUNBOOK.md)
- [Execução e retomada](24_AGENT_EXECUTION.md)

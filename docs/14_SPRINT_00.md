# Sprint 00 — Fundação

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

**Status:** não iniciada.

Entregas, testes e homologações abaixo estão planejados; nenhum item está marcado como concluído.

## Entregáveis

- [ ] Preflight do Linux do Hermes: checkout/base, autenticação local do Codex, recursos disponíveis, ferramentas e política de branch; registrar resultados no checkpoint.
- [ ] Estrutura backend/frontend conforme P01, versões fixadas, wrappers/lockfiles e comandos reais no README.
- [ ] Configuração por ambiente, placeholders, `.gitignore`, health mínimo, logs sem segredos e tratamento padronizado de erros.
- [ ] PostgreSQL dedicado para desenvolvimento/testes, primeiro ciclo Flyway separado para `public`/tenant e Hibernate em validação de schema.
- [ ] Base de CI: build, verificações de código/segredos/dependências e execução de testes pertinentes em PostgreSQL real. A forma de obter PostgreSQL no CI não obriga Docker local.
- [ ] Desenho comprovado de pool/tenant, política de transações, idempotência, inbox/outbox e eventos operacionais; implementar apenas infraestrutura necessária para os incrementos seguintes.
- [ ] Investigar viabilidade do SDK Mercado Pago, OAuth, produto de checkout, e-mail, domínio/ingresso e runtime Linux; registrar limitações sem ativar serviços reais.
- [ ] Rotina de execução e retomada com checkpoint sanitizado, registro privado de logs/processos e comandos efetivamente disponíveis; sem dependência deste histórico de conversa.
- [ ] Base Playwright e inventário rastreável de telas/ações, com dados fictícios, resultados estruturados e artefatos privados; ampliar cobertura em cada sprint conforme a [estratégia de testes](26_TEST_STRATEGY.md).
- [ ] Ambiente de homologação exclusivo e pipeline nativo de build/deploy/health com identificação de artefato, lock de publicação e retorno compatível; executar apenas quando houver incremento executável e recursos verificados.

## Dependências

Validar P01/P02/P03 e desenho de P08/P09/P10; disponibilizar os documentos no checkout Linux e verificar ferramentas e acesso ao PostgreSQL do host, com bancos exclusivos. Seguir o [guia de execução](24_AGENT_EXECUTION.md). Disponibilidade de provedores não é necessária para compilar a base, mas bloqueios encontrados precisam ser registrados.

## Critérios de aceite

- [ ] Checkout limpo com instruções reproduzíveis compila backend/frontend; nenhum comando depende de caminho pessoal ou segredo versionado.
- [ ] Testes usam banco exclusivo e recusam executar limpeza sobre banco não autorizado; nenhuma alteração nos bancos de referência.
- [ ] Migração inicial pode ser reaplicada sem duplicar dados; falha interrompe com diagnóstico e sem indicar prontidão falsa.
- [ ] Esqueleto de erro/saúde não vaza stack trace, credenciais ou dados pessoais.
- [ ] Shell Angular abre em celular/tablet/desktop; navegação básica por teclado e estados de carregamento/erro são demonstrados.
- [ ] Registrar modelo de recuperação de jobs e conflitos; não chamar testes vazios ou contexto Spring iniciado de prova de isolamento/pagamento.
- [ ] Sessão nova consegue retomar uma tarefa pelo checkpoint após conferir Git e ambiente, sem repetir mutações já concluídas ou depender do histórico do chat. Branch/commit e deploy de homologação são identificados separadamente; nenhuma ação alcança `main` ou produção.
- [ ] Falha de health/migration em homologação é registrada sem promover o candidato a validado. A rotina de retomada conserva a base de desenvolvimento e o último release validado como estados distintos.

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Arquitetura](02_ARCHITECTURE.md)
- [Engenharia](03_ENGINEERING_RULES.md)
- [Ambientes](22_PRODUCTION_RUNBOOK.md)
- [Execução e retomada](24_AGENT_EXECUTION.md)

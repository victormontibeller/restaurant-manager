# Inventário rastreável de cobertura

[Índice](../README.md) · [Matriz normativa](../26_TEST_STRATEGY.md)

Estado em 2026-11-04, ciclo 2. Os IDs abaixo preservam o escopo integral; não são aprovação das famílias ainda não implementadas. Atores completos, unidades atribuídas e políticas serão exercitados nas sprints correspondentes. Público é o único ator disponível no shell atual.

## Fundação entregue

| Cenário | Superfície/ação real | Ator | Evidência |
| --- | --- | --- | --- |
| S00-UI01 | `/`: shell, health, CSS, alvo de toque, ausência de overflow | Público | Playwright nos cinco projetos; screenshots revisados |
| S00-UI02 | Pular conteúdo, foco, verificar conexão, offline/online | Público | Playwright nos cinco projetos, sem mock de API |
| S00-API01 | Domínio desconhecido, rota privada, health mínimo | Público | Playwright nos cinco projetos |
| S00-DB01 | Duas empresas A/B, unidades A1/A2/B1, contexto neutro, SQL/rollback e conexão física reutilizada | Infraestrutura | FundacaoTest, PoolIsolationTest, TenantConnectionFailureTest; PostgreSQL real |
| S00-DB02 | Allowlist, migração reaplicada, bloqueio de segundo migrador, erro SQL e recuperação | Migrador | MigrationBoundaryTest; PostgreSQL real exclusivo |
| S00-OPS01 | Falha real de startup e retorno do mesmo binário compatível | Operador técnico | exercise-recovery.py; relatório privado vinculado ao SHA/hash |

## Famílias de telas

| ID | Estado no ciclo 2 | Dependência/evidência parcial |
| --- | --- | --- |
| T01 | Parcial, não aprovado como família | Resolução do domínio/listagem testadas; escolha/horários pendentes |
| T02 | Não implementado/não executado | Sprint 02 |
| T03 | Não implementado/não executado | Sprint 02 |
| T04 | Não implementado/não executado | Sprint 02 |
| T05 | Não implementado/não executado | Sprint 02 |
| T06 | Não implementado/não executado | Sprint 01 |
| T07 | Não implementado/não executado | Sprints 01–04 |
| T08 | Não implementado/não executado | Sprint 04; provedor externo separado |
| T09 | Não implementado/não executado | Sprints 03–04 |
| T10 | Não implementado/não executado | Sprint 03 |
| T11 | Não implementado/não executado | Sprint 03 |
| T12 | Não implementado/não executado | Sprint 03 |
| T13 | Não implementado/não executado | Sprint 03 |
| T14 | Não implementado/não executado | Sprint 03 |
| T15 | Não implementado/não executado | Sprint 03 |
| T16 | Não implementado/não executado | Sprint 04 |
| T17 | Não implementado/não executado | Sprints 03–04 |
| T18 | Não implementado/não executado | Sprint 04 |
| T19 | Não implementado/não executado | Sprint 04 |
| T20 | Não implementado/não executado | Sprint 02 |
| T21 | Não implementado/não executado | Sprint 02 |
| T22 | Não implementado/não executado | Sprints 01/04 |
| T23 | Não implementado/não executado | Sprints 01–04 |
| T24 | Não implementado/não executado | Sprint 01 |
| T25 | Não implementado/não executado | Sprint 01 |
| T26 | Não implementado/não executado | Sprint 04; E04/E05 pendentes |
| T27 | Não implementado/não executado | Sprints 03–04 |
| T28 | Não implementado/não executado | Sprint 01 |

## Cenários transversais

| ID | Estado no ciclo 2 | Dependência/evidência parcial |
| --- | --- | --- |
| X01 | Não implementado/não executado | Sprint 03 |
| X02 | Não implementado/não executado | Sprint 03 |
| X03 | Não implementado/não executado | Sprint 03 |
| X04 | Não implementado/não executado | Sprint 03 |
| X05 | Não implementado/não executado | Sprints 02–04; exemplos obrigatórios preservados na fonte |
| X06 | Não implementado/não executado | Sprint 04 |
| X07 | Não implementado/não executado | Sprint 04 |
| X08 | Não implementado/não executado | Sprint 04 |
| X09 | Não implementado/não executado | Sprint 04 |
| X10 | Não implementado/não executado | Sprint 04 |
| X11 | Não implementado/não executado | Sprints 03–04 |
| X12 | Não implementado/não executado | Sprints 02–04 |
| X13 | Parcial, não aprovado como cenário completo | Pool/thread comprovados; jobs/mídia futuros |
| X14 | Parcial, não aprovado como cenário completo | Shell informa offline; PWA/sessão/transações futuras |
| X15 | Parcial, não aprovado como cenário completo | SHA/hash, migrador e retorno nativo comprovados; backup/restore e manutenção incompatível pendentes |

## Atores ainda pendentes

Cliente, participante de mesa, Administrador, Gerente, Atendimento, Caixa, Cozinha, Expedição e operador SaaS: ainda sem contas/jornadas implementadas. Negativos de permissão/unidade/propriedade desses atores não foram executados. Ausência de credenciais externas bloqueia somente sandbox/real; não justifica aprovar implementação ausente.

Resultados desta fundação: [ciclo 2](sprint-00-ciclo-2.md). A matriz inteira deverá ser reexecutada sobre o release final; somar este relatório aos futuros não substitui esse gate.

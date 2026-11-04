# Inventário rastreável de cobertura

[Índice](../README.md) · [Matriz normativa](../26_TEST_STRATEGY.md)

Estado em 2026-11-04, ciclo 11. Os IDs preservam o escopo integral; não são aprovação de famílias incompletas. Candidato de identidade/acessos validado em rm_test, não implantado em homologação. O último release servido continua sendo a fundação; consulte o checkpoint para os SHAs.

## Fundação entregue

| Cenário | Superfície/ação real | Ator | Evidência |
| --- | --- | --- | --- |
| S00-UI01 | `/`: shell, health, CSS, alvo de toque, ausência de overflow | Público | Playwright nos cinco projetos; screenshots revisados |
| S00-UI02 | Pular conteúdo, foco, verificar conexão, offline/online | Público | Playwright nos cinco projetos, sem mock de API |
| S00-UI03 | Carregamento e botão desabilitado durante requisição real | Público | Playwright nos cinco projetos; apenas atraso, sem resposta fabricada |
| S00-API01 | Domínio desconhecido, rota privada, health mínimo | Público | Playwright nos cinco projetos |
| S00-DB01 | Duas empresas A/B, unidades A1/A2/B1, contexto neutro, SQL/rollback e conexão física reutilizada | Infraestrutura | FundacaoTest, PoolIsolationTest, TenantConnectionFailureTest; PostgreSQL real |
| S00-DB02 | Allowlist, migração reaplicada, bloqueio de segundo migrador, erro SQL e recuperação | Migrador | MigrationBoundaryTest; PostgreSQL real exclusivo |
| S00-OPS01 | Falha real de startup e retorno do mesmo binário compatível | Operador técnico | exercise-recovery.py; relatório privado vinculado ao SHA/hash |

## Famílias de telas

| ID | Estado atual | Dependência/evidência parcial |
| --- | --- | --- |
| T01 | Parcial, não aprovado como família | Resolução do domínio/listagem testadas; escolha/horários pendentes |
| T02 | Não implementado/não executado | Sprint 02 |
| T03 | Não implementado/não executado | Sprint 02 |
| T04 | Não implementado/não executado | Sprint 02 |
| T05 | Não implementado/não executado | Sprint 02 |
| T06 | Parcial, família não aprovada | Login/refresh/logout e recuperação testados; cadastro/verificação de cliente em validação no ciclo 10; verificação de funcionários preexistentes pendente |
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
| T23 | Parcial, família não aprovada | CRUD lógico de unidades em validação; horários/regiões/parâmetros pendentes |
| T24 | Parcial, família não aprovada | Equipe existente/vínculos testados; convites/criação em validação no ciclo 11 |
| T25 | Parcial, família não aprovada | Matriz/UI e concorrência testadas; catálogo completo de ações por perfil e eventos pendentes |
| T26 | Não implementado/não executado | Sprint 04; E04/E05 pendentes |
| T27 | Não implementado/não executado | Sprints 03–04 |
| T28 | Parcial, família não aprovada | Provisionamento CLI testado; identidade SaaS/consulta e suspensão comercial em validação; provisionamento HTTP e integração com pedidos pendentes |

## Cenários transversais

| ID | Estado atual | Dependência/evidência parcial |
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

Administrador tem jornadas de login, matriz e equipe; unidades em validação. Gerente, Atendimento, Caixa, Cozinha, Expedição e Cliente possuem identidades fictícias nos testes API, com negativos de configuração e vínculos. Isso não implementa suas jornadas de catálogo/operação/finanças. Participante de mesa ainda sem identidade/jornada; identidade SaaS e consulta de empresas estão em validação no ciclo 2 da retomada. Ausência de credenciais externas bloqueia somente sandbox/real; não justifica aprovar implementação ausente.

## Identidade e acessos — cobertura incremental

| Cenário | Superfície/ação | Ator | Evidência |
| --- | --- | --- | --- |
| S01-UI01 | Login, recarga/refresh, cookies, armazenamento e logout | Administrador fictício | Cinco projetos aprovados contra b631403 no ciclo 6 |
| S01-UI02 | Senha inválida, foco e CSRF ausente | Público/Administrador | Cinco projetos aprovados contra b631403 |
| S01-UI03 | Abas concorrentes, perda de rede e retry de logout | Administrador | Cinco projetos aprovados contra b631403 |
| S01-UI04 | Matriz, confirmação de senha, persistência e último Administrador | Administrador | Cinco projetos aprovados contra b631403 |
| S01-UI05 | Criar/editar/inativar unidade, fuso inválido e conflito | Administrador | Cinco projetos aprovados contra 589ea43 no ciclo 9 |
| S01-UI06–09 | Resultado incerto, logout/reautenticação, navegação e paginação | Administrador | Cinco projetos aprovados contra 589ea43 no ciclo 9 |
| S01-UI10–12 | Recuperação capturada, código único, erros e resposta perdida | Público/Cliente fictício | Cinco projetos aprovados sobre 76eeffa no ciclo 10; regressão do incremento novo pendente |
| S01-UI13–16 | Cadastro verificado, login restrito, código consumido, erros/offline e resposta perdida/502 após commit | Público/Cliente fictício | Testes escritos; execução positiva do candidato novo pendente |
| S01-UI17–19 | Criar/aceitar/revogar convite, login de funcionário, resultado incerto/replay após logout e validações/foco | Administrador e funcionário convidado | Testes escritos no ciclo 11; resultados no checkpoint, não presumir execução |
| S01-API03 | Convites, autorização, intenção concorrente, aceite único, rollback, expiração após lock e expurgo | Administrador, demais perfis e público | ConvitesTest; resultados efetivos no checkpoint |
| S01-UI20–22 | Verificar e-mail preexistente, preservar credenciais/perfil, erros/foco/offline e resposta perdida | Funcionário preexistente e público | Quinze combinações aprovadas no candidato 543d440 na retomada ciclo 2; revisão mobile realizada |
| S01-UI23–25 | Login SaaS, metadados, refresh/logout, erros/foco/offline e origem empresarial negada | Operador SaaS | Testes escritos na retomada ciclo 2; execução nova ainda pendente neste registro |
| S01-API05 | Audiência/origem separadas, CSRF real, refresh concorrente, revogação, quota e retenção SaaS | Operador SaaS e negativos empresariais | PlataformaTest em validação; não encerra T28 |
| S01-UI26–28 | Consultar empresa, confirmar senha, suspender/reativar, reconciliar resposta perdida e conflito, offline | Operador SaaS | Testes novos na retomada ciclo 3; execução positiva ainda pendente neste registro |
| S01-API06 | Transições comerciais, versão/concorrência, revogação, rollback de auditoria e consultas em suspensão | Operador SaaS e Administrador empresarial negado | EstadoEmpresaTest em validação; não cobre bloqueio de pedidos futuros |
| S01-API04 | Verificação existente, finalidade/tenant, concorrência, expiração após lock, rollback, quota e retenção | Funcionário e público | VerificacaoEmailTest; resultados efetivos no checkpoint |
| S01-API01 | Matriz/equipe, revogação com JWT válido, vínculos e concorrência | Seis funcionários e Cliente | AcessosTest; detalhes por incremento no checkpoint |
| S01-API02 | Unidade administrativa, idempotência e concorrência | Administrador; negativos dos outros perfis | Quatro testes novos; validação final em curso |

Resultados da fundação: [ciclo 3](sprint-00-ciclo-3.md). Incremento de provisionamento: [Sprint 01](sprint-01-ciclo-3.md), somente rm_test, não implantado. A matriz inteira deverá ser reexecutada sobre o release final; somar relatórios de versões distintas não substitui esse gate.

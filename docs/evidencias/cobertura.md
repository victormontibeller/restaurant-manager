# Inventário rastreável de cobertura

[Índice](../README.md) · [Matriz normativa](../26_TEST_STRATEGY.md)

Estado em 2026-11-04, retomada ciclo 13. Os IDs preservam o escopo integral;
não são aprovação de famílias incompletas. Candidato de identidade3cd4eeb está
servido em hml, com baseline anterior preservado. Não há aprovação integrada
da Sprint; consulte o checkpoint para resultados consolidados e SHAs.

## Atualização vigente — retomada ciclo 13

Manutenção corrigida aprovada no JAR3cd4eeb, seguida de instalação real e seeds
fictícios por CLI/API/captura. UI04/UI05 passaram dez combinações no mesmo JAR,
sem repetir build ou testes focados. Regressão restante é serializada após smoke
hml; resultados ainda não consolidados nesta gravação.

| Cenários novos | Superfície e atores | Escopo |
| --- | --- | --- |
| S01-HML01–02 | Dois administradores A/B, acessos, equipe, unidades, convites | Consulta UI/API, origem/tenant, cookies/sessão/refresh/logout |
| S01-HML03–07 | Gerente, Atendimento, Caixa, Cozinha e Expedição | Filial permitida/negada, eventos cadastrais, administração negada |
| S01-HML08–09 | Dois clientes distintos | Identidade própria, isolamento, ausência/negação de administração e eventos |
| S01-HML10 | Operador SaaS | Somente metadados, consulta comercial, audiência e sessão separadas |

Cinquenta combinações aprovadas às23:07Z, sem falha/skip/retry/flaky, fonte dc3240c
e JAR3cd4eeb. Runner não promove baseline nem substitui testes mutantes, backend,
concorrência ou recuperação. Revisão visual parcial de oito recortes, não telas
inteiras. [Evidência do ciclo13](sprint-01-retomada-ciclo-13.md).

## Histórico — retomada ciclo 11

No JAR e847fee, S01-UI35 passou cinco combinações; identidade UI01–09 teve
42 aprovações e três falhas, zero skip/retry/flaky. UI04 carregou lentamente no
WebKit; UI05 pressupunha que unidade recém-criada continuaria na primeira página
após recarga ordenada. Correções preservam expectativas e usam cargas/paginação
reais. Reexecução no artefato novo ainda pendente nesta atualização.

Transição hml real, migration Java, HTTPS e recusa de deploy concorrente entre
ciclos foram exercitadas. Retorno inicial falhou por OID textual; após correção,
original restaurado e inventário igual, candidato bloqueado/preservado. Fundação
hml não tinha empresas/identidades: cinco tabelas/três linhas não aprovam dados
empresariais. Baseline não foi promovido. [Evidência do ciclo 11](sprint-01-retomada-ciclo-11.md).

## Histórico — retomada ciclo 10

No artefato e847fee, S01-UI41 passou cinco combinações. S01-UI35 teve quatro
aprovações/uma falha WebKit de sincronização de carregamento; correção publicada,
reexecução ainda em andamento. Sem retries/skip/flaky convertidos em aprovação.
S01-UI36–40 passaram25 combinações no e9d23d9; evidência não transferida ao novo
artefato. Matriz integrada de identidade/hml continua pendente.

Ensaio nativo de manutenção em rm_test passou: parada própria, original por OID,
clone/inventário integral, migrador Java, DDL de teste confirmado seguido de erro
SQL injetado, retorno do original e três contas com negativos nas três fases.
1853 tabelas/17301 linhas no ponto comparado. Hml preservada no mesmo SHA/PID.
Não é falha real de uma migration de produto nem deploy hml; não cobre mídia,
backup externo ou reconciliação financeira. X15 permanece parcial.
[Evidência do ciclo10](sprint-01-retomada-ciclo-10.md).

## Histórico — retomada ciclo 6

Atualização vigente: no JAR dee85d3, convites e SaaS passaram quinze combinações
cada; responsividade corrigida dos convites foi reexecutada e captura mobile
revisada. Eventos teve dez aprovações/cinco falhas e identidade 43 aprovações/duas
falhas. Correções publicadas; reexecuções continuam sem resultado observado no
encerramento. Registros históricos abaixo não substituem esse estado nem aprovam
a matriz integrada. Fila operacional implementada, com teste nativo ainda não
consolidado. [Evidência do ciclo 6](sprint-01-retomada-ciclo-6.md).

## Atualização — retomada ciclo 7

Eventos S01-UI32–34 passaram quinze combinações no JAR dee85d3. Reexecução
S01-UI04 teve duas aprovações/três falhas; correções posteriores aguardam E2E.
S01-UI35 acrescenta revogação/remoção de vínculo inativo pela UI (Administração,
negativo da sessão Cozinha), ainda não executado neste registro. Quatro regressões
PostgreSQL aprovadas para vínculo inativo, sessões e login simultâneo.
X15 permanece parcial: ensaio novo de banco recuperou conteúdo/metadados em
cluster isolado; mídia/chaves/manutenção e aplicação restaurada não cobertas.

## Fundação entregue

Retomada ciclo9: S01-UI35 passa a alterar/salvar/recarregar perfil pela UI com
payload/resposta/GET real; S01-UI41 cobre perfil de convite escolhido, consulta,
aceite e login. Novos testes ainda não executados neste registro. O probe de
template real cobre payloads/recarga com API fictícia nos três motores e integra
os gates de build/CI; não substitui E2E. Os gates de fundação agora recusam JAR
de identidade para impedir aprovação parcial como baseline da Sprint01.

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
| T06 | Parcial, família não aprovada | Login, cadastro, recuperação, verificação e convites implementados/testados por artefato; regressão integrada/hml pendente |
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
| T24 | Parcial, família não aprovada | Equipe, vínculos e convites implementados/testados; reexecução UI35 e integração hml pendentes |
| T25 | Parcial, família não aprovada | Matriz, concorrência e eventos cadastrais testados por artefato; gate integrado e ações operacionais futuras pendentes |
| T26 | Não implementado/não executado | Sprint 04; E04/E05 pendentes |
| T27 | Parcial, família não aprovada | Acompanhamento cadastral da unidade em validação; eventos operacionais nas Sprints 03–04 |
| T28 | Parcial, família não aprovada | HTTP/UI/CLI/fila, identidade SaaS e suspensão implementados; retomada operacional, gate integrado/hml e integração futura com pedidos pendentes |

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
| X15 | Parcial, não aprovado como cenário completo | SHA/hash, restore isolado com aplicação e retorno nativo de banco após DDL/erro injetados comprovados; promoção/migration incompatível hml, mídia e recuperação integral pendentes |

## Incremento de provisionamento — retomada ciclo 4

S01-UI17–19, S01-UI23–25 e S01-UI26–28: quinze combinações por suíte
aprovadas no artefato e039dc2, com PostgreSQL real e cinco projetos, sem
skip/retry/flaky; resultado do worker herdado recolhido nesta rodada. Isso não
aprova a matriz integrada do código novo. Inspeção posterior encontrou overflow
no botão de convites apesar das assertivas antigas: responsividade de S01-UI18
permanece reprovada até reexecução com CSS e comparação de viewport corrigidos.

| Cenário | Superfície/ação | Ator | Estado |
| --- | --- | --- | --- |
| S01-UI29 | Solicitação pela UI, processamento CLI real e empresa disponível sem impersonação | Operador SaaS | Escrito; execução do candidato novo pendente |
| S01-UI30 | Resposta perdida, UUID após logout/login, consulta sem duplicação | Operador SaaS | Escrito; execução pendente |
| S01-UI31 | Falha de ativação real, consulta, retomada versionada e conclusão | Operador SaaS | Escrito; execução pendente |
| S01-API07 | Reserva, autorização, concorrência, rollback, falha/retomada e crash após ativação | SaaS/worker privilegiado | Nove testes PostgreSQL aprovados; não substituem build/E2E |

## Acompanhamento cadastral — retomada ciclo 5

| Cenário | Superfície/ação | Ator | Estado |
| --- | --- | --- | --- |
| S01-UI32 | Selecionar unidade, receber alteração persistida e recuperar após offline, teclado/mobile | Administrador | Escrito; execução pendente |
| S01-UI33 | Consulta por unidade; retirar ação/vínculo e encerrar acompanhamento com JWT ainda válido | Cozinha e Administrador | Escrito; execução pendente |
| S01-UI34 | Ausência de UI e negação direta, outro tenant e sessão encerrada | Cliente | Escrito; execução pendente |
| S01-API08 | Projeção mínima, replay/paginação, seis perfis, revogação, rollback/commit concorrente e duas identidades empresariais válidas | Equipe/Cliente | Testes PostgreSQL novos; resultado consolidado no checkpoint |

T27 continua parcial: esse acompanhamento é cadastral, não entrega eventos de
pedidos, mesa, pagamento nem estado de leitura. Não encerrar X11 com esta parcela.

## Atores ainda pendentes

Retomada ciclo8 acrescenta S01-UI36–40, uma jornada para cada perfil Gerente,
Atendimento, Caixa, Cozinha e Expedição: acompanhamento da filial, revogação e
restauração da ação com JWT existente, recarga/refresh, logout, menus ausentes e
escrita direta de matriz/equipe negada mesmo após reautenticação. Confere estado
persistido inalterado após negativas. Testes escritos/typecheck aprovado; execução
ainda pendente. Isso cobre funções cadastrais atuais, não jornadas das Sprints02–04.

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

# Inventário rastreável de cobertura

## Estado vigente — ciclo33, 2026-11-06

Build95 aprovado,24XML/175backend sem falha/erro/skip. Matriz32 conferiu50pares
únicos no mesmo95 (UI18×5 e identidade45); eventos em execução, sem gate global.
32capturas95 inspecionadas com limites e vínculo:10principais/12complementos/
10adicionais. Não somar matriz31 nem suas capturas ao candidato novo.
Composição operacional conferida nos JARs reais, ainda sem manutenção/troca
nativa95. [Evidência33](sprint-01-retomada-ciclo-33.md).

## Registro anterior — ciclo32, 2026-11-06

Consolidação final: matriz31 aprovada em215pares únicos do JAR5cce633, sem
falha/skip/retry/flaky, recibos reabertos. Revisão visual tem56imagens com
origem/hash, mas permanece bloqueada para aceitação por lacuna semântica do
artefato antigo.95d278e publicado/CI aprovada; build nativo ativo, E2E novo ainda
não iniciado. Não transferir cobertura ao Angular posterior.

Correção de associação de erros por campo em Angular, com provas vermelho/verde
isoladas nos três motores. UI04/UI11/UI14/UI19/UI21/UI26/UI29 foram ampliados;
E2E do novo código ainda pendente. A matriz31 continua no JAR5cce633, sem
interrupção/duplicação, e não aprova a aplicação alterada. Não houve deploy nem
promoção. [Evidência32](sprint-01-retomada-ciclo-32.md); o checkpoint registra
as contagens e fases observadas, sem converter gates pendentes em aprovação.

## Histórico — ciclo31, 2026-11-06

JAR5cce633/hash2db5ed4a:24XML/175backend sem falha/erro/skip; quatro partidas
frias UI18 passaram nos dois motores antes falhos, com diagnóstico HQL no startup.
Matriz integrada nova em execução:50pares únicos conferidos (UI18×5 e
identidade45), eventos e demais famílias ainda pendentes. Revisão visual parcial
materializada:10principais/12complementos/10adicionais,32imagens com origem/hash.
Isso não aprova matriz inteira, promoção ou Sprint. [Evidência31](sprint-01-retomada-ciclo-31.md).

Hml continua97d75b0; sua matriz285, manutenção e provisionamento assistido do
ciclo28 são provas históricas desse JAR, não do backend novo. Não reconstruir
5cce633 por scripts/docs. Estado posterior e gates no
[checkpoint](../25_EXECUTION_STATUS.md); famílias futuras abaixo não foram reduzidas.

## Histórico — ciclo 27, 2026-11-05 local

Às 02:31Z de 2026-11-06, 150 pares únicos aprovados no JAR 97d75b0:
25 focos, 45 identidade, 45 eventos, 15 verificação e 20 cadastro. Recibos,
hashes e cobertura reabertos. Restante da matriz em execução; nenhuma aprovação
global presumida. Reteste UI18×5 aguarda término do worker, sem novo build.
Revisão visual tem 22 superfícies/layouts principais e complementos vinculados;
um complemento de convites continua reprovado por enquadramento até o reteste.
Manutenção/troca/assistido/smokes/aceitação pendentes. Não transferir matriz do
6cd8a86 ao Angular corrigido. [Evidência](sprint-01-retomada-ciclo-27.md).

## Histórico — ciclo25, 2026-11-05 local

Worker24 preservado no6cd8a86:65pares únicos aprovados (20focos e45identidade),
demais famílias ainda em execução neste registro. Origem/hash das14capturas
herdadas conferidos. Revisão de exportação mobile/desktop reprovou mensagem de
sucesso antiga após nova tentativa falha. Correção dos estados com vermelho/verde
de lógica e typecheck; UI42 ampliado, novo E2E/build ainda pendentes. Não aceitar
o6cd8a86 apesar de resultados automatizados verdes. UI35 terá capturas do vínculo,
ajuda e cartão recolhido sem reduzir assertivas. [Evidência](sprint-01-retomada-ciclo-25.md).
Manutenção/troca/assistido/smokes/aceitação permanecem abertos. Sprint01 não
concluída; cobertura futuraT01–T28/X01–X15 não reduzida.

## Histórico — ciclo24, 2026-11-05

Matriz S01-UI01–43 concluída em23:13:50Z no artefato96769ac/hash50a2a604:
215pares únicos nos cinco projetos, sem falha/skip/flaky/retry. Recibos,
relatórios, hashes e cobertura foram reabertos e conferidos. Inclui exportação,
eventos, vínculos, convites e provisionamento; as falhas históricas abaixo não
descrevem essa rodada. Não somar execuções antigas ao total dessa matriz.

O candidato6cd8a86 contém correções posteriores de foco/erro por campo, incluindo
senha em branco, e isola a massa do teste de retenção que falhou no build36e49e7.
CI e build durável aprovados com174backend sem falha/erro/skip. Worker24 passou
vinte pares dos focosUI11/UI14/UI19/UI21 nos cinco projetos, sem skip/flaky/retry;
matriz restante em execução. Seis de26capturas visuais inspecionadas e vinculadas
por origem/hash. Não é aprovação global nem smoke hml novo. A matriz do
96769ac NÃO aprova o Angular novo. Hml permanece3cd4eeb, baseline449ce3c.
Fundação/smoke/assistido/manutenção/revisão visual do candidato final ainda são
gates abertos. Nenhuma família T ou cenário X incompleto foi convertido em
aprovado. [Evidência atual](sprint-01-retomada-ciclo-24.md).

## Histórico — ciclo14

Exportação cadastral acrescenta S01-UI42 (JSON mínimo de
consulta atual, teclado e falha sem arquivo antigo) e S01-UI43 (filial/tenant e
revogação durante requisição). Implementação/testes locais, E2E NÃO executado.
Não pertence ao JAR3cd4eeb atualmente servido. Regressão herdada de eventos teve
43 aprovações/2falhas na captura UI32 Firefox/WebKit acima do limite de altura;
correção local ainda não reexecutada. [Evidência vigente](sprint-01-retomada-ciclo-14.md).

[Índice](../README.md) · [Matriz normativa](../26_TEST_STRATEGY.md)

Estado em 2026-11-04, retomada ciclo 13. Os IDs preservam o escopo integral;
não são aprovação de famílias incompletas. Candidato de identidade3cd4eeb está
servido em hml, com baseline anterior preservado. Não há aprovação integrada
da Sprint; consulte o checkpoint para resultados consolidados e SHAs.

## Histórico — retomada ciclo 13

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
| T24 | Parcial, família não aprovada | Equipe, vínculos e convites implementados; UI35 aprovado no96769ac; reexecução do Angular posterior e integração hml pendentes |
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

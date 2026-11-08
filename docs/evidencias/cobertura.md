# Inventário rastreável de cobertura

## Sprint 3 — revisão final concluída localmente

A [revisão final](revisao-final-sprint-03-2026-11-07.md) registra as correções
R01–R10, falhas e reexecuções. O JAR15 passou em **365 testes backend/54 XML**,
sem falhas, erros ou skips. Formatação, tipos, 19 grupos de lógica (18 casos
de mesas e seis de contexto), 12 combinações de templates e build/PWA passaram.
Os probes usam transporte controlado. A matriz14 aprovou 295 pares da regressão,
mas parou no UI05 Firefox após 43 pares Sprint 3: alerta omitido pelo job tardio.
A correção R10 passou em sete testes dirigidos e na regressão completa15;
verifica alerta/expiração únicos e ordenados, inclusive após lease abandonada
ou aceite no limite. A matriz15 passou nos 65 pares Sprint 3 e 295 de regressão,
sem herdar resultados14, skips, retries ou instabilidade. Foram inspecionadas
110 capturas e cinco complementares Firefox, separados da contagem da matriz. UI05 e seus prazos permanecem inalterados. UI10 aguarda
a abertura real de SSE e comprova JWT válido antes de revogar, preservando o
limite da revogação.

| Cobertura acrescentada | Prova e situação |
| --- | --- |
| AcessosSessaoConcorrenciaTest / AcessosRepositoryTest / EventosOperacionaisControllerTest | Revogação/serialização, conflito de sessão em REPEATABLE_READ, JWT vencendo entre filtro e controller, erro interno legítimo; incluídos na regressão completa aprovada |
| PedidosReplayTest / PedidosSolicitacoesMesaTest | Replay consistente, revogação durante espera, pendência versus serviço/cancelamento e rollback de decisão inválida; incluídos na regressão completa aprovada |
| CatalogoTest | Escrita autorizada precede logout real; revogação anterior à autorização impede escrita; 13 testes incluídos na regressão completa aprovada |
| test_mesa_pagination.cjs / test_mesa_context.cjs | Paginação independente, intenção incerta, respostas tardias, contexto e erros de ação preservados durante consultas; 18 e seis casos aprovados nos componentes reais com transporte controlado |
| test_mesa_navigation_templates.cjs | Geometria/foco em 360/768/1280 px, fonte ampliada, clique único durante SSE, erro 409 persistente, fila e bloqueio de envio; aprovado em Chromium/Firefox/WebKit com transporte controlado |
| PedidosDeadlineTest | Recuperação após ambos os vencimentos, alerta anterior já existente, reprocessamento, lease abandonada, aceite no limite e corrida aceite/job; sete dirigidos e regressão completa aprovados |
| S03-UI12 | Mais de 50 mesas, solicitações e comandas assistidas; aprovado nos cinco projetos da matriz final |
| S03-UI13 | Nome duplicado, resposta de criação perdida e resposta tardia da comanda A após escolher B; aprovado nos cinco projetos da matriz final |

## Sprint 3 — histórico da implementação local, candidatos07/08

No artefato final08 `e828ec28de90d6fdbc4a302fa4df53296d49df00cc12b09e5cba35d0c67344c7`,
a regressão backend executou novamente **347 testes/49 XML**, sem falhas, erros
ou skips, com JDK 21 e PostgreSQL real. Recuperação de deadlines após reinício,
replay sem duplicação e **30 pares dirigidos** passaram nesse mesmo JAR.
A matriz completa **350 pares únicos (55 novos + 295 de regressão)** pertence ao
candidato07 `2c11a135df8276adc25308d05a594f77c2cb81f5493e7514e0bd85bd1dc6deea`.
O delta08 se limita a sete textos em cinco arquivos TypeScript e ao literal de
etapa da API. Não somar essas execuções nem declarar 350 pares no hash final.

As duas consolidações selecionam somente PASS, sem skips, retries ou flaky;
falhas e reexecuções históricas permanecem registradas na
[evidência da sprint](sprint-03-local-2026-11-07.md). Os 30 pares do08 passaram
na primeira tentativa. Foram inspecionadas 55 capturas do07 e 30 focais do08.
Formatação, tipos, build/PWA, 18 grupos de lógica e nove probes de templates
passaram; esses probes usam simulação e não substituem os E2E com API/DB reais.
Linux/homologação, aparelhos físicos, tecnologia assistiva e piloto pendentes.

| Cenário | Famílias | Superfícies e prova local executada |
| --- | --- | --- |
| S03-UI01 | T05/T09/T12/T15 | Cliente envia; equipe aceita; KDS inicia/conclui uma de três unidades; projeção mínima |
| S03-UI02 | T10/T11/T14/T17 | Mesa, QR sem segredo, código temporário, rodada, ajuda/conta, fechamento e revogação |
| S03-UI03 | T05/T09, X13 | Resposta perdida, consulta da mesma intenção, replay/conflito e pedido alheio negado |
| S03-UI04 | T04/T09/T15/T19 | Duas unidades de combo, cancelamento integral de uma, saldo e primeiro preparo imutável |
| S03-UI05 | T12/T23/T27 | Prazo versionado, alerta durável único e expiração pelo job real |
| S03-UI06 | T12/T15/T24/T25 | Cinco perfis operacionais, ações efetivas, unidade não atribuída e campos indevidos |
| S03-UI07 | T05/T09/T12 | Delivery fictício controlado, taxa do servidor e recusa com ajuste |
| S03-UI08 | T05/T09, X14 | Confirmação bloqueada offline, reconexão, teclado e formulário |
| S03-UI09 | T13/T14/T15 | Pedido assistido, preparo e serviço na mesa com autoria preservada |
| S03-UI10 | T12/T27, X13 | Revogação durante SSE com JWT ainda válido e remoção das ações |
| S03-UI11 | T09/T27, X14 | Falha isolada de transporte SSE, polling real e reconexão |
| PedidosTest / PedidosMesaTest / PedidosConcorrenciaTest | T05/T09–T15/T17, X01/X13 | Intenção, catálogo/horários, autorização, tenant/unidade, suspensão/inativação e corridas de envio/aceite/preparo/fechamento |
| CozinhaTest / FinanceiroTest | T15/T19 | Lote atômico, unidades/combos, marco imutável e ajuste remanescente com fixtures financeiras |
| MesasTest / SessaoMesaTest | T10/T11/T14/T17 | Atendimento único, comandos versionados, audiência, rotação/expiração/revogação e fechamento |
| PedidosDeadlineTest / EventosOperacionaisTest / FluxoEventosServiceTest | T12/T27 | Lease/retry, expiração no limite, evento transacional, ordenação por commit e expiração durante consulta SSE |
| test_order_recovery.cjs / test_operational_events.cjs | T05/T09/T27 | Probes simulados de intenção incerta, sessão antiga, cursor, fallback e revogação |
| test_mesa_context.cjs / test_snapshot_queue.cjs | T09/T14/T27 | Probes simulados de contexto, respostas antigas, consultas serializadas e atualização de várias unidades |
| ApiExceptionHandlerTest / SseTransporteTest / RespostaJsonTransporteTest / DespachoSseSecurityTest | T27, X13 | Conversor e cadeias de segurança reais: desconexão, ERROR/INCLUDE, JSON de erro, 500 legítimo e rotas negadas |

Recebimentos, devoluções reais, expedição, regiões e piloto continuam fora da
implementação da Sprint 3. Resultados históricos abaixo não são herdados.

## Sprint 2 integrada — validação local concluída

A [revisão final do PR #5](revisao-final-pr-05-2026-11-06.md) registra 271 testes
backend e 295 pares únicos de navegador aprovados no candidato final, sem
skip/retry/flaky na consolidação. Inclui cinco provas controladas de atualização
PWA e 75 pares com injeção de falha de transporte isolada. As APIs de negócio
usam PostgreSQL real. O [checkpoint](../25_EXECUTION_STATUS.md) identifica
artefato, processos encerrados e homologação deliberadamente pendente.

A [refatoração das camadas Java](refatoracao-camadas-java-2026-11-06.md)
reexecutou os 262 testes backend e 295 pares no JAR daquela etapa. Ela e a
[entrega original](sprint-02-local-2026-11-06.md) permanecem como histórico;
a validação vigente é a revisão final acima, sem somar as execuções.

| Cenário | Famílias | Superfícies e prova |
| --- | --- | --- |
| S02-UI03 | T02–T05/T20–T21, X05/X12/X14 | Categoria/produto/mídia/adicional/combo/oferta; vitrine e busca; prévia R$ 46; linhas distintas, cálculo, mudança de preço, reconfirmação, indisponibilidade, rede e troca de unidade |
| S02-UI04 | T20–T21, X01 | Edição concorrente, reconsulta de versão e imagem inválida sem publicação |
| S02-UI05 | T20, X01/X13 | Upload real com resposta perdida, consulta pelo mesmo UUID, sem reenviar ou duplicar imagem |
| S02-UI-PERFIL-* | T20–T21/T24–T25 | Administrador nas duas unidades; cinco perfis configuráveis com concessão/revogação por ação, UI/API, mesma sessão e filial não atribuída |
| S02-UI-PERFIS-CLIENTES | T02/T06, X13 | Dois clientes, propriedade dos favoritos, gestão negada e revogação após logout |
| S02-PWA01 | T01–T05, X14 | Shell integrado offline, manifesto/ícones, cache sem APIs/tokens/query privada, reconexão |
| S02-PWA02 | X14 | Build real em servidor local controlado: nova versão aguarda consentimento; cancelamento preserva a aba; atualização não recarrega outras abas |
| CatalogoTest / CarrinhoTest / CalculadoraCarrinhoTest | T02–T05/T20–T21, X01/X05/X12/X13 | Dinheiro, combos/limites, adulteração, tenant/unidade/ator, versões, snapshots, concorrência, rollback e revogação enquanto aguarda lock |
| MidiaTest / NormalizadorImagemTest / Sprint02BoundaryTest | T20, X01/X13 | Tipo real, quotas/dimensões, orientação EXIF/espelhos, limites dos metadados, normalização, atomicidade, replay, ação atual, isolamento e allowlist HTTP |
| test_catalog_cart.cjs / test_pwa.cjs | T03–T05, X12/X14 | Probes simulados: dinheiro exato, cálculo somente servidor, respostas atrasadas, prévia/rede/edição, cache restrito e atualização explícita |
| test_catalog_recovery.cjs | T20–T21, X13 | Probe simulado do editor real: recuperação de componentes do combo, rascunho/UUID preservados, falha/reconsulta, inativo e destruição sem limpar intenção |

S02-UI01/02 continuam cobrindo horários e agenda pública. A regressão das
famílias existentes é executada no mesmo candidato; UI29/UI31 e smokes de
homologação continuam no gate Linux. Pedidos, checkout, pagamentos, cozinha,
regiões e demais famílias futuras não fazem parte do aceite desta sprint.

## Histórico local — primeiro incremento da Sprint 2, 2026-11-06

PRs #3/#4 integrados; revisão da base com CI aprovada. S02-01 implementa
horários/canais e consulta pública, sem aprovação de homologação. [Evidência
local](sprint-02-funcionamento-2026-11-06.md) registra 208 testes backend, 10
pares novos e 20 da fundação no mesmo JAR; não substitui a matriz histórica
nem a homologação do incremento.

| Cenário novo | Famílias | Atores e prova local |
| --- | --- | --- |
| S02-UI01 | T23 (horários/canais), T01, X01/X12 | Administrador edita/persiste; sobreposição e versões antigas negadas; mudança de fuso exige reconsulta; público consulta o resultado |
| S02-UI02 | T01, X14 (conexão) | Público escolhe unidade; offline remove disponibilidade; reconexão exige nova consulta; storage privado ausente |
| FuncionamentoUnidadeTest / HorarioFuncionamentoTest | T01/T23, X12/X13 | API/serviço: seis perfis não administrativos negados, sessão/reautenticação, outro tenant, constraints, concorrência, rollback, fuso/madrugada |

S02-UI01/02 passaram em Chromium desktop/360/768, Firefox e WebKit desktop.
Naquele incremento, shell/PWA e T02–T05/T20–T21 ainda eram futuros; sua
implementação e validação local posterior estão no registro integrado acima.
Status final e processos no [checkpoint](../25_EXECUTION_STATUS.md).

## Histórico — ciclo35, 2026-11-06

Baseline95 aceito em homologação:175backend/24XML,215pares UI01–43,20fundação
e50smokes de identidades, total285pares únicos nos cinco projetos, sem falha/
erro/skip/retry/flaky. Recibos/hashes/fontes/OIDs reabertos; não somar partidas
frias nem matrizes antigas. Manutenção/troca/contas/aceitação nativas aprovadas.
Revisão visual:56imagens32/34 e dez viewports hml adicionais, limites explícitos.
Os sete critérios técnicosSprint01 foram conferidos. PR3 aberto, integração
em main pendente; Sprints02–05, famílias futuras, Mac e piloto não aprovados.
[Evidência final35](sprint-01-retomada-ciclo-35.md).

## Histórico — ciclo34, 2026-11-06

Consolidação final do mesmo JAR95:215pares únicos/10parcelas aprovados,
sem falha/skip/retry/flaky, com resultados/hashes/cobertura reabertos e candidato
recolhido.56capturas vinculadas:26principais/20complementos/10adicionais,
com limites de componentes/viewports explícitos. Manutenção95 não iniciou
por preflight incorreto do coordenador (dev recusado em helper test/hml).
Troca/smokes/aceitação pendentes; nenhum gate global. Revisão independente conferiu
rastreabilidade dos sete critérios, sem converter execução futura em aprovação.
[Evidência34](sprint-01-retomada-ciclo-34.md).

## Histórico — ciclo33, 2026-11-06

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

Retrato histórico da Sprint 1 no candidato95. Os estados abaixo não descrevem
o checkout atual: as seções de Sprint 2 e Sprint 3 no início deste inventário
registram a cobertura posterior, distinguindo validação local de homologação.

| ID | Estado histórico registrado | Dependência/evidência parcial |
| --- | --- | --- |
| T01 | Parcial, não aprovado como família | Resolução do domínio/listagem testadas; escolha/horários pendentes |
| T02 | Não implementado/não executado | Sprint 02 |
| T03 | Não implementado/não executado | Sprint 02 |
| T04 | Não implementado/não executado | Sprint 02 |
| T05 | Não implementado/não executado | Sprint 02 |
| T06 | Aprovado no escopo Sprint01 | Login/cadastro/recuperação/verificação/convites no95, com negativos, matriz integrada e hml; e-mail é captura fictícia |
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
| T23 | Parcial, família não aprovada | CRUD lógico de unidades aprovado no95; horários/regiões/parâmetros futuros pendentes |
| T24 | Aprovado no escopo Sprint01 | Equipe/vínculos/convites e último Administrador, incluindo concorrência, revogação e UI35; matriz95 e hml conferidos |
| T25 | Aprovado no escopo Sprint01 | Matriz versionada, conflito, autorização e revogação comprovados no95; isso não entrega ações de negócio de pedidos/pagamentos futuros |
| T26 | Não implementado/não executado | Sprint 04; E04/E05 pendentes |
| T27 | Parcial, família não aprovada | Acompanhamento/exportação cadastral por unidade aprovados no95; eventos de pedidos/pagamentos e leitura nas Sprints03–04 |
| T28 | Aprovado no escopo Sprint01 | Identidade SaaS, HTTP/UI/CLI/fila, retomada e suspensão conferidos; assistido28 histórico preservado e componentes compatíveis no95. Não há pedidos para homologar suspensão operacional futura |

## Cenários transversais

Retrato histórico da Sprint 1 no candidato95; consultar as seções vigentes
no início deste inventário para a cobertura acrescentada nas Sprints 2 e 3.

| ID | Estado histórico registrado | Dependência/evidência parcial |
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
| X15 | Parcial, não aprovado como cenário completo | SHA/hash, restore isolado com aplicação, retorno nativo após DDL/erro e baseline95 aceito; mídia, recuperação integral e mudanças incompatíveis futuras pendentes |

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

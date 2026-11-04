# Checkpoint de execução

[Índice](README.md) · [Ciclo 10](evidencias/sprint-01-ciclo-10.md) · [Cobertura](evidencias/cobertura.md)

## Incremento vigente — retomada ciclo 7, 2026-11-04

Missão não concluída. Workers herdados recolhidos: eventos aprovou quinze
combinações; S01-UI04 aprovou duas/falhou três. Trace confirma resposta sem espera
e prazo total esgotado; corrigidos sincronização HTTP e orçamento da jornada,
sem retry ou remoção de assertivas. Reexecução ainda pendente neste registro.

Revisão independente detectou revogação de funcionário bloqueada por vínculo
inativo e pausa ausente na interrupção da fila. Vermelhos reproduzidos;
backend corrigido passou quatro regressões PostgreSQL, incluindo login simultâneo
e revogação de ambas as sessões. UI mostra, remove e restaura vínculos inativos;
S01-UI35 escrito, E2E novo ainda pendente. Pausa prévia cobre execução/read-back
incertos e SIGTERM; testes Python e lógica frontend executados.

Novo ensaio de banco executado de verdade: snapshot exportado, pg_dump e restore
em cluster separado sem TCP, 1197 tabelas/11922 linhas, 71 empresas ativas ou
suspensas (70 com usuários/unidades), conteúdo e metadados equivalentes.
Tempo total 36,346s; restore/verificação 24,321s. Falhas anteriores preservadas:
limite de locks privado, parsing JSON e representação de constraints/ACL.
Não cobre mídia/chaves/aplicação restaurada nem libera deploy/migration hml.

Fila herdada despachou três UUIDs via timer/Java: dois concluídos e falha injetada
no segundo, conforme esperado. Runner falhou ao parar timer transitório já
removido; constraint foi limpa. Retomada do UUID falho ainda pendente; não
confundir lote observado com aprovação integral. Hml fundação preservada.

Publicado `dfe496cd450044cb6e35d390443913944f1dff97`; remoto/PR head relidos.
CI aprovada nos dois runs; log confirma 165 backend/50 Python sem falha/erro/skip.
Build local identificado e worker E2E finito em execução independente; não
repetir nem interromper. E2E aguarda gate e faz S01-UI35/UI04/eventos e retomada
do UUID da fila. Sem aprovação futura presumida. [Evidência](evidencias/sprint-01-retomada-ciclo-7.md).
PR #3 draft, sem merge. Depois: manutenção e demais critérios; 02–05 não iniciadas.

## Registro herdado — encerramento ciclo 6

Missão NÃO concluída. Aviso efetivo de orçamento quase esgotado recebido depois
da consulta de 17:57:16Z; após o aviso, somente gravações obrigatórias de handoff.
Não foi iniciado outro coordenador, nem repetido/interrompido o build herdado.

Publicado e remoto/PR relidos: `02e694d9dbdb7fc3bf2078126305d77e8de07372`.
PR #3 OPEN/draft/base main, corpo atualizado e relido. CI do `5f15836` aprovada
nos dois runs; log confirma 163 backend e 43 Python, sem falha/erro/skip. CI do
head posterior ainda não consolidada; não transferir aprovação entre SHAs.

Worker E2E inicial terminou às 17:56:15Z, exit 1: eventos dez aprovações/cinco
falhas, convites quinze aprovadas, identidade 43 aprovadas/duas falhas e SaaS
quinze aprovadas. Nenhum retry/skip/flaky; falhas não foram apagadas. Correções
de seletores/sincronização/captura publicadas. Captura mobile de convites revisada.

Workers predeterminados seguem independentes: reexecução de eventos e ensaio
real da fila; depois S01-UI04 nos cinco projetos. Às 17:57:16Z, o primeiro estava
em readiness e o segundo aguardava; nenhum resultado novo consolidado. Não
interromper nem duplicar: conferir unidades/PIDs/manifests/resultados antes de
outra suíte, build ou migration. STATUS privado contém caminhos e limpeza de
constraint exclusiva de teste, caso o ensaio precise de recuperação.

Fila implementada e testes/guardas verificadas, mas despacho Java/timer ainda
sem resultado observado neste encerramento. Não chamar fixture unitária ou
recusa de lock de aprovação operacional. Hml preservada em 449ce3c, health UP
na última verificação; sem deploy/reinício/migration. Sem merge/CONCLUSAO.json.

Relatório privado navegável gerado antes da consolidação SaaS; handoff distingue
esse snapshot dos resultados posteriores. Estes registros finais são locais,
posteriores ao push. Próximo: recolher workers sem repetir, corrigir falhas,
completar manutenção/backup/restore e critérios restantes. Sprint01 aberta;
02–05 não iniciadas. Nenhum critério pendente convertido em aprovação.

## Retomada ciclo 6 — 2026-11-04

Build herdado de `dee85d3` recolhido sem repetição: exit 0/gate true, hash
`8c70f3e21bc1352210c2d5a8b9fac26b41e51036eb5f751dcb1ff3a2a750780e`.
Worker E2E terminou com falha antes de executar cenários: configuração de eventos
importava a guarda de identidade e recusava seu próprio host. Corrigida derivação
direta da configuração base, com origem de eventos restrita e prontidão preservada.
Revisão independente detectou mock incorreto no teste de configuração; corrigido
para carregar a configuração base real. Teste e descoberta Playwright passaram,
sem equivaler à execução dos quinze cenários. Homologação 449ce3c saudável e
preservada; PR #3 OPEN/draft, sem merge. Próximo: reexecutar E2E no JAR já aprovado
com fonte de testes identificada, implementar fila operacional e critérios restantes.

Incremento do ciclo 6: despacho limitado da fila por CLI real, com guardas de
artefato/migrations, read-back, resultados privados, pausa técnica e tratamento
de término. Revisão independente encontrou três falhas operacionais corrigidas;
43 testes Python e typecheck passaram. Segunda revisão das correções não pôde
ser delegada por limite operacional de subagentes; diff/retestes locais não
foram apresentados como nova revisão independente. Ensaio nativo da fila ainda
pendente. [Evidências e limites](evidencias/sprint-01-retomada-ciclo-6.md).

E2E no JAR herdado: convites passou quinze combinações, viewport real e captura
mobile revisados. Eventos teve dez aprovações/cinco falhas por seletor de label
ambíguo; correção exata mantém assertivas, reexecução pendente. Identidade/SaaS
continuam em worker próprio; não duplicar suíte. Nenhum build novo necessário
para scripts/testes sem mudança na fonte principal do JAR.

## Encerramento — retomada ciclo 5, 2026-11-04

Missão NÃO concluída. Aviso efetivo de orçamento quase esgotado recebido após
consulta de 17:09:59Z; depois somente gravações obrigatórias de handoff.

Publicado: `dee85d3cd9455622ba35e8ee5d147c60e1858fe8`. PR #3 OPEN/draft,
base main e head remoto relidos. CI dos dois runs aprovada; 163 backend sem
falha/erro/skip. Localmente, AcessosTest terminou com 19 testes aprovados,
incluindo os sete cenários de eventos; XML e nomes conferidos. Isso NÃO é
resultado consolidado do build inteiro.

Build independente continua sem result.json na consulta de 17:09:59Z; não foi
interrompido nem repetido. Worker E2E próprio foi iniciado, com manifesto/PID,
para aguardar gate/hash e executar eventos/convites/identidade/plataforma.
Nenhum resultado E2E novo consolidado neste encerramento. Conferir unidades,
job/resultados/logs e candidato ANTES de novo build/suíte/migration. Não usar
JAR herdado V11 contra rm_test migrado para V12. STATUS privado contém caminhos.

Última verificação hml 17:05:24Z: 449ce3c, health UP/PID41392. Sem deploy,
reinício ou migration de hml; sem merge. Checkpoint/evidência/cobertura finais
permanecem locais posteriores ao push; preservar. Relatório privado navegável
contém snapshot verificável de 16:58Z; handoff final separado distingue dados
observados depois, sem inventar resultado futuro. Sem CONCLUSAO.json.

Próximo passo: recolher build/E2E duráveis sem repetir; corrigir falhas e revisar
capturas, inclusive convites com viewport real. Prosseguir fila operacional,
manutenção/backup/restore e critérios restantes. Sprint01 aberta;02–05 não
iniciadas. Nenhum critério pendente foi convertido em aprovação.

## Registro intermediário — retomada ciclo 5, 2026-11-04

Publicado e remoto/PR relidos: `dee85d3cd9455622ba35e8ee5d147c60e1858fe8`,
PR #3 OPEN/draft/base main. Dois checks CI success, runs 41871742353/41871726704;
log conferido: 163 backend, zero falhas/erros/skip, incluindo as duas provas
adicionais de eventos. Build local independente ainda em execução; não equivale
ao gate local. Worker E2E próprio aguarda seu resultado e executará eventos,
convites, identidade e plataforma, sem deploy. Consultar manifests/unidades
antes de outro build/suíte/migration; não repetir trabalho durável em andamento.

Missão não concluída. Build/E2E herdados de 31cda03 terminaram exit 0; candidato
herdado encerrado antes da migration V12. Homologação segue preservada em 449ce3c.
Correção visual bd30b09 revisada independentemente; E2E com viewport correta ainda
pendente, sem transferir aprovação do artefato anterior.

Novo incremento de produto: eventos cadastrais de unidade atômicos, cursor local,
ação delegável e polling Angular, com limpeza/revalidação por sessão e unidade.
Revisão independente encontrou corridas remanescentes de autenticação assíncrona;
reproduzidas e corrigidas nos serviços empresarial/SaaS. Testes e contratos novos
na [evidência](evidencias/sprint-01-retomada-ciclo-5.md); cinco testes PostgreSQL
focados e seis JS passaram. Duas provas adicionais PostgreSQL aguardam o build
integrado local. Typecheck passou. Na gravação inicial, build/CI/E2E estavam
pendentes; atualização de CI confirmada acima, sem transferir gate ao build local.

Próximo passo: consolidar testes focados e adicionais de concorrência/isolamento,
publicar incremento revisado, build identificado e E2E de eventos/convites mais
regressões afetadas. Fila operacional/backup/restore e demais critérios Sprint01
permanecem pendentes;02–05 não iniciadas. Sem CONCLUSAO.json.

## Encerramento — retomada ciclo 4, 2026-11-04

Missão NÃO concluída. Aviso efetivo do executor de orçamento quase esgotado
recebido após consulta de 16:18:52Z; depois somente gravação de handoff.

Publicado e remoto/PR relidos: `bd30b09e7faa4cacf302baf478c8745cfd3a7f9b`,
PR #3 OPEN/draft/base main. Corpo atualizado e relido; CI desse SHA ainda
QUEUED na última consulta. Sem merge/deploy. Correção visual posterior ao
`31cda03` não está no build em execução; não transferir seu gate para o head.

Build nativo independente do `31cda03cee98829384a467511fc9cf5c241a6e83`
permanece em execução, PID observado 219046. Último log contém classes concluídas
sem falhas, mas não existe resultado/gate consolidado: NÃO declarar build aprovado.
Worker `restaurant-manager-e2e.service`, PID observado 219715, aguarda o resultado
antes de iniciar candidato e suítes provisionamento/SaaS/estado. Não foi outro
coordenador nem houve interrupção deliberada. Próximo ciclo DEVE reconciliar
unidades, job/resultados/logs e candidato antes de iniciar build/suíte/migration.

Última verificação hml 16:18:52Z: 449ce3c/health UP/PID41392; sem alteração.
Relatório privado `restart4-report.html` e checkpoint estruturado foram gerados
com resultados reais e pendências. STATUS privado contém os caminhos completos.
Este handoff é local posterior ao push; preservar. Sem CONCLUSAO.json.

Próximo passo: recolher o build e E2E duráveis existentes SEM repetir; corrigir
eventuais falhas. Depois revisar e validar o head com correção visual, executar
convites e regressões com largura de viewport configurada. Continuar fila
operacional, eventos/projeções e manutenção/backup/restore. Sprint01 aberta;
02–05 não iniciadas. Nenhum critério pendente foi convertido em aprovação.

## Registro intermediário — retomada ciclo 4, 2026-11-04

Missão não concluída. Worker herdado e039dc2 terminou exit 0 e foi reconciliado:
estado comercial, SaaS e convites aprovados nos cinco projetos, quinze combinações
por suíte, sem retry/skip/flaky. Candidato encerrou; não houve repetição do build.
Hml conferida saudável no 449ce3c; sem deploy/reinício/migração.

Novo incremento real: solicitação SaaS de provisionamento, consulta/listagem,
retomada versionada e UI; worker privilegiado CLI por UUID, sem DDL no HTTP.
Duas revisões independentes; achados reproduzidos e corrigidos. Nove testes
PostgreSQL e dois testes focados de lógica frontend passaram; typecheck aprovado.
[Evidência](evidencias/sprint-01-retomada-ciclo-4.md). Build/CI/E2E novos pendentes
nesta gravação; PR #3 continua draft, sem merge. Não existe timer da fila instalado.

Próximo passo: publicar incremento revisado, build identificado independente e
E2E S01-UI29–31 com worker real, depois regressões afetadas. Não usar JAR e039dc2
contra public V6. Continuar eventos/projeções e gate de manutenção/backup/restore.
Sprint01 aberta;02–05 não iniciadas. Sem CONCLUSAO.json.

### Publicação e descoberta visual — ciclo 4

Incremento `31cda03cee98829384a467511fc9cf5c241a6e83` publicado; remoto e PR #3
OPEN/draft/base main relidos. Build independente preservado em andamento; E2E
durável aguarda seu resultado antes de adquirir lock e iniciar candidato. CI
ainda estava queued na consulta de 16:15Z, sem aprovação presumida.

Inspeção visual encontrou overflow no botão de convites da captura herdada.
Correção CSS e doze assertivas de largura são posteriores ao 31cda03 e NÃO estão
em seu artefato. Probe de layout isolado reproduziu 1687px e passou a360px;
typecheck passou. Não chamar isso de reexecução E2E. Registros anteriores de
sucesso funcional não aprovam a responsividade falha. Não repetir/interromper o
build atual para incorporar essa correção; consolidar primeiro seus resultados.

## Encerramento — retomada ciclo 3, 2026-11-04

Missão NÃO concluída. Aviso efetivo de orçamento quase esgotado recebido depois
da consulta de 15:30:40Z; após o aviso, somente gravação de handoff. Build e CI
do e039dc2 aprovados conforme registro abaixo. Nenhum E2E novo consolidado antes
do aviso; não inferir aprovação a partir do início do candidato.

O worker nativo de E2E permanece independente, sem interrupção deliberada:
`restaurant-manager-e2e.service`, PID observado 206684; candidato próprio 206695,
health UP em loopback na última consulta. Lock exclusivo de E2E e lock de
build/deploy recusaram aquisição concorrente real. O próximo ciclo DEVE recolher
resultado/log/manifesto privados e conferir unidade/processos ANTES de iniciar
outra suíte, migrar banco ou reconstruir. O worker executa somente as suítes
predeterminadas e encerra seu candidato; não é outro coordenador nem faz deploy.

Publicado: `e039dc2bc3e02c4d046257c94233d7ea065e59a5`, PR #3 OPEN/draft/base main,
remoto relido. Checkpoint/evidência finais locais posteriores ao push; preservar.
Corpo do PR foi atualizado antes de concluir build/CI e ainda os descreve em
execução. Atualizar após recolher E2E. Hml permanece na fundação 449ce3c, sem
reinício/deploy/migração; não houve nova verificação após o aviso.

Próximo trabalho concreto: recolher as suítes estado-empresa/SaaS/convites do
JAR aprovado sem repetir build, corrigir falhas e executar regressões restantes;
seguir provisionamento HTTP/eventos/projeções e manutenção/backup/restore.
Sprint01 aberta;02–05 não iniciadas. Sem CONCLUSAO.json. STATUS privado contém
job, comandos, processos e limites precisos; relatório privado desta rodada
registra somente resultados já observados, não o resultado futuro do worker.

## Registro intermediário — retomada ciclo 3

Missão não concluída. Base f00137f e CI/PR #3 draft conferidos; documentos locais
herdados preservados. JAR herdado reutilizado, sem reconstrução. E2E SaaS teve
doze aprovações/três falhas nos quinze cenários: duas mensagens WebKit mascaradas
pelo indicador de rede, corrigidas; Firefox sem resposta de login ainda pendente
de diagnóstico/reexecução. Candidato herdado encerrado antes de V5 pública.

Novo incremento: consulta exata, reautenticação e suspensão/reativação SaaS com
versão, motivo e auditoria atômica; contexto SUSPENSO preserva acesso empresarial.
Revisão independente apontou cartão desatualizado após reconciliação; vermelho
reproduzido e correção aplicada. 25 testes focados aprovados, XML sem falhas,
erros ou skip; typecheck aprovado. Build/CI/E2E novos pendentes neste registro.
[Detalhes](evidencias/sprint-01-retomada-ciclo-3.md).

Hml verificada em 449ce3c/health UP, sem deploy/migração/reinício. Não há pedidos
nem gate de admissão de vendas entregue. Provisionamento HTTP/eventos/projeções,
manutenção/backup/restore e critérios restantes continuam pendentes; 02–05 não
iniciadas. Próximo passo: publicar incremento revisado, build independente e
E2E S01-UI26–28/SaaS/convites no candidato imutável. Sem CONCLUSAO.json.

Incremento publicado e remoto/PR relidos: `e039dc2bc3e02c4d046257c94233d7ea065e59a5`.
CI runs 41855643192/41855632008 success no SHA exato; log confirma 147 backend.
Build local independente terminou em 2026-11-04T15:28:43Z, exit 0/gate true,
147 backend sem falhas/erros/skip e 26 Python; frontend/auditorias aprovados.
Hash `33a5dc2edd61b9d2f7db3fcdaa497af70218159866553fbd0636146c02c51b01`.
Não reconstruir este artefato para alterações documentais. E2E está em worker
nativo próprio, serializado após build, com manifesto/log/resultado privados;
consultar unidade/processos antes de outra suíte. Ainda sem aprovação E2E neste
registro. Não é outro coordenador e não promove o release.

## Encerramento — retomada ciclo 2, 2026-11-04

Missão NÃO concluída. Aviso efetivo do executor de orçamento quase esgotado
recebido após a consulta de 14:43:34Z. Depois disso, somente encerramento seguro
e handoff. Runner SaaS e candidato próprios foram encerrados pela ferramenta;
nenhum resultado E2E SaaS consolidado/aprovado. Conferir manifesto/PID/listener
na retomada antes de reutilizar porta; a última saída apenas aguardava readiness.

Commit publicado e remoto/PR relidos: `f00137fc9f77533be2e5263e95d448d87b4a2ed6`.
PR #3 OPEN/draft; ambos os checks CI success. Build local independente exit0/gate
true, 138 backend sem falhas/erros/skip, 26 Python e frontend/auditorias aprovados;
hash `e506684145ab225cf9cdf4f15bf7f7630137ece155e92241cf7b72341c8fa399`.
NÃO repetir build: job/artefato privado imutável disponíveis. Operador fictício
foi criado e relido em rm_test; fixture privada existe, não repetir seed cegamente.

Verificação herdada passou quinze combinações; convites quatorze/uma falha,
correção publicada, reexecução ainda pendente. SaaS teve duas falhas de projeto
identificadas na revisão, reproduzidas e corrigidas; 29 testes focados aprovados.
Demais regressões integradas não executadas. Última verificação hml: 449ce3c,
health UP/PID41392, sem deploy/restart/migração; não houve releitura após aviso.
Checkpoint final local posterior ao push. Próximo passo: E2E no JAR f00137f já
aprovado, revisar/corrigir resultados, prosseguir provisionamento/suspensão HTTP,
eventos/projeções e manutenção/backup/restore. Sprint01 aberta;02–05 não iniciadas.
Sem CONCLUSAO.json. Detalhes, fixture e comandos no STATUS privado do ciclo 2.

## Registro intermediário — retomada ciclo 2

Missão não concluída. Fontes/estado real reconciliados, build 543d440 reutilizado
sem reconstrução: 129 backend aprovados e gate/hash conferidos. Verificação
S01-UI20–22 passou quinze combinações; captura mobile revisada. Convites passaram
quatorze e falharam uma combinação Firefox na sincronização do login (HTTP 200
em cerca de oito segundos); teste corrigido, reexecução pendente. Demais suítes
herdadas não executadas nesta rodada, pois runner parou na falha. Candidato antigo
encerrado antes da nova migration public. Hml 449ce3c saudável e preservada.

Novo incremento real: identidade SaaS isolada, consulta de empresas e UI. Duas
revisões independentes neste ciclo (verificação herdada e SaaS). Achados SaaS
reproduzidos: FOR SHARE sem privilégio e reativação sem revogação durável. V4 e
regressão corrigem; 29 testes focados aprovados, sem falhas/erros/skip; typecheck
aplicação/E2E aprovado após remover import indisponível, sem dependência nova. Não atribuir
evidências herdadas ao artefato novo. [Detalhes](evidencias/sprint-01-retomada-ciclo-2.md).
PR #3 continua draft; sem merge/deploy. Provisionamento/suspensão HTTP, eventos,
projeções, manutenção/backup/restore e demais critérios pendentes; 02–05 abertas.

Incremento publicado: `f00137fc9f77533be2e5263e95d448d87b4a2ed6`, remoto/PR relidos.
Dois checks CI success, runs 41848026109/41848018333; log confirmou 138 testes
backend sem falhas/erros/skip. Build local independente terminou exit 0/gate true
em 2026-11-04T14:41:06Z, hash
`e506684145ab225cf9cdf4f15bf7f7630137ece155e92241cf7b72341c8fa399`.
A espera da ferramenta expirou aos 420 segundos, mas não interrompeu o worker;
resultado durável foi recolhido, sem repetir build. E2E novo ainda pendente aqui.

## Encerramento da retomada — ciclo 1, 2026-11-04

Missão NÃO concluída. Aviso efetivo do executor de orçamento quase esgotado
recebido ao recolher o segundo build; após isso, somente encerramento seguro e
handoff. Runner da nova validação encerrado pela ferramenta; dez contas fictícias
de verificação foram preparadas, mas nenhum E2E novo foi consolidado/aprovado.
Conferir processos/manifesto do candidato na retomada antes de reutilizar a porta.

Publicado e remoto/PR relidos: `543d440fb35fa1442cd0b681bab3a37aa41295e0`, PR #3
OPEN/draft/base main. Build independente desse SHA terminou exit 0/gate true em
2026-11-04T13:56:19Z; hash
`d19cfb078805f270ea092706ffb3513276a83e116f3ad4fc44aef16cd5e4985f`.
Não repetir o build: resultado, gate e artefato imutável estão no job privado.
CI runs 41840935866 e 41840925360 success; log do primeiro confirmou 129 testes
backend sem falhas/erros/ignorados. XML local completo do novo build não foi
reconsolidado após o aviso; os quatorze focados locais já estavam conferidos.

Convites anteriores: treze aprovações/duas falhas, correção de sincronização
publicada, reexecução pendente. Verificação preexistente: API/Angular/V11 e dez
testes novos implementados; E2E S01-UI20–22 pendente, assim como regressão integrada
do candidato. Revisão independente do último incremento continua bloqueada pelo
limite desta chamada, sem aprovação substituta. Sprint 01 aberta; 02–05 não iniciadas.

Última verificação de hml antes do aviso: SHA
`449ce3ccf941c73b34ac15a4754183c147f91aaa`, health UP/PID41392. Sem deploy,
reinício ou migração hml. Checkpoint final local posterior ao push; preservar.
Próximo passo: conferir candidato/fixture já criada, executar E2E do JAR V11
aprovado sem reconstruí-lo, revisar captura e corrigir falhas; então continuar
SaaS/suspensão/eventos/projeções e manutenção/backup/restore. Sem CONCLUSAO.json.

## Retomada autorizada — ciclo 1 reiniciado, 2026-11-04

Missão não concluída. Git/PR #3 draft e os dois checks CI do `c3233db` conferidos;
checkpoint herdado preservado abaixo. O build privado desse SHA falhou por
`KeyError: TMPDIR`; não existe aprovação local desse job. Corrigida propagação
explícita de scratch/PATH/RM_HOME ao systemd, sem repassar ambiente completo.
Teste reproduziu a ausência do argumento antes da correção. Revisão independente
identificou ausência de validação de privacidade do scratch, também corrigida.
Build real e E2E ainda pendentes neste registro. Homologação conferida saudável no
SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, sem deploy/reinício.

Atualização do incremento: build systemd de `d3763addb3a121728113bcec2f794a270966c240`
aprovado, 119 backend e 26 Python; hash
`11adb0784f12a0222a5e4e812b147d86cb73cdddabc37f10ccb5d57b745cf505`.
Recusa concorrente e ambiente efetivo do worker conferidos. PR #3 draft/head e
dois checks CI desse SHA verificados. E2E convites no candidato HTTPS V10: treze
aprovações/duas falhas de sincronização da reautenticação; teste corrigido para
aguardar resposta real 204, reexecução pendente. Candidato encerrado antes de V11.

Implementada verificação de e-mail de conta preexistente, com API/Angular/V11,
captura cifrada e finalidade distinta. Vermelho real 403 versus 202. Dez testes
novos e quatro de proteção/captura aprovados; typecheck passou. Build/E2E desse
incremento pendentes. Revisão independente solicitada, mas bloqueada pelo limite
de subagentes desta chamada; revisão local não encerra esse gate. Não mesclar PR.
[Evidência e limites](evidencias/sprint-01-retomada-ciclo-1.md).

## Encerramento do ciclo 12 — 2026-11-04

Missão NÃO concluída. Implementado runner de build independente da sessão em
`scripts/durable_build.py`: clone privado destacado, unidade systemd exclusiva,
locks, identidade PID/início/SHA, log, resultado e verificação do gate/hash. Revisão
independente somente leitura realizada. Limitações registradas no runbook:
promoção pelo deploy atual não integrada; interrupção abrupta pode deixar resultado
ausente e requer reconciliação; nenhuma garantia contra queda de energia.

Testes Python: 24 aprovados, incluindo cinco métodos novos do runner e subcasos
de SHA/hash/checks divergentes. Fixtures unitárias não são releases. Sintaxe Bash,
scanner de 197 arquivos e diff aprovados. Primeira tentativa de clone recusou
wrapper Windows por normalização CRLF; corrigida preservação dos bytes no clone
privado, sem ignorar mudanças de conteúdo. Commits `618e029` e `c3233db` criados;
push da branch existente retornou sucesso. Após aviso de orçamento, SHA remoto,
metadados do PR e CI do novo SHA NÃO foram relidos. PR #3 era OPEN/draft na retomada;
CI do incremento anterior `51cd2d0` estava aprovada nos dois runs consultados.

Runner real iniciado pelo systemd para `c3233db99acf8cf9ada9dd926924690cea7274dd`.
Última consulta imediata retornou unidade inactive/MainPID=0; resultado/log do job
NÃO consolidados antes do aviso de orçamento. Não afirmar build aprovado nem
continuidade comprovada por esse lançamento. Próximo ciclo DEVE ler
`builds/latest.json`, request/running/result/log privados e reconciliar a unidade
antes de iniciar outro build. A primeira tentativa deixou clone privado sem job
iniciado; não confundir com a segunda. Nenhum E2E novo, candidato ou deploy.

XML herdados conferidos: ConvitesTest 12, CadastroClienteTest 14 e RecuperacaoTest
12, sem falhas/erros/skip, relativos à rodada focada anterior. Não constituem gate
integrado deste SHA. SQL dev/test/hml confirmou identidades separadas e loopback.
Homologação verificada na retomada: `449ce3ccf941c73b34ac15a4754183c147f91aaa`,
health UP/PID 41392; sem reinício/migração/deploy neste ciclo. Não houve nova
verificação final após o aviso. completion-rejected.json ausente; sem CONCLUSAO.json.

Próximo trabalho: recolher/corrigir o build durável, comprovar recusa concorrente
real e continuidade; executar convites e regressão integrada no candidato V10;
seguir critérios pendentes de verificação/SaaS/suspensão/eventos/projeções e
manutenção/backup/restore. Sprint 01 aberta; 02–05 não iniciadas. Checkpoint final
permanece local posterior ao push e deve ser preservado.

## Encerramento do ciclo 11 — 2026-11-04

Missão NÃO concluída. O executor avisou orçamento efetivo quase esgotado após preparar o script privado de empacotamento do candidato de teste. Depois disso, somente encerramento seguro e handoff. Nenhum empacotamento/candidato novo ou E2E de convites foi iniciado.

Incremento publicado: `51cd2d053fb50ca5528c842423c74884351cab12`, branch `hermes/sprint-01-identidade-acessos`, PR #3 OPEN/draft, base main; SHA remoto e metadados do PR relidos após push. CI do novo SHA ainda NÃO conferida; não transferir aprovação da CI anterior. Sem merge adicional.

Vermelho da corrida revogação/expurgo reproduziu hash restaurado, com falha esperado um registro limpo e observado zero. Corrigido com lock da linha depois da política empresarial. Rodada local `ConvitesTest,CadastroClienteTest,RecuperacaoTest` seguida de typecheck terminou exit 0; no encerramento, a ferramenta respondeu `already_exited`, não houve interrupção dessa rodada. Log já observado confirmava doze testes de convites e quatorze de cadastro sem falhas/erros/skip. XML/contagem final da recuperação não foram consolidados após o aviso; não inventar total integrado. Scanner de 195 arquivos e diff passaram antes do commit.

Não há build-gate/hash novo do 51cd2d0. Script privado preparado permite empacotar candidato exclusivo de testes, explicitamente SEM gate de release; NÃO foi executado. Build completo identificado continua pendente, assim como S01-UI17–19 e regressão completa corrigida. Candidato herdado foi encerrado antes de V10; nenhum novo servidor iniciado. Homologação permanece no último release saudável, sem deploy/reinício/migração neste ciclo. Última verificação foi na retomada, não após o aviso final.

Retomada: conferir Git/processos/bancos, preservar estes documentos locais finais; consolidar XML/logs da rodada focada, conferir CI do 51cd2d0 e atualizar corpo do PR (ainda herdado). Executar build identificado completo de checkout limpo; novo candidato HTTPS/rm_test compatível com V10; rodar convites e regressões com cobertura exata por projeto e revisão visual. Não usar JAR V9 contra V10. Verificação de funcionários preexistentes, SaaS/suspensão/eventos/projeções, demais critérios e manutenção/backup/restore continuam pendentes. Sprint 01 aberta; 02–05 não iniciadas. Sem CONCLUSAO.json.

## Registro intermediário do ciclo 11

Missão NÃO concluída. Retomada reconciliou Git/PR, serviços e identidades SQL dev/test/hml. completion-rejected.json ausente. Registros herdados preservados em `8e4b1d328f02f96bf5b27033e6cad4979dc27a78`. Build identificado desse SHA passou: 107 testes backend sem falha/erro/skip, 19 Python, Angular/auditorias. Hash `b94cde1f9804263b434d516b8e140e8c2b2aa877974735fc3695ad787dff75cb`.

No candidato HTTPS/rm_test herdado, cadastro resultou em dezenove aprovações e uma falha WebKit S01-UI15; recuperação passou quinze combinações. A falha de cadastro verificava o alerta antes da conclusão da perda de resposta injetada. Snapshot ainda ocupado e screenshot posterior com alerta correto foram inspecionados. Correção sincroniza com `requestfailed`/resposta 502, sem afrouxar assertivas. Reexecução dos quatro cenários de cadastro em WebKit passou sem retry/skip/flaky. Não chamar essa parcela de matriz completa corrigida. Identidade herdada foi interrompida para priorizar incremento real; fundação desta rodada não executada. Candidato encerrado antes de V10.

Incremento em desenvolvimento: convites administrativos idempotentes, aceite verificado com código único, revogação, consulta exata, captura cifrada, UI e OpenAPI. Vermelho HTTP real 403 versus 200 reproduzido antes da implementação; primeira tentativa do probe teve timeout no login e não é evidência comportamental. Duas revisões independentes somente leitura; achado de corrida revogação/expurgo em reprodução. Testes novos/build/CI/E2E ainda não aprovados neste registro. Sem deploy/migração de hml: último release saudável continua `449ce3ccf941c73b34ac15a4754183c147f91aaa`.

Próximo passo: concluir testes de convites/expurgo e correções, typecheck e regressões; publicar incremento revisado no PR #3 draft, build identificado e E2E novo. Verificação de funcionários preexistentes, SaaS/suspensão/eventos/projeções, demais critérios e manutenção/backup/restore seguem pendentes. Sprint 01 aberta; 02–05 não iniciadas. Nenhum CONCLUSAO.json.

## Encerramento do ciclo 10 — 2026-11-04

Missão NÃO concluída. O executor emitiu aviso de orçamento efetivo quase esgotado durante o build local novo. Depois do aviso, somente encerramento seguro e gravação de handoff. Build próprio encerrado explicitamente pela ferramenta (`killed`); não é gate aprovado. Nenhum candidato do ciclo 10 foi copiado/iniciado, nem E2E positivo do cadastro executado.

Incremento publicado e remoto/PR relidos: `29441cf86106b4817db365f3a037bf247b73e9ea`, branch `hermes/sprint-01-identidade-acessos`, PR #3 OPEN/draft, base main. Dois runs CI `41818215855` e `41818223314` concluíram SUCCESS no SHA exato: cada um executou 107 testes backend, zero falhas/erros/skip, build Angular/backend e auditorias. Não somar conjuntos repetidos. Trinta testes focados locais e typecheck também aprovados antes do commit.

Build local novo interrompido; nenhum hash/gate novo confirmado. Recuperação quinze + fundação vinte combinações de navegador foram aprovadas neste ciclo somente no SHA herdado `76eeffa`, com artefato `d6efed247099ca8770958c3f27ec93f9a070087e1ad1d0884800486ee224282c`. S01-UI13–16 e regressões integradas do 29441cf permanecem pendentes. O vermelho de UI sobre o candidato antigo não é aprovação da UI nova.

Última verificação de hml antes do aviso: SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, hash `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`, PID 41392, health UP. Sem deploy/reinício/migração de hml. V9 somente em rm_test. Relatório privado navegável produzido com resultados reais e links locais verificados; sem conclusão técnica artificial.

Retomada: conferir Git/processos/bancos e preservar estes registros finais locais; publicar documentação após checks, repetir build identificado completo de checkout limpo, verificar gate/hash e iniciar candidato HTTPS pelo runner privado do ciclo 10. Executar cadastro e regressões por projeto se necessário, sem chamar parcela de matriz completa. Não usar JAR V8 contra banco V9. Depois continuar convites/verificação de funcionários, SaaS/suspensão/eventos e demais critérios. Sprint 01 aberta; 02–05 não iniciadas; nenhum CONCLUSAO.json. Corpo do PR foi atualizado/relido antes da confirmação final da CI e ainda descreve CI/build em execução; atualizar na retomada.

## Registro intermediário do ciclo 10

Missão não concluída. Retomada conferiu Git, bancos/processos, PR #3 OPEN/draft e homologação. Documentos locais herdados preservados/publicados em `76eeffa5f9768bc667eeaec976c83bb00a78708d`. completion-rejected.json ausente. Build identificado desse SHA aprovado: 93 backend, 19 Python, frontend e auditorias; hash `d6efed247099ca8770958c3f27ec93f9a070087e1ad1d0884800486ee224282c`.

Candidato herdado HTTPS/rm_test validou quinze cenários de recuperação e vinte de fundação nos cinco projetos; agregação exata sem retry/skip/flaky. Captura mobile de recuperação revisada. Candidato encerrado antes de V9. Não atribuir esses resultados ao código novo. Hml permanece no SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, health UP, sem deploy/reinício/migração.

Incremento atual: cadastro de cliente com prova de e-mail antes da criação/senha, outbox privada cifrada, códigos de finalidade própria, proteção transacional, UI e OpenAPI. Duas revisões independentes somente leitura; achados de limite depois do lock e erro HTTP 5xx/HTML tratados também na recuperação. Vermelhos de API/UI e contenção do limitador registrados. Rodada corrigida aprovada: 14 cadastro + 12 recuperação + 4 proteção/captura, trinta testes sem falhas/erros/skip. Typecheck aplicação/E2E, diff e scanner de 183 arquivos aprovados. [Evidência](evidencias/sprint-01-ciclo-10.md).

Próximo passo: publicar incremento revisado no PR draft; build identificado de checkout limpo; executar cadastro e regressões sobre novo candidato imutável. Runners privados do ciclo 10 preparados, não executados. Cadastro ainda não está em hml. Convites/verificação de funcionários, SaaS/suspensão/eventos, demais critérios de identidade e manutenção/backup/restore continuam pendentes. Sprint 01 aberta; 02–05 não iniciadas. Sem CONCLUSAO.json.

## Encerramento do ciclo 9 — 2026-11-04

Missão NÃO concluída. O executor avisou orçamento efetivo quase esgotado durante o build local. O processo próprio do build foi encerrado pela ferramenta (`killed`) para não deixar suíte concorrente na retomada. Depois do aviso, somente encerramento seguro e gravação de handoff; nenhum candidato novo foi iniciado.

Commit publicado e remoto/PR relidos: `7818ba626cfa94aafa7015d835111d818c84579c`, branch `hermes/sprint-01-identidade-acessos`, PR #3 OPEN/draft, base main. Primeiro push recebeu erro interno do GitHub; remoto conferido antes da segunda tentativa bem-sucedida. Dois runs CI `41813105884` e `41813113657` concluíram SUCCESS no SHA exato: cada um executou **93 testes backend**, zero falhas/erros/skip, build Angular/backend e auditorias. São duas execuções do mesmo conjunto, não 186 testes distintos.

Build local identificado foi interrompido e NÃO constitui aprovação; não há novo gate/hash local confirmado. Os quinze testes focados e quatro unitários da correção final passaram antes do commit, conforme evidência. E2E herdado de `589ea43` passou integralmente (45 identidade + 20 fundação), mas S01-UI10–12 e regressão integrada do novo SHA NÃO foram executados. Runners privados preparados; nenhum JAR `cycle9-candidate.jar` foi copiado/iniciado neste ciclo.

Última verificação de hml antes do aviso: SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, hash `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`, PID 41392, health UP. Sem deploy/reinício/migration hml. V7/V8 somente em rm_test. Estes registros finais de checkpoint/evidência permanecem locais após o commit; preservá-los. Não houve novo commit/push após o aviso.

Retomada concreta: conferir processos/bancos/Git, preservar e publicar documentos finais após checks; repetir build local completo com checkout limpo, conferir gate/SHA/hash, iniciar candidato HTTPS e executar a nova matriz de recuperação mais regressões. Não reutilizar gate/JAR herdados V6 contra banco V8. Depois avançar cadastro/verificação/convites, SaaS/suspensão/eventos e demais critérios. Sprint 01 segue aberta; 02–05 não iniciadas. Sem CONCLUSAO.json.

## Registro intermediário do ciclo 9

Missão não concluída. A retomada reconciliou Git, PR #3 draft, bancos/processos e release hml saudável. completion-rejected.json ausente. O build herdado de `589ea43551727a95626cfe35bd8686da92a6ffcb` foi confirmado com 77 testes backend aprovados e hash `9ad019a9f72b208e7a101cb2cb297b12fc203fae7ee2a7065e457aa5f991cc2c`; E2E completo herdado aprovado: 45 identidade + 20 fundação, sem retries/skip/flaky. Candidato de teste foi encerrado antes das migrations do incremento seguinte; hml não foi alterada.

Novo trabalho na mesma branch/PR: recuperação de senha empresarial com captura privada cifrada/durável e UI Angular. V7/V8 somente em rm_test, dois revisores independentes somente leitura. Quinze testes focados passaram após corrigir achados reproduzidos; regressão adicional de payload NULL teve vermelho pertinente e quatro testes unitários aprovados após correção. Typecheck frontend/E2E, scanner documental e diff passaram. Build identificado, CI e nova suíte E2E ainda pendentes nesta gravação. [Detalhes e limitações](evidencias/sprint-01-ciclo-9.md).

Próximo passo: publicar incremento revisado no PR draft, build identificado e candidato HTTPS com captura privada; executar S01-UI10–12 nos cinco projetos. Não iniciar outra suíte pesada em paralelo nem reutilizar JAR V6 contra banco V8. Depois, prosseguir cadastro/verificação/convites/SaaS/suspensão/eventos, mantendo Sprint 01 aberta. Preservar hml fundação e completar manutenção/backup antes de promover migrations. AGENTS.md não foi editado: a ferramenta protegeu o arquivo sem aprovação interativa; autorização específica continua registrada nas fontes canônicas já atualizadas.

## Registro herdado preservado

## Encerramento do ciclo 8 — 2026-11-04

Missão NÃO concluída. Encerramento por aviso efetivo do executor logo após o término bem-sucedido do build; depois do aviso, somente gravação de handoff. Coordenador único, sem novo supervisor.

Branch `hermes/sprint-01-identidade-acessos`, commit publicado `589ea43551727a95626cfe35bd8686da92a6ffcb`. Push, SHA remoto e PR #3 OPEN/draft, base main, head conferidos por leitura. Corpo do PR atualizado e relido. Dois checks CI aprovados, runs 41806918815 e 41806926438. Main continua `fa9e595bd3bb3f1d768a279ac25ee03243c12fb9`; nenhum merge adicional. Sprint 01 parcial; 02–05 não iniciadas.

## Incremento publicado

- Rotação JWT herdada revisada, compilada e testada: ativa/anterior, `kid` estrito local, algoritmo fixo, sem fallback/busca externa e configuração sanitizada.
- Corrigida exigência de `iat` original; sua ausência era suprida pelo conversor da dependência. Vermelho reproduzido antes da correção.
- Retenção técnica de sessões/refresh/limitadores, migration V6, transações limitadas e locks; worker por tenant, paginação, contexto limpo após erro, recuperação de lotes e diagnóstico de backlog.
- Refresh/logout retornam credencial inválida quando a sessão desaparece após consulta do hash. Nenhuma chave real ou autenticação do Hermes alterada.
- Duas revisões independentes somente leitura. Achados de emissão ausente, limitação a um lote e diagnóstico sem tenant foram reproduzidos/corrigidos.

Alterações herdadas de README/runbook/evidências do ciclo 7 foram preservadas e publicadas. Este checkpoint final e a atualização final da evidência do ciclo 8 são locais posteriores ao commit, sem novo commit após o aviso do executor.

## Testes e build — resultados distintos

Suíte backend anterior à retenção: 66 aprovados. Primeira regressão focada JWT/retenção/autenticação: 27 aprovados. Rodada focada final: 21 aprovados (JWT 10, PostgreSQL retenção 6, coordenação worker 4 e regressão unitária de sessão removida 1). Zero falhas/erros/skip nas execuções aprovadas. Não somar essas rodadas como suíte integrada.

Uma tentativa anterior de backend foi interrompida por timeout de 240 segundos e foi refeita integralmente; não conta como aprovação. Vermelhos pertinentes e comandos estão nas evidências. 19 testes Python e typecheck aplicação/E2E passaram antes do build.

Build identificado `scripts/build-release.sh` do 589ea43 terminou exit 0, confirmado pela ferramenta de processos. O aviso final impediu releitura/consolidação do XML e do gate/hash: não inventar contagem final nem reutilizar hash de outro build. Conferir `build-gate.json`, artefato e log privados ao retomar.

E2E de identidade (45 casos) e fundação (20 casos) NÃO iniciados neste ciclo. Os runners privados estão preparados, mas candidato HTTPS não foi iniciado nem copiado/promovido. A suíte interrompida do ciclo 7 permanece sem aprovação completa. Não houve revisão visual nova neste ciclo.

## Homologação e processos

Última verificação realizada antes do aviso final por `scripts/verify-release.py`: SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, hash `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`, health UP, PID 41392. Sem deploy/reinício/migration de hml; identidade ainda não está nesse release. Não houve nova verificação após o aviso.

PostgreSQL nativo exclusivo em loopback:55432; V6 aplicada somente em rm_test pelos testes, com identidade SQL verificada. Build e suítes próprias terminaram; nenhum servidor candidato foi iniciado. Serviços hml/PostgreSQL/supervisor preservados. Conferir processos ao retomar, sem matar desconhecidos.

## Próximo passo concreto

1. Reconciliar Git, working tree, processos, bancos, log e gate privados. Preservar estes arquivos locais e o último release hml saudável.
2. Consolidar resultado completo do build 589ea43 e conferir hash/SHA. Copiar o artefato imutável e iniciar o runner candidato privado, com HTTPS e identidade rm_test verificados. Não usar JAR do ciclo 7 contra banco com V6 sem conferir compatibilidade.
3. Executar integralmente os nove cenários de identidade nos cinco projetos e os quatro de fundação; runner privado preparado faz ambos sequencialmente. Agregador exige 45/20 combinações únicas sem erro/skip/flaky/retry, vinculadas ao SHA/hash. Revisar capturas reais.
4. Continuar APIs/telas SaaS, cadastro/verificação/recuperação/convites, suspensão/eventos/projeções, matriz por ação/perfil e OpenAPI restante. Ensaiar manutenção/backup/restore antes de migrations hml. Não mesclar Sprint 01 com critérios pendentes.
5. Sprints 02–05 e matriz T01–T28/X01–X15 seguem abertas. Retenção não equivale a política jurídica, teste de carga ou validação externa/piloto.

completion-rejected.json ausente no início; nenhum CONCLUSAO.json criado. Status detalhado e comandos executáveis ficam no registro privado da missão.

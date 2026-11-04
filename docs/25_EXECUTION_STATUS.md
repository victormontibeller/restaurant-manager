# Checkpoint de execução

[Índice](README.md) · [Ciclo 10](evidencias/sprint-01-ciclo-10.md) · [Cobertura](evidencias/cobertura.md)

## Retomada autorizada — ciclo 1 reiniciado, 2026-11-04

Missão não concluída. Git/PR #3 draft e os dois checks CI do `c3233db` conferidos;
checkpoint herdado preservado abaixo. O build privado desse SHA falhou por
`KeyError: TMPDIR`; não existe aprovação local desse job. Corrigida propagação
explícita de scratch/PATH/RM_HOME ao systemd, sem repassar ambiente completo.
Teste reproduziu a ausência do argumento antes da correção. Revisão independente
identificou ausência de validação de privacidade do scratch, também corrigida.
Build real e E2E ainda pendentes neste registro. Homologação conferida saudável no
SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, sem deploy/reinício.

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

# Sprint 01 — retomada ciclo 24

## Correção do gate nativo

Retomada em 2026-11-05: build36e49e7 terminou com 23suítes/174testes, uma
falha de retenção, zero erros/ignorados. Worker23 encerrou antes de novo build
ou E2E. Não houve interrupção deliberada nem tentativa de reaproveitar gate falho.

Ajuste herdado de `RetencaoIdentidadeTest` publicado em
`6cd8a867253573bb32037294f4abbbb07e03df51`: dois schemas exclusivos da classe,
contagens exatas preservadas e prova explícita da sessão bloqueada presente
antes e ausente depois do expurgo. Nenhuma alteração de serviço/repository,
migration de produto, DROP ou reset. Os schemas ficam preservados no banco de
teste; a limpeza remove somente a massa própria. Paralelismo de métodos não
está habilitado e exigiria rever esse isolamento por classe.

Revisão independente estática não encontrou bloqueador. XML da execução focada
herdada foi relido: seis testes, zero falha/erro/skip. Não foi repetido apenas
para recontar. Scanner310 e `git diff --check` passaram antes da publicação.
Remoto e PR3 OPEN/draft/base main/head foram relidos após o push.

Ambos checks CI de6cd8a86 passaram. Log de um run confirma174backend sem falha,
erro ou skip,147testes Python e build aprovado. CI utiliza PostgreSQL próprio;
não é aprovação do E2E ou do build nativo ainda em andamento.

## Execução consolidada

Um único build durável de6cd8a86 foi iniciado às23:46:31Z, em checkout privado
imutável. Worker24 finito aguarda seu resultado/gate/hash antes de preparar
contas e iniciar o candidato. Não reconstrói, não faz deploy nem merge.

Plano conferido programaticamente:215pares únicos,43cenáriosS01-UI01–43 nos
cinco projetos. Vinte focos de formulários antecedem195combinações restantes;
não há duplicação dos focos na parcela complementar. Reentrada real foi
recusada e o hash do progresso permaneceu igual. Limite operacional do worker:
quatro horas; espera pelo build até2700s. Não é teto da missão contínua.

A segunda revisão identificou que encapsular manutenção em subprocesso com
timeout poderia matar seu `finally` e deixar o serviço independente ativo.
Essa fase foi removida do worker ANTES do lançamento; nenhum ensaio de
manutenção foi iniciado por ele. Executar a manutenção separadamente, com
reconciliação de unidade, ledger e OIDs. O runner mantém somente build/E2E como
dependência e não atribui sua aprovação à CI.

## Ambiente e limites

Bancos dev/test/hml relidos com rolesapp distintas em loopback55432.
Homologação3cd4eeb UP/PID399982; originalOID16392 bloqueado, clone135836 ativo.
Baseline449ce3c preservado. Nenhum deploy, promoção, merge ou conclusão técnica.
Tentativa de corrigir AGENTS foi novamente recusada pelo executor; não contornada.

A matriz96769ac histórica passou215pares, mas não aprova o Angular posterior.
A Sprint01 continua aberta. Build/E2E nativos do candidato consolidado, revisão
visual, manutenção, troca de frontend, ensaio assistido hml, smokes e aceitação
permanecem pendentes neste registro. Sprints02–05 não iniciadas; T22 ainda sem
consulta UI/API de auditoria, sem converter a persistência existente em entrega
dessa superfície. [Critérios e rastreabilidade](../15_SPRINT_01.md).

Logs, claim, hash do runner, PID/início, job e comandos estão no STATUS privado.
Resultado posterior deve ser recolhido, não inferido a partir deste lançamento.

## Resultados observados até00:19Z de2026-11-06

Build consolidado6cd8a86 terminou00:09:29Z, exit0/release_gate=true. Gate, fonte
limpa, cópia e hash6e73242aa79e52847b2cfd3380d4974aa3cb1b9a5264b8a1b219a9b312cefebd
conferidos. Recontagem de23XML:174backend, zero falha/erro/skip.147Python,
Angular/probes e auditorias passaram. Build não foi repetido.

Comparação real de JARs encontrou378entradas fora de static em cada artefato,
sem entradas exclusivas nem bytes diferentes contra3cd4eeb. A mudança permanece
restrita ao frontend; esta comparação não dispensa manutenção/smokes/revisão
nem concede aprovação de deploy.

Quatro focosUI11/UI14/UI19/UI21 passaram vinte combinações únicas nos cinco
projetos, zero falha/skip/flaky/retry. Worker segue em identidade e conserva
candidato/locks; não duplicar suíte nem reconstruir. Não há resultado global.

Capturas completas mobile/desktop de recuperação, cadastro e verificação foram
inspecionadas: mensagens/labels legíveis, botões separados, foco visível e sem
corte/sobreposição observados. Página longa exige rolagem vertical. Seis registros
privados com notas, hash e cenário/projeto de origem conferidos; faltam vinte
entradas visuais. Screenshot não comprova interação/ARIA ou aparelho físico.
Hml3cd4eeb e baseline449ce3c continuam preservados, sem troca/manutenção/merge.

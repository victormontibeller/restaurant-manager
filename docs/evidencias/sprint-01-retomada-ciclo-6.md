# Sprint 01 — retomada ciclo 6

Missão em andamento, sem conclusão da sprint ou promoção de homologação.

## Handoff final

Aviso efetivo de orçamento recebido após consulta de 17:57:16Z; depois somente
gravações obrigatórias. Head publicado `02e694d`, PR #3 draft, sem merge/deploy.
CI do 5f15836 confirmou 163 backend e 43 Python aprovados; head posterior ainda
não consolidado. Worker inicial terminou exit 1 às 17:56:15Z: SaaS também passou
quinze combinações, mas eventos/identidade mantêm falhas descritas abaixo.

Reexecução de eventos/ensaio nativo da fila e reexecução focada de S01-UI04
continuam em workers serializados. Nenhum resultado novo observado antes do
aviso. Não houve encerramento deliberado desses workers nem reconstrução do
JAR. Conferir processos/resultados antes de nova suíte; não aprovar antecipadamente.
Última homologação observada segue 449ce3c saudável. Registro final local após push.

## Artefato herdado e correções E2E

Build de `dee85d3cd9455622ba35e8ee5d147c60e1858fe8` recolhido sem repetir:
exit 0/gate true, hash `8c70f3e21bc1352210c2d5a8b9fac26b41e51036eb5f751dcb1ff3a2a750780e`.
O primeiro worker abortou antes dos cenários porque eventos importava a restrição
de domínio da suíte identidade. Corrigido em `e0ef516`: origem própria restrita,
configuração base e prontidão preservadas. Revisão independente encontrou mock
incorreto no teste novo; corrigido para carregar a configuração base real.
Teste da configuração e descoberta real Playwright passaram.

Reexecução no mesmo JAR, testes do `e0ef516`: eventos dez aprovações/cinco falhas,
sem skips/retries/flaky. Falha S01-UI32: seletor parcial do label também encontra
checkboxes de unidades com nomes semelhantes. A atualização/reconexão havia
passado até o foco; não aprova o cenário. Correção `exact:true` mantém todas as
assertivas e será reexecutada, sem alterar o candidato em execução.

Convites: quinze combinações aprovadas nos cinco projetos, sem retries, skips
ou flaky. Viewport real verificada pelas assertivas; captura mobile de 360 px
inspecionada em recorte na resolução original. Botões longos contidos/quebrados,
sem o overflow anterior; captura completa tem lista longa e não é teste de
aparelho físico. Identidade/plataforma ainda em execução neste registro.

Na regressão de identidade, S01-UI04 Firefox falhou aguardando confirmação de
senha por cinco segundos. Trace real registrou HTTP 204 em aproximadamente dois
segundos; snapshot da asserção ainda estava ocupado, mas screenshot final mostra
confirmação e controles habilitados. O teste agora aguarda/verifica cada resposta
de reautenticação/gravação antes das assertivas de UI, sem retirar negativos nem
aumentar o timeout das assertivas. Reexecução desse caso pendente; a rodada com
falha não foi transformada em aprovação. Não se conclui desempenho aprovado.

Regressão de identidade terminou com 43 aprovações/duas falhas. A segunda foi
S01-UI04 WebKit: captura integral excedeu o limite de 32767 pixels de altura do
bitmap, depois das assertivas de último Administrador. Captura passou a registrar
viewport e cartão protegido separadamente; nenhuma assertiva foi removida.
Ambas as correções precisam de reexecução; não aprovar a suíte pela contagem parcial.

## Despacho da fila SaaS

Novo `scripts/provisioning_queue.py` consulta intenções pendentes e executa o CLI
Java existente por lote, sem transportar regras de provisionamento para Python.
Read-back de solicitação/empresa/domínio, timeout limitado, resultado durável,
backlog, pausa de intenção incerta e isolamento do ambiente do subprocesso.
Somente dev/test; nenhuma credencial owner acrescentada ao HTTP.

Revisão independente encontrou: aceitação de artefato antigo, término do pai
sem garantia do filho e disputa no ponteiro latest. Correções: equivalência da
fonte principal/dependências e comando suportado, checksums public/template,
SIGTERM com recolhimento do filho e descritor do lock herdado, ponteiro publicado
somente sob exclusão. Processo nativo deve usar cgroup, sem daemon desacoplado.

Vermelho real dos primeiros testes: lote não executado/limite não aplicado.
Após implementação, `python3 -m unittest discover -s scripts -p 'test_*.py'`
passou 43 testes sem skip. Inclui fixtures unitárias de gate, checksums e destino;
essas fixtures NÃO são releases. Teste de SIGTERM usa subprocessos reais, mas
um executável fictício, não o worker Java/PostgreSQL. Typecheck Angular/E2E,
scanner de 254 arquivos e diff aprovados antes da publicação.

Probe somente leitura em rm_test confirmou identidade SQL, equivalência de
fonte do JAR herdado e checksums de public/template. Isso não executou a fila.
Ensaio nativo com Java/PostgreSQL e timer permanece pendente neste registro.
[Procedimento e limites](../22_PRODUCTION_RUNBOOK.md#fila-operacional).

## Pendências

Reexecutar eventos corrigidos, consolidar identidade/SaaS e executar despacho
real de fila. Permanecem manutenção/backup/restore, regressão integrada e demais
critérios da Sprint 01; Sprints 02–05 não iniciadas. Homologação preservada no
`449ce3ccf941c73b34ac15a4754183c147f91aaa`. Nenhum merge nem CONCLUSAO.json.

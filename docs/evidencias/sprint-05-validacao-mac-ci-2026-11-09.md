# Sprint 5 — validação complementar no Mac e na CI

**Estado deste registro:** execução em andamento. Resultados abaixo distinguem
provas aprovadas, tentativas reprovadas preservadas e validações ainda não
executadas. Homologação Linux, serviços externos e piloto não são aprovados.

A continuação usa a branch `codex/sprint-05-registro-entregas` e o
[PR #10](https://github.com/victormontibeller/restaurant-manager/pull/10),
partindo do registro `17e9573` sobre a `main` integrada em `5ea8324`.
Escopo autorizado: concluir testes possíveis no Mac/CI, corrigir falhas,
atualizar Sprint 5/checkpoint e remover a cópia antiga da Sprint 4.

## Reprovação visual do primeiro candidato e correção

A primeira matriz foi interrompida entre lotes após **313 pares aprovados**,
com zero lotes ativos e sem aprovar a matriz integral. A revisão das capturas
T11 desktop/mobile encontrou a frase obsoleta que negava pagamentos já
implementados. Uma varredura complementar encontrou Unidades negando regiões
de entrega disponíveis/citando menu antigo e checkout prometendo sempre
15 minutos, embora o prazo seja configurável.

Foram corrigidos os três textos e a expectativa já existente do E2E de Unidades.
Formatação e tipos passaram. O JAR `55df989f8b83` permanece como evidência dos
ensaios backend e do candidato visualmente reprovado; **não é a aprovação final
da interface**. API e provedor desse candidato foram encerrados por identidade,
com demonstração e PostgreSQL originais preservados. Registros, capturas e
recibos da rodada 01 permanecem intactos. Novo build, fixtures e matriz completa
serão executados em raiz privada separada; não herdar os 313 resultados.

## Artefato e ambiente

- JAR local: `55df989f8b83bec803188daa80d2d28a41aa97269f278755abf9d24db9263e7a`.
- Build inicial completo: 435 testes backend em 63 relatórios, zero falhas,
  erros ou skips; checks Angular e auditorias aprovados.
- Após corrigir as cores CSS, frontend recompilado e JAR empacotado novamente.
  As 506 entradas compiladas/dependências do backend são idênticas às do
  artefato aprovado nos 435 testes. Nenhum contrato ou migration foi alterado.
- Manifesto completo das fontes do build e arquivos públicos preservado.
  O build identifica a base Git e o snapshot de trabalho, incluindo as cores
  corrigidas; não é um release implantado no Linux.
- O commit `b663385` recebeu a implementação. Um atestado separado conferiu
  as 517 fontes contra os blobs desse commit e a identidade integral do JAR/PWA;
  preservou o recibo original de build em `17e9573` com snapshot de trabalho.
  O atestado vincula conteúdo ao commit, sem alegar novo build ou nova execução
  dos 435 testes. A matriz final usa cópia imutável com recibos desse atestado.
- Ambiente local observado: macOS 26.6.2 x86_64, Java Microsoft OpenJDK
  21.0.9, Node 26.0.0, npm 11.12.1, Playwright 1.64.1 e PostgreSQL 18.4.
  Host com 16 GiB de RAM e 12 CPUs lógicas; o processo do ensaio limita a JVM
  a dois processadores ativos e heap máximo de 384 MiB.
  A CI usa Ubuntu 24.04, Temurin 21 e Node 26.7.0 conforme o workflow versionado.
- PostgreSQL real exclusivo `rm_test`, runtime próprio em HTTPS loopback 8089,
  provedor HTTP fictício persistente em loopback. A demonstração 8095 e bancos
  de outros projetos ficam fora dos comandos do ensaio.
- Novos tenants/contas fictícios em todas as famílias; sem reset de quotas,
  sem substituir contas antigas e sem credenciais/dumps/relatórios privados no Git.

## Checks portáveis e dependentes de CI

Os **234 testes portáveis de scripts** passaram no Mac, sem falhas, erros ou
skips. A execução exploratória completa de 236 testes, anterior à inclusão dos
oito casos de diagnóstico, registrou 15 erros em dez métodos que dependem de
`/proc`. Ela não foi aprovada nem alterada com skips para produzir um resultado
verde. A suíte integral de **244 testes** passou na
[CI Fundação #192](https://github.com/victormontibeller/restaurant-manager/actions/runs/42728174611),
commit `cbb1e19`, incluindo os dez métodos dependentes de `/proc`.
A mesma CI aprovou **452 testes backend**, zero falhas, erros ou skips,
checks Angular, build e auditorias. A CI #190 já havia aprovado a implementação
`b663385`; a #192 repetiu a suíte com as asserções reforçadas.

Os checks Angular incluíram formatação, tipos, lógica, templates nos três
navegadores, build/PWA e auditoria npm. Após a correção CSS, formatação, tipos e
build foram repetidos. A auditoria Java passou e a identidade binária do backend
foi conferida após o novo empacotamento.

## Fronteiras de autorização e timeout

**17 casos novos aprovados**, com reexecução dirigida de **51/51 testes** em
sete classes, sem falhas, erros ou skips: oráculo independente de 28 ações ×
seis perfis, concessão/revogação das ações nos cinco perfis configuráveis com
o mesmo JWT, negativos de unidade/tenant e comandos financeiros/operacionais,
além de dois timeouts HTTP reais com o prazo de produção de dez segundos.
A suíte integral de 452 testes foi aprovada na CI #192.
A revisão posterior reforçou esses dois testes em `cbb1e19`: exigem que o
provedor ainda aguarde a resposta, sem expiração do watchdog de 40 segundos,
e que a falha ocorra entre 9,5 e 30 segundos. A devolução verifica ainda reserva
de R$ 20,00 antes da reconciliação e zero após confirmar. Esse reforço passou na
CI integral #192; não é apresentado como parte da rodada local anterior.

A rodada dirigida 01 ficou reprovada com duas expectativas incorretas dos novos
testes: ausência de pendência financeira antes da consulta final de checkout e
comparação integral de relatórios que incluía o instante variável `consultadoEm`.
Foram corrigidas a ordem do processamento real e a comparação dos campos
estáveis, mantendo a validação temporal separada. Os sete relatórios da rodada
01 foram preservados; a rodada 02 repetiu todas as sete classes.

Esses testes complementam as jornadas de navegador; a contagem de cenários
não substitui a demonstração de autorização ou das invariantes concorrentes.

## Perda de resposta e reconciliação financeira

**Tentativa 02 aprovada**, no JAR identificado acima. O simulador salva o efeito
fictício e encerra a conexão sem resposta HTTP. O recibo vincula cada injeção ao
pedido correspondente; o ensaio recusa URLs que não pertençam ao provedor local.

Foram executados dois reinícios exclusivamente do candidato, com PID/início/JAR
conferidos antes e depois. Resultado final: um pedido cancelado, uma cobrança,
um recebimento, uma devolução local e uma devolução no simulador; R$ 20,00
confirmados como devolvidos, sem duplicação. Diagnósticos somente leitura
identificaram `PAGAMENTO_INCERTO` e `DEVOLUCAO_INCERTA` durante a falha e sua
normalização após a reconciliação. Não houve Mercado Pago sandbox, cobrança real
ou restauração de pagamento externo neste ensaio.

A tentativa 01 permanece reprovada: o assert final de diagnóstico era executado
após a devolução confirmar, antes de o checkout concluir sua própria
reconciliação assíncrona. Uma consulta somente leitura posterior confirmou a
normalização. O harness passou a aguardar os dois estados com prazo limitado e
o cenário inteiro foi repetido com nova intenção; a aprovação não foi herdada.

## Contraste e revisão visual

Três textos informativos do shell da equipe tinham contraste insuficiente.
As cores corrigidas apresentam razões entre 5,13:1 e 5,91:1 nos fundos usados.
O placeholder decorativo de produto sem foto também ganhou legibilidade,
passando de 3,23:1 para 5,15:1.

`scripts/check_contrast.cjs` mede cores, fontes e fundos calculados no DOM real,
sem arredondar o resultado para aprovar. No texto sobre imagem/gradiente,
mede conservadoramente o pior pixel dos retângulos do próprio texto com a
pintura dos glifos temporariamente oculta; restaura o CSS em `finally` e
preserva somente capturas normais. Efeitos não demonstrados não são aprovados.
O script passou em 14 verificações matemáticas/de limites/destino/sessão.

**38 de 38 configurações distintas medidas**, sem falhas ou revisões de
contraste pendentes, no mesmo JAR final: onze casos antes da interrupção da
tentativa 01, vinte no lote 03 e sete de Administrador no lote 04. Os lotes 03/04
terminaram aprovados; a tentativa 01 permanece interrompida. As interrupções
01/02 foram erros do harness: seleção por label em vez de combobox e título
ambíguo sem nível explícito. Contas, sessões e quotas foram preservadas.
O consolidado confere os 38 IDs únicos do plano: 1.747 medições por cores CSS
e 36 pelo limite conservador de fundo, mais 64 exceções explícitas de controles
desabilitados. Os recibos registram os PIDs efetivos; não se afirma que todas
essas medições ocorreram no mesmo processo. O lote 04 usou o PID final 30923 sem reiniciá-lo.

Teclado, foco, semântica, contraste e viewports não constituem certificação WCAG
nem prova de uso com VoiceOver ou aparelhos reais; esse aceite assistivo e
operacional pertence à preparação do piloto.

## Backup, manutenção, recuperação e carga

**Tentativa 09 aprovada integralmente**, das 21:08:18 às 21:24:40 de
2026-11-09 (UTC−03), no JAR `55df989f8b83`. Os hashes dos sete scripts executados
foram reconferidos no checkout. A origem permaneceu somente leitura; o recibo
final não registra erros de cleanup.

| Prova | Resultado observado |
| --- | --- |
| Snapshot e restore | 33 dumps, 18.859 tabelas, 146.606 linhas, 293 empresas ativas/suspensas; conteúdo e metadados iguais. Backup: 363,124 s; restore/verificação: 136,384 s |
| Mídia | 104 imagens em três empresas; zero hashes divergentes/referências órfãs; dois positivos HTTP e dois negativos entre tenants. Roundtrip adicional somente no clone, com escritores parados |
| Manutenção | JAR compatível antes; DDL/histórico Flyway 9999 sintéticos confirmados e falha SQL injetada; startup recusado pela causa esperada; retorno ao OID original, inventários iguais e health aprovado. Candidato falho preservado; sem downmigration, DROP de banco ou promoção |
| Dados anteriores ao backup | Sessão criada antes do snapshot; chave JWT errada → 401 e chave AES errada → e-mail FALHOU ainda válido, zero capturas. Mesmo snapshot restaurado novamente; chaves originais da fixture recuperaram sessão e token anteriores, uma captura. Reset consumiu o token original, revogou a sessão e recusou reuso; nova senha autenticou |
| Carga | 641 requisições, zero erros, quatro clientes, 20,366 s; p50 17,183 ms, p95 29,240 ms, p99 39,460 ms; CPU máxima 178,4%, RSS máximo 720.612 KiB |
| Pool | Hikari MXBean do próprio PID, 187 amostras/100 ms; limite/pico de quatro conexões, zero threads esperando nas amostras. Não mede latência de aquisição nem demonstra capacidade operacional |
| Transporte e retomada | Proxy TLS local recebeu resposta confirmada da API e enviou zero bytes HTTP ao cliente, que observou desconexão. Interrupção da API e rollback de conexão próprios; restart/job em 25,220 s; um pedido cancelado, zero recebimentos e um evento de cada tipo, sem duplicação |
| Diagnósticos | Falha real de pg_dump em destino privado inválido detectada como BACKUP_FALHOU; EMAIL_FALHOU e JOB_ATRASADO detectados e normalizados após recuperação. Consultas somente leitura; nenhum alerta externo enviado |

O snapshot inicial é de 21:08:18,727 e o tempo até a aplicação ficar pronta após
o conjunto restore/manutenção foi 763,513 s. São medições deste ensaio; a massa
é fictícia e não estabelece RPO/RTO acordados. As chaves recuperadas pertencem
à fixture criada antes do snapshot adicional; não são chaves históricas de
produção nem credenciais de provedor externo. O
[runbook](../22_PRODUCTION_RUNBOOK.md#ensaio-local-sprint-5) delimita portas,
parada dos escritores, recuperação, diagnósticos e limites Linux.

## Matriz integrada de navegador

Inventário independente ampliado de 405 para **415 pares**: 83 cenários em
cinco projetos, incluindo os workers reais S01-UI29 e S01-UI31 antes omitidos
no Mac. O cliente PostgreSQL pode ser indicado por `RM_TEST_PSQL`; as guardas
de banco, identidade e artefato permanecem obrigatórias.

`scripts/sprint05_matrix.py` vincula JAR, PID/início, fontes, fixtures, configuração
e relatórios. Confere bytes/conjunto do PWA contra o JAR, recusa pares ausentes,
duplicados, skips, retries, instabilidade e evidência de outro candidato.
Relatório HTML/JSON identifica telas T01–T28, perfis, unidades e expectativas.
A revisão visual exige as 28 telas em desktop e mobile, vinculadas a capturas
reais; capturar uma imagem não equivale a revisá-la. Inventário real dos 415 pares conferido e execução final iniciada no PID
30923, início 2026-11-09 21:25:23 (UTC−03), JAR imutável atestado em `b663385`.
O commit posterior `cbb1e19` reforça somente testes backend; fontes da aplicação
e harness da matriz permanecem iguais. Lotes sem orçamento de autenticação
ficam temporariamente bloqueados antes de abrir o navegador, sem reset de quota
e sem contar como teste executado; o runner avança pelos lotes independentes e
retoma os faltantes na mesma vinculação após a janela. Aprovação ainda pendente.

## Execução reproduzível e recibos

Todos os comandos usam configuração e massa fictícia privadas, fora do Git.
O diretório de trabalho dos comandos é a raiz do repositório; `RAIZ_PRIVADA`
representa o armazenamento privado desta execução, sem valores de credenciais.

```sh
python3 scripts/local_rehearsal.py --source-env "$RAIZ_PRIVADA/test.env" \
  --fixture "$RAIZ_PRIVADA/pedidos-fixture.json" --jar "$JAR_IMUTAVEL" \
  --jar-sha256 "$SHA256_JAR" --source-manifest "$RAIZ_PRIVADA/source-manifest.json" \
  --pg-bin /usr/local/opt/postgresql@18/bin \
  --java-home "$JAVA_HOME" --output /private/tmp/rm-s05-ensaio09
python3 scripts/sprint05_matrix.py inventory --plan "$RAIZ_PRIVADA/matrix-plan.json" --output "$RAIZ_PRIVADA/matrix"
python3 scripts/sprint05_matrix.py run --plan "$RAIZ_PRIVADA/matrix-plan.json" --output "$RAIZ_PRIVADA/matrix"
python3 scripts/sprint05_matrix.py consolidate --plan "$RAIZ_PRIVADA/matrix-plan.json" --output "$RAIZ_PRIVADA/matrix" --visual-review "$RAIZ_PRIVADA/visual-review.json"
```

Os comandos da matriz acima são o procedimento previsto; execução e aprovação
só serão registradas após os recibos finais. Os recibos privados já concluídos
identificam comandos, tempos e resultados; hashes abaixo permitem distingui-los
sem publicar fixtures ou registros autenticados.

| Recibo privado | SHA-256 | Escopo |
| --- | --- | --- |
| `result.json` | `79e1cf8b96bc018c3aba3fcf2b81e56eb2844966dab7d0c68ce0af76112ef8e1` | Build local original, 435 backend e identidade binária após CSS |
| `matrix-build.json` | `8296ca774549ed096c7a402e7eeaeadd0747b969268fb1d35af89bef74e3e5c2` | Atestado das 517 fontes no commit; não é novo build |
| `backend-focused-02.json` | `7ba13543856128bd095831b615010f8dd4f42bf1e1a660d93aa2a4d993d0246a` | 51 testes dirigidos; 17 novos |
| `python-mac-portable.json` | `c39929f3ae68a7d0160b36a6f12869a70f5b41e6ee9dc77d308156f3ba5fb537` | 234 testes portáveis |
| `financial-recovery-02/recovery-result.json` | `c5ae5e3ed0713f55cab8665ec6fcbca4e7390ffa95f13b7916e4e9239d4b91d2` | Transporte/reconciliação fictícios, sem restore externo |
| `ci-192.json` | `4fde55eca5a8b4139bc3fe2b0b6ab7bc9506992e543374f550b252f90d26e08d` | CI integral de scripts/backend/Angular/auditorias em `cbb1e19` |
| `contrast-completion.json` | `220c934aaa7a3a64b7abbc427f23467aa880e64f95423e583e5084ed8452264f` | 38 configurações distintas, mesmo JAR e PIDs explícitos |
| `contrast-result-04.json` | `5d67ab08c7b42e22f591127d949818aab4dc550137c82c6cfb8cc3ee6b4c09ec` | Sete casos finais de Administrador |
| `ensaio09/result.json` | `c59dc2659820494be7849143c297fc6c96c9e360e88983bb5dd954a47d65267f` | Ensaio09 completo, inclusive cleanup |
| `ensaio09/maintenance/result.json` | `46574d7305ebf87d1e126d3877f7d4dac79fc32ebfa6b8e00b83c2b1647a7d5c` | Manutenção/retorno sintéticos no clone |
| `ensaio09/prebackup-recovery.json` | `843153642fa9d16a4c71b6d25b3dbfc3cc337fae0dd799e71b8395e78552ba3b` | Sessão, token e ciphertext anteriores ao snapshot |

## Preservação e dependências externas

Removida a cópia não versionada `18_SPRINT_04-LAPTOP-HO4BA7QG.md`, após
comparação que confirmou apenas a linha de status antiga como diferença.
Documento oficial da Sprint 4 preservado. O arquivo manual local não versionado
permanece com SHA-256
`f0d87ddc44e486c1d29a90f778002b6cb0901a1dbc84c01c2f41f8b929f46e94`.

Continuam pendentes implantação/matriz no release Linux real, Mercado Pago
sandbox, domínio/HTTPS/ingresso e e-mail externos, backup operacional externo e
metas acordadas, responsáveis, treinamento, aparelhos/tecnologia assistiva e
aceite/acompanhamento do piloto. O detalhamento canônico fica na
[Sprint 5](../19_SPRINT_05.md), no [runbook](../22_PRODUCTION_RUNBOOK.md) e no
[registro do piloto](../23_PILOT_IMPLEMENTATION.md#registro-externo).

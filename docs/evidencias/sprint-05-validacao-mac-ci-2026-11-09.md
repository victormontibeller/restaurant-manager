# Sprint 5 — validação complementar no Mac e na CI

**Estado deste registro:** execução em andamento. Resultados abaixo distinguem
provas aprovadas, tentativas reprovadas preservadas e validações ainda não
executadas. Homologação Linux, serviços externos e piloto não são aprovados.

A continuação usa a branch `codex/sprint-05-registro-entregas` e o
[PR #10](https://github.com/victormontibeller/restaurant-manager/pull/10),
partindo do registro `17e9573` sobre a `main` integrada em `5ea8324`.
Escopo autorizado: concluir testes possíveis no Mac/CI, corrigir falhas,
atualizar Sprint 5/checkpoint e remover a cópia antiga da Sprint 4.

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
verde. A suíte integral do novo head ainda precisa passar na CI Linux.

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
A expectativa da suíte integral na CI passa de 435 para 452 testes.

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

Em andamento: 31 de 38 casos medidos sem falhas ou revisões de contraste
pendentes. Onze casos passaram antes da interrupção da tentativa 01; vinte
passaram integralmente no lote 03. As interrupções 01/02 foram erros do harness:
seleção por label em vez de combobox e título ambíguo sem nível explícito.
Nenhuma delas foi declarada uma rodada integral aprovada. Os seletores foram
conferidos nos templates; contas/sessões e janelas de autenticação foram
preservadas. Restam sete casos de Administrador.

Teclado, foco, semântica, contraste e viewports não constituem certificação WCAG
nem prova de uso com VoiceOver ou aparelhos reais; esse aceite assistivo e
operacional pertence à preparação do piloto.

## Backup, manutenção, recuperação e carga

Implementação pronta; execução integrada ainda pendente. O
[runbook](../22_PRODUCTION_RUNBOOK.md#ensaio-local-sprint-5) delimita clone,
portas, snapshot, chaves pré-backup, manutenção sintética, proxy de transporte,
telemetria Hikari e diagnósticos locais. Testes unitários não aprovam essas
provas reais. Resultados serão registrados após a execução e o cleanup.

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
reais; capturar uma imagem não equivale a revisá-la. Execução final pendente.

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

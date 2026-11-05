# Sprint01 — retomada ciclo14

Missão não concluída. O aviso efetivo de orçamento quase esgotado foi recebido
após corrigir localmente a captura de eventos; depois somente handoff obrigatório.
Sem merge, promoção de baseline, novo build ou CONCLUSAO.json.

## Incremento publicado

`85872fdfacd14cf6ffb5672d4d47154674a2a159`, remoto/PR3 OPEN/draft/base main
relidos. Ambos checks CI passaram na consulta de23:53:32Z. Consolidador de
resultados e aceitação de baseline de identidade, com manutenção, OIDs, cobertura
exata, capturas vinculadas a cenário/projeto e retomada de publicação parcial.
Não conclui Sprint/projeto. Código não foi executado para promover homologação.

Revisão independente encontrou ausência do vínculo ao clone, reutilização de
captura para superfícies diferentes e falha na última gravação da aceitação.
Correções e regressões adicionadas; reutilização visual teve vermelho
comportamental, coordenação inclui falha injetada em cada gravação final.
123 testes Python passaram, além de typecheck, scanner e diff. Testes unitários
não substituem execução real do promotor.

## Execuções preservadas

JAR3cd4eeb/hash1697a473d968c0246a0b83b23bbd192b7e7fddbc282f061d66cf5f08a6c9d744
não reconstruído. Regressão herdada continua em fonte imutável dc3240c/rm_test.
Até00:04:14Z de2026-11-05:

| Família | Aprovados | Falhas | Estado |
| --- | ---: | ---: | --- |
| Verificação | 15 | 0 | Consolidado |
| Cadastro | 20 | 0 | Consolidado |
| Recuperação | 15 | 0 | Consolidado |
| Convites | 20 | 0 | Consolidado |
| Identidade sem UI04/UI05 | 35 | 0 | Consolidado |
| Eventos | 43 | 2 | Reprovada |
| Plataforma | — | — | Em execução, sem resultado observado |
| Estado comercial/provisionamento | — | — | Sem resultado observado |

Resultados consolidados não tiveram skip/retry/flaky. Não aprovar a matriz
somando somente casos verdes. UI04/UI05 já possuem dez combinações aprovadas
no mesmo JAR e não foram repetidos.

As duas falhas de UI32, Firefox/WebKit, ocorreram na captura fullPage acima do
limite de32767 pixels, depois das assertivas funcionais. A matriz administrativa
continua abaixo do componente de acompanhamento e cresce com a massa acumulada.
Correção local captura integralmente `app-eventos-unidade`, mantendo todas as
assertivas e a cobertura própria das outras superfícies. NÃO reexecutada; não
converter essas falhas em aprovação. Última correção de captura ocorreu depois
do typecheck, sem novo check após o aviso de orçamento.

Worker14 finito foi iniciado para aguardar o término do worker13, executar
fundação em HTTPS hml e repetir somente o smoke necessário ao novo vínculo por
OID. Fonte85872fd/JAR3cd4eeb; sem build/deploy/merge/promotor. Ainda aguardava na
última observação. O smoke antigo continua válido no escopo histórico, mas não
contém OID e não libera o novo gate. Não interromper nem duplicar esses workers.

## Exportação — implementação local não publicada

Download JSON de id/nome/fuso/versão da unidade, com nova consulta ao endpoint
existente autorizado, não exportação de cache. Revalida sessão/ação/vínculo no
backend; troca de contexto ou resposta de sessão antiga não inicia download.
URL temporária é revogada; dados extras são excluídos da projeção. Não cria rota
pública nem antecipa relatório financeiro.

Cinco testes de lógica/exportação e quatro regressões de eventos passaram;
typecheck aprovado antes da última correção de captura. UI42/UI43 foram escritos
e descobertos em dez combinações; NÃO executados. Primeira descoberta ampla
falhou pela fixture exigida nos outros arquivos; descoberta restrita ao arquivo
correto passou. Não é resultado E2E.

Nova revisão independente foi recusada pelo limite operacional2/2 desta chamada.
Por isso exportação, seus gates/testes/docs e correção de captura continuam
locais, sem commit, build ou publicação. Guarda real recusou aplicar o JAR antigo
à fonte Angular modificada. Próximo ciclo deve revisar antes de publicar/buildar.

## Ambiente e limites

Última leitura de runtime00:01:43Z: hml3cd4eeb, UP/PID399982, HTTPS/loopback.
SQL dev/test/hml confirmou roles app distintas em127.0.0.1:55432. Clone hmlOID135836
ativo; originalOID16392 bloqueado, sem conexões; baseline449ce3c preservado.

Onze imagens inspecionadas e registradas privadamente: páginas de cadastro,
recuperação/verificação/login e recortes de convites/matriz/equipe/unidades.
Matriz/unidades mostram somente cabeçalhos; captura de convites é muito longa.
Revisão visual integral NÃO aprovada. Não houve teste em aparelho físico.

Sprint01 continua aberta: regressão/capturas, exportação, jornada hml assistida
da fila e aceitação efetiva pendentes.02–05 não iniciadas. Captura local de e-mail
não equivale a provedor externo homologado. [Checkpoint](../25_EXECUTION_STATUS.md).

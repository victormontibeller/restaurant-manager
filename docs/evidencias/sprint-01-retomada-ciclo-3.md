# Sprint 01 — retomada, ciclo 3

[Índice](../README.md) · [Checkpoint](../25_EXECUTION_STATUS.md)

## Base e fronteiras

Retomada de 2026-11-04 na branch existente e PR #3 draft. Base publicada
`f00137fc9f77533be2e5263e95d448d87b4a2ed6`, CI verde conferida por SHA.
Homologação `449ce3c` saudável e preservada, sem deploy/reinício/migração.
Identidades SQL dev/test/hml distintas verificadas. Coordenador único.

## E2E herdado, sem reconstrução

Usado o JAR imutável do ciclo anterior, hash
`e506684145ab225cf9cdf4f15bf7f7630137ece155e92241cf7b72341c8fa399`.
Primeiro lançamento falhou porque o script shell não é executável; corrigida a
invocação com `bash`, sem mudar permissões nem repetir build. O primeiro runner
não chegou a executar testes; foi encerrado por ausência do candidato.

SaaS S01-UI23–25 executou quinze combinações: doze aprovadas, três falhas,
nenhum skip/retry/flaky. Firefox S01-UI23 não recebeu resposta do login dentro
no prazo do teste; causa ainda não encerrada. WebKit S01-UI24/25 recebeu HTTP
401/404 reais, mas a UI substituiu a mensagem pelo indicador `navigator.onLine`.
Corrigida prioridade do erro HTTP; regressão força indicador offline sem simular
a API. Screenshot Firefox revisado: formulário permanecia ocupado, sem erro
visível; não afirmar sucesso. Reexecução no candidato novo permanece necessária.

## Implementação comercial SaaS

Consulta exata de empresa, confirmação de senha do operador, suspensão/reativação
versionadas com motivo e auditoria atômica. Sessão/reautenticação são conferidas
após locks; empresa incompleta não pode ser ativada. V5 pública apenas no banco
de teste. Contexto SUSPENSO preserva acesso empresarial existente. Não há pedidos
implementados: sua admissão e reconciliação permanecem critérios futuros, sem
aprovação indireta. [Regra](../06_MULTI_TENANT.md) e [API](../api/plataforma.yaml).

Revisão independente somente leitura apontou cartão desatualizado após consulta
que reconcilia resposta perdida. Probe executando o componente transpilado
reproduziu detalhe SUSPENSO/cartão ATIVO, exit 1; corrigida sincronização da lista.
Probe corrigido passou, inclusive erro HTTP com indicador offline. Não é E2E.

Vermelho de backend reproduzido antes da implementação: reautenticação esperava
422 e retornava 403. Rodada focada corrigida terminou exit 0: 9 EstadoEmpresaTest,
9 PlataformaTest e 7 FundacaoTest, total 25 sem falhas/erros/skip, XML conferidos.
Inclui concorrência real de duas transações, revogação do operador durante espera
com lock observado e falha de auditoria que reverte estado/versão. Expiração da
janela especificamente durante espera de empresa ainda não tem teste dedicado.
Typecheck aplicação/E2E aprovado; novos S01-UI26–28 escritos, execução pendente.

## Limites deste registro

Build identificado/CI/E2E novos ainda pendentes. Convites corrigidos e regressão
integrada restante não foram executados neste ciclo até aqui. Provisionamento
HTTP, eventos/projeções, manutenção/backup/restore e demais critérios continuam
abertos. Sprint 01 não concluída; 02–05 não iniciadas. Nenhum merge/deploy novo.

## Build e publicação do incremento

Publicado `e039dc2bc3e02c4d046257c94233d7ea065e59a5`; SHA remoto, head/base e
PR #3 OPEN/draft relidos. CI runs 41855643192/41855632008 success nesse SHA;
log de um run confirmou 147 testes backend sem falhas/erros/skip.

Build local terminou em 2026-11-04T15:28:43Z, exit 0/gate true. Dezenove XML
somam 147 testes backend, sem falhas/erros/skip; 26 Python e gates de frontend/
auditorias passaram. Hash do JAR conferido:
`33a5dc2edd61b9d2f7db3fcdaa497af70218159866553fbd0636146c02c51b01`.
Não somar testes focados à suíte completa como testes distintos.

O runner de validação aguardando o build foi substituído, antes de iniciar
qualquer cenário novo, por um worker nativo independente da sessão. O build não
foi reiniciado. Worker registra PID/início/SHA, tem lock exclusivo de E2E e usa
o lock de build/deploy durante a validação. JAR/checkout imutáveis, logs privados
e agregação exata das combinações; encerra somente seu candidato. Isso permite
recolher resultado entre ciclos sem repetir o build. Resultado ausente não é
aprovação; interrupção abrupta continua exigindo reconciliação de processos.
Na última consulta deste registro, candidato próprio estava iniciando; nenhum
E2E novo aprovado ainda. Homologação preservada.

## Encerramento pelo aviso efetivo do executor

Aviso de orçamento quase esgotado recebido após a consulta de 15:30:40Z. Somente
handoff depois do aviso. Candidato novo foi observado health UP em loopback,
com SHA/hash/identidade rm_test no manifesto. Locks de E2E e build/deploy
recusaram aquisição concorrente real. Worker nativo permanece independente;
não foi interrompido para repetir tudo na retomada. Nenhum resultado E2E novo
foi consolidado antes do aviso. Consultar resultado/log/unidade antes de outra
suíte ou migration. Não afirmar continuidade concluída nem testes aprovados
somente porque a unidade iniciou.

CI e build completo aprovados conforme seção anterior; PR #3 continua draft,
sem merge ou deploy. Checkpoint final local posterior ao push. Sprint01 e missão
inteira permanecem abertas; demais critérios e sprints não foram reduzidos.

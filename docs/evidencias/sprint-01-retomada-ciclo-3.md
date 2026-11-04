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

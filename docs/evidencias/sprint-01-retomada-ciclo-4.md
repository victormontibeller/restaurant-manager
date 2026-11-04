# Sprint 01 — retomada, ciclo 4

[Checkpoint](../25_EXECUTION_STATUS.md) · [Tenancy](../06_MULTI_TENANT.md)

## Resultado até o incremento

Missão não concluída. Branch/PR #3 existentes preservados. Build e039dc2 não foi
repetido: worker herdado terminou exit 0 em 2026-11-04T15:42:55Z. Estado comercial,
SaaS e convites passaram quinze combinações cada, nos cinco projetos, sem
skip/retry/flaky. Candidato próprio encerrado; hml não foi alterada.

Implementados solicitação durável de provisionamento SaaS, consulta/listagem e
retomada versionada; UI Angular e processamento privilegiado por UUID. A API não
recebe DDL nem credencial owner. V6 pública somente no banco de testes. Fila não
é agendamento instalado; hml continua bloqueada até gate operacional.

## Vermelho, revisão e correção

Probe HTTP autenticado real no candidato anterior: esperado 202, observado 403
na rota ainda ausente. Primeira tentativa do probe enviou campos extras da
fixture e foi rejeitada no login; não é evidência comportamental de provisionar.

Duas revisões independentes somente leitura. Achados backend: CLI legado podia
tomar reserva da fila/gerar outro BCrypt, e crash após ativar seguido de suspensão
impedia reconciliação. Testes reproduziram ausência da exceção e falha de retomada.
Corrigidos reserva compartilhada com advisory global e reconhecimento de empresa
já ativa/suspensa sem reativação. Teste concorrente usa duas sessões distintas.

Achados frontend: 401 tardio encerrava sessão nova e resposta de componente
já destruído apagava intenção após login da mesma conta. Dois testes focados de
código transpilado reproduziram ambos e passaram após geração de sessão e guarda
de destruição. São testes de lógica com Angular substituído, não E2E. O helper de
falha E2E passou a limitar a JVM internamente e limpar a constraint no finally;
contagem de POSTs usa observador independente do interceptor de resposta perdida.

## Verificação executada e pendências

- `SolicitacaoProvisionamentoTest`: nove testes PostgreSQL aprovados após
  correção; XML sem falhas/erros/skip. Inclui concorrência, replay/divergência,
  autenticação, rollback de auditoria, falha/retomada e crash após ativação.
- `node scripts/test_platform_session.cjs`: dois testes aprovados após vermelho.
- Typecheck aplicação/E2E aprovado. Nenhuma dependência nova.
- S01-UI29–31 escritos; build identificado e execução E2E novos ainda pendentes
  nesta gravação. Não atribuir os resultados herdados ao novo artefato.

Sprint 01 continua aberta: agendamento operacional, eventos/projeções, matriz de
perfis e manutenção/backup/restore, além da regressão integrada. Sprints 02–05 não
iniciadas. Sem merge/deploy neste registro, sem conclusão técnica artificial.

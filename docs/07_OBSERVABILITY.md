# Observabilidade e auditoria

> **Escopo:** métricas, alertas, diagnóstico e rastreabilidade operacional.
> **Situação:** diagnóstico local implementado e exercitado com dados fictícios; alertas externos e supervisão operacional permanecem pendentes. Decisões e propostas seguem o [registro central](00_PROJECT_VISION.md).

[Índice da documentação](README.md)

## Métricas e responsáveis

Métricas mínimas propostas: disponibilidade/latência/erros, conexões do pool, espaço em disco, atraso de jobs, pedidos aguardando aceite, idade dos eventos pendentes, falhas de webhook, devoluções em reconciliação, e-mails falhos e resultado do backup. Definir destinos de alerta e quem responde; log local sem acompanhamento não encerra a dependência operacional.

## Logs, auditoria e recuperação

Logs devem permitir diagnóstico sem expor dados pessoais ou credenciais, conforme [Segurança](04_SECURITY.md). Auditoria e eventos de saída acompanham a transação local, conforme [Regras de engenharia](03_ENGINEERING_RULES.md#transacoes-e-recuperacao).

O diagnóstico deve distinguir pedidos pendentes, jobs atrasados, recebimentos incertos, devoluções em reconciliação e falhas de comunicação. Os estados e motivos continuam definidos em [Regras de negócio](20_BUSINESS_RULES.md); a observabilidade não cria estados paralelos.

## Rastreabilidade local da Sprint 3

Pedidos guardam histórico com ator, comando, instante e motivo; ajustes
financeiros preservam a alocação comercial e o valor remanescente. Auditoria,
eventos e estado confirmam na mesma transação. O KDS recebe apenas a projeção
de preparo; histórico operacional não autoriza divulgar dados de outro cliente.

Trabalhos de aceite persistem próximo processamento, lease, tentativas e tipo
de falha sanitizado. Uma falha bloqueada continua visível no armazenamento para
diagnóstico técnico. Console de manutenção e alertas externos permanecem fora
desse incremento; o diagnóstico local da Sprint 5 está descrito abaixo.
Indicador de conexão e última atualização na interface
não comprovam que o operador leu o alerta ou executou a ação.

Desconexões reconhecidas na cadeia de causas encerram o transporte sem gerar
outra resposta ou log de falha interna. Falhas genuínas de serialização continuam
registradas com correlação e tipo sanitizado. A página interna de erro de um
SSE já desconectado segue a delimitação descrita em [Segurança](04_SECURITY.md).

## Evidência operacional

A [Sprint 5](19_SPRINT_05.md) exige validar alertas e recuperação no ambiente real.
Destinos dos alertas, acompanhamento e responsáveis permanecem no
[registro do piloto](23_PILOT_IMPLEMENTATION.md#registro-externo).

<a id="diagnostico-local-sprint-5"></a>
## Diagnóstico local da Sprint 5

[`local_diagnostics.py`](../scripts/local_diagnostics.py) implementa coleta de
contagens e idade dos estados persistidos, sem nomes, payloads, credenciais,
tokens ou conteúdo de e-mail. O coletor exige `rm_test`, porta local autorizada,
tenant registrado e transação `READ ONLY`; no ensaio de restore, o wrapper
também confere o diretório do cluster próprio em 55433. A seleção pode se limitar
ao pedido da fixture para não confundir falhas de dados históricos com a intenção
exercitada. As consultas não corrigem estados nem promovem candidatos.

| Sinal local | Condição observada |
| --- | --- |
| `JOB_ATRASADO` | Trabalho não bloqueado, com próximo processamento vencido e lease ausente ou vencida |
| `JOB_BLOQUEADO` | Trabalho de prazo bloqueado para intervenção |
| `EMAIL_FALHOU` / `EMAIL_RETRY_PENDENTE` | Outbox de identidade em `FALHOU` ou `PENDENTE` com tentativa anterior |
| `NOTIFICACAO_FALHOU` | Notificação operacional em `FALHOU` |
| `PAGAMENTO_INCERTO` | Checkout em `EM_RECONCILIACAO` ou `BLOQUEADO` |
| `DEVOLUCAO_INCERTA` | Devolução em `EM_RECONCILIACAO` ou `FALHOU` |
| `BACKUP_FALHOU` | Resultado de backup informado como falho; a prova integrada exige erro real de abertura do destino inexistente do `pg_dump` |

Uma contagem positiva gera um sinal no recibo privado `diagnostics-*.json`, com
instante, contagem e idade. Isso identifica estado a investigar; não estabelece
SLA, limiar de escalonamento ou responsável. O sinal não é enviado a um canal
externo, e `external_alert_sent` e `operational_supervision_approved` permanecem
falsos. Destino de backup, retenção, disponibilidade do monitor e resposta humana
continuam dependências operacionais.

O [ensaio local](22_PRODUCTION_RUNBOOK.md#ensaio-local-sprint-5) liga o diagnóstico
a falhas controladas: e-mail cifrado com chave errada, pedido com job vencido
durante a interrupção da aplicação e backup para destino inexistente. Os casos
recuperáveis exigem nova consulta mostrando a normalização da condição própria,
sem fabricar um estado saudável por escrita do coletor. Diagnósticos de checkout
e devolução podem ser usados nas provas com provedor fictício; não comprovam
Mercado Pago sandbox ou operação financeira externa.

Na carga sintética, `local_rehearsal.py` também mede latência, erros, CPU/RSS da
aplicação e PostgreSQL, disco e conexões. O probe Hikari usa Attach API no PID Java
próprio e consulta MBeans de máximo configurado, conexões ativas/ociosas/totais e
threads esperando conexão, com intervalo nominal de 100 ms. Guarda
`pool-samples.csv` e o resumo em `load.json`, sem expor endpoint HTTP público.
Threads em espera são uma
medida amostrada de contenção; não são latência de aquisição. Essas medições não
definem capacidade do servidor Linux ou metas de operação do restaurante.

No ensaio 09, aprovado no Mac e encerrado sem erros de cleanup, a carga fez
641 requisições sem erros, com p95 de 29,24 ms. As 187 amostras Hikari observaram
máximo e pico de quatro conexões e nenhuma thread aguardando conexão. As provas
detectaram `EMAIL_FALHOU`, `JOB_ATRASADO` e `BACKUP_FALHOU`; as novas consultas
confirmaram a normalização do e-mail e do pedido após a recuperação.

Esses resultados e suas limitações, incluindo falhas preservadas e reexecuções,
pertencem à [evidência Mac/CI](evidencias/sprint-05-validacao-mac-ci-2026-11-09.md).
Não houve envio externo de alertas; homologação Linux, supervisão operacional e
piloto real permanecem pendentes.

## Documentos relacionados

- [Ambientes, releases e continuidade](22_PRODUCTION_RUNBOOK.md)
- [Notificações e integrações](21_INTEGRATIONS.md)

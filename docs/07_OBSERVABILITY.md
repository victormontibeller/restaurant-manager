# Observabilidade e auditoria

> **Escopo:** métricas, alertas, diagnóstico e rastreabilidade operacional.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

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
diagnóstico técnico; console de manutenção, métricas e alertas externos ainda
não estão implementados. Indicador de conexão e última atualização na interface
não comprovam que o operador leu o alerta ou executou a ação.

Desconexões reconhecidas na cadeia de causas encerram o transporte sem gerar
outra resposta ou log de falha interna. Falhas genuínas de serialização continuam
registradas com correlação e tipo sanitizado. A página interna de erro de um
SSE já desconectado segue a delimitação descrita em [Segurança](04_SECURITY.md).

## Evidência operacional

A [Sprint 5](19_SPRINT_05.md) valida alertas e recuperação no ambiente real. Destinos dos alertas, acompanhamento e responsáveis permanecem no [registro do piloto](23_PILOT_IMPLEMENTATION.md#registro-externo).

## Documentos relacionados

- [Ambientes, releases e continuidade](22_PRODUCTION_RUNBOOK.md)
- [Notificações e integrações](21_INTEGRATIONS.md)

# Sprint 03 — Pedidos, mesas e cozinha

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** implementação e revisão concluídas localmente. Decisões e limites seguem o [registro central](00_PROJECT_VISION.md) e as evidências do [checkpoint](25_EXECUTION_STATUS.md).

[Índice da documentação](README.md)

**Status:** implementação e revisão local concluídas. Linux/homologação pendentes.

Os itens marcados correspondem à validação local descrita na
[evidência da sprint](evidencias/sprint-03-local-2026-11-07.md), sem aprovação de
homologação. O proprietário confirmou o plano local, P10 e delivery controlado
no [registro central](00_PROJECT_VISION.md).

## Entregáveis

- [x] Pedido assistido e de cliente, fila de aceite manual para delivery/retirada a pagar presencialmente, entrada direta da mesa e estados de produção.
- [x] Mesa/atendimento/código temporário, participantes, rodadas e comanda; pedido de ajuda/conta e bloqueio ao iniciar fechamento.
- [x] KDS por unidade, unidades comerciais rastreáveis, componentes escolhidos dos combos, primeiro início de preparo imutável, conclusão de itens, serviço na mesa e cancelamento com solicitação/intervenção.
- [x] Prazos 2/5 minutos configuráveis, idempotência, histórico e notificações internas duráveis.
- [x] Contratos de cobrança/ajuste e saldo da comanda, sem declarar recebimentos reais implementados antes da Sprint 4.

## Dependências

Sprints 1–2, contratos de eventos/transações. Usar cenários controlados para dinheiro/saldos quando necessário; identificar explicitamente o que ainda é simulado.

## Critérios de aceite

- [x] Delivery/retirada entram no aceite; mesa autorizada entra na cozinha sem timeout de aceite. Mesa com QR mas sem autorização, sessão antiga ou comanda em fechamento é bloqueada.
- [x] Alerta ocorre uma vez no prazo; aceite e expiração concorrentes não produzem dois resultados. Reiniciar a API recupera deadlines vencidos e pendências.
- [x] Duplo clique, perda da resposta e reconexão não duplicam pedido/rodada. Mesmo identificador com payload diferente retorna conflito.
- [x] Cancelamento versus primeiro preparo e envio de rodada versus fechamento têm resultado único e saldo consistente. Cliente não cancela pedido de outro participante.
- [x] Cozinha não acessa endereço, credenciais ou dados financeiros; fila/eventos não atravessam empresa/unidade.
- [x] Cancelamento parcial autorizado preserva histórico e ajusta cobrança corretamente; não depende de modificar preço no frontend.
- [x] Linha com quantidade 3 admite unidades em estados diferentes. Iniciar uma unidade bloqueia autocancelamento do pedido; cancelar a única iniciada não apaga o marco nem restaura esse direito.
- [x] Lote de início/conclusão revalida todas as unidades e aplica resultado atômico ou conflito. Todas as unidades ativas prontas tornam o pedido pronto; todas canceladas tornam-no cancelado, sem reabrir fases finais.
- [x] Cancelar uma de duas unidades de combo extingue somente a cobrança remanescente daquela unidade completa; tentativa de cancelar componente é negada. Permissão pós-preparo considera o pedido inteiro, mesmo quando a unidade selecionada ainda está na fila.
- [x] Cliente, Atendimento e Cozinha completam o percurso em viewports de celular/tablet emulados; telas mostram perda de conexão e recuperam estado sem supor que o alerta foi lido. Validação em dispositivos físicos permanece pendente.

## Revisão final

Correções R01–R10 concluídas. O artefato final passou em **365 testes backend
e 360 pares únicos de navegador** (65 Sprint 3 + 295 regressão), sem skips,
retries ou instabilidade. Recuperação dos dois vencimentos, scanner,
110 capturas da matriz e cinco complementares Firefox conferidos. Os checks
frontend permanecem vinculados aos mesmos bytes validados, com aviso de
457,81 kB iniciais e orçamentos preservados. Resultados, falhas e limites estão
na [evidência da revisão final](evidencias/revisao-final-sprint-03-2026-11-07.md).
Publicação e pendências no [checkpoint](25_EXECUTION_STATUS.md).

## Resultado local anterior e limites

347 testes backend aprovados no artefato final08; matriz completa de 350 pares
no candidato 07 e 30 pares dirigidos no candidato 08, após sete ajustes textuais e o literal de etapa
da API. Resultados e hashes permanecem separados, sem somar as execuções.
Build/PWA, tipos, formatação, lógica, templates, reinício/recuperação e revisão
visual concluídos. Recebimentos/devoluções nos cenários são fixtures; provedor
financeiro, expedição e demais entregas da Sprint 4 não foram antecipados.
Linux/Hermes, homologação, dispositivos físicos, tecnologia assistiva e piloto
continuam pendentes. Detalhes e falhas preservadas estão na evidência acima.

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Regras operacionais](20_BUSINESS_RULES.md)
- [Acessos](11_ACCESS_CONTROL.md)
- [Observabilidade](07_OBSERVABILITY.md)

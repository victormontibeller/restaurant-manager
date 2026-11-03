# Sprint 03 — Pedidos, mesas e cozinha

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

**Status:** não iniciada.

Entregas, testes e homologações abaixo estão planejados; nenhum item está marcado como concluído.

## Entregáveis

- [ ] Pedido assistido e de cliente, fila de aceite manual para delivery/retirada a pagar presencialmente, entrada direta da mesa e estados de produção.
- [ ] Mesa/atendimento/código temporário, participantes, rodadas e comanda; pedido de ajuda/conta e bloqueio ao iniciar fechamento.
- [ ] KDS por unidade, unidades comerciais rastreáveis, componentes escolhidos dos combos, primeiro início de preparo imutável, conclusão de itens, serviço na mesa e cancelamento com solicitação/intervenção.
- [ ] Prazos 2/5 minutos configuráveis, idempotência, histórico e notificações internas duráveis.
- [ ] Contratos de cobrança/ajuste e saldo da comanda, sem declarar recebimentos reais implementados antes da Sprint 4.

## Dependências

Sprints 1–2, contratos de eventos/transações. Usar cenários controlados para dinheiro/saldos quando necessário; identificar explicitamente o que ainda é simulado.

## Critérios de aceite

- [ ] Delivery/retirada entram no aceite; mesa autorizada entra na cozinha sem timeout de aceite. Mesa com QR mas sem autorização, sessão antiga ou comanda em fechamento é bloqueada.
- [ ] Alerta ocorre uma vez no prazo; aceite e expiração concorrentes não produzem dois resultados. Reiniciar a API recupera deadlines vencidos e pendências.
- [ ] Duplo clique, perda da resposta e reconexão não duplicam pedido/rodada. Mesmo identificador com payload diferente retorna conflito.
- [ ] Cancelamento versus primeiro preparo e envio de rodada versus fechamento têm resultado único e saldo consistente. Cliente não cancela pedido de outro participante.
- [ ] Cozinha não acessa endereço, credenciais ou dados financeiros; fila/eventos não atravessam empresa/unidade.
- [ ] Cancelamento parcial autorizado preserva histórico e ajusta cobrança corretamente; não depende de modificar preço no frontend.
- [ ] Linha com quantidade 3 admite unidades em estados diferentes. Iniciar uma unidade bloqueia autocancelamento do pedido; cancelar a única iniciada não apaga o marco nem restaura esse direito.
- [ ] Lote de início/conclusão revalida todas as unidades e aplica resultado atômico ou conflito. Todas as unidades ativas prontas tornam o pedido pronto; todas canceladas tornam-no cancelado, sem reabrir fases finais.
- [ ] Cancelar uma de duas unidades de combo extingue somente a cobrança remanescente daquela unidade completa; tentativa de cancelar componente é negada. Permissão pós-preparo considera o pedido inteiro, mesmo quando a unidade selecionada ainda está na fila.
- [ ] Cliente, Atendimento e Cozinha completam o percurso em dispositivos móveis; telas mostram perda de conexão e recuperam estado sem supor que o alerta foi lido.

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Regras operacionais](20_BUSINESS_RULES.md)
- [Acessos](11_ACCESS_CONTROL.md)
- [Observabilidade](07_OBSERVABILITY.md)

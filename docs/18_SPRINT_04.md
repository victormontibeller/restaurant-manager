# Sprint 04 — Delivery e pagamentos

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

**Status:** não iniciada.

Entregas, testes e homologações abaixo estão planejados; nenhum item está marcado como concluído.

## Entregáveis

- [ ] Endereço/região/taxa/mínimo e entrega própria, retirada, expedição e ocorrências.
- [ ] Conexão Mercado Pago por restaurante, checkout escolhido, webhook validado, inbox, tentativas e reconciliação.
- [ ] Recebimentos presenciais, divisão da comanda por valor, troco, quitação e fechamento; reabertura elegível.
- [ ] Devolução integral/parcial automática e manual, ajuste de cobrança, reserva de saldo e fila de falhas.
- [ ] Notificações por e-mail com templates e status, atualização de pedidos pelo sistema.
- [ ] Relatório operacional de vendas/cancelamentos por período e unidade, com consumo/cobranças, recebimentos confirmados, devoluções e pendências apresentados separadamente.

## Dependências

Sprint 3; validar P07/P08, prazos de checkout e política pós-despacho; contas sandbox, URLs de callback acessíveis e provedor de e-mail. Credenciais reais e processo fiscal seguem como condições para piloto.

## Critérios de aceite

- [ ] Pedido online só entra no aceite após confirmação confiável do pagamento; retorno da tela de checkout não confirma recebimento.
- [ ] Webhook inválido, de outra conta, duplicado, fora de ordem e tardio não cruza tenant nem duplica efeito. Pagamento tardio de pedido cancelado gera devolução/pendência sem reativação.
- [ ] Timeout após cobrança/devolução no provedor é reconciliado antes de repetir. Reinício durante a operação conserva intenção, evento e resultado.
- [ ] Dois operadores não recebem acima do saldo, e duas devoluções não ultrapassam valor devolvível. Dinheiro com troco não gera crédito; valores em decimal preservam o total.
- [ ] Cancelar rodada com pagamento parcial usa saldo agregado da comanda; validar o exemplo R$ 120/R$ 50/R$ 80 → R$ 10 a devolver. Comanda não fecha com obrigação incerta.
- [ ] Cancelamento de uma unidade comercial usa seu snapshot com escolhas e adicionais, sem rateio por componente. Devolução parcial financeira autorizada pode ajustar valor do combo sem criar cancelamento de componente ou duplicar abatimento.
- [ ] Combo pago de R$ 40 com ajuste/devolução anterior de R$ 10, confirmada ou pendente, pode ser cancelado abatendo somente os R$ 30 remanescentes. Cobrança nunca fica negativa e devoluções confirmadas mais reservas nunca excedem R$ 40; ajuste global mantém alocação rastreável nas unidades/taxa.
- [ ] Cliente pode cancelar antes do preparo mesmo após aceite; recusa e timeout de pedido pago geram devolução integral. Falha de devolução permanece visível e recuperável.
- [ ] Conta Mercado Pago A nunca é usada no pedido da empresa B, inclusive em chamadas simultâneas do SDK e renovação de credenciais.
- [ ] Alteração da região/taxa não muda pedido passado; endereço fora da área e total abaixo do mínimo não passam pela API.
- [ ] Delivery/retirada não concluem com pagamento devido; servir mesa não exige pagamento prévio da comanda. Ações de receber, concluir entrega e devolver são autorizadas separadamente.
- [ ] Falha de e-mail não desfaz venda; retry não reenvia indefinidamente; acompanhamento exibe estados claros em celular/tablet, inclusive retorno de checkout externo.
- [ ] Relatório respeita tenant, unidades e permissão; totais conferem com pedidos, ajustes, recebimentos e devoluções da massa conhecida, sem contar rodadas de mesa e comanda duas vezes. Definir data de referência/fuso por indicador e distinguir venda, dinheiro recebido e devolução pendente.
- [ ] Separar relatório de testes locais, sandbox e verificação real do provedor. Sandbox aprovado não encerra habilitação comercial/produção.

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Regras financeiras](20_BUSINESS_RULES.md)
- [Integrações](21_INTEGRATIONS.md)
- [API](08_API_STANDARDS.md)

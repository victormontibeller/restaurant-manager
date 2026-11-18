# Dados de pedidos, comandas e configurações

A conferência usou as projeções vigentes na base da Sprint 07. O detalhe financeiro se abre a partir do pedido ou da comanda e respeita as ações efetivas da equipe.

| Público e tela | Dados apresentados |
| --- | --- |
| Cliente, acompanhamento do próprio pedido | O detalhe usa o preço e as escolhas registrados no envio. Mostra valor por unidade, subtotal original, preço base quando diferente, acréscimos e adicionais. Para delivery, exibe o endereço do pedido, a região, o mínimo, a taxa e o total original da cotação. O saldo atual considera cancelamentos e ajustes. A hora da última consulta acompanha a última resposta confirmada. |
| Participante da mesa | O resumo da comanda apresenta total, recebimento e devolução confirmados, saldos e aviso de operação financeira pendente para a mesa inteira. A lista de rodadas mantém o escopo fornecido pela API da mesa. |
| Equipe, fila de pedidos e mesas | A projeção operacional reúne canal, estado, tempos, observações, itens, escolhas, quantidades e estados de produção, solicitações e histórico. Mesas e comandas mostram situação, solicitações da mesa, totais e saldos. |
| Equipe, financeiro do pedido ou da comanda | A composição lista valor original e abatimento por parcela. Na comanda, cada parcela identifica o pedido. Recebimentos mostram valor, meio e horário confirmado. Em dinheiro, incluem valor entregue e troco. Devoluções mostram origem, motivo, estado, datas de solicitação e confirmação. Uma consulta com acesso revogado remove os dados do painel. |
| Equipe, configuração | Delivery reúne prazo do checkout, CEP inicial e final, ativação, taxa e mínimo por região. Aceite indica prazos e herança. A integração de pagamento informa vendedor, estado da autorização e validade. Unidades mostram fuso, canais e horários. A equipe pode consultar vínculos, ações por perfil e vencimento de convites conforme o acesso. |
| Cliente, horários e pagamento online | A consulta identifica fuso, canal, situação e horários da unidade. O pedido distingue o estado da tentativa atual, prazo, ação disponível e histórico das tentativas de pagamento. |
| Plataforma SaaS | A consulta comercial identifica empresa, domínios, estado e versão. O provisionamento mostra empresa solicitada, host, referência, estado, versão e última falha informada pela API. A sessão e os endpoints são próprios da plataforma. |

## Verificação local

Tipagem, formatação, suíte de lógica e build de produção aprovados. No Chromium com o build de produção e transporte simulado, as telas do pedido próprio, da comanda e do financeiro abriram em 390, 820 e 1280 px sem rolagem horizontal. A verificação conferiu a composição de um combo, cotação, saldos da mesa, origem e horários da devolução. Também conferiu que uma falha temporária do pedido mantém a hora da consulta anterior e que a perda de acesso remove o pedido ou as movimentações financeiras da tela.

Os cenários integrados S03-UI02, S03-UI06, S03-UI07 e S04-UI03 receberam asserções para valores da comanda, separação de projeções, cotação e parcela, recebimento e devolução. A execução integrada pertence à matriz do release.

Consulte as diretrizes de [Interface e PWA](../09_UI_GUIDELINES.md), [Acessos](../11_ACCESS_CONTROL.md) e [Matriz de validação](../26_TEST_STRATEGY.md).

# Sprint 08 — Vendas, movimentos, pendências e notificações

O gerente e o caixa podem conferir os números da unidade, identificar de onde veio cada movimento e acompanhar operações que aguardam processamento. A autorização efetiva continua definida pela [matriz de acessos](11_ACCESS_CONTROL.md). Os critérios de data, confirmação e saldo seguem as [regras de vendas](20_BUSINESS_RULES.md#relatório-operacional-de-vendas).

## Dados disponíveis em cada tela

| Tela | Resumo | Dados acessíveis no detalhe |
| --- | --- | --- |
| Vendas | Período, fuso, instante da consulta, pedidos criados, cancelados atuais, cobranças originais, recebimentos, devoluções, ajustes, saldos a receber e a devolver e reservas | Pedidos, cancelamentos e valor original por canal. Recebimentos, devoluções e ajustes por dia com atividade. |
| Extrato | Data do movimento, tipo, valor, canal e referência de pedido ou comanda | Identificador do movimento, pedido ou comanda, mesa, forma de pagamento, valor entregue e troco em dinheiro, recebimento de origem da devolução. Uma cobrança compartilhada pelas rodadas de mesa conserva a referência da comanda. |
| Pendências financeiras | Pedido, canal, pagamento ou devolução online, estado da tentativa, valor e criação | Estado atual do pedido, identificadores do pedido e da operação, tentativas, processamento em curso, falha anterior, próxima tentativa prevista e fuso. Para checkout, vigência ou substituição e registro do encaminhamento ao provedor. Para devolução, recebimento de origem. |
| Notificações por e-mail | Pedido, canal, evento, estado da captura e criação | Referências da notificação e do pedido, estado atual do pedido, tentativas, processamento em curso, falha anterior, próxima tentativa prevista e fuso. Capturado significa que o conteúdo foi salvo localmente. |

As filas têm filtros de tipo e estado aplicados pelo servidor e controles independentes de consulta, página e erro. A aba recupera seus filtros ao voltar. A reconciliação opera sobre o mesmo identificador financeiro e o servidor verifica a reserva de processamento. A equipe vê metadados operacionais. Conteúdo de e-mail, contatos, URLs de checkout, credenciais e erros internos ficam fora da projeção.

## Consultas

- O [relatório de vendas](api/relatorios.yaml) abre no dia da unidade. A consulta aceita período inclusivo de até 367 dias e página do extrato com 25 movimentos, ordenados por data, tipo e identificador. O resumo, os agrupamentos e a página usam o mesmo snapshot PostgreSQL dentro de cada requisição.
- Os [contratos de pagamento e notificações](api/pagamentos.yaml) mantêm as consultas anteriores e incluem as rotas de página com até 50 registros e indicador de continuidade. Listar e reconciliar exigem a ação vigente na unidade.
- As projeções consultam as tabelas de pedidos, parcelas, cobranças, movimentos, tentativas e notificações já implantadas.

## Verificação local

- PostgreSQL real no Mac, com a V29 do release integrado. Quatro classes exercitaram 32 casos. Na rodada ampliada, 31 passaram e um checkout de teste foi processado pelo servidor de outra suíte. O caso foi reexecutado com a janela exclusiva e passou. A rodada anterior de três classes teve 29 aprovações.
- Os casos verificam o limite da meia-noite em São Paulo, paginação de 26 lançamentos no mesmo instante, ordenação, saldos, ajustes, troco e devolução de uma comanda com duas rodadas. As filas verificam filtros, privacidade e acesso por perfil, unidade e tenant.
- Typecheck, build Angular/PWA e suíte de lógica passaram. O [roteiro visual](../scripts/check_financial_views.cjs) recebe os diretórios `browser` da base e do candidato e o destino das capturas. A execução com Chrome e transporte controlado gerou 30 imagens em 360, 768 e 1280 px, nos temas claro e escuro. Foram corrigidas a associação entre rótulos e filtros e a superfície dos detalhes no tema escuro.
- Os percursos integrados S04-UI06 e S04-UI09 foram ampliados para validar o relatório e as duas filas. A aprovação do release e a execução em aparelhos físicos acompanham o [checkpoint](25_EXECUTION_STATUS.md).

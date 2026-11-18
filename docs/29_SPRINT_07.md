# Sprint 07 — Cozinha e expedição

A cozinha usa as três etapas confirmadas pelo servidor e a expedição usa a linha expansível de Pedidos. O gesto de arrastar e os novos detalhes utilizam as APIs atuais. No menu Dia a dia, Cozinha aparece entre Mesas e comandas e Expedição para quem pode iniciar ou concluir preparo. A rota direta `/cozinha` compartilha a navegação e as cores da gestão nos dois temas.

## Operação e dados

| Tela | Resumo | Detalhes e ações |
| --- | --- | --- |
| Cozinha | Unidade e canal, contagem por etapa, mesa ou canal do pedido, referência curta, idade e duração do preparo, observações, cancelamento em avaliação, quantidades por estado. Itens, combos, escolhas, adicionais e quantidades continuam visíveis durante o preparo. | Na fila → Em preparo inicia as unidades elegíveis. Em preparo → Prontos exige que todas as unidades ativas restantes já tenham começado. Os botões atendem teclado, toque e preparo parcial. Histórico inclui referência completa, comanda quando presente, datas da criação, início e conclusão, estados e horários por unidade de produção, solicitações com data/motivo e eventos. Horários usam o fuso da unidade. |
| Expedição | Referência, canal, horário e idade do pedido, estado, região, ocorrência pendente e ação permitida de retirada, saída ou entrega. | O detalhe reúne destinatário, contato, endereço completo, região, mínimo, taxa e total da cotação confirmada, observações, itens, escolhas, adicionais, produção e horários, histórico e avaliação de cancelamento. Ocorrências têm motivo, estado, decisão e devolução da taxa quando aplicável. Recebimentos, ajustes e devoluções abrem conforme as ações efetivas da sessão. |

A API do painel fornece a paginação de cada etapa e separa prontos anteriores ao dia local. Arrastar usa o Angular CDK apenas com colunas simultâneas, sem reordenação ou mudança local definitiva. O servidor recebe IDs das unidades, versão observada e a mesma intenção em eventual recuperação. Em etapas mistas, o operador continua pelos botões. Cada aba da apresentação compacta mantém a navegação por teclado.

Na expedição, a atualização periódica mantém o detalhe e o motivo digitado pelo ID do pedido. A consulta descarta respostas de contexto anterior. A tela reconcilia comandos incertos mesmo quando o pedido já saiu da página. A remoção de acesso descarta a projeção e os rascunhos.

A projeção da cozinha exclui dados de contato, endereço e valores. O saldo e os movimentos financeiros vêm do fluxo próprio de financeiro. Campos de controle como versões, IDs de relacionamento, revisão da cotação e cursor orientam comandos, agrupamento e paginação. Prazos de aceite do pedido se aplicam antes das etapas destas duas telas. Pedidos antigos sem a cotação ou os horários opcionais mostram apenas o conteúdo disponível.

## Comparação de densidade

Em 18/11/2026, o Chromium mediu as mesmas doze entregas fictícias nos builds de produção da base `1a3d01f` e do candidato da sprint. Cada pedido tem duas unidades do prato, um adicional, observação, endereço, cotação e histórico. Na produção da cozinha, os mesmos itens estão na fila. A janela tem 900 px de altura e rolagem inicial no topo. A coluna de visibilidade conta somente linhas ou cartões inteiros. Em ambas as preferências de tema, as medidas coincidiram. Na base, a cozinha ignorava a preferência escura.

| Tela | Largura | Altura antes | Altura depois | Inteiros na primeira tela, antes → depois |
| --- | ---: | ---: | ---: | ---: |
| Expedição | 360 px | 890 px | 221 px | 0 → 3 |
| Expedição | 768 px | 837 px | 121 px | 0 → 5 |
| Expedição | 1280 px | 837 px | 101 px | 0 → 6 |
| Cozinha | 360 px | 558 px | 380 px | 0 → 1 |
| Cozinha | 768 px | 514 px | 354 px | 0 → 1 |
| Cozinha | 1280 px | 558 px | 380 px | 0 → 1 |

Após a integração do menu da gestão, a medição no candidato `b54bd75` confirmou que o primeiro cartão de preparo aparece inteiro nas três larguras, com o histórico recolhido. O roteiro [de comparação](../scripts/measure_operation_density.cjs) recebe dois diretórios `browser` produzidos pelo Angular. Para salvar as 24 capturas de antes e depois, definir `RM_DENSIDADE_CAPTURAS` com um diretório local.

## Verificação

- Build de produção e pacote PWA, tipagem da aplicação e E2E, Prettier e suíte de lógica aprovados no Mac.
- O [teste do painel](../scripts/test_kitchen_templates.cjs) exercitou o ponteiro real em Chromium, Firefox e WebKit com API simulada. Cobriu avanço único, salto e retrocesso inválidos, pedido misto, conflito de versão, seleção parcial, rede indisponível, recuperação com o mesmo corpo, revogação e navegação por teclado.
- O teste nos builds percorreu as duas rotas nos dois temas a 360, 768 e 1280 px. Verificou superfícies claras/escuras, ausência de transbordamento horizontal, alvos de toque, dados da cotação, abertura pelo teclado, preservação do rascunho após atualização e desaparecimento do endereço após revogação simulada.
- Os roteiros integrados S03-UI01, S04-UI05 e S04-UI10 incorporam as novas interações. A matriz do release integrado, a homologação Linux e os aparelhos físicos são apurados no [checkpoint](25_EXECUTION_STATUS.md) segundo a [estratégia de testes](26_TEST_STRATEGY.md).

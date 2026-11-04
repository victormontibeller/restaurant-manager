# Regras e estados do negócio

> **Escopo:** catálogo, pedidos, preparo, mesas, comandas, pagamentos, devoluções e comunicações.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Catálogo e cálculo

Produtos têm nome, descrição, categoria, mídia, composição/configuração permitida e disponibilidade. Adicionais possuem preço e limites de seleção; combos usam composição explícita. Observações de preparo têm limite de tamanho e são texto simples. Informações sobre ingredientes e alergênicos devem ser claras quando fornecidas pelo restaurante; não prometer ausência de contaminação sem validação operacional.

O backend recalcula preço unitário, adicionais, quantidade, subtotal e taxa. Alterações de preço/disponibilidade durante o carrinho retornam resumo atualizado para confirmação; não cobram silenciosamente um valor diferente. O pedido preserva snapshot do produto, escolhas, valores, endereço e unidade. Alterações futuras no catálogo não reescrevem o histórico.

Disponibilidade é uma chave operacional no piloto, não saldo de ingredientes. Se não houver controle de quantidade, a UI não promete reserva de estoque. Produto desativado mantém referências históricas; mudanças de unidade exigem reconstruir/revalidar o carrinho.

<a id="combos-personalizaveis"></a>
## Combos personalizáveis e preço

Conforme D17, um combo possui preço base e grupos configuráveis de componentes, como hambúrguer, acompanhamento e bebida. Cada grupo define opções permitidas e quantidades mínima/máxima por unidade do combo. Uma opção pode estar incluída no preço ou ter acréscimo não negativo; o produto escolhido pode oferecer adicionais explicitamente habilitados para aquela opção do combo.

Regras de implementação do piloto:

- Validar limites por grupo/opção, quantidades inteiras, adicionais e disponibilidade na unidade/canal/horário. Texto livre não satisfaz uma escolha obrigatória.
- Preço unitário do combo = preço base + soma de `[quantidade da escolha × (acréscimo da opção + adicionais por unidade escolhida)]`. Cada adicional tem sua própria quantidade por unidade do componente. O preço avulso do componente não é somado automaticamente; não cobrar um adicional duas vezes.
- Exemplo ilustrativo: base de R$ 30,00, hambúrguer escolhido com acréscimo de R$ 5,00, bebida com R$ 2,00 e adicional de R$ 3,00 resultam em um combo de R$ 40,00. Duas unidades iguais totalizam R$ 80,00.
- Se um grupo permitir duas escolhas iguais, cada uma com acréscimo de R$ 5,00 e adicional de R$ 3,00, a base de R$ 30,00 resulta em R$ 46,00 por combo. Adicionais diferentes exigem escolhas identificadas separadamente, sem aplicar a mesma configuração às duas por engano.
- Grupos e limites aplicam-se a cada combo. Quantidade 2 não significa uma única bebida compartilhada entre ambos. Combos com configurações diferentes ficam em linhas diferentes; alterar uma configuração não altera outra unidade já confirmada.
- Uma opção indisponível exige escolha explícita de alternativa. O combo continua disponível se todos os grupos obrigatórios puderem ser atendidos por opções permitidas; não substituir escolha silenciosamente. Validar também a disponibilidade própria do combo.
- Preservar snapshot de grupos, opções, quantidades, adicionais, descrições de preparo, preço base, acréscimos e total confirmado. Alterações no catálogo não mudam pedido nem configuração enviada à cozinha.
- Para manter a composição e o cálculo verificáveis, o piloto não permite combo dentro de combo. Campos livres registram observações, sem criar componente, preço ou substituição fora das opções autorizadas.

Cancelar uma unidade do combo cancela sua configuração completa e extingue sua cobrança remanescente. Sem ajustes anteriores, esse valor é o preço integral preservado com acréscimos/adicionais; com ajuste comercial anterior, abater somente a parcela ainda devida. Não repartir o preço entre componentes nem oferecer cancelamento avulso de bebida/acompanhamento. Uma devolução parcial por valor, autorizada e justificada pelas regras financeiras, continua possível como ajuste comercial; não equivale a cancelar um componente nem altera o preparo automaticamente.

<a id="quantidades-e-preparo"></a>
## Quantidades e unidade de preparo

Uma linha do pedido contém uma configuração e um preço unitário preservados, com quantidade inteira positiva. Quantidade 3 representa três unidades comerciais iguais. Cada unidade tem identidade e estado de produção próprios; a quantidade original não é reduzida para esconder cancelamentos. Quantidades ativas, canceladas, em preparo e prontas são derivadas dessas unidades.

No combo, a unidade comercial é o combo completo. O KDS exibe seus componentes e adicionais selecionados, mas eles não ganham preço de venda, cancelamento ou estado independente no piloto. Marcar o combo pronto significa conferir todos os componentes escolhidos. Separar/preparar o primeiro componente já inicia o preparo do combo; não esperar a cocção do hambúrguer para registrar uma bebida já separada.

Cada unidade segue `NA_FILA → EM_PREPARO → PRONTO`, ou `CANCELADO` por ação elegível. A interface pode agrupar visualmente uma linha, mostrando, por exemplo, 3 hambúrgueres: 1 na fila, 1 em preparo e 1 pronto. Comandos como iniciar/concluir uma quantidade precisam identificar as unidades afetadas no servidor; um lote revalida todas e confirma atomicamente ou retorna conflito, sem aplicar só parte silenciosamente.

A fila da cozinha e os comandos de produção só são habilitados depois do aceite de delivery/retirada ou da autorização do pedido de mesa. Registros de unidades criados antes disso não permitem iniciar preparo de pedido aguardando pagamento/aceite; o estado do pedido também é verificado no backend.

O pedido preserva `primeiroPreparoEm`, preenchido uma única vez quando qualquer unidade inicia preparo. Cancelar essa unidade não apaga esse marco, não devolve o pedido à fila como se nada tivesse começado e não restaura autocancelamento pelo cliente.

Na fase de produção, após o aceite aplicável:

- Todas as unidades canceladas: pedido `CANCELADO`.
- Pelo menos uma unidade ativa, todas prontas: pedido `PRONTO`.
- Alguma unidade já iniciou em qualquer momento e existe unidade ativa ainda não pronta: pedido `EM_PREPARO`.
- Nenhuma unidade jamais iniciou: pedido `NA_FILA`.

O cálculo acima não regride pedido já servido, despachado, concluído ou cancelado. Serviço, retirada e despacho continuam pelo pedido agregado; entrega parcial não faz parte dessa definição.

## Pedido, preparo e atendimento são conceitos diferentes

- **Pedido:** uma intenção confirmada de compra; na mesa, cada rodada é um pedido ligado à comanda.
- **Item de produção:** uma unidade comercial de uma linha do pedido, incluindo o combo completo com sua configuração; guarda início e conclusão.
- **Mesa:** recurso físico da unidade.
- **Atendimento:** sessão de ocupação da mesa por um grupo, com código e participantes próprios.
- **Comanda:** registro de consumo e recebimentos do atendimento. Um atendimento tem uma comanda no MVP.

Proposta: uma mesa mantém no máximo um atendimento ativo. Não haverá juntar/transferir mesas nem dividir itens por pessoa no piloto. Uma nova sessão nunca reaproveita a autorização do grupo anterior.

## Estados do pedido

Os nomes abaixo formam o contrato proposto de domínio. Estado de pagamento e estado de devolução são eixos independentes.

| Estado | Entrada | Saídas válidas / observações |
| --- | --- | --- |
| `AGUARDANDO_PAGAMENTO` | Delivery/retirada online confirmado pelo cliente | Pagamento confirmado → `AGUARDANDO_ACEITE`; desistência/expiração própria → `CANCELADO` |
| `AGUARDANDO_ACEITE` | Online pago ou pedido a pagar presencialmente | Aceitar → `NA_FILA`; recusar/expirar/cancelar elegível → `CANCELADO` |
| `NA_FILA` | Aceite da equipe ou pedido de mesa autorizada | Primeiro início de item → `EM_PREPARO`; cancelamento elegível → `CANCELADO` |
| `EM_PREPARO` | Ao menos um item iniciado | Todos os itens ativos prontos → `PRONTO`; exceção autorizada → `CANCELADO` |
| `PRONTO` | Produção concluída | Mesa servida ou retirada entregue → `CONCLUIDO`; delivery despachado → `EM_ENTREGA`; cancelamento autorizado antes de servir/retirar/despachar → `CANCELADO` |
| `EM_ENTREGA` | Expedição registra saída | Entrega confirmada → `CONCLUIDO`; problema exige ocorrência e decisão autorizada |
| `CONCLUIDO` | Servido, retirado ou entregue | Terminal operacional; ajustes/devoluções posteriores não reabrem preparo |
| `CANCELADO` | Cancelamento com origem e motivo | Terminal operacional; pagamento tardio gera devolução/reconciliação, não reativação |

Recusa é um cancelamento com motivo próprio. Pedido de delivery pronto pode ser cancelado por operador autorizado antes do despacho. Após despacho, a proposta é tratar falha de entrega/retorno com ocorrência e ação gerencial específica, sem simular entrega bem-sucedida. Definir submotivos e conclusão dessa ocorrência na Sprint 4.

Um pedido pode estar `EM_PREPARO` com alguns itens prontos. O primeiro início de preparo bloqueia o autocancelamento do pedido inteiro. Cancelamento parcial de itens exige operador autorizado; o registro original permanece, com ajuste explícito de consumo/valor e eventual devolução. Não inferir esse ajuste apenas do status global.

Cancelar unidades ainda na fila não permite contornar a permissão pós-preparo quando outra unidade do pedido já começou. As unidades selecionadas, o pedido, seu primeiro início e a consequência financeira são revalidados na mesma operação protegida.

## Aceite e temporizadores

1. Delivery/retirada entram em `AGUARDANDO_ACEITE` apenas quando estão aptos ao aceite: online com confirmação do provedor; presencial com envio validado.
2. Persistir `aguardandoAceiteEm`, `alertarEm` e `expirarEm`, calculados pelo servidor. Padrão: alerta após 2 minutos e cancelamento após 5 minutos.
3. Alerta exige prazo positivo, inferior ao cancelamento. Configuração é por unidade, com valores iniciais herdados da empresa; alterações valem para entradas futuras e não mudam prazos já prometidos.
4. Job durável processa vencimentos mesmo após reinício. Alertas não podem se multiplicar a cada tentativa do job. A tela também calcula o atraso a partir dos prazos persistidos.
5. Aceite e cancelamento automático disputam o mesmo estado de forma atômica. Em `agora >= expirarEm`, a ação de aceitar é recusada e a expiração é aplicada, mesmo se o job atrasou.
6. Cancelamento de pedido pago cria uma obrigação de devolução e evento durável. A falha do provedor não desfaz o cancelamento nem oculta o dinheiro a devolver.

Pedidos aceitos ou de mesa não usam esse relógio. O prazo para concluir um checkout online é outro parâmetro, ainda proposto para definição com a modalidade do provedor; não reutilizar os 5 minutos de aceite.

## Cancelamento e concorrência com preparo

O cliente pode cancelar integralmente as unidades remanescentes de seu pedido enquanto nenhum item jamais começou a ser preparado, inclusive depois do aceite. Não há autocancelamento parcial pelo cliente. Participante de mesa só pode cancelar rodadas de sua autoria. Pedido assistido mantém autoria do funcionário e vínculo ao atendimento; eventual cancelamento pelo participante exige intervenção da equipe no MVP.

Cancelamento e início de preparo precisam bloquear/revalidar o mesmo agregado: se cancelamento confirmar primeiro, a cozinha não inicia; se preparo confirmar primeiro, o cliente recebe informação de que precisa solicitar avaliação. Não executar ambas as transições e tentar reparar o resultado depois.

Após o início, o cliente registra uma solicitação; produção continua até decisão da equipe. Operador com ação específica pode aprovar/rejeitar, com motivo, itens afetados e consequência financeira. Cancelamento pós-preparo é permitido por padrão ao Gerente e Administrador, mas a ação do Gerente é delegável pela matriz. A cozinha recebe a atualização sem perder o histórico do que já preparou.

A equipe pode cancelar uma quantidade de unidades comerciais completas, sem apagar a linha original. Cancelar uma de três unidades extingue a cobrança remanescente daquela unidade, preservando seu preço original no histórico; cancelar um de dois combos afeta somente o combo personalizado selecionado. Cancelar a última unidade ativa torna o cancelamento integral e aplica a política de taxa pertinente. Na mesa, a obrigação de devolução continua calculada pelo saldo agregado da comanda, e não atribuída a uma parcela ou pessoa.

## Comanda e recebimentos por valor

| Estado da comanda | Comportamento |
| --- | --- |
| `ABERTA` | Aceita rodadas de sessões válidas; pedido de conta cria uma solicitação |
| `EM_FECHAMENTO` | Equipe iniciou fechamento; novas rodadas são negadas no backend |
| `FECHADA` | Saldo devido zerado e pedidos ativos servidos/resolvidos; atendimento e acessos temporários encerrados |

Reabrir de `EM_FECHAMENTO` para `ABERTA` é permitido ao Caixa/Gerente por padrão **somente antes do primeiro recebimento confirmado**. Depois de recebimentos, ajustes manuais e devoluções exigem ação financeira específica; não apagar recebimentos nem voltar a aceitar rodadas silenciosamente. O autocancelamento elegível de uma rodada própria ainda sem preparo continua permitido: a regra do sistema ajusta a cobrança e registra eventual obrigação de devolução, sem conceder ao participante poderes de caixa. Uma comanda `FECHADA` permanece fechada; novo consumo exige novo atendimento.

Divisão é por valor: por exemplo, em uma comanda de R$ 120,00, receber R$ 50,00 e depois R$ 70,00. Não atribuir itens ou participantes a parcelas. Podem existir vários métodos de pagamento. No piloto, a equipe registra os recebimentos; não há pagamento online autônomo da mesa nem integração com terminal de cartão.

Recebimento em dinheiro distingue valor aplicado, valor entregue e troco. Em R$ 70,00 de saldo, entrega de R$ 100,00 aplica R$ 70,00 e registra R$ 30,00 de troco; não cria crédito de R$ 30,00 na comanda. Cartão/Pix presencial só é confirmado pela equipe após verificação externa, nunca por screenshot do cliente.

Proposta de contabilização para comandas e pedidos:

- `totalDevido` = cobranças de itens/taxa menos ajustes de cobrança autorizados.
- `pagoConfirmado` = soma de recebimentos efetivamente confirmados.
- `devolvidoConfirmado` = soma de devoluções efetivamente confirmadas.
- `liquidoRecebido` = `pagoConfirmado - devolvidoConfirmado`.
- `saldoAReceber` = máximo de `totalDevido - liquidoRecebido`, zero.
- `saldoADevolver` = máximo de `liquidoRecebido - totalDevido`, zero.

Devolução comercial implica ajuste de cobrança correspondente, para não recriar dívida por um valor dispensado. Correção de um pagamento duplicado pode devolver o excedente sem reduzir a cobrança. Ambos os motivos são distintos e auditados. Devolução em processamento reserva seu valor e bloqueia nova operação conflitante.

Ajustes comerciais identificam as unidades comerciais e/ou taxa afetadas e o valor alocado a cada uma. Um ajuste global deve registrar essa alocação de forma consistente, com soma exata e limites por parcela; isso não atribui itens aos recebimentos nem divide a comanda por pessoa. Cancelamento posterior considera os ajustes anteriores, preserva a cobrança original e acrescenta somente o abatimento remanescente, sem também descontar a linha novamente por estar cancelada.

Exemplo: combo de R$ 40,00 já pago, com ajuste comercial de R$ 10,00 e devolução confirmada ou em processamento. Seu cancelamento completo abate os R$ 30,00 remanescentes, tornando a cobrança zero. A obrigação financeira considera devoluções confirmadas e valores já reservados; não iniciar novamente a devolução dos R$ 10,00. Nenhum caminho pode tornar a cobrança negativa ou devolver/reservar mais que os R$ 40,00 recebidos.

Dois operadores não podem aplicar recebimentos acima do saldo. Fechamento exige `saldoAReceber = 0`, `saldoADevolver = 0` e ausência de recebimentos/devoluções incertos; comanda com todos os itens cancelados e sem dívida pode fechar. Ajustes após o fechamento geram uma pendência financeira vinculada, sem reabrir a autorização da mesa.

## Pagamentos e devoluções

Pagamento possui tentativa, meio, valor, referência externa e estado independente: propostos `PENDENTE`, `CONFIRMADO`, `RECUSADO`, `CANCELADO` e `EM_RECONCILIACAO`. Recusa de uma tentativa não apaga outras tentativas nem o pedido. Repetição de cobrança precisa recuperar o resultado anterior antes de criar outra intenção.

Devolução possui valor, motivo, origem automática/manual, vínculo ao recebimento e estados propostos `SOLICITADA`, `EM_PROCESSAMENTO`, `CONFIRMADA`, `FALHOU` e `EM_RECONCILIACAO`. Valor devolvível considera montante confirmado, devoluções já confirmadas e reservas ainda pendentes; duas solicitações concorrentes não podem ultrapassá-lo.

- Recusa, expiração de aceite e autocancelamento elegível de pedido independente pago online iniciam devolução automática integral.
- Na mesa, cancelar uma rodada ajusta o total da comanda e calcula o excedente agregado, pois pagamentos são por valor. Exemplo: R$ 120,00 de consumo e R$ 50,00 recebidos, com cancelamento de R$ 80,00, deixam R$ 40,00 de cobrança e R$ 10,00 a devolver. O sistema registra a obrigação; a equipe confirma a devolução presencial após realizá-la externamente.
- Cancelamento integral antes do despacho inclui taxa de entrega. Parcial mantém os preços originais e só devolve taxa se essa parcela for selecionada e justificada por operador autorizado.
- Depois do despacho, política de taxa/entrega depende da ocorrência; a proposta é decisão gerencial explícita, sem desconto arbitrário calculado pelo frontend.
- Pagamento aprovado tardiamente para pedido cancelado não o reativa: registrar o recebimento, iniciar devolução e sinalizar falha/pendência se necessário.
- Se duas tentativas online forem aprovadas para uma mesma dívida, aplicar apenas o devido e devolver o excedente, com reconciliação.
- Para dinheiro/cartão/Pix presencial, registrar devolução somente após ação externa confirmada pelo operador autorizado; não afirmar que houve estorno da maquininha pelo sistema.
- Confirmação de cancelamento não significa devolução concluída. Mensagens e relatórios mostram os dois estados, sem prometer prazo de crédito bancário não fornecido pelo provedor.

## Comunicações

| Evento | Sistema | E-mail | Responsável por falha |
| --- | --- | --- | --- |
| Pedido aguardando aceite / alerta de prazo | Equipe da unidade | Não necessário para operação imediata | Gerente/Atendimento |
| Aceite / recusa / cancelamento | Cliente e operação | Cliente autenticado, com contato válido | Operação; fila técnica se envio falhar |
| Pronto para retirada / saiu para entrega | Cliente e operação | Cliente autenticado | Expedição |
| Pedido de conta / ajuda / cancelamento solicitado | Equipe e solicitante | Não obrigatório | Atendimento/Caixa/Gerente conforme ação |
| Devolução pendente / concluída / falha | Cliente e equipe autorizada | Cliente autenticado | Gerente e responsável técnico |
| Convite / recuperação de conta | Destinatário | Obrigatório para a jornada proposta | Administrador / suporte técnico |

Participantes de mesa acompanham pelo navegador, sem e-mail obrigatório. Eventos essenciais persistem; som e avisos do navegador são complementares. Mensagem enviada por e-mail não equivale a lida. Falha de comunicação não desfaz pedido/pagamento: gera retry e pendência visível, com conteúdo sem dados sensíveis desnecessários.

## Documentos relacionados

- [Jornadas](01_PRD.md)
- [Permissões](11_ACCESS_CONTROL.md)
- [Modelo de dados](05_DATABASE.md)
- [Integrações financeiras e comunicação](21_INTEGRATIONS.md)

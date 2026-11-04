# Requisitos do produto e jornadas

> **Escopo:** escopo do piloto, interfaces e percursos de clientes, equipe e operador SaaS.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

<a id="escopo-do-piloto"></a>
## Fronteira do piloto

**Incluído:** vitrine, busca/categorias, produtos e adicionais, combos com componentes personalizáveis, carrinho, dados de entrega, pedido por canal, acompanhamento, mesas e comandas, cozinha, expedição, recebimentos, devoluções, permissões, auditoria e visão operacional básica de vendas/cancelamentos.

**Fora da primeira entrega:** precificação de pizza por sabores/bordas/frações, estoque de ingredientes/fichas técnicas/compras, reservas de mesa, marketplace entre restaurantes, frota externa, integração WhatsApp, maquininha integrada, emissão fiscal automática, programas de fidelidade, cupons complexos, aplicativo nativo e funcionamento transacional offline.

O registro de recebimentos é controle operacional. Não representa um ERP contábil ou fechamento completo de caixa com sangria, suprimento e conciliação bancária. A ausência de emissão fiscal integrada exige definir como a operação fiscal será atendida no piloto.

## Superfícies do produto

| Interface | Público | Principais funções |
| --- | --- | --- |
| Vitrine e área do cliente | Visitante, cliente e participante de mesa | Fotos, categorias, busca, detalhes, carrinho, pedido, acompanhamento e solicitações |
| Operação do restaurante | Administrador, Gerente, Atendimento, Caixa e Expedição | Fila de aceite, mesas/comandas, recebimentos, expedição, catálogo, configurações e relatórios conforme ação |
| Painel da cozinha (KDS) | Cozinha e outros perfis autorizados | Fila por unidade, detalhes de preparo, iniciar e concluir produção |
| Administração da plataforma | Operador do SaaS | Provisionar empresas, domínios e situação operacional; sem acesso implícito a pedidos ou contas de clientes |

A vitrine se inspira no formato visual do [SocialFood de referência](https://socialfood.bardochuveiro.com.br/), com fotos grandes, navegação por categorias e apresentação atraente. Deve manter busca, preços, disponibilidade e botão de pedir fáceis de localizar. A referência visual não autoriza copiar código, marca ou mídias; materiais devem pertencer ao restaurante ou ter uso autorizado.

## Cliente de delivery

1. Abre o domínio do restaurante, escolhe uma unidade e consulta horários/área atendida.
2. Navega pelo cardápio, configura produto, adicionais e escolhas dos combos e monta o carrinho. Cada combo mostra preço base, acréscimos e total antes do envio.
3. Autentica-se; informa endereço e contato necessários. O backend valida atendimento, preço, disponibilidade e total.
4. Escolhe um método habilitado: pagamento online ou pagamento na entrega. Vê taxas, total e que o pedido depende de aceite.
5. Confirma uma única intenção de pedido. No online, aguarda a confirmação do provedor antes da fila de aceite; no pagamento na entrega, entra na fila com saldo devido.
6. Acompanha aceite, preparo, saída e entrega. Recebe eventos pelo sistema e e-mails dos marcos selecionados.
7. Pode cancelar seu pedido enquanto nenhum item começou a ser preparado. Após isso, solicita avaliação; a tela distingue solicitação, cancelamento e devolução.

Falhas obrigatórias: fora da área, loja fechada, item indisponível, total alterado, pagamento pendente/recusado, falta de conexão após envio, recusa e timeout de aceite. Nenhuma mensagem de retorno do navegador comprova pagamento.

## Cliente de retirada

Segue a mesma jornada de conta, cálculo, pagamento e aceite. Não exige endereço de entrega nem taxa de entrega. Ao ficar pronto, o pedido informa unidade, referência para retirada e horário. A equipe confirma a entrega e, quando devido, registra o recebimento. Agendamento de pedidos futuros fica fora do piloto proposto.

## Participante de mesa

1. A equipe abre um atendimento na mesa e disponibiliza um código temporário.
2. O QR identifica a mesa; o código válido do atendimento autoriza uma sessão JWT restrita. Não é obrigatório criar conta ou informar e-mail.
3. O participante configura itens e componentes dos combos e envia uma rodada. O pedido entra diretamente na cozinha e compõe a comanda desse atendimento.
4. Acompanha suas rodadas e pode pedir atendimento ou solicitar a conta. O resumo compartilhado da comanda não expõe dados pessoais de outros participantes.
5. Pode cancelar somente seus próprios pedidos ainda sem preparo. Solicita intervenção para os demais casos.
6. A equipe inicia o fechamento, recebe os valores e encerra o atendimento. A sessão de mesa perde acesso e o próximo grupo começa com novo código/contexto.

Enviar solicitação de conta não fecha a comanda automaticamente. O sistema informa quando a equipe começou o fechamento e bloqueou novas rodadas. QR fotografado e sessão de grupo anterior não devem autorizar compras.

## Equipe do restaurante

| Perfil | Jornada padrão | Tratamento de falhas |
| --- | --- | --- |
| Administrador | Cadastra unidades, equipe, permissões, integrações e parâmetros; acompanha auditoria | Preservar último administrador, reautenticar operações sensíveis, mostrar configuração incompleta |
| Gerente | Supervisiona fila, catálogo e operação; decide exceções, cancelamentos e devoluções | Motivo obrigatório, saldo/estado revalidados e pendências financeiras visíveis |
| Atendimento | Abre mesa, autoriza participantes, lança pedidos assistidos, aceita delivery/retirada e atende solicitações | Não criar rodada duplicada; informar bloqueio por fechamento e expiração da sessão |
| Caixa | Consulta comanda, inicia fechamento, registra parcelas por valor e conclui recebimento | Reconciliar resultado incerto; impedir duas quitações concorrentes e sobre-recebimento |
| Cozinha | Seleciona unidade, lê fila e observações de preparo, inicia produção e marca pronto | Dados permanecem após reconexão; cancelamento concorrente tem um vencedor consistente |
| Expedição | Confere prontos, marca servido/retirado/saída/entrega segundo o canal | Delivery/retirada exigem recebimento antes da conclusão; operador autorizado pode registrá-lo na mesma jornada. Mesa pode ser servida antes do pagamento da comanda |

As jornadas descrevem permissões iniciais, não poderes fixos embutidos no frontend. A matriz atual do restaurante decide as ações disponíveis.

## Operador da plataforma

Provisiona a empresa, vincula domínio, acompanha saúde técnica e trata suspensão/reativação da assinatura. Não recebe automaticamente papel de Administrador do restaurante nem pode impersonar clientes. Suporte excepcional a dados empresariais exige processo específico futuro, consentimento e auditoria; não integra o MVP.

## Documentos relacionados

- [Regras de negócio](20_BUSINESS_RULES.md)
- [Perfis e permissões](11_ACCESS_CONTROL.md)
- [Interface e PWA](09_UI_GUIDELINES.md)

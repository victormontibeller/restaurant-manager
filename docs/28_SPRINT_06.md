# Sprint 06 — Gestão compacta, Minha conta e tema

A entrada é a [visão do roadmap](13_ROADMAP.md). Os padrões reutilizáveis ficam nas [diretrizes de interface](09_UI_GUIDELINES.md), e a consulta e edição da conta no [contrato de identidade](api/identidade.yaml).

| Tela | Dados disponíveis para consulta e ação |
| --- | --- |
| Minha conta | Nome, telefone, e-mail, verificação, data de cadastro e perfil. O cliente gerencia endereços completos com destinatário e contato. A equipe consulta nomes e fusos das unidades às quais tem acesso. |
| Pedidos e pedido assistido | Canal, referência, estado, horários, prazos, observações, itens, adicionais, composição, unidades de produção, histórico e solicitações. O cliente consulta seu endereço e a taxa registrados no pedido de entrega. A gestão abre o financeiro conforme a ação concedida. |
| Mesas, comandas e chamados | Disponibilidade, situação do atendimento, pedidos de ajuda ou fechamento e horário do chamado. A comanda mostra total, recebido, devolvido, saldos e eventual pendência. |
| Equipe, convites e acessos | Nome disponível, e-mail, perfil, situação, verificação, data de cadastro e vínculos do funcionário. Convites detalham unidades, criação, validade e data de aceite ou revogação. A matriz indica escopo e dependências das permissões. |
| Unidades, funcionamento e atualizações | Nome, fuso, situação, canais, horários e eventos de alteração com data e versão. |
| Regiões, prazos e integração | Faixa de CEP, taxa, mínimo, ativação e prazo do checkout. Prazos de aceite exibem padrão ou herança por unidade. A conexão Mercado Pago identifica vendedor, situação e validade da autorização. |
| Cardápio, carrinho, Minha mesa e acompanhamento | Seleções, imagens, quantidades, componentes, adicionais, cotação, pagamento e andamento conforme o canal e o vínculo com o pedido ou mesa. |
| Cozinha, expedição, relatórios, notificações e catálogo | Recebem o tema compartilhado. Os detalhes de operação e as projeções por unidade são entregues nas Sprints 07 a 09. |

O aceite inclui consulta e edição da própria conta por cliente e funcionário, persistência do tema entre navegações e recargas, operação em três larguras e validação dos limites de acesso em PostgreSQL. Os resultados da execução ficam no [checkpoint](25_EXECUTION_STATUS.md).

Na demonstração local, 21 combinações de rota e perfil foram abertas no Chromium em 360, 768 e 1280 px e nos dois temas. As 126 verificações confirmaram a rota, o tema escolhido e a largura do documento sem rolagem horizontal. A conta foi consultada com cliente e administrador fictícios. São verificações de navegação e layout, além dos testes de API e das jornadas de edição.

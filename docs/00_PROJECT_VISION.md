# Visão do projeto e decisões

> **Escopo:** objetivo, decisões confirmadas D01–D18 e premissas P01–P13.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

Restaurant Manager é uma plataforma SaaS para restaurantes, pizzarias e hamburguerias, com cardápio visual e pedidos de delivery, retirada e mesa. O nome comercial será definido posteriormente.

Versão inicial da especificação: 2026-11-02. Fundação iniciada em 2026-11-04; o [checkpoint](25_EXECUTION_STATUS.md) distingue código/testes das jornadas ainda não implementadas.

<a id="interpretacao"></a>
## Como interpretar o documento

- **D — Decisão confirmada:** orientação aprovada para o projeto.
- **P — Premissa proposta:** solução usada para planejar; precisa ser validada na sprint indicada antes da implementação dependente. Não é uma decisão já tomada pelo usuário.
- **E — Dependência externa:** exige informação, serviço, credencial ou responsável fora do código. Simulações não a encerram.

Regras detalhadas sem uma decisão anterior explícita são especificações propostas para implementar as decisões confirmadas. Alterações relevantes devem atualizar o documento responsável pelo assunto e registrar motivo, impacto e aceite. O [registro do piloto](23_PILOT_IMPLEMENTATION.md#registro-externo) controla as dependências externas; decisões e premissas permanecem centralizadas neste arquivo.

<a id="decisoes-confirmadas"></a>
## Decisões confirmadas

| ID | Decisão |
| --- | --- |
| D01 | SaaS para restaurantes, pizzarias e hamburguerias; primeiro piloto em uma hamburgueria, com uma unidade real. |
| D02 | PostgreSQL com um schema por empresa; filiais são unidades internas desse schema. |
| D03 | Java/Spring e arquitetura da loja-virtual como referência principal; Schools como referência de tenancy e acessos. |
| D04 | Usuários autenticados por JWT. Cardápio público, conta de cliente para delivery/retirada e sessão temporária restrita para mesa autorizada. |
| D05 | Perfis fixos, permissões de funcionários configuráveis por ação e acesso limitado às unidades atribuídas. Administrador protegido; administração do SaaS separada. |
| D06 | Angular responsivo/PWA para computador, tablet e celular. |
| D07 | Cardápio visual, delivery com entrega própria do restaurante, retirada, mesas, comandas, cozinha e expedição. |
| D08 | Delivery e retirada têm aceite manual; pedidos de mesa autorizada seguem diretamente para a cozinha. |
| D09 | Alerta de aceite em 2 minutos e cancelamento automático em 5 minutos, com configuração por estabelecimento. |
| D10 | Cliente pode cancelar antes do preparo; após o início, há intervenção autorizada. Comanda pode ser dividida por valor. Devoluções integrais e parciais são necessárias. |
| D11 | Mercado Pago vinculado ao restaurante; registro de recebimentos presenciais. Comunicação pelo sistema e por e-mail. |
| D12 | Desenvolvimento, testes e homologação pelo Hermes no Linux, com checkout e bancos PostgreSQL exclusivos do projeto, separados entre si e de produção. O Mac permanece ambiente adicional possível. Servidor Linux próprio, 8 GB de RAM e serviços nativos. |
| D13 | Regras, validações e segurança no backend; frontend oferece usabilidade e portabilidade. SDKs têm preferência quando existem e atendem à necessidade. |
| D14 | Entregar a documentação antes da aplicação. Repositório público, sem credenciais ou dados reais nos exemplos. |
| D15 | Nesta execução autorizada em 2026-11-03, Hermes usa diretamente o provedor `openai-codex` com autenticação atual, sem instalar Codex CLI nem alterar credenciais. Documentos e checkpoint permitem retomada sem depender do chat. |
| D16 | Delimitação vigente de 2026-11-06: Hermes termina somente implementação/validação da Sprint 01 e prepara passagem para Codex/Mac. Mantém branch `hermes/...` e PR aberto para revisão/merge pelo proprietário após gates reais; não inicia Sprints 02–05. Sem commit direto, merge pelo agente, auto-merge ou force push. Homologação fictícia é autônoma; produção permanece fora do escopo. Substitui o avanço integral autorizado em 2026-11-03. |
| D17 | Combos permitem personalização de componentes. Preço base mais acréscimos das escolhas e adicionais; cada combo completo é uma unidade comercial para cancelamento, sem cancelamento isolado de componentes. |
| D18 | Ao final, executar validação completa de todas as telas/jornadas do escopo e níveis de acesso, com positivos/negativos, isolamento, concorrência, recuperação e mobile; corrigir falhas e entregar relatório por cenário ligado ao release real de homologação. |

D12 e D16 foram atualizadas em 2026-11-02 para execução principal no Linux e publicação autônoma em homologação. Isso não autoriza reutilizar banco de produção ou de outro projeto. A política e a retomada estão no [guia de execução](24_AGENT_EXECUTION.md); a cobertura final de D18 está na [estratégia de testes](26_TEST_STRATEGY.md).

<a id="premissas-propostas"></a>
## Premissas propostas para detalhamento

| ID | Proposta de planejamento | Validar até |
| --- | --- | --- |
| P01 | Monorepositório com `backend/`, `frontend/`, `docs/` e futuros `scripts/`; monólito modular, Maven, Spring Security, JPA/Hibernate e Flyway. | Sprint 0 |
| P02 | O executor inventaria o Linux, seleciona e registra versões suportadas/compatíveis de Java/Spring/Angular/Node/PostgreSQL e SDKs, fixando build/locks. Java 21 é candidato por familiaridade, sem fixação antecipada ou troca automática de ferramentas globais. | Sprint 0 |
| P03 | Massa fictícia com pelo menos duas empresas, uma delas com duas unidades, e funcionário autorizado em somente uma dessas filiais, para testar ambas as fronteiras. | Sprint 0 |
| P04 | Login por e-mail/senha, convite de funcionários, verificação/recuperação por e-mail; access token curto em memória e refresh rotativo em cookie seguro. | Sprint 1 |
| P05 | Catálogo da empresa compartilhado, com preço, disponibilidade e horários por unidade; cliente escolhe unidade antes de montar o pedido. | Sprint 2 |
| P06 | Favoritos pessoais e sugestões curadas, sem recomendação por IA. As escolhas de personalização, preço e unidade de cancelamento dos combos foram resolvidas em D17; os limites de opções/adicionais são configurados pelo restaurante. | Sprint 2 |
| P07 | Regiões por faixas de CEP, taxa fixa, pedido mínimo e horários por unidade. Sem roteirização ou mapa do entregador. | Sprint 4 |
| P08 | Mercado Pago conectado por OAuth e checkout hospedado como primeira modalidade; confirmar produto, recursos disponíveis no SDK e habilitação das contas. | Sprint 0: viabilidade; Sprint 4: escolha e homologação |
| P09 | API e Angular na mesma origem; proxy Caddy, serviços systemd e mídia persistente. Builds/testes em área e processos de desenvolvimento separados dos releases/serviços de produção, mesmo no Linux compartilhado; recursos e concorrência precisam de medição. | Sprint 0: desenho; Sprint 5: ambiente real |
| P10 | Atualizações operacionais via SSE autenticado com alternativa por polling; jobs duráveis no PostgreSQL, inicialmente no mesmo processo da API. | Sprint 0: desenho; Sprint 3: validação |
| P11 | Provisionamento assistido e cobrança da assinatura SaaS administrada manualmente no piloto; venda do restaurante separada da receita SaaS. | Sprint 1 |
| P12 | BRL como moeda inicial; instantes em UTC e fuso por unidade. Sem descontos livres, gorjeta ou taxa de serviço automática na primeira entrega. | Sprint 2 |
| P13 | Sem pedidos offline: cache apenas de shell e conteúdo público permitido; operações precisam de confirmação do servidor. | Sprint 2 |

## Documentos relacionados

- [Escopo e jornadas](01_PRD.md)
- [Roadmap](13_ROADMAP.md)
- [Dependências externas e piloto](23_PILOT_IMPLEMENTATION.md)
- [Registro de decisões arquiteturais](adr/README.md)
- [Execução pelo Hermes](24_AGENT_EXECUTION.md)

# Restaurant Manager

Plataforma SaaS para restaurantes, pizzarias e hamburguerias, com cardápio visual e pedidos para delivery, retirada e consumo na mesa. Cada empresa terá seus dados em um schema PostgreSQL próprio, com filiais internas e controle de acesso por ação e unidade.

**Estado atual:** planejamento documentado. Ainda não existem aplicação executável, banco provisionado, integrações homologadas ou ambiente publicado. O nome comercial será definido posteriormente.

## Stack e arquitetura

| Camada | Direção definida |
| --- | --- |
| Backend | Java e Spring Boot, monólito modular, fluxo Controller → Service → Repository |
| Frontend | Angular responsivo e PWA para computador, tablet e celular |
| Dados | PostgreSQL; schema por empresa e filiais dentro do schema |
| Autenticação | JWT, com autorização efetiva no backend |
| Pagamentos | Mercado Pago por restaurante e registro de recebimentos presenciais |
| Comunicação | Notificações no sistema e e-mail |
| Desenvolvimento | Linux do Hermes com checkout e bancos PostgreSQL exclusivos para desenvolvimento, testes e homologação; Mac como ambiente adicional |
| Publicação inicial | Servidor Linux próprio com 8 GB de RAM, serviços nativos e operação com Hermes |

As versões compatíveis da stack serão verificadas e fixadas na sprint de fundação. A arquitetura da **loja-virtual** é a referência principal; **Schools** contribui com os conceitos de isolamento e acessos. A preferência é por SDKs oficiais quando disponíveis e adequados.

## Piloto

O planejamento considera uma hamburgueria e uma unidade real no primeiro piloto, além de empresas e unidades fictícias para comprovar o isolamento. Inclui:

- Vitrine visual, categorias, produtos, adicionais, combos com componentes personalizáveis e disponibilidade.
- Delivery e retirada com aceite manual; pedidos de mesa autorizada enviados diretamente à cozinha.
- Mesas, atendimentos, comandas, painel de cozinha e expedição.
- Perfis fixos com permissões configuráveis por ação e unidades atribuídas ao funcionário.
- Cancelamentos, divisão da comanda por valor e devoluções integrais e parciais.
- Pagamentos online, recebimentos presenciais, notificações e trilha de auditoria.

Regras específicas de pizzas, estoque de ingredientes, emissão fiscal integrada, aplicativo nativo e integrações de entrega ficam fora da primeira entrega. O processo fiscal usado pelo restaurante precisa ser definido antes do piloto.

## Documentação

Comece pelo [índice da documentação](docs/README.md). Os arquivos seguem a organização por assunto e por sprint usada no Schools:

- [Visão e decisões](docs/00_PROJECT_VISION.md) e [requisitos/jornadas](docs/01_PRD.md).
- [Arquitetura](docs/02_ARCHITECTURE.md), [engenharia](docs/03_ENGINEERING_RULES.md) e [segurança](docs/04_SECURITY.md).
- [Dados](docs/05_DATABASE.md), [tenancy](docs/06_MULTI_TENANT.md) e [perfis/permissões](docs/11_ACCESS_CONTROL.md).
- [Regras de negócio](docs/20_BUSINESS_RULES.md), [integrações](docs/21_INTEGRATIONS.md) e [interface/PWA](docs/09_UI_GUIDELINES.md).
- [Roadmap e sprints](docs/13_ROADMAP.md), [critérios de entrega](docs/12_DEFINITION_OF_DONE.md) e [condições do piloto](docs/23_PILOT_IMPLEMENTATION.md).
- [Ambientes e operação](docs/22_PRODUCTION_RUNBOOK.md) e [guia de contribuição](AGENTS.md).
- [Execução pelo Hermes/Codex](docs/24_AGENT_EXECUTION.md) e [checkpoint de retomada](docs/25_EXECUTION_STATUS.md).
- [Validação completa de telas, jornadas e acessos](docs/26_TEST_STRATEGY.md).

Decisões confirmadas, premissas propostas e dependências externas permanecem identificadas. Os critérios descritos são trabalho a executar, não evidência de implementação concluída.

## Desenvolvimento

A próxima etapa de implementação é a [Sprint 0 — Fundação](docs/14_SPRINT_00.md). Ela criará a estrutura executável, configuração local, migrações e verificações automatizadas. Os comandos de instalação, execução e testes serão documentados quando existirem e tiverem sido verificados.

Hermes chama o Codex autenticado na conta do usuário e avança autonomamente pelo roadmap: implementa, testa, corrige, cria branches/commits, faz push e publica em homologação após as verificações necessárias. Produção permanece separada. A entrega técnica final exige testes de todas as telas/jornadas por perfil e unidade, com relatório de evidências. Guia e checkpoint permitem continuar em outra sessão sem depender do histórico de conversa.

Não versionar credenciais, arquivos de ambiente reais, dados de clientes, dumps ou mídias privadas. Exemplos de configuração devem usar somente placeholders. Não reutilizar os bancos dos projetos de referência.

# Restaurant Manager

Plataforma SaaS para restaurantes, pizzarias e hamburguerias, com cardápio visual e pedidos para delivery, retirada e consumo na mesa. Cada empresa terá seus dados em um schema PostgreSQL próprio, com filiais internas e controle de acesso por ação e unidade.

**Estado atual:** Sprint 00 em andamento. Backend Spring, shell Angular e testes PostgreSQL existem; contas, catálogo, pedidos e pagamentos ainda não estão implementados. Estado de publicação e resultados no [checkpoint](docs/25_EXECUTION_STATUS.md). O nome comercial será definido posteriormente.

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

A [Sprint 0 — Fundação](docs/14_SPRINT_00.md) está em andamento. Versões e limites estão no [ADR 0001](docs/adr/0001-fundacao-nativa.md).

Com Java 21/Maven e Node 26 no PATH, e as variáveis de banco configuradas em ambiente privado:

```bash
npm --prefix frontend ci --ignore-scripts
npm --prefix frontend run typecheck
npm --prefix frontend run build
bash backend/mvnw -B -ntp -f backend/pom.xml verify
python3 scripts/check-repository.py
```

Os testes recusam qualquer alvo diferente de `rm_test`, roles `rm_test_owner`/`rm_test_app`, em loopback :55432. Não usam H2. Para o ambiente privado provisionado, `bash scripts/with-env.sh test <comando>` carrega a configuração sem imprimi-la. `scripts/bootstrap-database.py` cria/verifica o cluster exclusivo com binários previamente extraídos; não instala dependências globais.

`scripts/build-release.sh` exige checkout limpo e gera gate vinculado ao SHA/hash. `scripts/deploy-hml.py` publica candidato no serviço nativo e não o promove antes de E2E. `scripts/verify-release.py` verifica health, PID, manifesto e hash reais. Scripts novos só contam como validados após resultados no checkpoint.

Para Playwright: defina `RM_REPORT_DIR` absoluto fora do checkout e `RM_BASE_URL`; execute `npm --prefix frontend run e2e`. Instale browsers com o CLI Playwright; no Linux sem sudo, `scripts/install-browser-libs.py` extrai pacotes Ubuntu em prefixo privado. Relatórios e credenciais nunca vão ao Git.

Hermes usa o provedor `openai-codex` autenticado atual e avança pelo roadmap autorizado. Produção permanece separada. A entrega técnica final exige todas as telas/jornadas por perfil e unidade; o shell da fundação não atende esse fechamento. Guia e checkpoint permitem retomar sem depender do histórico.

Não versionar credenciais, arquivos de ambiente reais, dados de clientes, dumps ou mídias privadas. Exemplos de configuração devem usar somente placeholders. Não reutilizar os bancos dos projetos de referência.

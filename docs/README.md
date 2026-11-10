# Índice da documentação

A organização segue o padrão do Schools: documentos por assunto, roadmap central e um arquivo por sprint. A arquitetura de implementação continua baseada na loja-virtual, com Java/Spring e Angular.

## Por onde começar

1. [Visão, decisões e premissas](00_PROJECT_VISION.md) e [requisitos/jornadas](01_PRD.md).
2. [Arquitetura](02_ARCHITECTURE.md) e documentos do assunto que será alterado.
3. [Roadmap](13_ROADMAP.md), sprint correspondente e [critérios de entrega](12_DEFINITION_OF_DONE.md).
4. [Runbook](22_PRODUCTION_RUNBOOK.md) e [condições do piloto](23_PILOT_IMPLEMENTATION.md) antes de homologar ou publicar.
5. Para executar pelo Hermes, consultar o [guia de execução](24_AGENT_EXECUTION.md) e o [checkpoint](25_EXECUTION_STATUS.md) antes de iniciar ou retomar uma tarefa.

As instruções de contribuição ficam no [AGENTS.md](../AGENTS.md); a apresentação está no [README do repositório](../README.md).

O [redesenho com Spartan](evidencias/redesenho-frontend-2026-11-08.md) foi validado
localmente e publicado na demonstração, com cliente, gestão e cozinha separados.
O [checkpoint](25_EXECUTION_STATUS.md) distingue essa entrega das etapas externas pendentes.

## Fontes por assunto

| Assunto | Arquivo | Conteúdo |
| --- | --- | --- |
| [Visão, decisões e premissas](00_PROJECT_VISION.md) | `00_PROJECT_VISION.md` | Objetivo, D01–D18 e P01–P13 |
| [Requisitos e jornadas](01_PRD.md) | `01_PRD.md` | Escopo, interfaces e percursos por usuário |
| [Arquitetura](02_ARCHITECTURE.md) | `02_ARCHITECTURE.md` | Módulos, camadas e referências |
| [Engenharia](03_ENGINEERING_RULES.md) | `03_ENGINEERING_RULES.md` | Regras no backend, transações e recuperação |
| [Segurança](04_SECURITY.md) | `04_SECURITY.md` | JWT, sessões, proteção e dados pessoais |
| [Banco de dados](05_DATABASE.md) | `05_DATABASE.md` | Modelo, integridade e migrações |
| [Tenancy](06_MULTI_TENANT.md) | `06_MULTI_TENANT.md` | Schemas, contexto, provisionamento e unidades |
| [Observabilidade](07_OBSERVABILITY.md) | `07_OBSERVABILITY.md` | Métricas, auditoria e alertas |
| [API](08_API_STANDARDS.md) | `08_API_STANDARDS.md` | DTOs, HTTP, erros e portabilidade |
| [Interface e PWA](09_UI_GUIDELINES.md) | `09_UI_GUIDELINES.md` | Responsividade, acessibilidade e conexão |
| [Código](10_CODING_STANDARDS.md) | `10_CODING_STANDARDS.md` | Java, mensagens, dinheiro e ferramentas |
| [Acessos](11_ACCESS_CONTROL.md) | `11_ACCESS_CONTROL.md` | Perfis, ações, unidades e matriz |
| [Critérios de entrega](12_DEFINITION_OF_DONE.md) | `12_DEFINITION_OF_DONE.md` | Qualidade, testes e evidências |
| [Roadmap](13_ROADMAP.md) | `13_ROADMAP.md` | Sequência, dependências e rastreabilidade |
| [Regras de negócio](20_BUSINESS_RULES.md) | `20_BUSINESS_RULES.md` | Estados, comanda, recebimentos e devoluções |
| [Integrações](21_INTEGRATIONS.md) | `21_INTEGRATIONS.md` | SDKs, Mercado Pago, e-mail e eventos |
| [Ambientes e operação](22_PRODUCTION_RUNBOOK.md) | `22_PRODUCTION_RUNBOOK.md` | Local, Linux, release, backup e restore |
| [Piloto](23_PILOT_IMPLEMENTATION.md) | `23_PILOT_IMPLEMENTATION.md` | E01–E12, responsáveis e condições de início |
| [Execução pelo Hermes/Codex](24_AGENT_EXECUTION.md) | `24_AGENT_EXECUTION.md` | Autonomia, ambiente, divisão de tarefas e retomada |
| [Checkpoint vigente](25_EXECUTION_STATUS.md) | `25_EXECUTION_STATUS.md` | Tarefa, evidências, pendências e próximo passo |
| [Passagem para Codex/Mac](27_HANDOFF_CODEX_MAC.md) | `27_HANDOFF_CODEX_MAC.md` | Histórico do handoff e referência à revisão atual no Mac |
| [Testes completos](26_TEST_STRATEGY.md) | `26_TEST_STRATEGY.md` | Telas, jornadas, perfis, gates e relatório final |

## Sprints

| Plano | Situação |
| --- | --- |
| [Sprint 0 — Fundação](14_SPRINT_00.md) | Fundação validada; PR #2 mesclado |
| [Sprint 1 — Tenant, autenticação e acessos](15_SPRINT_01.md) | PRs #3 e [#4](https://github.com/victormontibeller/restaurant-manager/pull/4) integrados; CI da revisão aprovada e homologação do novo release pendente |
| [Sprint 2 — Catálogo e PWA](16_SPRINT_02.md) | Implementação, revisão final e testes locais concluídos; publicação/integração rastreáveis no [PR #5](https://github.com/victormontibeller/restaurant-manager/pull/5); Linux/homologação pendentes |
| [Sprint 3 — Pedidos, mesas e cozinha](17_SPRINT_03.md) | Implementação e revisão local concluídas; [PR #6 integrado](https://github.com/victormontibeller/restaurant-manager/pull/6); Linux/homologação pendentes |
| [Sprint 4 — Delivery e pagamentos](18_SPRINT_04.md) | [PR #8 integrado](https://github.com/victormontibeller/restaurant-manager/pull/8) em `8888234`; [435 backend + 405 pares UI locais](evidencias/sprint-04-local-2026-11-09.md); Linux/homologação pendentes |
| [Sprint 5 — Homologação e piloto](19_SPRINT_05.md) | Preparação e [validação Mac/CI](evidencias/sprint-05-validacao-mac-ci-2026-11-09.md) concluídas; homologação Linux, serviços externos e piloto pendentes |

## Decisões, evidências e manutenção

- Os documentos por assunto são a fonte vigente de requisitos e regras, respeitando o status de cada definição: decisão confirmada, premissa proposta ou dependência externa. Ser uma fonte de referência não transforma proposta em decisão aprovada.
- D01–D18 e P01–P13 ficam somente no [registro central](00_PROJECT_VISION.md); E01–E12 ficam no [registro do piloto](23_PILOT_IMPLEMENTATION.md#registro-externo). Preserve esses IDs ao evoluir o projeto.
- Sprints organizam trabalho e, depois da execução, registram resultados. Em caso de divergência com relato histórico, prevalece a fonte vigente do assunto; atualize as referências quando uma decisão mudar.
- Cada regra detalhada tem um documento responsável. Prefira links à cópia de trechos inteiros entre arquivos. Requisitos e seus critérios de aceite podem referenciar o mesmo comportamento sem criar duas fontes da regra.
- [ADRs](adr/README.md) registram contexto, decisão e consequências de escolhas relevantes. O ADR 0001 registra a fundação tecnicamente aceita, sem aprovar sprints posteriores.
- Relatórios de revisão e evidências, quando produzidos, ficam em documentos próprios, identificados por data e vinculados à sprint. Não criar histórico de testes que ainda não ocorreram.
- [Referências externas e projetos de origem](REFERENCES.md) orientam a implementação e precisam de revalidação quando aplicáveis.

## Situação atual

O estado de execução fica no [checkpoint vigente](25_EXECUTION_STATUS.md). A [revisão pré-Sprint 2](evidencias/revisao-pre-sprint-02-2026-11-06.md) registra achados, correções e limites de validação no Mac. A documentação descreve requisitos e critérios; somente evidências registradas da implementação permitem marcar entregas como concluídas. Revisão de links, coerência de escopo, permissões e estados não constitui teste da aplicação nem homologação externa.

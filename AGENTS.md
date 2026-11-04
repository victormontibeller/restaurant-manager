# AGENTS.md — Guia de contribuição

A documentação canônica fica em `docs/`, organizada por assunto e sprint. Este arquivo define a ordem de consulta e as regras gerais de trabalho; os detalhes pertencem às fontes indicadas.

## Antes de editar

- Use PT-BR na documentação, interface e mensagens de validação. Prefira linguagem direta e termos consistentes com o domínio.
- Comece pelo [índice](docs/README.md) e leia a fonte do assunto afetado antes de editar. Diferencie decisões confirmadas, premissas propostas e dependências externas; o registro central fica em [Visão do projeto](docs/00_PROJECT_VISION.md).
- Neste estágio há somente documentação. Não declare implementado, testado ou homologado o que ainda é um requisito.
- Preserve alterações existentes do usuário. Não altere os projetos de referência. O fluxo pelo Hermes está autorizado a avançar autonomamente pelo roadmap, implementar, testar, corrigir, criar branches/commits, fazer push e deploy em homologação conforme o [guia](docs/24_AGENT_EXECUTION.md#autonomia), sem confirmação a cada etapa. Merge em `main` e produção permanecem fora da autorização automática. A configuração documental não inicia nem instala a execução no Linux.

Leia também a sprint relacionada e os critérios de entrega. Não crie cópias integrais das regras no AGENTS, no README ou no relato da sprint; atualize a fonte do assunto e suas referências.

## Regras essenciais

- Arquitetura da loja-virtual: Controller → Service → Repository; DTOs separam transporte de persistência. Regras e validações de negócio ficam no backend.
- Reutilize os conceitos de tenancy e acessos do Schools, adaptados a Java/Spring; não importe suas ferramentas Django nem políticas específicas do domínio escolar.
- Prefira SDK oficial adequado, com adaptadores pequenos e credenciais isoladas por empresa; HTTP direto exige justificativa técnica.
- Autorize por sessão, tenant, unidade, ação e recurso. Contextos da plataforma e de webhooks seguem fluxos próprios; não aceitam schema arbitrário do chamador.
- Preserve integridade de pedidos e dinheiro com transações, constraints, idempotência e recuperação durável. Não mantenha locks durante chamadas externas.
- Use PostgreSQL real para provar isolamento e concorrência; bancos de desenvolvimento/testes são exclusivos do projeto.
- Segredos e dados pessoais não pertencem ao Git nem a logs. Configurações de exemplo contêm apenas placeholders.
- Valide acessibilidade e uso em computador, tablet e celular. PWA não confirma pedido ou pagamento offline.

## Onde consultar

| Assunto | Fonte canônica |
| --- | --- |
| Produto e decisões | [Visão](docs/00_PROJECT_VISION.md), [PRD](docs/01_PRD.md) |
| Arquitetura e regras de implementação | [Arquitetura](docs/02_ARCHITECTURE.md), [Engenharia](docs/03_ENGINEERING_RULES.md) |
| Java e padrões de código | [Coding standards](docs/10_CODING_STANDARDS.md) |
| Segurança e autenticação | [Segurança](docs/04_SECURITY.md) |
| Dados e contexto empresarial | [Banco](docs/05_DATABASE.md), [Multi-tenant](docs/06_MULTI_TENANT.md) |
| Perfis, ações e unidades | [Acessos](docs/11_ACCESS_CONTROL.md) |
| Estados e invariantes do produto | [Regras de negócio](docs/20_BUSINESS_RULES.md) |
| Contratos e provedores | [API](docs/08_API_STANDARDS.md), [Integrações](docs/21_INTEGRATIONS.md) |
| Frontend e mobile | [Interface/PWA](docs/09_UI_GUIDELINES.md) |
| Logs, auditoria e alertas | [Observabilidade](docs/07_OBSERVABILITY.md) |
| Testes e conclusão | [Definition of Done](docs/12_DEFINITION_OF_DONE.md) |
| Validação completa | [Telas, jornadas, perfis e evidências](docs/26_TEST_STRATEGY.md) |
| Planejamento | [Roadmap](docs/13_ROADMAP.md) e arquivo da sprint correspondente |
| Execução pelo Hermes e retomada | [Guia de execução](docs/24_AGENT_EXECUTION.md), [checkpoint](docs/25_EXECUTION_STATUS.md) |
| Ambientes e piloto | [Runbook](docs/22_PRODUCTION_RUNBOOK.md), [Piloto](docs/23_PILOT_IMPLEMENTATION.md) |
| Decisões arquiteturais | [ADRs](docs/adr/README.md) |

## Conclusão de trabalho

Execute os checks pertinentes à alteração e reporte resultados e limitações. Mudanças documentais exigem consistência e links válidos; não são testes da aplicação. Para implementação, cumpra a [Definition of Done](docs/12_DEFINITION_OF_DONE.md) e os critérios da sprint, distinguindo validação local, simulação, sandbox e operação real. Sprints históricas não prevalecem sobre regras vigentes.

Antes de retomar uma execução, confira o checkpoint contra o estado real de Git, arquivos, bancos e processos. Atualize-o após cada incremento verificável e antes de interromper. Coordenador único integra subagentes; alterações em contratos, migrações e checkpoint são serializadas conforme o guia.

Ao final, execute a matriz completa de telas/jornadas por perfil e unidade contra o release integrado de homologação, com positivos e negativos pela UI e API. Corrija falhas e registre as reexecuções; teste ignorado, instável, bloqueado ou não executado não é aprovado. Não trocar cobertura por um relatório artificialmente verde.

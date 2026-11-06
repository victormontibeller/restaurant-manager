# Restaurant Manager

Plataforma SaaS para restaurantes, pizzarias e hamburguerias, com cardápio visual e pedidos para delivery, retirada e consumo na mesa. Cada empresa terá seus dados em um schema PostgreSQL próprio, com filiais internas e controle de acesso por ação e unidade.

**Estado atual:** fundação e Sprint 01 integradas em `main` pelo PR #3 (`b50b9d1`). Há identidade empresarial/SaaS, cadastro/verificação/recuperação, convites, unidades/equipe, matriz, acompanhamento e exportação cadastrais. A [revisão pré-Sprint 2](docs/evidencias/revisao-pre-sprint-02-2026-11-06.md) registra correções e validação local no Mac; os gates Linux e a homologação dessas correções permanecem pendentes. Catálogo, pedidos e pagamentos não estão disponíveis. Versões, resultados e próximos passos ficam no [checkpoint](docs/25_EXECUTION_STATUS.md) e no [handoff Mac](docs/27_HANDOFF_CODEX_MAC.md). O nome comercial será definido posteriormente.

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

As versões fixadas na fundação estão no [ADR 0001](docs/adr/0001-fundacao-nativa.md). A arquitetura da **loja-virtual** é a referência principal; **Schools** contribui com os conceitos de isolamento e acessos. A preferência é por SDKs oficiais quando disponíveis e adequados.

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
- [Passagem da Sprint 01 para Codex no Mac](docs/27_HANDOFF_CODEX_MAC.md), com histórico do handoff e referência às verificações locais atuais.
- [Validação completa de telas, jornadas e acessos](docs/26_TEST_STRATEGY.md).

Decisões confirmadas, premissas propostas e dependências externas permanecem identificadas. Os critérios descritos são trabalho a executar, não evidência de implementação concluída.

## Desenvolvimento

A [Sprint 0 — Fundação](docs/14_SPRINT_00.md) tem gates técnicos aprovados e PR #2 integrado. Versões e limites estão no [ADR 0001](docs/adr/0001-fundacao-nativa.md).

Com Java 21/Maven e Node 26 no PATH, e as variáveis de banco configuradas em ambiente privado:

```bash
npm --prefix frontend ci --ignore-scripts
npm --prefix frontend run format:check
npm --prefix frontend run typecheck
npm --prefix frontend run test:logic
npm --prefix frontend run build
bash backend/mvnw -B -ntp -f backend/pom.xml verify
python3 scripts/check-repository.py
```

Os testes recusam qualquer alvo diferente de `rm_test`, roles `rm_test_owner`/`rm_test_app`, em loopback :55432. Não usam H2. Para o ambiente privado provisionado, `bash scripts/with-env.sh test <comando>` carrega a configuração sem imprimi-la. `scripts/bootstrap-database.py` cria/verifica o cluster exclusivo com binários previamente extraídos; não instala dependências globais.

`scripts/build-release.sh` exige checkout limpo e gera gate vinculado ao SHA/hash. `scripts/deploy-hml.py` publica candidato no serviço nativo e não o promove antes de E2E. O migrador separado (`java -jar app.jar --migrate-only`) recebe a credencial owner e valida o destino efetivo; o processo HTTP só recebe runtime. Em desenvolvimento, execute o migrador antes de iniciar o servidor. `scripts/verify-release.py [SHA]` verifica health, PID, manifesto, hash e ausência de credencial de migração no runtime. Migrations diferentes das do serviço anterior são recusadas até existir procedimento de manutenção/backup comprovado. Scripts novos só contam como validados após resultados no checkpoint.

Para Playwright: defina `RM_REPORT_DIR` absoluto fora do checkout e `RM_BASE_URL`; execute `npm --prefix frontend run e2e`. Instale browsers com o CLI Playwright; no Linux sem sudo, `scripts/install-browser-libs.py` extrai pacotes Ubuntu em prefixo privado. Relatórios e credenciais nunca vão ao Git.

Os probes de lógica têm lista única em `scripts/test-frontend.cjs`, usada por
`npm --prefix frontend run test:logic`, CI e build de release.
O padrão de legibilidade e modularidade fica nas [convenções Angular](docs/10_CODING_STANDARDS.md#legibilidade-e-organização-angular).
Use `npm --prefix frontend run format` para aplicar a formatação de código.
Templates com navegador: `npm --prefix frontend run test:templates`.
Probe unitário dos seletores de perfil: `node scripts/test_profile_selects.cjs`.
Formulários/foco/erros locais: `node scripts/test_identity_forms.cjs`.
Usa os componentes/templates Angular reais com API fictícia em memória, não E2E.
O probe JIT de formulários testa o handler de retorno; emissão de `output()`
no template compilado é verificada pelos E2E. `scripts/test-profile-templates.sh`
executa ambos os probes nos três motores durante o build.
Exige browser Playwright instalado; `RM_TEMPLATE_BROWSER=chromium|firefox|webkit`
seleciona o motor, Chromium por padrão. A configuração privada de browsers/libs
é a mesma do E2E; WebKit aceita o wrapper local em `RM_WEBKIT_EXECUTABLE`.

`python3 scripts/e2e-hml.py` envolve a suíte com verificação do mesmo SHA/hash/PID antes e depois, sem aprovar revisão visual automaticamente. Testes das travas de release: `python3 -m unittest discover -s scripts -p 'test_*.py'`, com `TMPDIR` apontando para scratch privado. Os testes de migration usam somente schema de ensaio em `rm_test` após validar a conexão; não limpam homologação.

Hermes usa o provedor `openai-codex` autenticado atual. O escopo vigente de 2026-11-06 limita esta execução ao fechamento da Sprint 01 e passagem para Codex/Mac, sem iniciar Sprints 02–05. O PR #3 já foi integrado pelo proprietário; a revisão Mac preserva esse limite de escopo. Produção permanece separada. A entrega técnica final exige todas as telas/jornadas por perfil e unidade; o shell da fundação não atende esse fechamento. Guia e checkpoint permitem retomar sem depender do histórico.

### Provisionamento local em desenvolvimento/testes

Após o build e a migration explícita do banco `dev`/`test`, o JAR aceita `--provisionar <ARQUIVO_PRIVADO_0600>` ou `--retomar-provisionamento <UUID>`. O arquivo UTF-8 no formato properties contém exatamente `id`, `nome`, `host`, `unidade`, `email`, `senha`; deve ficar fora do checkout, com senha aleatória de 12 caracteres a 72 bytes e host local explicitamente cadastrado (ex.: `ficticia.localhost`). Não passe senha na linha de comando nem publique o arquivo. Respostas imprimem somente UUID/estado; login exige a empresa ativada e runtime HTTPS configurado conforme abaixo. Repetição com o mesmo identificador/dados é idempotente; payload divergente conflita.

O comando não executa migration global implicitamente. Homologação exige manutenção/retorno compatíveis e o opt-in técnico explícito descrito no [runbook](docs/22_PRODUCTION_RUNBOOK.md); não contornar a recusa do deploy. A disponibilidade do novo binário é registrada no checkpoint, não presumida por configuração. Testes reproduzíveis: `bash scripts/with-env.sh test bash backend/mvnw -B -ntp -f backend/pom.xml verify`, com `TMPDIR` privado definido. A suíte exerce processo Java novo para retomada, reserva/ativação PostgreSQL, concorrência e falhas reais de SQL.

Autenticação local requer `RM_JWT_SECRET` privado aleatório de pelo menos 64 bytes e HTTPS para os cookies Secure; contrato e limites em [Segurança](docs/04_SECURITY.md). A suíte mutante de navegador é separada da verificação não destrutiva da fundação: `npm --prefix frontend run e2e -- --config=playwright.identidade.config.ts`. Exige `RM_BASE_URL=https://c4.localhost:<PORTA>`, massa provisionada em `rm_test`, `RM_AUTH_FIXTURE` apontando para JSON privado com `email`/`senha`, `RM_REPORT_DIR` privado novo, browsers instalados e certificado local. Nunca executar contra banco hml nem chamar esse ensaio de release homologado.

O candidato do ciclo 9 acrescenta recuperação de senha com captura local fictícia. Configure `RM_EMAIL_SECRET` (32 bytes aleatórios em base64) e `RM_EMAIL_CAPTURE_DIRECTORY` (diretório absoluto 0700, fora do checkout). Não imprimir nem publicar a chave/capturas. Sem essa configuração, a recuperação retorna indisponibilidade; os demais fluxos continuam independentes. `rm.email.agendado=false` desativa somente o worker para testes determinísticos. A suíte específica usa `--config=playwright.recuperacao.config.ts` e `RM_RECOVERY_FIXTURE` privado com `emails` por projeto de navegador e `captureDirectory` exclusivo do tenant de teste. Resultados e limitações ficam no checkpoint; nenhum e-mail externo é enviado.

Não versionar credenciais, arquivos de ambiente reais, dados de clientes, dumps ou mídias privadas. Exemplos de configuração devem usar somente placeholders. Não reutilizar os bancos dos projetos de referência.

O candidato da retomada ciclo 2 acrescenta identidade SaaS e consulta de empresas
em `https://plataforma.localhost:<PORTA>/?area=plataforma`, com origem dedicada
configurável por `rm.platform.host`. Operador é cadastrado de forma assistida no
registro público pelo owner; não reutiliza uma conta empresarial implicitamente.
Os incrementos posteriores acrescentam formulários de solicitação de
provisionamento e suspensão/reativação, validados no escopo fictício da Sprint01.
O despacho assistido hml por UUID está no [runbook](docs/22_PRODUCTION_RUNBOOK.md#despacho-assistido-hml).
API e fronteiras em
[Segurança](docs/04_SECURITY.md) e [OpenAPI SaaS](docs/api/plataforma.yaml).
Playwright: `--config=playwright.plataforma.config.ts`, `RM_PLATFORM_FIXTURE`
privado com `email`/`senha`, HTTPS e banco rm_test previamente verificado. Não
executar a suíte mutante contra hml. Evidências e pendências no checkpoint.

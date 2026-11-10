# Restaurant Manager

Plataforma SaaS para restaurantes, pizzarias e hamburguerias, com cardápio visual e pedidos para delivery, retirada e consumo na mesa. Cada empresa terá seus dados em um schema PostgreSQL próprio, com filiais internas e controle de acesso por ação e unidade.

**Estado atual:** fundação e Sprints 1–4 integradas em `main`. A limpeza e as correções da [revisão geral](docs/evidencias/revisao-geral-pre-testes-2026-11-10.md) estão implementadas em `469f3a4`; frontend completo e [CI #208](https://github.com/victormontibeller/restaurant-manager/actions/runs/42905565646) aprovados. O [PR #11](https://github.com/victormontibeller/restaurant-manager/pull/11) permanece em rascunho.

Por decisão do proprietário, esta rodada termina após backend local e auditorias. A nova matriz de **420 pares** e as **56 novas capturas** não foram executadas e permanecem pendentes; o candidato não tem aprovação integral. A rodada 01 continua reprovada, sem transferir aprovações ao candidato 02. Resultados detalhados e limites ficam no [checkpoint](docs/25_EXECUTION_STATUS.md). Homologação Linux, Mercado Pago sandbox, serviços reais e produção não são aprovados por esta validação local. O nome comercial será definido posteriormente.

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
executa os probes de perfil, identidade, funcionamento e navegação de mesas nos três motores durante o build.
Exige browser Playwright instalado; `RM_TEMPLATE_BROWSER=chromium|firefox|webkit`
seleciona o motor, Chromium por padrão. A configuração privada de browsers/libs
é a mesma do E2E; WebKit aceita o wrapper local em `RM_WEBKIT_EXECUTABLE`.

Na Sprint 2 local, as suítes `playwright.funcionamento.config.ts`,
`playwright.catalogo.config.ts` e `playwright.pwa.config.ts` exigem HTTPS
`sprint02.localhost`, `rm_test` e relatórios privados. Funcionamento usa
`RM_SCHEDULE_FIXTURE` (`email`/`senha`). Catálogo usa `RM_CATALOG_FIXTURE` com
Administrador, IDs de duas unidades e contas dos cinco perfis configuráveis
e dois clientes; veja a validação de campos em `frontend/e2e-catalogo/apoio.ts`.
Massa própria e limites de login devem ser planejados antes da execução.
Para o service worker no Chromium com certificado local privado, a suíte PWA
aceita `RM_TEST_TLS_SPKI`, SHA-256 em base64 da chave pública desse certificado.
A exceção fica restrita a essa chave no navegador de testes; não altera TLS
da aplicação nem a configuração de homologação.

A Sprint 3 usa `playwright.pedidos.config.ts`, com `RM_PEDIDOS_FIXTURE` privado
e `RM_BASE_URL` apontando ao runtime HTTPS do projeto. A massa contém duas
unidades, Administrador, cinco perfis operacionais e dois clientes fictícios;
o formato é validado em `frontend/e2e-pedidos/apoio.ts`. Execute com um worker,
sem retries e com quotas reais preservadas. A [evidência local](docs/evidencias/sprint-03-local-2026-11-07.md)
separa API/PostgreSQL reais, falhas de transporte injetadas, emulação e pendências.

`python3 scripts/e2e-hml.py` envolve a suíte com verificação do mesmo SHA/hash/PID antes e depois, sem aprovar revisão visual automaticamente. Testes das travas de release: `python3 -m unittest discover -s scripts -p 'test_*.py'`, com `TMPDIR` apontando para scratch privado. Os testes de migration usam somente schema de ensaio em `rm_test` após validar a conexão; não limpam homologação.

A missão anterior do Hermes encerrou a Sprint 01 e preparou a passagem para Codex/Mac. As Sprints 2–4 foram implementadas localmente e integradas. A autorização vigente cobre a preparação local da Sprint 5; implantação e matriz completa Linux ficam para etapa própria. Homologação exige seus gates; produção permanece separada. O [guia](docs/24_AGENT_EXECUTION.md) e o checkpoint registram a autorização e a retomada.

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

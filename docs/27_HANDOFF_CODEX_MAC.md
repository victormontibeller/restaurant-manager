# Passagem da Sprint 01 para Codex no Mac

[Índice](README.md) · [Checkpoint vigente](25_EXECUTION_STATUS.md) · [Sprint 01](15_SPRINT_01.md)

## Situação da passagem

Atualização posterior ao handoff, 2026-11-06: o proprietário integrou o PR #3
em `main` (`b50b9d1`). O checkout Mac foi sincronizado e a revisão anterior à
Sprint 2 ocorre em `codex/revisao-pre-sprint-02`. Consulte o
[checkpoint](25_EXECUTION_STATUS.md) para testes locais e limitações atuais.
Os registros do ciclo35 abaixo descrevem a passagem histórica; a pendência de
merge foi resolvida, sem alterar o artefato de homologação registrado.

Atualização do ciclo35, 2026-11-06: **implementação e validação técnica da
Sprint01 concluídas em homologação fictícia; integração em main pendente.**
Os cinco entregáveis e sete critérios foram conferidos, mas isso não declara
entrega integrada. A missão termina na Sprint01/handoff; Sprints02–05 ficam
para continuidade pelo proprietário. Setup macOS não foi executado.

- Repositório: `victormontibeller/restaurant-manager`.
- Branch: `hermes/sprint-01-identidade-acessos`; PR **#3**, base `main`.
- Fonte da aplicação e SHA servido desde08:53:28Z:
  `95d278eebb275521ead3299fbb12f067f6e2419c`.
- SHA-256 do JAR:
  `bb07902c10444312a5bdd8c165efce8278d213de0d11f00d4242cddc8237706d`.
- Fonte operacional usada na troca/smokes:
  `01e27240ed56f5a462fff1964aae8c094ea621bc`.
- Último head publicado conferido antes deste handoff: `3a5d7a7ddb02b7153fd49194acfc86ab24cf8599`.
  Commits documentais posteriores não mudam o JAR; consultar o head real pelo
  comando abaixo. Não tentar gravar o hash do documento dentro do próprio commit.
- Baseline95 aceito às09:10:43Z; registro anterior449ce3c preservado.
  Troca composta executada no mesmo banco, sem migrations novas nem retorno de
  dados. Não restaurar o banco pré-identidade: há contas e uma empresa fictícia
  adicional que precisam ser preservadas.
- PR aberto; merge e integração em `main` aguardam o proprietário após gates.
  Não apagar a branch aberta nem declarar entrega integrada.

Resultados atuais e limites na [evidência35](evidencias/sprint-01-retomada-ciclo-35.md).
O [checkpoint](25_EXECUTION_STATUS.md) distingue passos concluídos dos pendentes.

## O que existe no produto

Java/Spring e Angular funcionais, com PostgreSQL real:

- Identidades empresarial e SaaS separadas; JWT, refresh rotativo, CSRF, logout,
  revogação e reautenticação para ações sensíveis.
- Cadastro/verificação/recuperação e convites com captura local fictícia de e-mail.
- Unidades, equipe, perfis fixos, matriz de ações, versões/conflitos e proteção
  concorrente do último Administrador.
- Autorização por empresa/unidade/ação, projeções por perfil, eventos cadastrais
  por polling e exportação cadastral mínima.
- Consulta e suspensão/reativação SaaS; solicitação de provisionamento pela UI
  com despacho Java assistido e retomável. Não existe timer automático em hml.

Catálogo, carrinho, pedidos, mesas/KDS, pagamentos, delivery e PWA operacional
não estão entregues. Auditoria persistida não significa consulta de auditoria
pela UI/API. O [inventário de cobertura](evidencias/cobertura.md) mantém as
superfícies futuras explícitas. Não há envio externo de e-mail, pagamentos reais,
produção ou piloto aprovado.

## Evidências disponíveis e pendências

Provas do JAR95, sem atribuir a ele execuções de versões anteriores:

- Build nativo:175 testes backend em24 XML, zero falha/erro/skip.
- Matriz32:215 combinações UI01–43 nos cinco projetos, zero falha/skip/retry/flaky.
  Jornadas mutantes usam Angular/API reais e PostgreSQL exclusivo de testes.
- Revisão visual:26 capturas principais,20 complementos e10 adicionais,
  com notas/hash/origem. Limites de componente/viewport são explícitos;
  mobile é emulado, não teste de aparelho nem auditoria integral de acessibilidade.
- Manutenção35:4797 tabelas/40457 linhas, clone equivalente, migrador Java,
  três partidas e contas/negativos, falha SQL injetada após DDL confirmado e
  retorno ao banco original. Hml preservada durante o ensaio.
- Troca nativa `login-startup-frontend` concluída; nove contas empresariais
  revalidadas por login/me/logout e negação do JWT antigo. Sem novo seed.
- Fundação hml:20 combinações; smoke das dez identidades:50 combinações,
  ambos aprovados e encerrados. Consolidação real:285 pares únicos do mesmo JAR,
  sem duplicatas/falha/skip/retry/flaky; não soma partidas frias nem matrizes antigas.
- Aceitação real às09:10:43Z e leitura posterior de baseline, estado, ledger,
  candidato e serviço confirmadas. Sem restart/migration na aceitação;
  clone135836 e original16392 bloqueado preservados. Não equivale a merge.

A causa demonstrada de UI18 foi corrigida por interpretação HQL no startup
(`5cce633`), comprovada por teste de cache, quatro partidas frias Firefox/WebKit
e regressão integrada95. A compatibilidade do backend desses dois JARs foi
conferida byte a byte. Isso não explica toda latência histórica nem garante
performance sob qualquer carga; falhas anteriores e diagnósticos limitados
permanecem nas [evidências31](evidencias/sprint-01-retomada-ciclo-31.md) e
[35](evidencias/sprint-01-retomada-ciclo-35.md). Não ampliar timeout/relaxar segurança.

O assistido28 criou uma empresa fictícia com UI/API/CLI, replay/conflito e
reconciliação sem reexecutar Java. É prova histórica do97, não execução95.
Os componentes de provisionamento/migrations não mudaram; UI29–31 foram
executadas no95 em testes. A empresa adicional foi preservada na troca e
permanece na expectativa independente do inventário SaaS. Não repetir o cadastro.

Não reconstruir nem repetir matrizes aprovadas por alteração documental.
O escopo de implementação/validação desta missão está encerrado; o proprietário
deve revisar/integrar PR #3 antes da próxima sprint. Recuperação e mudanças
incompatíveis devem seguir o [runbook](22_PRODUCTION_RUNBOOK.md), sem retornar
ao banco pré-identidade. Após aceite, o antigo `hml_frontend.py recover` também
recusa retorno; não contornar suas guardas.
Evidências privadas ficam no servidor; não copiar credenciais, fixtures,
traces ou screenshots autenticados para Git/PR. Acesso hml/túnel/contas
continuam somente no arquivo privado `ACESSO.md` existente.

## Retomar o código no Mac

**Setup macOS não executado nem verificado na missão original do Hermes.** Os comandos abaixo
são orientação baseada nos manifests e fontes do repositório; não comprovam
compatibilidade operacional do Mac. Não copiar toolchains Linux para macOS.

No Terminal do Mac, com Git/GitHub CLI autenticados pelo proprietário:

```bash
gh repo clone victormontibeller/restaurant-manager
cd restaurant-manager
git fetch origin
git switch --track origin/hermes/sprint-01-identidade-acessos
git status --short
git rev-parse HEAD
gh pr view 3 --json state,isDraft,headRefOid,baseRefName,statusCheckRollup
```

Se o checkout/branch já existir, não repetir clone nem sobrescrever arquivos:
comparar `git status` e remoto, preservando alterações locais. Antes de outra
implementação/sprint, usar branch dedicada após integração da base pelo
proprietário, conforme [guia](24_AGENT_EXECUTION.md).

Abrir o checkout no Codex autenticado localmente. Ler `AGENTS.md`, índice,
visão, checkpoint, este documento e a fonte do assunto. Não transferir a
sessão/token do Hermes. Não iniciar supervisor adicional no Linux, nem executar
simultaneamente migrações/suítes mutantes contra o mesmo `rm_test`.

## Toolchain e verificações locais

Usar JDK **21**, Node **26** e PostgreSQL **16** nativos para a arquitetura do Mac.
Maven vem do wrapper versionado; Angular/TypeScript/Playwright vêm do lock npm.
Versões exatas usadas no Linux estão no [ADR 0001](adr/0001-fundacao-nativa.md).
Não atualizar dependências ou gerar novo lock como parte da simples retomada.

Na raiz do checkout, com Java/Node no PATH:

```bash
java -version
node --version
bash backend/mvnw -version
npm --prefix frontend ci --ignore-scripts
npm --prefix frontend run typecheck
npm --prefix frontend run build
python3 scripts/check-repository.py
```

Essas verificações não aprovam backend, isolamento nem E2E. `npm start` serve
Angular em loopback para desenvolvimento, mas não cria API/proxy/HTTPS nem
contas. O fluxo autenticado validado usa Angular e API na mesma origem HTTPS,
entregues pelo JAR; não remover Secure dos cookies para usar HTTP.

## PostgreSQL local e backend

Não há bootstrap macOS pronto. `bootstrap-database.py`, `ci-database.py`,
instalação de bibliotecas dos browsers, deploy e supervisão usam caminhos Ubuntu
ou systemd; **não executar esses scripts no Mac supondo portabilidade**.

Preparar uma instância PostgreSQL 16 exclusiva do projeto, somente em
`127.0.0.1:55432`, com dados fora do checkout. Se a porta estiver ocupada,
identificar o serviço e parar a preparação; não matar processos nem reutilizar
bancos alheios. Provisionar, com senhas locais aleatórias distintas:

| Ambiente | Banco | Owner/migração | Runtime |
| --- | --- | --- | --- |
| Desenvolvimento | `rm_dev` | `rm_dev_owner` | `rm_dev_app` |
| Testes | `rm_test` | `rm_test_owner` | `rm_test_app` |

As roles são LOGIN sem superuser/CREATEDB/CREATEROLE. Cada banco pertence ao
owner correspondente; retirar CONNECT de PUBLIC e conceder ao runtime. No
schema public, retirar CREATE de PUBLIC e conceder USAGE ao runtime. Configurar
`search_path=pg_catalog` para cada role runtime no respectivo banco. Migrations
versionadas concedem os demais privilégios. Não executar DDL como runtime.
As operações SQL exatas de referência estão em `scripts/bootstrap-database.py`;
a adaptação macOS precisa confirmar identidade e privilégios, não só criar nomes.

Criar configuração privada 0600, fora do checkout, seguindo `.env.example`.
Não carregar os placeholders literalmente. Para `verify`, configurar
`RM_STAGE=test`, `RM_DB_URL=jdbc:postgresql://127.0.0.1:55432/rm_test`,
`RM_DB_USER=rm_test_app`, `RM_MIGRATION_USER=rm_test_owner` e respectivas senhas
no ambiente privado. O teste confere também a identidade efetiva SQL. Não usar
`rm_dev`, hml ou túnel para o banco de homologação como substituto.

Com variáveis já carregadas sem imprimi-las e `TMPDIR` privado existente:

```bash
bash backend/mvnw -B -ntp -f backend/pom.xml verify
python3 -m unittest discover -s scripts -p 'test_*.py'
```

A suíte Java prepara migrations/massa fictícia em `rm_test`; não usa H2 e não
apaga o banco. Suítes Python de operação podem exigir Linux; falha de
portabilidade deve ser registrada, nunca convertida em skip aprovado.

Para desenvolver a aplicação em `rm_dev`, executar o migrador separado do JAR
com `--migrate-only`, usando somente o owner autorizado. Depois, iniciar o mesmo
JAR com credenciais runtime, **sem `RM_MIGRATION_*`**, configurando HTTPS local,
chave JWT privada e, para comunicação, chave/captura fictícia conforme
[Segurança](04_SECURITY.md). O arquivo de configuração Spring com certificado
PKCS12 e senha deve ficar fora do Git; não usar senha em argumento de processo.
O provisionamento inicial dev/test usa `--provisionar <ARQUIVO_PRIVADO_0600>`
conforme [README](../README.md#provisionamento-local-em-desenvolvimentotestes).
Nunca reutilizar fixture/conta de hml para preparar o Mac.

E2E requer browsers nativos instalados pelo CLI Playwright do próprio checkout,
HTTPS, massa `rm_test`, fixtures e diretórios privados definidos. Usar as
configurações específicas existentes; `playwright.convites.config.ts` e filtro
`S01-UI18:` delimitam a investigação histórica de login frio. As jornadas
alteradas no ciclo32 foram executadas no95 no Linux; isso não valida o Mac.
`RM_REPORT_DIR` deve apontar para diretório privado externo ao checkout;
`RM_BASE_URL` deve ser a origem HTTPS da massa local e `RM_AUTH_FIXTURE` o arquivo
privado das contas preparadas. A configuração de identidade exige host
`c4.localhost`; as demais famílias têm suas próprias guardas e fixtures. Esses
nomes são contratos existentes, não configuração Mac já criada. Relatórios locais não devem sobrescrever
evidências do Linux. Registrar sistema, SHA, JAR/hash, banco e resultados reais
antes de afirmar que o ambiente Mac está validado.

## Resultado da revisão local posterior ao handoff

A [revisão pré-Sprint 2 de 2026-11-06](evidencias/revisao-pre-sprint-02-2026-11-06.md)
registra as verificações realmente executadas no Mac e os gates Linux pendentes.
Os comandos operacionais baseados em systemd e `/proc` continuam restritos ao
Linux; não são um bootstrap portátil. Os probes frontend podem ser executados
por `npm --prefix frontend run test:logic` e, com browsers nativos instalados,
`npm --prefix frontend run test:templates`.

Planeje a massa E2E por bloco: contas diferentes no mesmo schema ainda
compartilham a quota de login por origem (100 tentativas em 15 minutos).
Uma rodada de identidade, recuperação, verificação e cadastro contabiliza
90 tentativas; convites acrescenta 35. A matriz completa de eventos também
pode ultrapassar a quota quando os cinco projetos rodam rapidamente sobre o
mesmo schema. Preserve os contadores e aguarde a janela ou prepare empresas
fictícias isoladas, com origem/fixtures verificadas. Não aumentar timeouts,
ampliar limites ou limpar quotas para aprovar a matriz. Registre os blocos,
tentativas anteriores e pares únicos efetivamente aprovados.

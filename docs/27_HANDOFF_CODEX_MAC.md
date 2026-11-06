# Passagem da Sprint 01 para Codex no Mac

[Índice](README.md) · [Checkpoint vigente](25_EXECUTION_STATUS.md) · [Sprint 01](15_SPRINT_01.md)

## Situação da passagem

Preparação iniciada em 2026-11-06; **não é declaração de Sprint concluída**.
O checkpoint registra o resultado mais recente. Escopo vigente: fechar somente
Sprint 01; Sprints 02–05 serão continuadas pelo proprietário, fora desta execução.

- Repositório: `victormontibeller/restaurant-manager`.
- Branch: `hermes/sprint-01-identidade-acessos`; PR **#3**, base `main`.
- Referência publicada conferida antes deste documento:
  `290d60edc00ce84a4dd38320c1b3393c0befed35`. O head posterior deve ser consultado
  com o comando abaixo, não inferido a partir deste snapshot.
- Aplicação servida em homologação:
  `97d75b09b5b783b18104812cf67fb2e18afdf76a`.
- SHA-256 do JAR:
  `34e207ff6f877d050ef2c9c485c6fb7ff32a2297abb8f2834cf852286ce91f47`.
- Baseline anterior preservado: `449ce3ccf941c73b34ac15a4754183c147f91aaa`.
  O candidato de identidade ainda não foi promovido. Não restaurar o banco
  anterior à identidade: existem contas e uma empresa fictícia adicional no
  banco atual. Recuperação compatível é assunto do [runbook](22_PRODUCTION_RUNBOOK.md).
- PR permanece aberto; merge e integração em `main` aguardam o proprietário,
  após os gates. Não apagar a branch aberta nem declarar entrega integrada.

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

## Evidências disponíveis e bloqueios

No JAR indicado, a consolidação do ciclo28 conferiu:

- 174 testes backend, zero falha/erro/skip, em 23 XML.
- 215 combinações mutantes UI01–43 × cinco projetos, mais 20 de fundação e 50
  smokes de identidades hml: 285 pares únicos, sem somar retestes duplicados.
- Manutenção nativa com clone/migração/retorno; despacho assistido hml com
  read-back, replay, conflito e reconciliação sem reexecutar o Java.
- Revisão visual com 26 capturas principais e 20 complementos, com limites de
  viewport/componente registrados. Browsers mobile são emulados, não aparelhos.

**Bloqueio:** UI18 falhou no ciclo27 em Firefox/WebKit. O reteste28 passou,
mas não demonstrou correção da causa. Conferência de contagens não resolve
instabilidade. O diagnóstico focado do ciclo29 está no checkpoint; consultar
seu término antes de iniciar nova suíte. Não repetir build, manutenção,
provisionamento ou todas as famílias apenas para investigar esse cenário.

A aceitação de baseline e o fechamento dos sete critérios da Sprint dependem
da resolução fundamentada desse achado e dos gates restantes. O consolidador
recusa manifestos com achados abertos ou sem revisão explícita. Não trocar
flags para obter aprovação. Evidências privadas continuam no servidor; não
copiar credenciais, fixtures, traces ou screenshots autenticados para o Git/PR.
Acesso hml/túnel/contas continuam somente no arquivo privado `ACESSO.md` existente.

## Retomar o código no Mac

**Setup macOS não executado nem verificado nesta missão.** Os comandos abaixo
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
`S01-UI18:` delimitam o bloqueio atual. Relatórios locais não devem sobrescrever
evidências do Linux. Registrar sistema, SHA, JAR/hash, banco e resultados reais
antes de afirmar que o ambiente Mac está validado.

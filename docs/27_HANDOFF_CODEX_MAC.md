# Passagem da Sprint 01 para Codex no Mac

[Índice](README.md) · [Checkpoint vigente](25_EXECUTION_STATUS.md) · [Sprint 01](15_SPRINT_01.md)

## Situação da passagem

Preparação iniciada em 2026-11-06; **não é declaração de Sprint concluída**.
O checkpoint registra o resultado mais recente. Escopo vigente: fechar somente
Sprint 01; Sprints 02–05 serão continuadas pelo proprietário, fora desta execução.

Resumo vigente ciclo34 às08:15Z: build95 preservado;155pares únicos aprovados,
incluindo cadastro20 e recuperação15; demais parcelas em execução.42capturas vinculadas;
manutenção95/troca/smokes/aceitação continuam pendentes. Fonte operacional01
limpa/compatível e revalidação das contas preparada, ainda não executada.
Não repetir empresa assistida28 nem retornar banco pré-identidade.
[Evidência34](evidencias/sprint-01-retomada-ciclo-34.md).

Resumo histórico ciclo33: build95 aprovado,24XML/175backend sem falha/erro/skip;
hashbb07902c10444312a5bdd8c165efce8278d213de0d11f00d4242cddc8237706d.
Worker32 aprovou50pares únicos (UI18×5+identidade45) e segue eventos.32capturas
novas inspecionadas/vinculadas; revisão integral continua pendente. Opt-in
composto publicado01e2724/CI aprovada, conferido nos JARs reais, sem reconstrução.
Nenhuma troca nativa nova; restante da matriz95, manutenção e smokes/aceitação
continuam pendentes.
[Evidência33](evidencias/sprint-01-retomada-ciclo-33.md).

Resumo histórico do ciclo32: a correção da consulta fria tem quatro partidas
aprovadas e sua matriz integrada31 terminou com215pares únicos conferidos.
Correção acessível publicada em95d278e, ambos checksCI aprovados. Build nativo
95 ativo na última consulta, ainda sem resultado; novo workerE2E preparado mas
não iniciado. A revisão encontrou
uma lacuna adicional de associação acessível dos erros de código/reautenticação.
Correção Angular e probes passaram, mas novo artefato/E2E e gates operacionais
continuam pendentes. Não confundir os resultados históricos abaixo com aceite
do código posterior. [Evidência32](evidencias/sprint-01-retomada-ciclo-32.md).

O modo operacional `login-startup` não aceita frontend diferente. O novo
`login-startup-frontend` mantém a delimitação backend e permite static;
comparação dos JARs reais e gates operacionais continuam obrigatórios.
Não retornar ao banco anterior à identidade. Nenhuma operação nativa nova
foi executada32 nem aprovada antecipadamente no ciclo33.

- Repositório: `victormontibeller/restaurant-manager`.
- Branch: `hermes/sprint-01-identidade-acessos`; PR **#3**, base `main`.
- Correção de produto publicada e CI aprovada:
  `5cce633e515d76346da3b534e7f9ce3697a65eb3`. A consulta de login agora é
  interpretada no startup; não está no JAR de homologação abaixo.
  A guarda de aceitação foi entregue em `a94e475f7dec9c49a4dca40978880c0cb052f8c4`.
  O head documental posterior deve ser consultado
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

Atualização29b: a reprodução instrumentada com relógio corrigido voltou a
falhar emFirefox e passou emWebKit. O primeiro login foi abortado pelo navegador
em10009ms, mas o servidor só terminou200 em12547ms. Há custo de inicialização
antes das amostras BCrypt; próxima investigação deve cobrir a primeira
autenticação em processo novo, sem aquecimento exclusivo do teste ou aumento
cego de timeout. Resultado e limites em
[evidência29](evidencias/sprint-01-retomada-ciclo-29.md).

No ciclo30, a mesma consulta HQL virou named query validada no startup.
Teste vermelho/verde e dez regressões de identidade passaram (11 ao todo);
ambos checks CI do5cce633 passaram, com175backend e152Python no log conferido.
Build nativo único e ensaio frio de quatro partidas estão identificados no
checkpoint; consultar resultados antes de iniciar outro trabalho pesado.
Isso ainda não fecha UI18. Não alterar timeouts/criptografia nem aquecer apenas
a fixture. [Evidência30](evidencias/sprint-01-retomada-ciclo-30.md).

No ciclo31, as quatro partidas frias passaram sem retry/skip/flaky. Primeiro
login no navegador: 3414, 3433, 5681 e 4006ms; JFR calibrado registrou HQL no
startup, sem amostras desse parser nas autenticações observadas. Ausência de
amostras não prova ausência de custo. A correção tem causa e prova delimitadas;
não explica automaticamente toda lentidão histórica de navegação/reautenticação.
Regressão integrada do novo JAR continua necessária. Build local recontado:
24XML/175backend, zero falha/erro/skip, sem reconstrução.

O novo backend não é uma troca somente de frontend. O modo padrão permanece
restrito; o opt-in `login-startup` aceita apenas as três entradas do incremento
revisado, preserva o clone e retorna somente o binário imediatamente anterior.
Detalhes e limites no [runbook](22_PRODUCTION_RUNBOOK.md). Implementação/testes
de coordenação não são execução nativa: troca e manutenção do novo JAR ainda
pendentes neste registro. Não retornar o banco pré-identidade.

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
`S01-UI18:` delimitam a investigação histórica de login frio. As jornadas
alteradas no ciclo32 também precisam ser executadas no artefato correspondente.
`RM_REPORT_DIR` deve apontar para diretório privado externo ao checkout;
`RM_BASE_URL` deve ser a origem HTTPS da massa local e `RM_AUTH_FIXTURE` o arquivo
privado das contas preparadas. A configuração de identidade exige host
`c4.localhost`; as demais famílias têm suas próprias guardas e fixtures. Esses
nomes são contratos existentes, não configuração Mac já criada. Relatórios locais não devem sobrescrever
evidências do Linux. Registrar sistema, SHA, JAR/hash, banco e resultados reais
antes de afirmar que o ambiente Mac está validado.

# Ambientes e runbook de operação

> **Escopo:** desenvolvimento local, publicação Linux nativa, releases, backup e continuidade.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Desenvolvimento local

O ambiente principal de desenvolvimento/testes/homologação será o Linux do Hermes, em checkout próprio e bancos PostgreSQL exclusivos, separados entre si e de produção. Verificar a instância existente, nomes, permissões e versão antes de provisionar; não alterar bancos de outros projetos. A execução não depende do Mac ligado. O Mac pode continuar com seu PostgreSQL local como ambiente adicional, também segregado.

Não guardar dados do cluster, uploads operacionais ou backups dentro do checkout nem da pasta sincronizada do código. O fluxo segue o [guia Hermes/Codex](24_AGENT_EXECUTION.md): deploy de homologação está autorizado automaticamente; produção depende de pedido específico.

Exemplo **ilustrativo**, sem valores reais e ainda sem arquivo de configuração implementado:

```dotenv
DB_HOST=<HOST_LOCAL>
DB_PORT=<PORTA_POSTGRES>
DB_NAME=<BANCO_EXCLUSIVO_DE_DESENVOLVIMENTO>
DB_TEST_NAME=<BANCO_EXCLUSIVO_DE_TESTES>
DB_USERNAME=<USUARIO_DO_PROJETO>
DB_PASSWORD=<SEGREDO_LOCAL>
JWT_SIGNING_KEY_FILE=<CAMINHO_FORA_DO_REPOSITORIO>
SECRETS_ENCRYPTION_KEY_FILE=<CAMINHO_FORA_DO_REPOSITORIO>
APP_BASE_URL=<ORIGEM_LOCAL_AUTORIZADA>
PAYMENT_MODE=<SIMULADO_OU_SANDBOX>
EMAIL_MODE=<CAPTURA_LOCAL>
```

As variáveis finais serão definidas na Sprint 0. `.env.example` terá apenas placeholders; `.env`, chaves, dumps, mídia privada e artefatos temporários serão ignorados. Nenhum segredo “de desenvolvimento” fixo deve ser publicado. Não substituir ferramentas globais da máquina para atender ao projeto; selecionar versões por configuração local.

## Homologação isolada e publicação automática

Criar configuração própria de homologação: banco/usuário, serviço nativo, origem/porta, diretórios de release/mídia e credenciais de sandbox/captura separados dos demais ambientes. Identificar o ambiente no banner e nos diagnósticos. Dados fictícios não devem ser confundidos com pedidos reais. Credenciais de homologação ficam restritas às operações que precisam delas; testes destrutivos usam seu banco de teste, sem limpar a homologação compartilhada por acidente.

A publicação pelo Hermes segue o [procedimento automático](24_AGENT_EXECUTION.md#publicacao-homologacao), com lock, SHA/artefato identificado, testes antes e depois do deploy e retorno compatível. Não exige nova aprovação por incremento. Domínio/HTTPS externo pode continuar pendente para cenários que não dependam dele; callbacks públicos e instalação PWA segura devem ser validados quando o ambiente apropriado existir.

Registrar tip integrado, release candidato, SHA observado no serviço e último release validado separadamente. Migração parcial não promove o candidato. Retorno de binário não desfaz schema nem retrocede a base de desenvolvimento. Restore automático de homologação só ocorre sobre seu banco/mídia exclusivos, com dados fictícios, ponto consistente e escritores parados; preservar evidências e reconciliar integrações sandbox. Produção não participa dessa recuperação automática.

## Publicação Linux com serviços nativos

O ambiente de homologação desta execução usa Linux e serviços nativos exclusivos, com listeners de banco/aplicação em loopback. Inventário e versões efetivamente observados ficam no checkpoint e registros privados; disponibilidade de Docker não muda a decisão de implantação nativa. Domínio/ingresso públicos permanecem pendentes. A memória instalada não comprova capacidade para uma quantidade de restaurantes; dimensionar com medições.

Topologia proposta: Caddy entrega build Angular e encaminha API HTTPS para Spring em loopback; PostgreSQL acessível somente por canais autorizados; serviços systemd com usuário dedicado, restart controlado e limites; mídia em diretório persistente fora dos releases. Hermes executa procedimentos documentados, mas a aplicação não depende de conversa/sessão do agente para funcionar.

O banco de produção ficará no servidor Linux, separado dos bancos de desenvolvimento/testes/homologação mesmo quando compartilharem host. Não publicar a porta PostgreSQL na Internet. Só escolher túnel, redirecionamento de portas ou outro ingresso após validar IP público/CGNAT e disponibilidade real. Domínio, DNS, TLS e callbacks dos provedores devem funcionar antes da homologação externa correspondente.

Procedimento futuro de release:

1. Gerar artefatos versionados em área/processos de desenvolvimento separados dos releases e serviços de produção, com identificação do commit e dependências fixadas. No host compartilhado, medir recursos e limitar concorrência; não pressupor capacidade por haver 8 GB de RAM.
2. Conferir ambiente, espaço, configuração, backup recente e compatibilidade das migrações.
3. Aplicar migrações de plataforma/tenants com registro por empresa e bloqueio de execução concorrente. Migração com a versão anterior ativa exige compatibilidade demonstrada. Para mudança incompatível, entrar em manutenção, bloquear novas operações, drenar operações em andamento e parar todos os escritores, incluindo API e jobs, antes de migrar.
4. Instalar release, reiniciar serviço e verificar saúde técnica e jornadas críticas.
5. Em falha, executar retorno compatível: trocar binário não desfaz migração de banco. Mudança incompatível exige estratégia própria de recuperação, sem perder transações reais. O runbook deve cobrir eventos externos durante manutenção, comportamento de retry do provedor e reconciliação ao retomar.

Os scripts de build, deploy, verificação de SHA/hash/processo e retorno compatível já estão versionados, com comandos no [README](../README.md). A fundação foi publicada e seu retorno ensaiado; isso não equivale a restore de banco/mídia. O deploy recusa migrations diferentes sem manutenção/backup comprovados. Autenticação e unidades da Sprint 01 ainda não foram promovidas ao serviço de homologação. Homologação fictícia está autorizada dentro do fluxo; produção requer pedido específico.

## Provisionamento assistido pela fila SaaS

O candidato do ciclo 4 recebe solicitações pela interface SaaS. Após consultar
e conferir o UUID, o operador técnico executa em dev/test, com configuração
privada e artefato correspondente às migrations:

```bash
bash scripts/with-env.sh test java -Xmx128m -XX:ActiveProcessorCount=2 \
  -jar <ARTEFATO_PRIVADO_VALIDADO> --processar-solicitacao <UUID_DA_SOLICITACAO>
```

O comando recusa hml neste estágio. Não recebe senha em argumentos e compartilha
lock com migrador/provisionador. Retorno zero exige consultar a solicitação e a
empresa; falha não ativa empresa incompleta. Depois de corrigir a causa, solicitar
retomada versionada pela UI e executar o mesmo UUID. Não usar o CLI legado para
tomar uma reserva da fila. Ainda não há timer/worker contínuo instalado nem
aprovação de homologação para esta jornada.

<a id="fila-operacional"></a>

## Despacho operacional da fila — incremento do ciclo 6

Executar de checkout privado limpo/imutável, usando um job de build aprovado:

```bash
bash scripts/with-env.sh dev python3 scripts/provisioning_queue.py \
  <DIRETORIO_PRIVADO_DO_JOB> --limit 3
```

Aceita somente dev/test; confirma banco/role/loopback, SHA/hash/gate, suporte ao
CLI, igualdade da fonte Java/recursos/dependências com o runner e checksums das
migrations de public/template. Scripts/documentos/testes podem mudar sem novo
JAR se a fonte da aplicação continuar idêntica. Checksums seguem o calculador
CRC32 da versão Flyway 11.14.1 fixada no artefato; formatos não suportados falham
fechado. Essa guarda não substitui o gate de migrations de um deploy.

Um lote tem uma a dez solicitações, padrão três; cada processo Java usa 128 MiB,
duas CPUs lógicas e timeout de noventa segundos. `deploy.lock` impede concorrência
com suítes/builds; o descritor é herdado pelo filho e SIGTERM recolhe o processo.
Timers devem usar `KillMode=control-group`, sem processos desacoplados. Processo
abruptamente morto pode deixar resultado ausente: reconciliar PID/cgroup e banco,
nunca concluir sucesso por ausência de erro. Não instalar timer em checkout mutável.

Resultados privados ficam em `provisioning/<ambiente>/<tentativa>/`, com SHA do
JAR e runner, PID/início, progresso por intenção e saída. `latest.json` só muda
sob lock; tentativa recusada registra `OCUPADO`/exit 75 sem substituir execução
ativa. Resultado zero significa lote executado/confirmado, não fila toda vazia
nem sprint aprovada. Backlog registra quantidade/idade de pendentes e falhas.

`FALHOU` exige retomada versionada pela UI após corrigir a causa. Se a tentativa
continua `SOLICITADO` depois de timeout/contenção, `paused.json` bloqueia novos
despachos; diagnosticar e executar uma vez com `--resume`, preservando o aviso
reconhecido na tentativa. Não colocar `--resume` em timer. Registros são locais,
sem garantia contra perda do disco; supervisão/alerta externo segue pendente.

Na retomada ciclo 7, a pausa é gravada ANTES de iniciar cada filho. Só é removida
após estado terminal confirmado e progresso salvo. Interrupção ou falha de
read-back conserva pausa mesmo se o Java já concluiu; diagnosticar o UUID no
banco antes de reconhecer. Não presumir nova execução por ausência de resultado.

O timer nativo de desenvolvimento deve usar intervalo de sessenta segundos
após término, limites de recursos e caminhos privados explícitos. Não programar
timer mutante permanente em `rm_test`, pois disputaria a massa das suítes. Antes
de ativar, verificar migrations, identidade e conta fictícia; após ativar, conferir
unidade, resultado e efeito real no banco. Hml continua bloqueada pelo gate de
manutenção/backup/restore. Nenhuma instalação é presumida por este procedimento.

## Build independente da sessão

`python3 scripts/durable_build.py start` exige checkout limpo e cria clone privado
destacado do SHA, sem hardlinks. A unidade de usuário exclusiva
`restaurant-manager-build.service` executa o build completo fora da sessão Hermes.
Locks de lançamento/worker e o lock existente de build/deploy impedem concorrência.
O caminho retornado contém request, PID/início do processo, log e resultado JSON,
gate próprio e cópia do artefato cujo hash foi conferido. Não modificar esse clone.
O próximo ciclo consulta `builds/latest.json` no diretório privado do projeto,
o resultado do job e `systemctl --user show restaurant-manager-build.service`;
não reinicia um build ativo. Resultado ausente ou falho nunca aprova release.

O lançamento propaga explicitamente somente `PATH`, `RM_HOME` e `TMPDIR` do
chamador; o scratch deve existir, ser gravável e ficar fora de `/tmp`. Não exporta
todo o ambiente da sessão nem credenciais do Hermes. `with-env.sh test` carrega
configuração privada do banco de teste e seleciona Java/Maven; Node/npm vêm do
`PATH` explícito. O ambiente do supervisor não é automaticamente o do serviço.

Este mecanismo não faz deploy nem substitui E2E. O deploy atual ainda consome
o gate/JAR do checkout original: não copiar somente o gate de um job para ele.
A integração de promoção do artefato privado continua pendente. Encerramento
abrupto sem resultado exige reconciliar unidade/log/PID; não há aprovação por
inferência, nem garantia de persistência contra queda de energia.

<a id="backups-e-continuidade"></a>
## Backups, restauração e continuidade

### Ensaio disponível de banco — retomada ciclo 7

`bash scripts/with-env.sh test python3 scripts/database_recovery.py` valida
conexão efetiva rm_test e adquire o lock de build/deploy. Exporta snapshot de
transação somente leitura; inventário e pg_dump usam o mesmo ponto. Restaura
em cluster novo, privado, sem TCP, com papéis sem login, sem alterar bancos
dev/test/hml. Compara todas as linhas por hash, proprietários, privilégios,
constraints, índices, funções e triggers, exigindo ao menos duas empresas com
schema, unidade e identidade. Normaliza somente a representação equivalente
de casts literais varchar/text e ACL padrão do PostgreSQL; não ignora diferenças.

Resultado, inventários, dump e logs ficam privados em `recovery/<tentativa>`.
O cluster isolado é parado no encerramento; falha de cleanup impede aprovação
e fica registrada. Queda abrupta exige conferir `cluster/postmaster.pid` e
recolher somente esse processo. O ensaio não remove arquivos anteriores.
Medições são técnicas, não metas RPO/RTO; snapshot anterior à conclusão pode
omitir transações posteriores, que precisam ser reconciliadas em recuperação.

Esta prova é somente de banco: NÃO cobre mídia, recuperação de chaves,
login da aplicação restaurada, backup externo, manutenção/migration de hml
nem habilita o deploy ou provisionamento hml. Esses gates permanecem abertos.

### Probe opcional da aplicação restaurada — ciclo 8

`database_recovery.py --application-job <JOB_PRIVADO_APROVADO> --application-fixture
<JSON_PRIVADO>` acrescenta um ensaio HTTP real após comparar integralmente o banco.
Exige gate/hash/fonte correspondente; a fixture 0600 contém contas fictícias de
duas empresas e funcionário restrito a uma filial, chaves JWT/comunicação e TLS.
Nunca versionar esse JSON. Copia configuração/certificado com manifesto de hashes
para a tentativa privada; runtime relê somente essa cópia.

Neste modo, o cluster novo aceita exclusivamente rm_test_app com senha efêmera
em 127.0.0.1:55433 e aplicação HTTPS em 127.0.0.1:8090. O runtime exige opt-in
`--rm.recovery-test=true`, limitado a test/rm_test/rm_test_app/55433; não altera
allowlists de migration/provisionamento nem permite recuperação sobre hml/dev.
Processos próprios são recolhidos; erro de cleanup impede aprovação. Modo padrão
do ensaio de banco continua sem TCP.

Verificações: login/identidade de contas restauradas, JWT de outra empresa negado,
filiais reais permitida/negada, ação administrativa negada à Cozinha, shell Angular,
health, sessão/JWT após restart, mensagem cifrada com worker parado e captura após
restart, reset/reuso de código e preservação de outras contas. Esses JWTs/mensagens
são criados APÓS restore: não demonstram recuperação de tokens/outbox pré-backup.
Mídia ainda não existe neste incremento. Não aprova X15, backup externo, manutenção,
deploy ou recuperação integral de chaves; execução e resultados ficam no checkpoint.

Backup deve abranger banco, mídias necessárias e recuperação de configuração/chaves por processo seguro separado. Banco e mídias precisam formar um ponto recuperável consistente: adotar snapshot coordenado/quiescência ou mídia imutável/versionada com retenção e inventário compatíveis com o backup do banco. Uma cópia posterior dos arquivos, sem controle de alterações concorrentes, não atende a esse requisito. Registrar o ponto de recuperação e verificar referências de mídia no restore. Agendamento, criptografia, destino externo, retenção, RPO, RTO e responsável são pendências. Backup no mesmo disco não basta como único mecanismo de recuperação.

Exigir ensaio de restore em ambiente isolado: verificar pelo menos duas empresas, usuários/acessos, pedidos, recebimentos, mídia e separação dos schemas. Reconciliar efeitos externos após restauração, pois o provedor pode ter processado eventos posteriores ao ponto restaurado. Restore integral não comprova automaticamente recuperação seletiva de um tenant.

Plano de contingência do piloto deve dizer como registrar pedidos e recebimentos se Internet/servidor cair e como reconciliá-los depois, sem duplicação. Operação manual alternativa será acordada com o restaurante; PWA não substitui esse procedimento.

## Documentos relacionados

- [Métricas e alertas](07_OBSERVABILITY.md)
- [Migrations por tenant](06_MULTI_TENANT.md)
- [Homologação](19_SPRINT_05.md)
- [Dependências do piloto](23_PILOT_IMPLEMENTATION.md)
- [Execução de desenvolvimento pelo Hermes](24_AGENT_EXECUTION.md)

# Ambientes e runbook de operação

> **Escopo:** desenvolvimento local, publicação Linux nativa, releases, backup e continuidade.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Desenvolvimento local

O ambiente principal de desenvolvimento/testes/homologação será o Linux do Hermes, em checkout próprio e bancos PostgreSQL exclusivos, separados entre si e de produção. Verificar a instância existente, nomes, permissões e versão antes de provisionar; não alterar bancos de outros projetos. A execução não depende do Mac ligado. O Mac pode continuar com seu PostgreSQL local como ambiente adicional, também segregado.

Não guardar dados do cluster, uploads operacionais ou backups dentro do checkout nem da pasta sincronizada do código. O fluxo segue o [guia Hermes/Codex](24_AGENT_EXECUTION.md): deploy de homologação está autorizado automaticamente; produção depende de pedido específico.

O contrato de configuração está em [`.env.example`](../.env.example), somente
com placeholders. Usar arquivos privados 0600 fora do checkout e separar a
credencial owner do runtime. O wrapper `with-env.sh` é para configuração privada
confiável do operador; o ensaio local lê somente atribuições, sem executar shell.
Chaves, dumps, mídia privada e artefatos temporários não pertencem ao Git.
Não substituir ferramentas globais da máquina para atender ao projeto;
selecionar versões por configuração local.

## Homologação isolada e publicação automática

Criar configuração própria de homologação: banco/usuário, serviço nativo, origem/porta, diretórios de release/mídia e credenciais de sandbox/captura separados dos demais ambientes. Identificar o ambiente no banner e nos diagnósticos. Dados fictícios não devem ser confundidos com pedidos reais. Credenciais de homologação ficam restritas às operações que precisam delas; testes destrutivos usam seu banco de teste, sem limpar a homologação compartilhada por acidente.

A publicação pelo Hermes segue o [procedimento automático](24_AGENT_EXECUTION.md#publicacao-homologacao), com lock, SHA/artefato identificado, testes antes e depois do deploy e retorno compatível. Não exige nova aprovação por incremento. Domínio/HTTPS externo pode continuar pendente para cenários que não dependam dele; callbacks públicos e instalação PWA segura devem ser validados quando o ambiente apropriado existir.

Registrar tip integrado, release candidato, SHA observado no serviço e último release validado separadamente. Migração parcial não promove o candidato. Retorno de binário não desfaz schema nem retrocede a base de desenvolvimento. Restore automático de homologação só ocorre sobre seu banco/mídia exclusivos, com dados fictícios, ponto consistente e escritores parados; preservar evidências e reconciliar integrações sandbox. Produção não participa dessa recuperação automática.

## Publicação Linux com serviços nativos

O ambiente de homologação desta execução usa Linux e serviços nativos exclusivos, com listeners de banco/aplicação em loopback. Inventário e versões efetivamente observados ficam no checkpoint e registros privados; disponibilidade de Docker não muda a decisão de implantação nativa. Domínio/ingresso públicos permanecem pendentes. A memória instalada não comprova capacidade para uma quantidade de restaurantes; dimensionar com medições.

Topologia proposta: Caddy entrega build Angular e encaminha API HTTPS para Spring em loopback; PostgreSQL acessível somente por canais autorizados; serviços systemd com usuário dedicado, restart controlado e limites; mídia inicialmente prevista em diretório persistente fora dos releases. Na implementação da Sprint 2, as imagens públicas limitadas ficam no próprio PostgreSQL, conforme o [ADR 0002](adr/0002-midia-publica-transacional.md); diretórios de mídia privada/externa permanecem futuros. Hermes executa procedimentos documentados, mas a aplicação não depende de conversa/sessão do agente para funcionar.

O banco de produção ficará no servidor Linux, separado dos bancos de desenvolvimento/testes/homologação mesmo quando compartilharem host. Não publicar a porta PostgreSQL na Internet. Só escolher túnel, redirecionamento de portas ou outro ingresso após validar IP público/CGNAT e disponibilidade real. Domínio, DNS, TLS e callbacks dos provedores devem funcionar antes da homologação externa correspondente.

Procedimento futuro de release:

1. Gerar artefatos versionados em área/processos de desenvolvimento separados dos releases e serviços de produção, com identificação do commit e dependências fixadas. No host compartilhado, medir recursos e limitar concorrência; não pressupor capacidade por haver 8 GB de RAM.
2. Conferir ambiente, espaço, configuração, backup recente e compatibilidade das migrações.
3. Aplicar migrações de plataforma/tenants com registro por empresa e bloqueio de execução concorrente. Migração com a versão anterior ativa exige compatibilidade demonstrada. Para mudança incompatível, entrar em manutenção, bloquear novas operações, drenar operações em andamento e parar todos os escritores, incluindo API e jobs, antes de migrar.
4. Instalar release, reiniciar serviço e verificar saúde técnica e jornadas críticas.
5. Em falha, executar retorno compatível: trocar binário não desfaz migração de banco. Mudança incompatível exige estratégia própria de recuperação, sem perder transações reais. O runbook deve cobrir eventos externos durante manutenção, comportamento de retry do provedor e reconciliação ao retomar.

Os scripts de build, deploy, verificação de SHA/hash/processo e retorno compatível já estão versionados, com comandos no [README](../README.md). A fundação foi publicada e seu retorno ensaiado; isso não equivale a restore de banco/mídia. O deploy recusa migrations diferentes sem manutenção/backup comprovados. O candidato de identidade está servido em homologação desde o ciclo13, sem aceitação definitiva do baseline; conferir SHA e limites no checkpoint. Homologação fictícia está autorizada dentro do fluxo; produção requer pedido específico.

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

Este mecanismo não faz deploy nem substitui E2E. `deploy-hml.py --job <JOB>`
consome resultado/gate/hash e o JAR privados, exigindo checkout do job limpo e
igualdade de Java, recursos, Angular e manifests de dependências com o runner.
Documentação/scripts/testes posteriores não mudam o SHA original do artefato.
Não copiar somente o gate para outro JAR. A guarda de migrations diferentes
continua recusando a promoção sem procedimento de manutenção. Encerramento
abrupto sem resultado exige reconciliar unidade/log/PID; não há aprovação por
inferência, nem garantia de persistência contra queda de energia.

A preparação da massa de testes passa a migrar/semear uma vez por JVM após
sucesso, mantendo verificação da conexão efetiva em TODA chamada. Falha não
marca preparação concluída; chamadas concorrentes são serializadas. Migrations
explícitas dos testes de fronteira e validações do runtime não são puladas.
Isso evita repetir o migrador global para todos os tenants a cada classe; o
ganho no build completo precisa ser medido. Nenhum tenant/registro é apagado
para acelerar a suíte. Esse estado é exclusivo da fixture de testes, não produto.

Para artefatos de identidade, o contrato privado inclui explicitamente chave/id
JWT (e par anterior opcional), chave/diretório de captura e PKCS12 local com senha,
tipo `PKCS12` e `RM_TLS_TRUST_CERTIFICATE` apontando ao PEM de confiança. Todos
ficam fora do checkout, privados, com ancestrais não graváveis por terceiros;
grupo privado contendo somente proprietário/root não constitui terceiro.
Valores desconhecidos, overrides Spring e credenciais de migration não são
exportados ao runtime. Configuração ausente/inválida falha antes de migrar.
Não houve geração/substituição de chaves hml por essa alteração de código.

O verificador exige HTTPS para JAR de identidade, valida CA e hostname/IP; não
regride silenciosamente para HTTP. A fundação existente continua HTTP loopback.
Os wrappers `e2e-hml.py`/`validate-hml.py` são SOMENTE da fundação e agora recusam
explicitamente artefato de identidade: ainda falta integrar a matriz Sprint01
de homologação. Health/configuração corretos não promovem esse candidato a
último release validado. O contrato de configuração não comprova por si que um
PKCS12 contenha a chave/certificado corretos nem substitui startup/health real.

## Ensaio de manutenção nativa — retomada ciclo 10

`rehearse_maintenance.py` é um ensaio finito, exclusivamente em `rm_test`.
Exige job aprovado, configuração runtime privada correspondente e fixture de
contas fictícias. Adquire `deploy.lock`; antes de executar, recolher qualquer
worker E2E/build e comprovar que não há outro escritor que possa reconectar.
Não executar este ensaio junto de suítes nem interromper um worker para liberar
o banco. O script recusa conexões restantes, sem matar clientes.

O serviço próprio `restaurant-manager-maintenance-test.service` usa loopback8091,
TLS verificado, identidade rm_test_app e nenhuma credencial owner. Após conferir
contas e negativos, para o serviço e inventaria o banco. `maintenance_database.py`
bloqueia novas conexões, preserva o original por OID sob nome `_before_<UUID>` e
cria uma cópia canônica, com política de privilégios/configuração explicitamente
reaplicada e conferida. Não há DROP. Configurações não reconhecidas são recusadas.

O ensaio compara integralmente o inventário, executa o migrador Java real no
clone e verifica a aplicação. Depois confirma DDL exclusivo do ensaio e injeta
uma falha SQL explícita. Essa injeção NÃO é uma migration de produto falhando.
Retorna o banco original por OID, preserva o clone falho bloqueado, compara o
inventário e relê contas/isolamento após reinício nativo. Hml é conferida antes e
depois, sem alterar serviço/banco. Só o resultado observado aprova o ensaio.

O journal privado usa fsync de arquivo/diretórios e rename; registra fases antes
das mudanças de disponibilidade. Tentativa anterior pendente ou banco `_before_`
impede nova execução. Em perda da resposta de CREATE DATABASE, OID não registrado
NÃO é adotado automaticamente: ambos os bancos ficam preservados e é exigida
reconciliação. Conferir ledger, `pg_database` (nome/OID/proprietário/conexões),
unidade/cgroup e logs antes de decidir o retorno. Nunca editar o OID só para
silenciar a guarda. Interrupção abrupta não tem recuperação automática.

Esta primitiva não instala um promotor hml e não remove a guarda de migrations
do deploy. Cópia no mesmo cluster/disco é ponto de retorno fictício, não backup
externo nem substituto do ensaio pg_dump/restore. Não cobre mídia ou reconciliação
de efeitos externos; não encerra X15. Artefatos preservados exigem limpeza futura
explicitamente revisada, não exclusão automática.

## Primeira transição de homologação para identidade — ciclo 11

`scripts/hml_maintenance.py install --job <JOB> --runtime-config <CONFIG_PRIVADA>
--rehearsal <RESULTADO_PRIVADO>` implementa exclusivamente a transição do baseline
de fundação validado para identidade. Exige ensaio de manutenção encerrado do
mesmo SHA/hash, configuração hml/TLS privada, código identificado e lock exclusivo.
Não remove a guarda de migrations do deploy comum. Este último também recusa
qualquer manutenção pendente, mesmo depois que o lock da tentativa foi liberado.

Para o serviço próprio, confirma ausência de conexões, inventaria o banco,
preserva o original por OID e cria clone canônico. Compara conteúdo/metadados
antes de migrar com o Java real; instala runtime sem owner e verifica HTTPS,
SHA, hash e processo. Fundação sem identidades pode ser inventariada explicitamente;
o ensaio de restore de identidade continua exigindo contas de duas empresas.

Health aprovado deixa estado `health-aprovado-e2e-pendente`, NÃO altera
`healthy.json` e NÃO encerra a Sprint. No fluxo inicial do ciclo11, o original
bloqueado permitia retorno antes de criar contas/dados no candidato. A aceitação
de identidade foi acrescentada posteriormente, conforme a seção de consolidação
e aceitação abaixo; matriz integrada e promotor continuam obrigatórios.

**Não aplicar o retorno de banco abaixo ao estado atual da Sprint01.** Depois
de contas/dados novos, de troca binária registrada ou de início da aceitação,
restaurar o banco pré-identidade perderia dados. As guardas recusam esses estados.
O modo `hml_frontend.py recover` só retorna o binário imediatamente anterior no
mesmo clone enquanto a aceitação ainda não começou; após o aceite também fica
recusado. Nova recuperação exige procedimento compatível explicitamente revisado.

No estado inicial elegível, `scripts/hml_maintenance.py rollback <TENTATIVA_PRIVADA>` confirma arquivos do
baseline, para apenas processo reconhecido, retorna o banco por OID, compara
inventário e reinicia/verifica a unidade anterior. Preserva o candidato abandonado
sem conexões; não apaga banco nem aplica down migration. JAR candidato corrompido
não impede retornar ao original íntegro. Retorno não verificado deixa serviço
parado e pendência explícita. Kill abrupto exige reconciliar ledger, OIDs e processos;
resposta perdida de CREATE sem OID confirmado não autoriza adoção pelo nome.

Resultados reais, quando executados, ficam no checkpoint. Código e testes
unitários de coordenação não constituem deploy ou homologação da aplicação.

O CLI de provisionamento do incremento seguinte admite opt-in local exato
`RM_HML_PROVISIONING_ENABLED=true`, mantendo guardas de destino/conexão/lock.
Usá-lo somente após transição e validação operacional, com arquivo de pedido
fictício 0600 e read-back de empresa/domínio/administrador. Não adicionar a flag
ao runtime HTTP nem ao timer dev/test. Esse opt-in não promove candidato,
não substitui ensaio nem aprova a fila de homologação. Conferir o SHA servido:
o JAR anterior não contém essa opção.

## Smoke de identidades no candidato hml — ciclo 13

`hml_identity_smoke.py --job <JOB> --fixture <MASSA_PRIVADA> --report <DIRETORIO_NOVO>`
executa dez identidades distintas (dois administradores, cinco perfis operacionais,
dois clientes e operador SaaS) nos cinco projetos de navegador. A massa é externa,
privada, fictícia e vinculada ao SHA/hash; origens são explicitamente locais.
Confere banco/role/HTTPS/PID/hash, locks e fonte limpa antes de executar; o relatório
registra fonte dos testes separada do artefato. Exige cinquenta combinações exatas,
sem retry/skip/flaky e sem mudança de runtime/fixture/baseline durante a execução.

Não escreve dados de negócio, mas cria/renova/revoga sessões reais. Capturas/traces
e fixture nunca pertencem ao Git. A revisão visual permanece separada. Este smoke
NÃO substitui testes mutantes/concorrentes, recuperação ou matriz integral e NÃO
promove `healthy.json`; os wrappers de fundação continuam recusando identidade.
Resultado efetivamente observado fica no checkpoint, não é presumido pelo script.

Quando o ensaio assistido acrescentar empresas fictícias, uma NOVA fixture pode
informar `empresas_adicionais` com os UUIDs das intenções confirmadas. O smoke
continua exigindo igualdade exata do inventário SaaS, sem aceitar empresas
desconhecidas. Rejeita repetição, UUID inválido, sobreposição às empresas A/B e
conjunto além de cinquenta empresas, limite da página exercitada. Não construir
a expectativa copiando a própria listagem que será testada nem sobrescrever a
fixture já vinculada a um recibo. Isso não é aprovação do provisionamento.

<a id="despacho-assistido-hml"></a>
### Provisionamento assistido em homologação — ciclo 15

Após criar a solicitação pela UI/API SaaS, usar:

Antes de criar a intenção HTTP, o mesmo comando com `--check` (sem `--id`)
confere gates, runtime, OIDs, credenciais e migrations, sem escrever intenção ou
executar Java. Esse resultado não substitui a revalidação obrigatória no despacho.
Uma jornada coordenada mantém `e2e-worker.lock` e `deploy.lock` durante UI, CLI e
read-back. Para não soltar a exclusão entre fases, pode passar o descritor aberto
de `deploy.lock` por `--deploy-lock-fd`: o filho confere inode/proprietário e adquire
o flock compartilhado com o pai. Fechar o filho não libera o lock ainda mantido
pelo pai. Arquivo diferente, symlink ou concorrente são recusados; a opção não
ignora locks nem gates. A transmissão explícita do descritor é responsabilidade
do chamador, nunca um número copiado de outro processo.

```bash
RM_HML_PROVISIONING_ENABLED=true bash scripts/with-env.sh hml \
  python3 scripts/hml_provisioning.py --job <JOB_PRIVADO> \
  --id <UUID_CANONICO_DA_SOLICITACAO> --rehearsal <RESULTADO_MANUTENCAO>
```

O comando exige fonte limpa, mesmo backend e dependências do artefato, hash/SHA
do runtime, hml/role/porta exatas, HTTPS verificado, migrations compatíveis,
manutenção aprovada e OIDs preservados. Adquire `deploy.lock`; não o execute
concorrentemente com build, E2E ou migration. Não transfere ambiente do Hermes
para Java nem credencial owner ao HTTP. O timer dev/test continua recusando hml.

Intenção e tentativas ficam em `provisioning/hml-assisted/<UUID>` na área privada.
Arquivos e ancestrais recém-criados são sincronizados antes do CLI. Interrupção,
timeout ou read-back falho não aprovam a operação. Conferir solicitação/empresa,
processos/log privado e intenção antes de usar `--resume`; somente a mesma
intenção no mesmo artefato/banco é admitida. `CONCLUIDO` é relido sem nova chamada
Java. `FALHOU` requer ação SaaS versionada, não retry automático deste script.

Nenhum deploy, reinício, exclusão de banco ou promoção de `healthy.json` ocorre.
Resultado de coordenação simulada e verificação de lock não demonstram ativação
real; a evidência deve incluir UI/API, CLI e leitura posterior da empresa criada.

### Consolidação e aceitação de identidade — ciclo 14

O smoke registra agora tentativa de manutenção e OIDs original/candidato antes
e depois dos navegadores. SHA igual não permite reutilizar teste de outro clone.
Recibos antigos sem esse vínculo continuam como evidência histórica, mas não
liberam o novo promotor. `--foundation` executa somente os vinte cenários do
shell/API em HTTPS hml; não os confunde com os cinquenta de identidades.

`identity_evidence.py --bundle <MANIFESTO_PRIVADO> --output <RESULTADO_NOVO>`
reabre os relatórios reais e exige as combinações exatas S01-UI01–43, S00-UI01–03,
S00-API01 e S01-HML01–10 nos cinco projetos, sem duplicatas/skip/retry/flaky.
O manifesto referencia job aprovado, manutenção, recibos/fontes imutáveis e
revisões visuais por superfície em mobile/desktop, com notas/hash do PNG.
Exige também `blocking_findings: []` e `acceptance_authorized: true`, definidos
somente após revisão real dos achados. Campo ausente, malformado, achado aberto
ou autorização falsa recusam a conferência antes de acessar o runtime. Ambos
os comandos compartilham essa guarda. Não apagar um achado nem alterar a flag
para converter um reteste verde em correção; preservar o manifesto bloqueado
e registrar causa, correção e regressões antes de preparar outro manifesto.
Capturas precisam pertencer ao cenário/projeto correspondente. Não cria revisão
visual automaticamente. Parcelas explicitamente aprovadas de um worker cuja
fase posterior falhou podem ser consideradas isoladamente no MESMO artefato;
hash dos resultados e fonte são obrigatórios. Isso não aprova a fase falha.

Quando convites e plataforma usam capturas delimitadas, cada revisão inclui
`complements` com caminho, SHA-256, aprovação e nota de inspeção de cada imagem
complementar exigida em `VISUAL_COMPLEMENTS`. O consolidador confere também
esses arquivos, sua origem no cenário/projeto aprovado e ausência de duplicatas.
O cartão/viewport principal sozinho não aprova controles fora dele. Em convites,
o início do cadastro e a ação de criar ao fim das unidades têm capturas próprias;
não gerar imagem vertical ilimitada nem inferir inspeção de partes não vistas.

`identity_acceptance.py --attempt <TENTATIVA_HML> --bundle <MANIFESTO_PRIVADO>`
refaz essa conferência sob lock, valida OIDs/política/runtime e publica apenas
o baseline das funcionalidades de identidade disponíveis. Preserva baseline
anterior e banco original bloqueado. Não migra, reinicia, renomeia ou apaga banco;
não conclui Sprint/projeto. Critérios adicionais, como exportação e jornada hml
assistida da fila, continuam exigindo suas próprias evidências.

A intenção e o estado pendente antecedem a publicação. Falha parcial conserva
ledger bloqueante; a mesma intenção pode reconciliar seus registros após conferir
o estado real. Retorno automático ao banco da fundação fica recusado depois de
iniciada a aceitação: perderia as contas/dados posteriores. Mudança incompatível
futura ainda exige outro procedimento de manutenção; o deploy comum conserva
sua guarda de fingerprints. Código/testes unitários não significam aceitação
real; o checkpoint informa se o comando foi efetivamente aprovado.

## Substituição restrita do frontend pendente — ciclo16

`hml_frontend.py replace --attempt <TENTATIVA_HML> --job <JOB>
--rehearsal <RESULTADO_MANUTENCAO>` instala um novo candidato sem aprovar o
anterior para liberar o deploy. Exige build e ensaio do novo SHA/hash, fonte limpa,
unidade/runtime conhecidos e igualdade byte a byte de TODAS as entradas dos JARs
fora de `BOOT-INF/classes/static/`. Não ignora metadados, bibliotecas ou migrations.
O modo padrão continua recusando qualquer mudança de backend. A exceção
delimitada abaixo não libera deploy genérico de Java nem altera essa comparação.

A preparação fica privada e só publica seu marcador depois de persistir journal
e arquivos de retorno. Mantém banco/OIDs, chaves/runtime, original bloqueado e
`healthy.json`; não chama migrador nem restaura banco. Para/reinicia somente o
serviço reconhecido, verifica HTTPS/hash/PID e ambiente efetivo. Estado final
continua `health-aprovado-e2e-pendente`; nenhuma evidência antiga muda de SHA.

`hml_frontend.py recover --attempt <TENTATIVA_HML>` recupera somente o binário
imediatamente anterior no MESMO clone, inclusive quando o health passou mas E2E
posterior reprovou. Aceitação já iniciada impede esse retorno. Falha de persistência
durante recuperação tenta parar o candidato próprio, sem declarar sucesso. Troca
incompleta bloqueia smoke/aceitação. O rollback legado de banco fica recusado
depois do marcador, inclusive após retorno binário, para não perder contas novas.

Após retorno confirmado, `replace` pode preparar outro candidato preservando o
journal anterior em histórico privado; não apaga tentativas. Sobras de preparação
antes do marcador não alteram serviço e não são aprovação. Conferir estado real
após interrupção. Testes de coordenação/disco usam serviços simulados; resultado
nativo e limitações permanecem no checkpoint. A matriz integral continua obrigatória.

### Opt-in delimitado para a consulta de login — ciclo31

`hml_frontend.py replace --mode login-startup --attempt <TENTATIVA_HML>
--job <JOB> --rehearsal <RESULTADO_MANUTENCAO>` reutiliza a mesma operação e
recuperação binária para o incremento que antecipa a interpretação HQL.
Exige dois artefatos de identidade com exatamente as mesmas entradas ZIP;
somente `Usuario.class`, `IdentidadeRepository.class` e `application.yml`
podem diferir. A configuração aceita exclusivamente a adição revisada de
`hibernate.query.startup_check: true` com seu comentário. Frontend, dependências,
metadados, migrations SQL e demais recursos ficam byte a byte iguais.
Essa delimitação não verifica a semântica do bytecode: revisão da fonte,
build/testes do novo artefato e compatibilidade das escritas continuam obrigatórios.
Não serve para futuras mudanças Java, de configuração ou de banco.

Esse opt-in e sua composição explícita com frontend, descrita abaixo, podem
encadear sobre uma troca concluída ainda não aceita,
conferindo seu recibo contra o candidato atual. Arquiva o journal anterior e
registra o modo; `recover` usa o modo persistido, não aceita sua reinterpretação
pela CLI e retorna ao binário imediatamente anterior no mesmo clone. Journals
antigos sem modo continuam sendo `frontend`; modo desconhecido é recusado.
Build/ensaio do novo SHA/hash, OIDs, chaves/runtime, locks e baseline preservados
continuam obrigatórios. Não restaurar o banco anterior à identidade.

Interrupção entre arquivar o journal e publicar seu sucessor não altera o
serviço, mas deixa uma pendência: ausência do journal ativo com histórico ou
preparação bloqueia nova troca, smoke, provisionamento e aceitação. Conservar
todos os arquivos; reconciliar journal, unidade, hashes e estado real antes de
restabelecer o registro ativo. Não tratar a ausência como “nenhuma troca” nem
reexecutar automaticamente. A CLI `recover` não resolve essa janela sozinha.
Testes com disco/serviços simulados cobrem a recusa; a execução nativa da nova
troca só pode ser declarada após os gates e o resultado registrado no checkpoint.

### Composição restrita com frontend — ciclo33

`--mode login-startup-frontend` admite o mesmo incremento de login acima junto
das mudanças em `BOOT-INF/classes/static/`, incluindo chunks adicionados ou
removidos pelo Angular. Duplicatas ZIP são recusadas antes de filtrar static.
Todas as entradas restantes precisam coincidir, exceto exatamente as três
entradas delimitadas acima; a configuração YAML continua exigindo a adição
byte a byte, com âncora única. Migrations, bibliotecas e metadados permanecem
idênticos. O modo `login-startup` original continua exigindo frontend idêntico;
o default `frontend` continua exigindo backend idêntico.

Não é um deploy Java genérico nem dispensa revisão de fonte, build, ensaio de
manutenção e matriz do artefato final. Reutiliza o journal e a recuperação da
mesma operação: preserva histórico, clone e baseline, retornando somente ao
binário imediatamente anterior. Testes simulados da composição não comprovam
troca nativa; consultar o checkpoint para o resultado operacional efetivo.

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

Na retomada ciclo9, pg_dump falhou por esgotamento de locks enquanto o exportador
também mantinha o inventário inteiro. O leitor de inventário agora importa o
mesmo snapshot em sessão separada e encerra antes do pg_dump; o exportador mantém
somente o ponto MVCC. Não aumenta limites globais nem reinicia PostgreSQL. A
reexecução real deve confirmar o resultado; testes unitários não aprovam restore.

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

Na Sprint 2, as imagens normalizadas do catálogo ficam em `bytea` no schema
empresarial: o dump consistente inclui bytes, hashes e referências. No restore,
conferir essas referências e hashes em duas empresas; o simples armazenamento
transacional não substitui o ensaio. Nenhum restore Linux foi realizado nesta
etapa local.

Backup deve abranger banco, mídias necessárias e recuperação de configuração/chaves por processo seguro separado. Banco e mídias precisam formar um ponto recuperável consistente: adotar snapshot coordenado/quiescência ou mídia imutável/versionada com retenção e inventário compatíveis com o backup do banco. Uma cópia posterior dos arquivos, sem controle de alterações concorrentes, não atende a esse requisito. Registrar o ponto de recuperação e verificar referências de mídia no restore. Agendamento, criptografia, destino externo, retenção, RPO, RTO e responsável são pendências. Backup no mesmo disco não basta como único mecanismo de recuperação.

Exigir ensaio de restore em ambiente isolado: verificar pelo menos duas empresas, usuários/acessos, pedidos, recebimentos, mídia e separação dos schemas. Reconciliar efeitos externos após restauração, pois o provedor pode ter processado eventos posteriores ao ponto restaurado. Restore integral não comprova automaticamente recuperação seletiva de um tenant.

Plano de contingência do piloto deve dizer como registrar pedidos e recebimentos se Internet/servidor cair e como reconciliá-los depois, sem duplicação. Operação manual alternativa será acordada com o restaurante; PWA não substitui esse procedimento.

<a id="ensaio-local-sprint-5"></a>
## Preparação local da Sprint 5

`scripts/local_rehearsal.py` usa PostgreSQL, Java e `lsof` já instalados e um JAR de
hash conhecido com manifesto correspondente às fontes atuais da aplicação.
Não instala serviços nem publica um release. O diretório de saída deve ser novo,
privado, externo ao checkout e curto o suficiente para o socket PostgreSQL.
As portas 55433/8090 precisam estar livres; nenhum ocupante é encerrado.
O listener HTTPS precisa pertencer ao PID próprio e ao loopback.

```bash
python3 scripts/local_rehearsal.py \
  --source-env "<CONFIGURACAO_TEST_PRIVADA_0600>" \
  --fixture "<MASSA_PEDIDOS_PRIVADA_0600>" \
  --jar "<JAR_LOCAL_CONFERIDO>" \
  --jar-sha256 "<SHA256_DO_JAR>" \
  --source-manifest "<MANIFESTO_DE_FONTES_DO_BUILD_LOCAL>" \
  --pg-bin "<DIRETORIO_DOS_BINARIOS_POSTGRESQL>" \
  --java-home "<JAVA_21_HOME>" \
  --output "<DIRETORIO_PRIVADO_NOVO>"
```

A fixture de pedidos é o JSON privado das suítes locais, com `host`, `empresa`,
`schema`, `email`/`senha` do Administrador, `unidadeA` e
`contas.clienteA.email`/`senha`, todos fictícios (`@example.invalid`). O banco
precisa conter ao menos duas empresas ativas com identidade e catálogo fictícios.
As credenciais são testadas por login; fixtures históricas não são presumidas válidas.

O ensaio aceita somente `test`, `rm_test`, `rm_test_owner`/`rm_test_app` em
127.0.0.1:55432 e comprova a conexão efetiva. Exporta um snapshot somente leitura.
Inventário por schema e dumps de até dez schemas compartilham esse snapshot;
savepoints liberam locks de leitura por tabela/schema. Isso limita locks e o
tamanho das mensagens sem mudar parâmetros/reiniciar o cluster de origem.
Schemas de aplicação fora de `public`/`t_...` são recusados para revisão de cobertura.

Restaura todos os lotes em cluster novo, com socket 0700 e runtime efêmero em
127.0.0.1:55433, sem permissões owner. A comparação integral precede as mutações
do ensaio. Confere linhas, metadados, ACLs, constraints, índices, funções e triggers;
valida hashes/tamanhos e referências das imagens, bytes HTTP em duas empresas e
nega sua leitura pelo domínio da outra. Mídia transacional usa o mesmo snapshot.
Não demonstra recuperação seletiva de tenant nem mídia privada futura.

Para garantir massa de mídia sem escrever na origem, acrescenta dois PNGs
fictícios de um pixel e suas referências **somente no clone**, em empresas com
catálogo/Administrador fictícios. Com a aplicação ainda parada, faz um novo
backup dos dois schemas no mesmo snapshot, remove/restaura esses schemas do
clone e compara o inventário completo: os demais schemas precisam permanecer
iguais. Esse segundo roundtrip demonstra recuperação da massa acrescentada,
sem afirmar que a origem já continha imagens em duas empresas. Não usar esse
procedimento destrutivo de fixture em dev/hml/produção.

Chaves JWT/comunicação, senha do clone e PKCS12 são novos e exclusivos do ensaio.
O script faz backup e recuperação desse pacote com conferência de hashes e usa
somente a cópia recuperada. Isso demonstra o mecanismo local de configuração;
**não recupera as chaves originais**, sessões, tokens OAuth ou mensagens cifradas
antes do backup. Workers de pagamentos, e-mail, comunicação e retenção ficam
desligados; o de prazos só liga na recuperação controlada. Não há envio externo.

O [perfil de carga](../scripts/profiles/sprint05-local.json) fixa duração,
concorrência, pausa e distribuição catálogo/carrinho. `load.json` registra
latências, erros, CPU/RSS dos processos próprios, disco, estatísticas PostgreSQL
e conexões runtime observadas. Essa última medida não é telemetria interna do
Hikari; o atraso do job é medido separadamente após a falha. Não inferir
capacidade do Linux de 8 GB nem quantidade suportada de restaurantes.

Na recuperação, cria pedido presencial de R$ 20 no clone, mata somente o processo
Java próprio, comprova indisponibilidade, interrompe uma conexão com transação
aberta e verifica rollback. Reinicia o mesmo JAR, reenvia a intenção e observa
um único pedido, expiração durável, histórico sem duplicação e zero recebimentos.
A resposta inicial é recebida pelo harness e descartada: não é injeção de perda
de pacote. Cobrança/devolução e falhas do provedor continuam cenários próprios.

`result.json`, dumps, inventários, configuração e logs são privados. Aprovação
local exige todos os passos e cleanup confirmado; falha fica registrada e exige
novo diretório na reexecução. SIGINT/SIGTERM recolhem processos próprios; após
kill abrupto do harness, conferir o PID registrado e `cluster/postmaster.pid`
antes de parar somente os processos correspondentes. O script preserva arquivos
para diagnóstico e não faz limpeza automática de tentativas anteriores.
As medições de backup/restore/retomada e a idade do snapshot não são metas
acordadas de RPO/RTO. Transações/efeitos externos posteriores ao snapshot
exigiriam reconciliação; não são recuperados automaticamente pelo ensaio.

### Revisão operacional antes do Linux

| Área | Situação e ação necessária |
| --- | --- |
| Instalação | `bootstrap-database.py` depende do layout privado PostgreSQL 16/Linux e systemd; agora recusa Mac antes de escrever. Não instala ferramentas globais. Revalidar distribuição, binários, privilégios e serviços antes da retomada Linux. |
| Configuração | `.env.example` documenta identidade/TLS/captura e grupo opcional de pagamentos. `runtime_config` exporta apenas o contrato explícito, recusa grupo financeiro parcial/chave inválida/porta inválida e não exporta override de provedor fictício nem credencial owner. Sandbox requer credenciais de teste e validação própria. |
| Build | `build-release.sh` exige checkout limpo e `flock`; os dois arquivos locais preexistentes impedem usá-lo neste checkout. Preparar checkout Linux limpo do commit revisado; build identificado e gates completos são obrigatórios. JAR local reutilizado não constitui novo release homologado. |
| Deploy/retorno | `deploy-hml.py` mantém lock, hash/SHA e recusa migrations divergentes sem manutenção. A manutenção histórica é específica da transição fundação→identidade; não é promotor genérico das Sprints 2–4. Inventariar banco/serviço atuais e preparar caminho compatível antes de migrar. |
| Verificação | `/proc`, `systemctl` e verificação de listeners são Linux. `e2e-hml.py`/`validate-hml.py` continuam restritos à fundação; smoke de identidade não substitui matriz mutante integrada. Integrar o gate da matriz final antes de promover o release. |
| Proxy/HTTPS | Não há configuração Caddy de produção pronta neste incremento. Domínio, ingresso, certificado/renovação e callbacks precisam de implantação/verificação próprias (E01–E03). |
| Backup e operação | Ensaio local é no mesmo disco. Agendamento, criptografia/destino externo, retenção, alertas, responsáveis, RPO/RTO e reconciliação permanecem E07/E11. Captura local não comprova entrega de e-mail (E05). |

Resultados observados e falhas/reexecuções ficam na
[evidência da preparação local](evidencias/sprint-05-preparacao-local-2026-11-09.md).

## Documentos relacionados

- [Métricas e alertas](07_OBSERVABILITY.md)
- [Migrations por tenant](06_MULTI_TENANT.md)
- [Homologação](19_SPRINT_05.md)
- [Dependências do piloto](23_PILOT_IMPLEMENTATION.md)
- [Execução de desenvolvimento pelo Hermes](24_AGENT_EXECUTION.md)

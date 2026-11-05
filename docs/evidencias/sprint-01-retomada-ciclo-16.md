# Sprint01 — retomada ciclo16

Missão não concluída; Sprint01 permanece aberta e02–05 não iniciadas. PR3 draft,
sem merge nem promoção de baseline. Evidências privadas não pertencem ao Git.

## Retomada e exportação

Build47ca909 já aprovado foi reutilizado, sem reconstrução. Fonte privada limpa
foi conferida depois da exclusão local do symlink de dependências que causou a
falha anterior. Worker15b executou quinze combinações UI32/UI42/UI43 nos cinco
projetos: todas aprovadas, zero falha/skip/flaky/retry, duração392491ms. A API,
Angular e PostgreSQL são reais; aborto de transporte é injeção de falha declarada.
Isso valida exportação/reconsulta/negativos e captura de eventos corrigida, mas
não equivale à regressão integrada inteira. Demais famílias seguem em execução.

Homologação3cd4eeb permaneceu UP, original bloqueado e clone ativo. SQL dev/test/hml
confirmou bancos/roles distintos em loopback. Primeira tentativa de consulta por
psycopg falhou por pacote ausente; consulta efetiva foi realizada pelo psql privado,
sem instalar dependência. CI721b068 aprovada nos dois checks, PR/head remoto relidos.

## Substituição compatível ainda em validação

Não é válido aceitar o JAR antigo usando UI42/UI43 do novo. O deploy comum também
não pode ignorar manutenção pendente. Acrescentado caminho explícito para trocar
SOMENTE frontend de candidato ainda não aceito, preservando dados e baseline.
Comparação real dos dois JARs encontrou zero diferenças nas entradas fora de
static; a implementação exige essa igualdade completa, não só migrations iguais.

Duas revisões independentes somente leitura: a primeira avaliou o caminho mínimo;
a segunda encontrou preparação sem journal recuperável, retorno pós-health
bloqueado, falta de parada em erro de persistência e verificações incompletas de
unidade/runtime. Três vermelhos comportamentais reproduzidos antes das correções.
Preparação agora publica marcador atomicamente, retorno é binário no mesmo clone,
unidades têm hashes conferidos e ambiente efetivo é relido após start. Pendência
bloqueia smoke/aceitação e rollback de banco legado fica recusado.

145 testes Python passaram, incluindo coordenação com serviços simulados e
arquivos reais no scratch; não são deploy nativo. Novo ensaio/manutenção/troca e
smoke do novo SHA ainda pendentes neste registro. Nenhuma aprovação transferida
entre artefatos. Procedimento e limites na [fonte operacional](../22_PRODUCTION_RUNBOOK.md).

## Falhas da regressão em diagnóstico

UI04 falhou aguardando Administrador que não estava na primeira página. Trace
mostrou GET200 com cinquenta funcionários, sem a conta procurada; não foi falha
da proteção transacional. O teste passa a percorrer a paginação real até a conta,
conferindo respostas e controles, sem apagar massa nem aumentar o timeout.
UI08 mobile falhou na espera visual após liberar resposta interceptada; snapshot
posterior contém a mensagem correta. Correção espera explicitamente resposta200
e término do corpo antes da assertiva, mantendo o teste de bloqueio da navegação.
Typecheck passou. Reexecução real ainda pendente; falhas anteriores preservadas.
Worker16 finito aguarda15b e não instala se a regressão falhar. Não confundir
esse lançamento com manutenção/deploy aprovados.

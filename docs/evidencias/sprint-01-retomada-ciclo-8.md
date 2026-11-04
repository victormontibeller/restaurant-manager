# Sprint 01 — retomada ciclo 8, 2026-11-04

Missão e Sprint não concluídas. Homologação continua na fundação validada;
nenhum merge, migration hml ou deploy foi realizado neste incremento.

## Resultado herdado reconciliado

Build `dfe496cd450044cb6e35d390443913944f1dff97` terminou exit0/gate true;
165 testes backend sem falhas/erros/skip e hash
`778dd027c11007d0abab93030cfa4e9dba4ed576d6ef8f7f094dec67bf427635`.
Não foi repetido. Worker herdado concluiu cinco combinações de S01-UI35,
cinco de S01-UI04 e quinze de S01-UI32–34, nos cinco projetos previstos,
sem retries/skips/flaky. A contagem automática não inclui aprovação visual.

A retomada da solicitação da fila que havia falhado foi executada por API SaaS
com reautenticação/versão e CLI real em systemd. O worker confirmou CONCLUIDO,
três ativações únicas no lote herdado e ausência de pausa técnica. Não confundir
esse lote com fila global vazia: o resultado ainda registra backlog pendente.

## Defeito encontrado na revisão visual

A captura mobile de S01-UI35 mostrava ADMINISTRADOR no seletor de funcionário
cujo estado era COZINHA; o grupo de vínculos continuava visível. Não aprovar a
apresentação dessa versão apesar dos testes automáticos anteriores verdes.

`scripts/test_profile_selects.cjs` reproduziu o defeito com componentes/templates
Angular reais: seis modelos distintos resultaram em seis seletores exibindo
ADMINISTRADOR. A API desse teste é uma fixture em memória: unidade de UI, não E2E.

Corrigida seleção nas próprias opções dinâmicas em equipe/matriz e convites.
O probe passou em Chromium, Firefox e WebKit, cobrindo perfis iniciais, recarga
assíncrona, edição e recriação do formulário de convite com perfil preservado.
Uma tentativa intermediária tinha erro no harness ao acessar ApplicationRef;
corrigido para ComponentRef. Typecheck e regressões de sessão/eventos/vínculos
passaram. Um comando agregado excedeu 180s depois dos probes; regressões restantes
foram reexecutadas e terminaram exit0, sem tratar o timeout como aprovação.

S01-UI35 agora exige explicitamente valor COZINHA no seletor antes/depois de
salvar. A reexecução E2E dessa assertiva ainda depende de artefato corrigido.
Revisão independente adicional foi recusada pelo limite operacional de subagentes;
revisão local/testes não são apresentados como nova revisão independente.

## Recuperação de aplicação

Incremento `519a283` implementa probe opcional de aplicação após restore integral
isolado do banco. Runtime exige opt-in restrito a test/rm_test_app/loopback55433;
allowlists de comandos privilegiados permanecem em55432. Duas provas unitárias
Java passaram após vermelho de conexão recusada; uma tentativa intermediária de
compilação identificou consumidor do construtor, corrigido. 54 testes Python
passaram, incluindo configuração privada, duas empresas, filial e manifesto.

Revisão independente identificou cwd/captura incompatíveis, negativo satisfeito
por filial inexistente e escopo excessivo das provas de chaves; correções aplicadas.
O probe exige filiais reais e administrador positivo, login de outras contas após
reset e distingue configuração copiada/restart de recuperação de chaves pré-backup.

O ensaio HTTP real aguarda build identificado no worker finito. Não declarar
restauração da aplicação aprovada antes do resultado. Mídia, tokens/outbox anteriores
ao backup, backup externo e manutenção/migration hml continuam pendentes.
[Procedimento e limites](../22_PRODUCTION_RUNBOOK.md#probe-opcional-da-aplicação-restaurada--ciclo-8).

## Cobertura dos perfis e continuidade

`e9d23d9` acrescenta S01-UI36–40: cinco perfis operacionais, acompanhamento da
filial, revogação/restauração, refresh/logout e escrita de matriz/equipe negada
mesmo após reautenticação. Typecheck passou; execução E2E nova ainda pendente.
Ambos checks CI do519a283 e doe9d23d9 foram conferidos SUCCESS no SHA exato.

Worker8 foi iniciado para aguardar o predecessor e executar sequência finita:
build fixo doe9d23d9, massa fictícia exclusiva, restore/aplicação e E2E dos perfis.
Possui SHA, PID/início, logs/resultados duráveis e locks; não é coordenador, não
faz deploy. O build iniciou somente depois do encerramento do candidato anterior.
Não contém a correção posterior dos seletores. Não transferir gate entre SHAs.

A tentativa de parar SOMENTE o worker8 ainda em espera, para incorporar a correção
visual antes do build, foi bloqueada pelo executor. Nenhum serviço foi parado por
essa tentativa e nenhum caminho alternativo de parada foi usado. O worker seguiu
seu SHA fixo; preserve seu resultado e não repita um build ativo.

Próximos gates: recolher build/restore/E2E, corrigir falhas; incorporar seletor
corrigido ao candidato e reexecutar jornadas afetadas; completar manutenção e
promoção segura, revisão independente e critérios restantes da Sprint01. A matriz
integral e Sprints02–05 continuam abertas. Sem CONCLUSAO.json.

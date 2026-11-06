# Sprint 01 — retomada ciclo 29

[Checkpoint](../25_EXECUTION_STATUS.md) · [Sprint](../15_SPRINT_01.md) · [Passagem Mac](../27_HANDOFF_CODEX_MAC.md)

## Escopo e preservação

Missão relida integralmente: a delimitação vigente é terminar somente Sprint01
com passagem para Codex/Mac. Não iniciar Sprints02–05 nem fazer merge/auto-merge.
PR #3 continua aberto, com integração pelo proprietário após os gates.
As três alterações documentais herdadas foram preservadas.

Na retomada, Git/PR/head `290d60e` e ambos checks CI aprovados foram relidos.
Nenhum worker de validação/manutenção28 permanecia ativo. Homologação serve
`97d75b09b5b783b18104812cf67fb2e18afdf76a`, JAR SHA-256
`34e207ff6f877d050ef2c9c485c6fb7ff32a2297abb8f2834cf852286ce91f47`, health UP.
Baseline `449ce3ccf941c73b34ac15a4754183c147f91aaa` e banco original bloqueado
foram preservados. Nenhum build, seed, manutenção ou deploy foi repetido.

## Guarda de aceitação corrigida

Problema concreto: o manifesto28 continha achado aberto e
`acceptance_authorized=false`, mas `check_bundle` ignorava esses campos.
A cobertura verde podia atravessar a conferência apesar do bloqueio explícito.

Sete variantes negativas reproduziram a falha antes da correção. Agora a
conferência exige `blocking_findings=[]` e `acceptance_authorized` booleano true,
antes de resolver artefato/runtime. Ausência, tipo errado ou achado aberto são
recusados; o promotor compartilha a mesma função no preflight.

Verificado:

- 14 testes focados de evidência/aceitação aprovados; inclui preflight real
  recusando manifesto sem preparar intenção, publicar baseline ou alterar estado.
- 152 testes Python de regressão aprovados. Saídas de fixtures negativas da
  suíte não são execuções reais de deploy/build nem recibos de release.
- Manifesto privado28 REAL recusado antes de acessar o runtime.
- Revisão independente confirmou a guarda e a continuidade dos demais gates.

As flags não provam resolução do defeito. Nenhum manifesto foi liberado, nem
baseline promovido. A alteração não muda Java/Angular e não exige novo JAR.

## UI18: diagnóstico executado, instabilidade ainda aberta

Revisão independente dos traces27 confirmou:

- Firefox: login200 em 8690,930ms; reautenticação enviada e abortada sem resposta
  perto de 9760,727ms. Há abort observado, não prova de submit/blur perdido.
- WebKit: reautenticação204 em6528,507ms; jornada consumiu o limite de90000ms
  antes de registrar o segundo POST de login. Não confundir duração de teardown
  com configuração do timeout.
- Limite HTTP da aplicação continua10000ms; nenhum timeout, BCrypt ou assertiva
  foi relaxado para produzir aprovação.

Diagnóstico29 foi executado uma vez, somente Firefox/WebKit, na fonte imutável
`d1dc30bff06932ef9421793e02a4e36c21ac3798` e MESMO JAR. Capturou traces inclusive
em sucesso, log HTTP sem query/cabeçalhos/corpos, amostras PostgreSQL sem SQL e
JFR seletivo sem ambiente/argumentos. Unidade própria/control-group, limite
15min informado; nenhum novo coordenador. Terminou às04:00:36Z:

- Dois cenários aprovados, zero falha/skip/retry/flaky; Firefox71733ms,
  WebKit62925ms no relatório Playwright.
- Runtime hml antes/depois idêntico. Worker e candidato encerrados; unidade
  inactive/MainPID0. A revisão não somou esses dois pares à matriz285.
- Log do servidor: primeiro login Firefox8203ms e WebKit5129ms; demais logins/
  reautenticações entre2565 e3403ms. São tempos desta rodada, não os do ciclo27.
- 152 amostras PostgreSQL não observaram bloqueadores; isso não exclui esperas
  breves entre amostras nem contenção fora do banco.

### Limite da instrumentação, preservado explicitamente

O último evento JFR tem timestamp absoluto04:01:02, posterior ao recolhimento
real do processo04:00:36. Portanto, a primeira correlação JFR/requisição e o
corte por horário foram **invalidados**. O JSON derivado inicial é preservado
como análise inválida, não evidência de custo por login. O agregado revisado
usa somente contagens da gravação inteira por thread; não chama amostras de
duração ou porcentagem de CPU. A causa da divergência temporal não foi estabelecida.

Uma sonda Java independente usou o BCrypt custo12 da mesma biblioteca do JAR,
com senha aleatória apenas em memória. Oito verificações consumiram entre
1176 e1623ms de relógio e tempo de CPU da thread próximo desses valores.
Não envolve banco/navegador nem prova a causa da falha27; não justifica reduzir
custo criptográfico. Nenhuma configuração global de CPU/governor foi alterada.

### Decomposição dos traces sem cruzar relógios

As durações internas de cada trace mostram atrasos também fora da autenticação:

| Trecho | Firefox27 | Firefox29 | WebKit27 | WebKit29 |
| --- | ---: | ---: | ---: | ---: |
| Clique inicial Entrar | 15146ms | 1428ms | 3873ms | 1673ms |
| Clique Gerenciar convites, incluindo espera de habilitação | 19174ms | 2989ms | 12678ms | 3620ms |
| Início da espera pelo segundo login, relativo aos hooks | Não alcançado | 53101ms | 97695ms | 31817ms |

Log de ação Firefox27 registra botão de convites desabilitado durante parte da
espera. O código abre Acessos inicialmente e bloqueia navegação durante sua
carga; isso explica parte da espera, não atribui toda a latência nem demonstra
correção. O reteste verde continua sendo diagnóstico, não resolução.

## Passagem e próximos gates

O novo handoff lista funcionalidades, commits/artefato, provas e bloqueios,
com passos locais e limites dos scripts Linux. Setup macOS **não executado**.
Revisor apontou falta de referência29 no checkpoint e de link no índice;
ambos foram acrescentados antes da publicação deste incremento.

Próximo experimento deve separar o custo da autenticação da carga/navegação
inicial e da disputa de CPU, sem aumentar limites nem repetir toda a matriz.
Se usar JFR para tempos, calibrar o relógio primeiro ou preferir medição local
monotônica/CPU por requisição. Não atribuir automaticamente a BCrypt, banco,
hardware ou governor a falha histórica. Após causa/correção demonstradas,
validar regressões afetadas e só então conferir aceitação e critériosSprint01.

Sprint01 continua aberta. Não houve promoção, merge, STOP ou conclusão global.
A passagem está em preparação, não substitui gates pendentes.

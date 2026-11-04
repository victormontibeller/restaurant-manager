# Sprint01 — retomada ciclo9

[Checkpoint](../25_EXECUTION_STATUS.md) · [Runbook](../22_PRODUCTION_RUNBOOK.md)

## Estado

Missão não concluída. Incrementoe847fee publicado; correção do probe em
f1e58ded3ff477bb0c40b07846edf5ee8b2e27c6, remoto/PR3 OPEN/draft/base main relidos.
Na consulta20:18:37Z, CI desse head tinha um check falho e outro pendente. Causa da
nova falha ainda não investigada. Sem merge/deploy; hml449ce3c saudável e preservada.

## Implementação e testes focados

- Runtime de identidade com allowlist explícita de JWT, comunicação e TLS; owner
  não é propagado. CA/hostname exigidos pelo verificador, sem downgradeHTTP.
- Job durável consumível pelo deploy com SHA/hash originais e igualdade de fontes
  Java/recursos/Angular/dependências. Teste com JAR real aceitou sua fonte original
  e recusou frontend divergente. Configuração hml incompleta recusada sem mutação.
- Guarda de migrations diferentes preservada. Gate S00 agora recusa JAR de
  identidade; isso não implementa a matriz/promoção Sprint01.
- Probe de templates Angular reais cobre seleção, payloads e recarga de equipe,
  matriz e convites nos três motores. API fictícia, não E2E. Incluído em build/CI.
- S01-UI35 ampliado para alteração/persistência/recarga; S01-UI41 acrescentado sem
  remover S01-UI17. Execução corrigida ainda pendente no novo artefato.
- Preparação da massa migra/semeia uma vez por JVM, após sucesso; identidade SQL
  é conferida a cada chamada. Testes de migrations explícitas e validações runtime
  permanecem. Nenhum dado foi apagado para acelerar. Ganho integrado não medido.

69 testes Python e três unitários Java de preparação aprovados, sem skip.
Vermelho comportamental da repetição foi observado; uma tentativa intermediária
falhou compilação por classes transitórias ausentes no target, depois passou.
Typecheck e scanner de270 arquivos passaram antes da publicação.

Duas revisões independentes realizadas: seleção herdada e contrato de deploy.
Achados de ancestrais inseguros/downgradeHTTP/recarga sem resposta foram corrigidos.
Terceira revisão, de snapshot/otimização, recusada por limite2/2. Não substituí-la
por aprovação própria. CIe847fee revelou assertiva executada antes do render;
f1e58de usa espera pelo DOM com mesmas expectativas, mas CI nova ainda falhou.

## Resultados herdados recolhidos

Build e9d23d93c87010366f4bcd6a3a328ca4150d1b63 terminou às19:54:37Z,
exit0/gate true, hashfc5cea0401ced562d6375dc142f3fd8364f8fb0272774635f18bc0f80eb442ad.
167 backend, zero falhas/erros/skip, XML agregado independentemente.
S01-UI36–40 aprovou exatamente25 pares cenário/projeto, sem retry/skip/flaky.
Worker8 global terminou exit1 porque o restore falhou; sucesso E2E não apaga isso.
Recortes de cartões Cozinha mobile e Atendimento tablet foram vistos, sem texto
aparentemente fora do recorte; não equivalem a inspeção de tela completa.

## Restore corrigido real

Falha preservada: pg_dump esgotou locks enquanto o exportador também mantinha
inventário de tabelas/índices. Agora um leitor separado importa o snapshot e
encerra antes do dump; exportador conserva o ponto MVCC. Sem aumentar limites
nem reiniciar o cluster original.

Reexecução terminou às20:18:10Z, aprovada:1645 tabelas,100 empresas,15684 linhas;
backup9,163s, ensaio total332,798s. Hash do dump:
06cbc1a02432f5a21ea7289484a571414c837a5e15f167b5632e1e1d81359e8f.
Banco original somente leitura; restore em cluster distinto,rm_test_app/55433.

Aplicação recuperou três contas de duas empresas, negou tenant/unidade/administração
indevidos e confirmou restart, sessões, outbox cifrada após restore, reset/reuso de
código e preservação de outras contas. Processos próprios recolhidos.
Não prova mídia, tokens/outbox anteriores ao backup, backup externo, manutenção,
migrations/deploy hml ouX15 completo.

## Continuidade

Worker9 finito e nativo, sem decisões/Git/deploy, prossegue com build independente
SHA fixoe847fee e depois candidato/E2E S01-UI35/UI41. Não contém f1e58de do probe;
não interromper nem repetir o build ativo. Resultado novo ainda não consolidado.
Relatório privado gerado às20:18:28Z; STATUS contém caminhos/identidades.
O aviso de orçamento chegou após consulta20:18:37Z; depois só handoff obrigatório.
Sprint01 aberta;02–05 não iniciadas; semCONCLUSAO.json.

# Sprint 01 — retomada ciclo 28

## Escopo e identidade

Execução em 2026-11-06 UTC, com fonte de aplicação `97d75b09b5b783b18104812cf67fb2e18afdf76a`
e artefato SHA-256 `34e207ff6f877d050ef2c9c485c6fb7ff32a2297abb8f2834cf852286ce91f47`.
Fonte operacional e do reteste: `d1dc30bff06932ef9421793e02a4e36c21ac3798`.
Nenhum build repetido. PR #3 continua aberto como rascunho; os dois checks do
head documental `85a724e` foram relidos aprovados. Isso não substitui gates nativos.

## Manutenção executada

O ensaio existente `scripts/rehearse_maintenance.py` terminou em
2026-11-06T03:12:23Z com aprovação e código zero, no banco exclusivo `rm_test`:

- 3.997 tabelas e 33.588 linhas inventariadas; clone e retorno equivalentes.
- Migrador Java real terminou com código zero.
- Três partidas nativas com contas fictícias e negativos de tenant/unidade.
- DDL exclusivo confirmado, seguido de falha SQL explicitamente injetada.
- Banco original retornado por OID; clone preservado, bloqueado e sem exclusão.
- Unidade encerrada e OIDs relidos depois do resultado.
- Homologação manteve SHA, hash, processo e health durante o ensaio.

Não é falha de migration de produto nem backup externo; não encerra X15.
Resultado, inventários, ledger e logs estão na área privada identificada no STATUS.
O ensaio passou pelo systemd independente da chamada, com ambiente explícito e
sem timeout externo que pudesse interromper seu bloco de recuperação.

## Reteste herdado e diagnóstico

A matriz do ciclo26 terminou com 215 combinações aprovadas no mesmo artefato.
O reteste27 de UI18 teve três aprovações Chromium e duas falhas, sem skip,
retry ou flaky reportado pelo Playwright. As falhas continuam preservadas:

- Firefox enviou a reautenticação, mas a requisição foi abortada perto do limite
  HTTP de dez segundos. O teste aguardou uma resposta que não chegou.
- WebKit esgotou o orçamento global antes de enviar o segundo login.
- Revisão independente dos traces não encontrou dependência de blur ou submit
  perdido. Os traces não distinguem sozinhos contenção do host de latência no
  servidor; a hipótese não foi convertida em causa comprovada.

Não foram ampliados timeouts, reduzidas assertivas ou alterado o produto.
Os viewports de cadastro de convites Chromium foram inspecionados: campo de
perfil agora inteiro em desktop/mobile; a inspeção não abrange toda a lista de
unidades nem aprova a rodada funcional que falhou.

Reteste28 finito terminou03:20:15Z, com cinco combinações aprovadas, zero
falha/skip/retry/flaky. Usou o mesmo JAR/fonte, um worker, diagnóstico HTTP sem
cabeçalhos/corpos e amostras privadas de CPU. JSON, hash e cobertura relidos.
Uma execução verde posterior não apaga a instabilidade histórica nem prova
automaticamente sua causa. As amostras mostraram saturação de CPU em trechos
da rodada e clocks próximos de450MHz; a origem dessa limitação não foi
diagnosticada nem alterada. Nenhum processo alheio foi interrompido.

As14capturas novas de convites foram inspecionadas em desktop/mobile. A
materialização substitui somente UI18 antigo:215pares únicos,26imagens
principais/20complementos, com origem/hash/notas conferidos. Não é gate de
release aprovado: a instabilidade anterior permanece aberta.

## Candidato servido e provisionamento real

A substituição restrita terminou03:22:15Z, com SHA97d75b0, hash esperado e health
UP relidos. Backend/dependências/migrations são byte a byte iguais ao candidato
anterior, fora dos arquivos estáticos. Banco hml permaneceu no mesmo clone;
baseline anterior e banco original bloqueado foram preservados.

Nove contas empresariais existentes passaram por login/me/logout. A fixture
nova é vinculada ao97; não representa validação antecipada do operador SaaS.
Fundação hml passou20combinações exatas nos cinco projetos, sem falhas/skip/
retry/flaky; recibo, resultados, hashes e vínculo dos OIDs foram relidos.

O ensaio assistido REAL terminou03:27:45Z, aprovado:

- solicitação pela UI SaaS em viewport mobile e confirmação202;
- despacho Java por UUID, migração/ativação e estadoCONCLUIDO relido;
- replay idempotente, payload divergente409 e reconciliação sem reexecutar Java;
- login do novo Administrador, unidade única e negativos de outra empresa/SaaS;
- leitura SQL posterior independente confirmou solicitação, empresa e domínio;
- captura mobile do cartãoCONCLUIDO inspecionada, sem inferir página inteira.

Revisão independente apontou limites do wrapper privado quanto a timeout,
fixture e retomada. Nesta execução nova, o systemd usouKillMode=control-group;
unidade encerrada/cgroup ausente e locks livres foram conferidos. Hash da fixture
foi comparado ao recibo API antes/depois; a fixture ampliada contém somente a
intenção conhecida adicional. Não houve retomada do wrapper após falha; o teste
deliberado de reconciliação conferiuCONCLUIDO sem nova execução. Essas verificações
não são ensaio de timeout arbitrário nem tornam qualquer futura retomada segura.

O smoke do candidato servido terminou às03:37:46Z, com50combinações aprovadas
e zero falha/skip/retry/flaky, usando a fixture ampliada. JSON/hash/cobertura e
OIDs foram relidos. Dez viewports mobile foram inspecionados, com notas dos
limites de cada captura; não são páginas inteiras.

Probe API complementar confirmou o ID exato do operador, projeção mínima,
logout e recusa do JWT anterior. O primeiro probe falhou somente ao montar o
recibo por chave repetida; correção pontual e reexecução passaram, sem mudança
de produto ou cadastro. Não repetir seed ou criar outra empresa para substituir
a intenção já concluída.

Consolidação privada reabriu resultados/fontes/hashes e confirmou285pares
únicos do mesmo JAR:215mutantes,20fundação e50smoke. O manifesto está marcado
BLOCKED e mantém `release_gate=false`/`sprint_complete=false`, com a instabilidade27
explicitamente aberta. Não foi executado o CLI de aceitação. Cobertura
consistente não é prova de resolução de uma falha intermitente.

## Limites

Sem merge ou promoção de baseline. Aceitação integrada permanece pendente,
assim como o fechamento da instabilidade27. Sprint01 não
concluída; Sprints02–05 não iniciadas. E01–E12 e matriz T01–T28/X01–X15 preservadas.
Consultar o [checkpoint](../25_EXECUTION_STATUS.md) para atualizações posteriores.

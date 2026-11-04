# Sprint 01 — retomada autorizada, ciclo 1

[Checkpoint](../25_EXECUTION_STATUS.md) · [Cobertura](cobertura.md)

## Build independente corrigido

`d3763addb3a121728113bcec2f794a270966c240` propagou explicitamente
`TMPDIR`, `PATH` e `RM_HOME` ao serviço systemd, sem exportar o ambiente completo
do Hermes. Scratch exige diretório absoluto próprio/privado e gravável, fora de
`/tmp`. Vermelho unitário reproduziu ausência de TMPDIR; revisão independente
apontou validação de privacidade incompleta, corrigida com regressão.

Execução real no serviço: 26 testes Python e 119 testes backend, sem falhas,
erros ou ignorados; build Angular e auditorias aprovados. Gate local aprovado,
artefato SHA-256 `11adb0784f12a0222a5e4e812b147d86cb73cdddabc37f10ccb5d57b745cf505`.
Segundo lançamento enquanto o primeiro estava ativo foi recusado; PID/invocação
mantidos. Ambiente efetivo conferiu scratch e PATH. Job terminou com exit 0 e
resultado durável, após retornar da chamada que o iniciou. Não comprova reboot
ou queda de energia. Dois runs CI do SHA exato também aprovados.

## Convites no candidato V10

HTTPS e PostgreSQL de teste reais, artefato acima, sem promoção de homologação.
S01-UI17–19 executados nos cinco projetos: treze aprovações e duas falhas,
nenhum ignorado/retry/flaky. S01-UI18 falhou em Chromium desktop/mobile ao
verificar o aviso antes de concluir a reautenticação. Trace confirmou HTTP 204
na chamada real e tempo próximo do limite da asserção; snapshot ainda ocupado.

Correção sincroniza com a resposta real de `/auth/reautenticar` e exige 204,
mantendo a asserção visual e sem aumentar retries ou remover cenário. Reexecução
do conjunto corrigido ainda pendente neste registro. Não aprovar a matriz por
somar resultados de SHAs diferentes. Candidato V10 encerrado antes de V11.

## Verificação de contas existentes

Incremento T06: rotas protegidas por CSRF, resposta neutra, outbox cifrada,
código único por usuário/endereço/tenant, consumo/auditoria atômicos e UI Angular.
Não muda senha/perfil/unidades, não cria sessão, não usa códigos de outras
finalidades. Migration V11 só em desenvolvimento/teste; nenhuma migration hml.

Teste anterior à implementação retornou 403 em vez do 202 esperado, com uma
falha comportamental e zero erros/ignorados. Testes novos cobrem conta inexistente,
inativa/verificada, isolamento, finalidade, concorrência real, expiração após
lock observado, rollback, quota, retenção e indicador lido com JWT ainda válido.
Rodada focada aprovada: dez testes de verificação e quatro de proteção/captura,
zero falhas/erros/ignorados. Typecheck Angular e E2E passou. Novo build integrado
e E2E continuam pendentes neste registro; não transferir gate do SHA anterior.

A revisão independente desse segundo incremento foi solicitada, mas a ferramenta
recusou pelo limite efetivo de subagentes desta chamada. Revisão local do diff
não substitui esse gate; manter PR draft e revisão independente pendente antes
de aprovação/merge. A correção inicial do runner teve revisão independente real.

## Limites

Atualização final: commit publicado `543d440fb35fa1442cd0b681bab3a37aa41295e0`.
Build local completo terminou exit 0/gate true, hash
`d19cfb078805f270ea092706ffb3513276a83e116f3ad4fc44aef16cd5e4985f`.
Dois runs CI success no SHA exato; log do primeiro confirmou 129 testes backend
sem falhas/erros/ignorados. Aviso efetivo de orçamento impediu nova consolidação
do XML local e E2E positivo. Runner encerrado; dez contas fictícias preparadas.
S01-UI20–22 e reexecução de convites continuam pendentes; não atribuir aprovação
ao novo artefato apenas por build/CI. Reporte privado final separa essas evidências.

Sprint 01 não concluída; identidade SaaS, suspensão comercial, eventos/projeções,
critérios restantes e manutenção/backup/restore continuam pendentes. Sprints
02–05 não iniciadas. Homologação permanece no último release saudável da fundação.
Captura fictícia não encerra provedor real de e-mail nem dependências do piloto.

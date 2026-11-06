# Sprint01 — retomada ciclo23

## Correção de senha em branco

Revisão independente encontrou uma lacuna no critério de erro por campo:
doze espaços satisfaziam o HTML de recuperação, cadastro e aceite de convite,
mas o backend rejeitava `@NotBlank` com mensagem genérica. Probe de componente
reproduziu o envio sem alerta específico antes da correção.

Os três formulários agora associam a rejeição à senha, preservando foco no alerta,
limpeza de senha/confirmação e código para correção. O helper compartilha somente
a classificação dos espaços; não modifica, normaliza ou apara a senha enviada.
API, persistência e regra de negócio no backend não mudaram.

A classe efetiva Hibernate Validator 9.0.2 foi inspecionada por bytecode: usa
`String.isBlank`. Comparação executada entre o helper TypeScript compilado e
Java21 percorreu 1114112 pontos Unicode, com os mesmos 25 classificados como
espaço. Isso evita a divergência de `trim()` em NBSP e separadores de controle.

Vermelho pertinente observado no probe Angular real com transporte fictício.
Após a correção, os três motores Chromium/Firefox/WebKit passaram o probe de
formulários, incluindo foco, ARIA, ausência de envio inválido, limpeza, erro
incerto e envio exato de senha válida com espaços nas extremidades. Não é E2E.
Typecheck aplicação/E2E passou. A chamada conjunta dos probes de perfis atingiu
240s durante WebKit; não foi aprovada integralmente nem tratada como regressão
comprovada. O probe afetado de formulários/WebKit foi executado separadamente.

Segunda revisão independente do diff não encontrou bloqueador. E2E UI11/UI14/
UI19 ampliados, ainda não executados no artefato corrigido nesta gravação.
O JAR36e49e7, já programado pelo ciclo anterior, não contém esta correção.
Não transferir evidência entre artefatos nem interromper o build herdado.

## Estado integrado

Na consulta23:11Z de2026-11-05, worker21 tinha200 pares únicos aprovados,
zero falha/skip/flaky/retry nas parcelas consolidadas; provisionamento ainda
em execução. Não é aprovação global antecipada. Despachante22 aguardava21
para construir36e49e7. Homologação3cd4eeb/UP e baseline449ce3c preservados.
PR3 continua draft; sem promoção ou merge. Sprint01 aberta,02–05 não iniciadas.

A fonte canônica de execução já registra a autorização temporária de merge.
AGENTS permanece bloqueado pelo executor conforme tentativas anteriores;
nenhum contorno foi feito. Próximo: recolher matriz/build herdados, construir
o incremento consolidado quando o lock estiver livre e validar formulários,
matriz integrada, visual e procedimentos operacionais no artefato correspondente.

## Consolidação observada em23:19Z

Worker21 terminou23:13:50Z com215pares únicos aprovados,43cenários/cinco projetos,
zero falha/skip/flaky/retry. Recibos/hash/inventário reabertos e conferidos. O
despachante22 iniciou o build36e49e7 às23:14:11Z; não foi interrompido. Não executar
matriz integral desse intermediário já superado somente para descartá-la depois.

Publicado0094839945341fee77d6d8e8d97ce5916cf14d02; remoto/PR3 draft/base main/corpo
relidos. Ambos checksCI passaram; log42127882651 confirma174backend sem falha/
erro/skip,147Python e probes dos três motores. Não equivale a build/E2E nativo.

Worker23 finito espera36e49e7, confere gate/fonte/CI e lança um único build0094839;
depois20focos e195combinações restantes no mesmo JAR, sem duplicatas. Limite
operacional anunciado de quatro horas, sem teto da missão; esperas de build
limitadas a2700s cada. Não é coordenador, não altera código nem faz deploy/merge.
Claim, fonte imutável, PID/início/hash/log/progresso privados; reentrada real
recusada com progresso intacto. Último estado observado: aguardando-build22.

Relidas identidades rm_dev_app/rm_test_app/rm_hml_app nos bancos próprios em
loopback55432; hml3cd4eeb UP/PID399982 e baseline449ce3c preservados. Inspeção
adicional dos formulários mobile antigos e recortes de unidades/provisionamento/
exportação não encontrou novo corte; botões unidos do login antigo já foram
alterados em36e49e7. Não é revisão visual integral nem aprovação da versão nova.

## Falha nativa e encerramento

Build36e49e7 terminou23:36:39Z exit1/release_gate=false. XML de retenção registrou
`sessaoBloqueadaNaoInterrompeLoteEExpurgoRetomaDepois`: esperado0, observado1
na linha140. A contagem era global ao schema fixo compartilhado com outras
suítes em banco persistente. A coleta não identificou qual registro adicional
foi removido; não atribuir a falha a uma sessão específica por suposição.

Worker23 recusou prosseguir23:36:41Z por gate ausente; SEM novo build0094839,
fixture/candidato/E2E. Unidades de build/worker inactive/MainPID0 às23:37:16Z.
Não é erro de autenticação nem encerramento deliberado da suíte.

Ajuste LOCAL não publicado migra dois schemas exclusivos da classe de retenção,
mantém todas as contagens exatas, concorrência e limpeza por usuário próprio.
Acrescenta prova explícita da sessão bloqueada preservada e depois expurgada.
Nenhum DROP/reset, backend de produto ou migration alterado. Maven focado
`-Dtest=RetencaoIdentidadeTest test`, sob deploy.lock e with-env.sh test, retornou
exit0. XML não foi reconsolidado após aviso efetivo de orçamento. Revisão
independente adicional recusada pelo limite2/2; preservar ajuste para revisão.

Depois do aviso, somente checkpoint/STATUS privados e estes registros obrigatórios.
Não repetir o worker23 consumido nem inferir build/E2E futuro. Próximo: revisar
ajuste de teste, publicar, construir candidato consolidado e executar matriz,
depois fases operacionais. Missão/Sprint01 continuam abertas; hml preservada.

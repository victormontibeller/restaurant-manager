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

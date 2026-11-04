# Sprint 01 — retomada ciclo 10

[Checkpoint](../25_EXECUTION_STATUS.md) · [Sprint](../15_SPRINT_01.md)

Missão não concluída. Build/worker herdados de `e847fee` foram preservados;
nenhuma aprovação inferida de execução ainda ativa. Homologação `449ce3c`
conferida saudável, sem alteração neste registro.

## Correção do probe Angular

CI do `f1e58de` teve um check aprovado e outro falho. O log da falha mostra
`COZINHA` no modelo contra `GERENTE` esperado após recarga. Revisão independente
identificou a causa: `ocupado=false` e valores iguais no DOM não demonstram que
o `@for` reconciliou seus objetos; o listener ainda pode capturar o funcionário
anterior. O probe agora conserva `ApplicationRef` e aguarda `whenStable()` após
operações/recargas antes da interação seguinte. Não repete a escrita, força
change detection nem troca a assertiva de modelo por polling.

`bash scripts/test-profile-templates.sh` passou localmente nos três motores,
com payloads e recarga de equipe/matriz/convite conferidos. Angular real com API
fictícia: esta é uma unidade de UI, NÃO E2E/PostgreSQL nem aprovação de release.
CI nova e E2E herdado permanecem em acompanhamento.

A mesma revisão independente não identificou regressão bloqueante no leitor de
snapshot separado nem na preparação única da fixture por JVM. O snapshot não
protege contra DDL concorrente; lock e coordenação operacional continuam
obrigatórios. Não foi executado teste novo pelo revisor.

## Pendências

Manutenção/migrations com recuperação, gate integrado e publicação Sprint01;
Sprints02–05 não iniciadas. Sem merge ou conclusão técnica antecipada.

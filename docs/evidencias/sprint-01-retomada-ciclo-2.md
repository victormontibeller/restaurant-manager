# Sprint 01 — retomada, ciclo 2

[Índice](../README.md) · [Checkpoint](../25_EXECUTION_STATUS.md)

## Base e fronteiras

Retomada em 2026-11-04, único coordenador; branch existente/PR #3 draft preservados.
Missão integral permanece aberta. Hml conferida saudável na fundação `449ce3c`,
sem deploy/reinício/migração. Dev/test/hml confirmados por identidade SQL separada.
Nenhuma comunicação externa, cobrança ou produção usada.

## Evidência herdada recolhida sem reconstrução

Job de `543d440fb35fa1442cd0b681bab3a37aa41295e0`: gate/hash confirmados,
129 testes backend, zero falhas/erros/skip. E2E no JAR imutável HTTPS/rm_test:
S01-UI20–22 aprovados nos cinco projetos, quinze combinações sem retry/skip/flaky.
Captura de 360 px revisada: campos, foco, mensagem de conexão e botões sem corte.
Revisão independente da verificação não apontou vulnerabilidade confirmada;
registrou lacunas adicionais de concorrência/limites/UI, não aprovação da Sprint.

Convites: quatorze aprovações e uma falha Firefox S01-UI18. Trace mostrou login
HTTP 200 em 8005,734 ms, seguido de /me 200; teste esperava a tela em cinco
segundos sem sincronizar a resposta. Corrigido para aguardar login real e exigir
200 antes da mesma assertiva visual, sem ampliar timeout/retry ou simular API.
Reexecução ainda pendente neste registro. O runner parou nessa falha; cadastro,
recuperação, identidade e fundação dessa rodada NÃO foram executados.

## Incremento SaaS em validação

API/Angular de identidade do operador e listagem paginada de metadados. Tabelas
públicas separadas, audiência exclusiva, filtro de origem, CSRF real, refresh
rotativo, revogação, quotas, retenção técnica e auditoria mínima. JWT reutiliza
chaves do emissor com decodificadores estritos distintos; não existe impersonação.
Persistência pública JDBC explícita, sem trocar o transaction manager empresarial.
Contratos e limites na [fonte de segurança](../04_SECURITY.md) e
[OpenAPI parcial](../api/plataforma.yaml).

Vermelho HTTP SaaS real: CSRF esperado 200, observado 401 no candidato anterior.
Revisão independente identificou falta de privilégio para FOR SHARE e ausência
inicial de revogação durável ao inativar/reativar operador. Ambos reproduzidos em
PostgreSQL: lock runtime negado e zero sessões revogadas versus uma esperada.
Primeira suíte nova: nove falhas de login HTTP 500, nenhuma ignorada; não aprovada.
V4 corrige privilégios mínimos de lock e revogação transacional via trigger,
preservando V3 já aplicada em teste. Regressão false→true acrescentada.

Rodada corrigida: 29 testes aprovados (9 SaaS, 10 identidade empresarial e 10
rotação JWT), zero falhas/erros/skip. Typecheck inicialmente detectou import de
formulários não disponível; removido em favor do formulário nativo utilizado
pelos componentes vizinhos, sem nova dependência. Typecheck aplicação/E2E passou.
Build identificado e E2E SaaS pendentes neste registro.
Provisionamento/suspensão HTTP, eventos/projeções, manutenção/backup/restore e
critérios restantes da Sprint 01 seguem abertos. Sprints 02–05 não iniciadas.
Não há aprovação artificial, merge ou declaração de conclusão técnica.

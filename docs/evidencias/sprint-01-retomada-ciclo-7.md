# Sprint 01 — retomada ciclo 7

[Checkpoint](../25_EXECUTION_STATUS.md) · [Cobertura](cobertura.md)

## Identidade e limites

Incremento de aplicação/scripts/testes: `dfe496cd450044cb6e35d390443913944f1dff97`.
PR #3 continua aberto/draft. Sprint não concluída; nenhum merge ou deploy.
Homologação continua em `449ce3ccf941c73b34ac15a4754183c147f91aaa`.
As atualizações documentais posteriores não exigem reconstruir o mesmo código.

## Falhas reproduzidas e corrigidas

- Unidade inativa preservava vínculo, mas a edição/inativação do funcionário
  retornava 404. Teste novo reproduziu esperado 200/obtido 404. Sob o lock de
  política já existente, a edição admite unidades ativas ou vínculos anteriores
  daquele funcionário; vínculo novo inativo/desconhecido continua negado.
- UI identifica os vínculos inativos. Checkbox permanece durante edição para
  desfazer sem perder foco; confirmação atualiza a lista original. Unidade
  inativa não concede acesso; remover vínculo impede retorno após reativação.
- Fila gravava pausa somente após execução/read-back. Interrupção ou erro de
  consulta podia deixar SOLICITADO elegível sem intervenção. Pausa agora precede
  o filho e só sai após estado terminal/progresso confirmado. SIGTERM real em
  executável fictício demonstrou recolhimento do filho, liberação de lock e
  preservação do marcador; não equivale a matar Java real.

Quatro testes PostgreSQL focados passaram, sem falhas/erros/skip: vínculo
inativo e negativos, login simultâneo com sessões distintas e revogação de ambas,
inativação/reativação da unidade e revogação preexistente de funcionário.
A primeira tentativa focada foi interrompida por timeout operacional de 180s;
não é aprovação. A segunda reproduziu o vermelho e a terceira passou os quatro.

Cinquenta testes Python, teste de lógica frontend, typecheck e scanner passaram.
Duas revisões independentes somente leitura: diagnóstico dos bloqueadores e
revisão do incremento de recuperação/fila/UI. Achados foram corrigidos; as
alterações posteriores receberam revisão local, não uma terceira revisão
independente. Novo S01-UI35 está escrito e aguarda resultado E2E consolidado.

## Restore real de banco

Comando: `bash scripts/with-env.sh test python3 scripts/database_recovery.py`.

Execução aprovada em 2026-11-04, snapshot às 18:31:59Z e término às 18:32:35Z:
1197 tabelas, 11922 linhas e 71 empresas ATIVO/SUSPENSO; 70 tinham usuários e
unidades. Inventários da mesma transação/snapshot do pg_dump e do cluster
restaurado coincidiram. Comparados hashes de todas as linhas, proprietários,
privilégios, constraints, índices, funções e triggers. Cluster novo sem TCP,
papéis restaurados sem login e parada confirmada; dump privado 0600.

Tempo total 36,346s; backup 5,456s; restore/verificação 24,321s. Não são metas
RPO/RTO. Falhas anteriores foram preservadas e diagnosticadas: quantidade de
locks do cluster descartável, JSON multilinha, ACL explícita equivalente à
padrão e distribuição equivalente de cast de array pelo PostgreSQL após reparse.
Normalização restrita tem teste que mantém diferença de valores/tipos.

Essa prova não cobre mídia, chaves, login na aplicação restaurada, restauração
sobre hml, manutenção/migration incompatível nem backup externo. Não encerra X15.

## Resultados herdados, sem transferência para outro artefato

No JAR `dee85d3`, S01-UI32–34 passou quinze combinações nos cinco projetos;
captura de 360px foi inspecionada em recorte: foco e ações legíveis, sem corte
horizontal no acompanhamento. Página administrativa extensa continua sendo
limitação de usabilidade da massa acumulada; emulação não é aparelho físico.

S01-UI04 teve duas aprovações/três falhas. Trace comprovou setup Firefox de cerca
de dezesseis segundos e WebKit chegando ao último comando após o prazo de
sessenta segundos. O cenário agora tem orçamento total de 120s, mantém limites
normais de assertiva/retries zero e espera a resposta real 409 antes do alerta
do último Administrador. Reexecução nova ainda não consolidada neste registro.

Fila herdada realmente executou três solicitações por timer/Java: conclusão,
falha injetada de auditoria e conclusão. Runner parou porque exigiu sucesso ao
remover timer transitório já inexistente. Constraint foi removida; resultados e
estado foram relidos. Falta concluir a retomada do UUID falho; não aprovar o
ensaio inteiro pela parcela bem-sucedida.

## Build e continuidade

CI do dfe496c passou nos dois runs; log confirma 165 backend e 50 Python, sem
falha/erro/skip. Isso não substitui build local, E2E ou gates de homologação.
Build local segue independente em checkout privado imutável. Worker finito
aguarda seu gate, executa S01-UI35, S01-UI04 e S01-UI32–34 sequencialmente e retoma
a solicitação de fila herdada por API/CLI real. Não é outro coordenador nem faz
deploy. Consultar unidades, manifests e resultados antes de iniciar nova suíte.
Resultados observados depois deste registro ficam no checkpoint vigente.

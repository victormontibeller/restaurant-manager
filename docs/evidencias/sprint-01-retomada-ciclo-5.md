# Sprint 01 — retomada ciclo 5

Missão em andamento; sem conclusão de Sprint nem promoção de homologação.

## Herança reconciliada

Build durável `31cda03cee98829384a467511fc9cf5c241a6e83` terminou exit 0,
gate verdadeiro, hash
`991eb049f7a8664115fb9b30ff391d2afe4c5a7615b38cdbb2b0f0354609b705`.
Worker de E2E herdado terminou exit 0 em 2026-11-04T16:40:46Z, com relatório
estruturado disponível. Resultados não aprovam o CSS posterior de `bd30b09`.
Revisão independente do CSS não encontrou bloqueante; apontou limites do probe
isolado e ausência de sua integração em CI. E2E com viewport corrigida pendente.

## Incremento de produto

Acompanhamento cadastral de unidade com eventos PostgreSQL na mesma transação
da criação/alteração, cursor por versão da unidade e projeção mínima. Ação
`unidade.acompanhar` delegável; sessão, tenant, política e vínculo revalidados por
consulta. Paginação de cinquenta, replay e estado atual explícitos. Sem SSE,
pedidos, endereços, finanças ou substituição das notificações das Sprints 03–04.

Angular oferece seleção de unidade, consulta automática, indicação de conexão,
limpeza após revogação e recuperação após rede indisponível. Rascunho/cursor
apenas em memória; respostas atrasadas de outra unidade ou instância descartadas.

## Vermelhos, revisão e validação

- Probe HTTP autenticado no candidato herdado: esperado 200, observado 403 na
  rota ainda ausente. Tentativa anterior falhou no login de uma fixture antiga;
  não constitui vermelho do comportamento. Conta fictícia separada corrigiu o probe.
- Teste JS reproduziu 401 antigo encerrando sessão nova. Revisão independente
  encontrou também restauração atrasada após logout e 401 do token anterior após
  refresh. Correção aplicada nos serviços empresarial e SaaS; testes de regressão
  executados sobre código base e sobre código corrigido, com resultados privados.
- Testes JS isolam a lógica TypeScript com Angular substituído; não são E2E.
- Novos testes PostgreSQL cobrem perfis, revogação, paginação, rollback e lock;
  cinco testes focados passaram, XML conferido sem falhas/erros/skip. Duas provas
  adicionais cobrem commit/rollback concorrente e credenciais válidas de dois
  tenants com UUID semelhante; escritas depois da compilação focada, aguardam
  execução no build integrado. Não incluí-las na contagem já aprovada.
- S01-UI32–34 escritos nos cinco projetos, sem API simulada. Execução positiva
  ainda pendente nesta gravação.

Quatro testes JS novos (incluindo subcasos empresarial/SaaS), dois JS existentes
e typecheck completo da aplicação/E2E passaram. Primeira chamada de typecheck
atingiu timeout da ferramenta; reexecução completa terminou exit 0. Scanner de
251 arquivos e diff passaram. Não houve skip ou relaxamento das assertivas.

Build, CI, regressões e homologação do código novo não são aprovados por este
registro intermediário. O checkpoint e o relatório privado distinguem cada SHA.

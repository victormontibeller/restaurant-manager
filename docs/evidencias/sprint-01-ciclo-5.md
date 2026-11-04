# Sprint 01 — ciclo 5: matriz e equipe

[Índice](../README.md) · [Checkpoint](../25_EXECUTION_STATUS.md) · [Acessos](../11_ACCESS_CONTROL.md)

## Publicação e escopo

Commit `b63140322a71bf4d38fe10288632541205c93766`, PR #3 OPEN/draft, base main, lidos de volta após push. CI 41789372990 e 41789366670 SUCCESS. Sprint01 permanece parcial. PR #2 da fundação mesclado após gates, com merge `fa9e595bd3bb3f1d768a279ac25ee03243c12fb9` e árvore remota conferidos.

Matriz de cinco perfis com versão/dependências e auditoria; equipe existente paginada, alteração de perfil/unidades/estado; política central; proteção do último Administrador; reautenticação sensível. UI Angular implementada, mas validação final de navegador pendente. Não implementados convites/criação de funcionários, cadastro de unidades ou operação de pedidos/finanças.

## Execução real e correções

- Cinco testes API vermelhos antes dos endpoints. Primeira implementação encontrou dois testes inválidos por administradores preexistentes na massa compartilhada. Testes passaram a criar schemas exclusivos por UUID e remover somente seus próprios objetos, após verificar banco/role/host/porta. Nenhum dado alheio removido.
- Testes aprovados demonstram Administrador exclusivo, negativos dos demais perfis/cliente, outro tenant, unidade não atribuída, revogação com JWT válido, inativação/reativação sem ressuscitar sessão existente, dependências da matriz, ações desconhecidas, conflito simultâneo e último Administrador concorrente.
- Regressão intermediária: 51 testes backend, zero falhas/erros/skip; Angular typecheck/build aprovados.
- Revisão independente apontou login concorrente fora do lock da inativação e senha errada de reautenticação causando logout local. Duas regressões vermelhas reproduzidas. Correções: login com lock compartilhado da política e erro 422 de confirmação; duas regressões direcionadas passaram. Teste do lock usa transações independentes e comprova bloqueio até liberação.
- Build identificado `scripts/build-release.sh` do b631403 terminou exit 0, incluindo oito testes de acesso, regressões backend, frontend, travas e auditorias. O hash está no gate privado, não no relato de runtime hml.

## Navegadores não aprovados neste ciclo

Artefato anterior d7cd97a: 14/15 casos passaram. Primeiro Chromium desktop foi interrompido pela asserção de cinco segundos, com login ainda em curso no trace. O teste foi alterado para aguardar e conferir resposta HTTP real antes do DOM, sem mock/sleep/retry. A execução original não é considerada aprovada.

S01-UI04 demonstrou vermelho de tela de acessos ausente. Agora cobre matriz, confirmação inválida sem perder edição, reautenticação válida, persistência e proteção do último Administrador. Suíte final tem quatro cenários nos cinco projetos, ainda NÃO executados sobre b631403. Regressão de fundação e revisão visual desse candidato também pendentes.

## Runtime e retomada

Homologação continua `449ce3c`, health UP e identidade do processo conferidos, sem V2/V3/V4. Candidato antigo de teste encerrado antes do rebuild; novo não iniciado. Nenhum deploy ou aprovação artificial.

Registros privados do operador: `cycle5-access-red.log`, `cycle5-access-green.log`, `cycle5-access-isolated.log`, `cycle5-backend-regression.log`, `cycle5-review-red.log`, `cycle5-review-green.log`, `cycle5-build-release.log`, `cycle5-auth-ui` e `cycle5-access-ui-red`. Revisões somente leitura em `deleg_b934fdb0` e `deleg_3c02a630`. Próximo passo: iniciar o candidato identificado e executar/revisar E2E antes de qualquer promoção.

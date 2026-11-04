# Checkpoint de execução

> **Escopo:** estado vigente para retomada. As regras de preenchimento estão no [guia Hermes/Codex](24_AGENT_EXECUTION.md#checkpoint).

[Índice da documentação](README.md)

## Estado atual

| Campo | Registro |
| --- | --- |
| Atualização | 2026-11-02 — versionamento documental |
| Etapa | Documentação inicial preparada para revisão por PR |
| Sprint | Sprint 0 não iniciada; demais sprints não iniciadas |
| Escopo de execução autorizado | Roadmap técnico completo, testes necessários, branches/commits/push e deploy automático em homologação; esta entrega versiona a documentação, sem disparar a execução Linux |
| Host de execução futuro | Linux do Hermes, ainda sem inventário realizado neste projeto |
| Checkout Linux | A preparar; caminho real será mantido no registro privado do operador |
| Branch/base atuais verificadas | `codex/docs-planejamento-inicial`, criada sobre o commit vazio `95dccdc` de `main` para permitir revisão da documentação por PR |
| Publicação documental | Branch destinada ao PR para `main`; conferir SHA, refs remotas e estado do PR no GitHub ao retomar |
| Branch de implementação prevista | `codex/s00-i001-fundacao`, ainda não criada; partir da versão documental verificada, com próximas branches encadeadas por incremento |
| Publicação autorizada | Homologação automática após gates; produção permanece separada |
| Tip de aplicação / candidato / artefato | Ainda inexistentes; a base documental é a versão deste arquivo no Git, sem build produzido |
| SHA observado em homologação | Ainda inexistente; aplicação não publicada |
| Último release validado / alvo de retorno | Ainda inexistentes |
| Estado de homologação | Não publicado; sem migrations ou testes da aplicação executados |

## Definições consolidadas

- Execução pelo Hermes chamando Codex autenticado na conta do usuário.
- Desenvolvimento/testes/homologação no Linux, com checkout e bancos exclusivos do projeto.
- Autonomia para avançar entre tarefas/sprints, implementar, testar, corrigir, criar branches/commits, fazer push e deploy em homologação, sem novas confirmações por etapa. Produção permanece separada.
- Combos personalizáveis, preço base mais acréscimos, cancelamento por unidades comerciais completas. Regras detalhadas em [Regras de negócio](20_BUSINESS_RULES.md#combos-personalizaveis).
- Guia de execução e checkpoint estabelecidos para retomar sem depender do histórico do chat.
- Teste final completo das telas/jornadas e níveis de acesso, com relatório vinculado ao release real em homologação, conforme [estratégia](26_TEST_STRATEGY.md).

## Verificações desta etapa

Somente verificações documentais: coerência entre decisões, regras, dados, sprints e guia de execução; conferência de links locais, exemplos e referências. A consulta de ajuda do Codex no ambiente de edição não valida a instalação no Linux.

Nesta revisão foram conferidos 32 documentos Markdown, 318 links locais, IDs dos registros/cenários, tabelas, blocos de código e marcadores de dados privados. As seis sprints permanecem não iniciadas. A revisão também separou ensaios técnicos de homologação das validações operacionais do piloto.

Esta entrega trata de documentação, branch, commit e PR. Não foram executados build/testes da aplicação, provisionamento de bancos, autenticação no servidor, pagamento, envio real ou deploy. A base vazia em `main` existe somente para viabilizar a comparação do PR; não contém implementação. O estado de push e PR deve ser conferido no remoto, sem confundir versionamento com preparação do Linux.

## Pendências para iniciar a execução

1. Preparar a entrada do fluxo no Linux e registrar a primeira tarefa, sem exigir nova aprovação por sprint.
2. Obter a versão documental publicada no checkout Linux e conferir seu SHA; enquanto o PR estiver aberto, usar a branch documental para carregar o contexto. Não repetir o bootstrap do repositório nem iniciar pela base vazia de `main`.
3. Verificar ferramentas, autenticação local do Codex, recursos do host e acesso aos bancos de desenvolvimento/testes.
4. Registrar as escolhas técnicas da fundação conforme P01/P02 e critérios da [Sprint 0](14_SPRINT_00.md).

As demais premissas e dependências mantêm seus prazos nos [registros D/P](00_PROJECT_VISION.md) e [E](23_PILOT_IMPLEMENTATION.md#registro-externo). Não são homologações concluídas.

## Próximo passo

Realizar o preflight da Sprint 0 descrito no [guia de execução](24_AGENT_EXECUTION.md), antes de gerar a base executável. O fluxo avança autonomamente pelo roadmap e publica incrementos executáveis em homologação após os gates; não autoriza produção. A instalação/supervisão no Linux ainda precisa ser preparada e verificada.

## Registro a atualizar durante a implementação

- Tarefa/critério em andamento: ainda não atribuído.
- Commit de implementação verificado: ainda inexistente.
- Alterações sem commit: conferir `git status` ao retomar; esta entrega não contém código de aplicação.
- Comandos e resultados da aplicação: ainda não executados.
- Migrations e evidências pós-deploy por tenant: ainda não executadas.
- Matriz de telas/perfis e relatório final: especificados, ainda sem resultados de execução.
- Processos/recursos temporários da aplicação: nenhum iniciado nesta entrega.
- Impedimento de execução: inventário e ambiente Linux ainda não verificados; não há relato de falha de implementação.
- Próxima ação após interrupção: conferir estado real antes de prosseguir; não usar este registro inicial como evidência de uma execução futura.

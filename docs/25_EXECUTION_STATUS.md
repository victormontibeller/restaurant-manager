# Checkpoint de execução

[Índice](README.md) · [Ciclo 3](evidencias/sprint-00-ciclo-3.md) · [Inventário integral](evidencias/cobertura.md)

## Estado — 2026-11-04, ciclo 3

Sprint 00: fundação técnica validada; PR #2 aberto para revisão, integração em main pendente. Sprints 01–05 ainda não concluídas. Não existe CONCLUSAO.json nem produto pronto.

Branch atual na gravação: `hermes/sprint-00-fundacao`. Último commit publicado e observado: `449ce3ccf941c73b34ac15a4754183c147f91aaa`; alterações documentais posteriores não exigem novo deploy. Executor Hermes/openai-codex autenticado; supervisor único externo, não iniciar outro.

Pedido vigente de merges após gates registrado na missão, mas restrição efetiva deste executor impede merge em main; PRs permanecerão abertos. Para não perder o trabalho da fundação, Sprint 01 pode partir do tip validado da Sprint 00, com PR dependente explícito. Não usar main documental como base que exclua a implementação. Nenhum merge/commit direto em main foi realizado.

## Último release saudável

- SHA servido/validado: `449ce3ccf941c73b34ac15a4754183c147f91aaa`.
- SHA-256 JAR: `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`.
- Homologação nativa exclusiva loopback :8088, banco/roles hml segregados; runtime sem credencial DDL.
- Último PID após drill: 41392; verificar novamente ao retomar. Marcador healthy aprova somente fundação.
- E2E 20/20, zero falhas/skip/flaky nos cinco projetos; cinco screenshots inspecionados. API/PostgreSQL reais, mobile/tablet emulados.
- Startup falho e retorno real ao mesmo SHA/hash em 59,918 s; sem restore de banco ou mudança em rede/serviços alheios.

## Gates e correções do ciclo

- 15 testes backend PostgreSQL, 19 testes Python de travas, build/typecheck Angular, npm audit e OSV do artefato aprovados.
- CI `449ce3c`: runs 41776045898/41776040928 SUCCESS; branch remota conferida por ls-remote.
- Revisão independente corrigida: marcador SHA nulo/JAR corrompido falham fechado, health vinculado ao inode do socket do PID, inventário E2E obrigatório/relatório com hash, checkout limpo/SHA inicial-final e lock de build/deploy.
- Primeiro build do ciclo falhou na auditoria Java por toolchain ausente na etapa; script corrigido e gate integral reexecutado. Logs originais preservados no registro privado `overnight`.
- Migrations separadas, checksums/pending validados no runtime, rollback SQL/lock concorrente e isolamento A/B comprovados na fundação.
- Atualização de frase histórica em AGENTS foi bloqueada pela proteção do executor; arquivo preservado, sem contornar proteção. Estado vigente está neste checkpoint e nas fontes da Sprint.

## Próximo incremento

1. Publicar evidências/checklist da fundação e verificar PR/CI do tip documental.
2. Iniciar `hermes/sprint-01-identidade-acessos`, preservando a fundação como base, e implementar provisionamento retomável/identidades/sessões/permissões com PostgreSQL real. Registrar dependência do PR anterior.
3. Antes de implantar migrations diferentes em hml, implementar manutenção/backup/retorno compatível. Deploy atual as recusa deliberadamente; desenvolver/testar em rm_test sem alterar último release saudável.
4. Contas fictícias de todos os perfis e ACESSO completo ainda não existem. Sem login, catálogo, pedidos, dinheiro, PWA ou integração externa homologada.
5. Sprints 02–05, matriz T01–T28/X01–X15, backup/restore completo, carga e E01–E12/piloto continuam pendentes. Não criar conclusão artificial.

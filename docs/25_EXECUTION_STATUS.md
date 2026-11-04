# Checkpoint de execução

[Índice](README.md) · [Ciclo 8](evidencias/sprint-01-ciclo-8.md) · [Cobertura](evidencias/cobertura.md)

## Ciclo 8 — incremento em validação, 2026-11-04

Missão NÃO concluída. Coordenador único. Branch `hermes/sprint-01-identidade-acessos`, base publicada `740d1edf5c63e2f59479a9821cd4f9436e900087`. PR #3 OPEN/draft, base main; main remota `fa9e595bd3bb3f1d768a279ac25ee03243c12fb9`. Sprint 01 parcial; 02–05 não iniciadas. Nenhum merge adicional autorizado pelos gates ainda.

## Incremento deste ciclo

Rotação JWT herdada foi revisada, compilada e testada. Corrigida exigência de `iat` original, cuja ausência era suprida pelo conversor da dependência. Dez testes verdes. Implementada retenção técnica de sessões/refresh/limitadores, migration V6, transações limitadas com locks, worker tenant-aware e diagnóstico de backlog. Revisão independente apontou recuperação limitada a um lote e ausência do tenant no aviso; testes reproduziram ambos e correções passaram.

Resultados anteriores ao build identificado: suíte backend de 66 casos aprovada antes da retenção; regressão focada de 27 aprovada; rodada final de 21 JWT/retenção aprovada. Sem falhas/erros/skip nas execuções aprovadas. 19 testes Python e typecheck aplicação/E2E aprovados. Não somar essas execuções como suíte integrada do novo artefato. Detalhes e limites nas evidências.

Alterações herdadas de README/runbook/evidências do ciclo 7 foram preservadas e corrigem estados históricos. A autorização específica de PR/merge e Hermes já está nas fontes canônicas e missão privada; nenhuma configuração de autenticação modificada.

## Homologação e ambiente

Verificação por `scripts/verify-release.py`: SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, hash `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`, health UP, PID 41392. Sem deploy/reinício/migration de hml; identidade ainda não está nesse release. PostgreSQL nativo exclusivo em loopback:55432, testes em rm_test com identidade conferida pela suíte. Dados/credenciais continuam privados.

## Próximo passo concreto

1. Publicar incremento revisado; gerar build identificado limpo e conferir gate SHA/hash, sem reaproveitar gate do ciclo 7.
2. Executar todos os nove cenários de identidade nos cinco projetos e regressão de fundação contra cópia imutável do candidato, banco exclusivo rm_test, HTTPS e prontidão verificados. A suíte interrompida do ciclo 7 NÃO encerra esse requisito.
3. Conferir CI/PR no remoto, atualizar resultados e preservar último hml saudável. Não mesclar Sprint 01 com critérios pendentes.
4. Implementar fluxos SaaS e de conta pendentes, suspensão/eventos/projeções e OpenAPI; ensaiar manutenção/backup/restore antes de migrations hml. Sprints 02–05 e matriz final permanecem abertas.

completion-rejected.json ausente no início; nenhum CONCLUSAO.json criado. Ao retomar, reconciliar este checkpoint com Git/processos/gates privados, não pressupor checkout limpo nem suíte encerrada.

# Checkpoint de execução

[Índice](README.md) · [Fundação](evidencias/sprint-00-ciclo-3.md) · [Identidade ciclo 4](evidencias/sprint-01-ciclo-4.md) · [Cobertura](evidencias/cobertura.md)

## Ciclo 5 — incremento em validação, 2026-11-04

Coordenador único. Branch `hermes/sprint-01-identidade-acessos`, base anterior `d7cd97a21d09505f99be0043f4efde39bcbdb595`. Documentação local pós-ciclo 4 preservada. PR #2 mesclado após CI/revisão independente; merge remoto `fa9e595bd3bb3f1d768a279ac25ee03243c12fb9`, árvore conferida igual ao head aprovado. PR #3 OPEN/draft redirecionado e conferido com base `main`. Sprint 01 não concluída; 02–05 não iniciadas.

## Código e verificações desta etapa

Matriz versionada, catálogo de ações com dependências, auditoria transacional, listagem/edição da equipe existente, vínculos por unidade, política central e último Administrador protegido por lock. Reautenticação explícita com validade de cinco minutos e limite persistente. UI Angular responsiva para matriz/equipe. Enum de ações futuras não implementa pedidos/finanças.

TDD: cinco testes API inicialmente falharam por rotas ausentes; depois passaram. Suíte de acesso usa schema aleatório exclusivo por teste, após encontrar administradores preexistentes na massa compartilhada. Regressão anterior às duas últimas correções passou: 51 testes backend, zero falhas/erros/skip, Angular typecheck/build.

Revisão independente identificou corrida entre login/inativação e UI descartando formulário por senha de confirmação errada. Duas regressões vermelhas reproduzidas; correções passaram em execução direcionada. Login agora participa do lock compartilhado da política; senha de confirmação incorreta retorna 422 sem invalidar sessão. Build identificado/regressão integral e E2E do código final ainda pendentes neste checkpoint intermediário.

E2E inicial do artefato d7cd97a: 14/15 passaram; Chromium desktop foi interrompido pela asserção de 5s com login ainda em curso. Trace inspecionado somente por metadados; teste agora aguarda e valida resposta real antes do DOM, dentro de limite finito. Não contar a execução original como aprovada. Teste de matriz demonstrou vermelho real por tela ausente. UI final ainda não aprovada.

## Homologação preservada

SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, JAR SHA256 `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`, health UP e PID/socket conferidos neste ciclo. PostgreSQL loopback :55432, hml :8088, migrations V1 somente em hml. Sem deploy com migrations novas. Ensaio temporário HTTPS :8089 em rm_test encerrado antes de reconstruir o candidato.

## Continuidade

1. Executar build identificado completo e publicar incremento no PR #3 draft; ler CI de volta.
2. Iniciar candidato HTTPS em rm_test, executar identidade/matriz nos cinco projetos e regressão da fundação; revisar screenshots. Não promover com falhas/skip/flaky.
3. Continuar Sprint01: identidade SaaS separada, cadastro/verificação/recuperação/convites, CRUD de unidades, política de suspensão preservando operação, eventos/projeções, OpenAPI, retenção/expurgo e rotação de chaves. Matriz inteira de perfis/ações ainda exige expansão de testes.
4. Implementar/ensaiar manutenção/backup/restore antes de migration em hml. Não contornar fingerprint.
5. Sprints02–05/T01–T28/X01–X15 e E01–E12 continuam pendentes. Nenhum CONCLUSAO.json. Tentativa de atualizar AGENTS.md foi bloqueada pela proteção do executor; não contornada. Autorizações vigentes registradas nas fontes canônicas editáveis.

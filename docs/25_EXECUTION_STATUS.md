# Checkpoint de execução

[Índice](README.md) · [Fundação ciclo 3](evidencias/sprint-00-ciclo-3.md) · [Provisionamento](evidencias/sprint-01-ciclo-3.md) · [Cobertura](evidencias/cobertura.md)

## Ciclo 4 — incremento em validação

Branch `hermes/sprint-01-identidade-acessos`, base publicada anterior `997a78e8889d442387b1643fc4680b0710f3e723`. PR #3 OPEN/draft, base `hermes/sprint-00-fundacao`; PR #2 OPEN/ready, base main. Nenhum merge/commit direto em main. Sprint 01 não concluída; 02–05 não iniciadas. Não existe CONCLUSAO.json.

Preservado checkpoint local do ciclo 3. Git/refs/PRs/serviços conferidos. CI anterior 41779407969 falhou antes dos jobs: anotação GitHub apontou `runner.temp` inválido no env do job. Workflow corrigido para definir TMPDIR pelo RUNNER_TEMP em step/GITHUB_ENV; execução remota da correção ainda pendente.

## Implementação e validação local

- JWT empresarial HS256/5min, sessão PostgreSQL/12h, refresh rotativo hash-only, lock/releitura, revogação por reuso/logout/inativação, CSRF real separado de Bearer, domínio antes de autenticação, limite durável, entrada estrita e respostas PT-BR. Chave privada obrigatória; regras em Segurança.
- Revisão independente achou origem bloqueada consumindo limite de contas; teste vermelho confirmou 1 linha indevida e correção passou na suíte de identidade. Primeiro ensaio de CSRF real isolado passou; helper de teste `with(csrf())` contaminava repositório compartilhado. Substituído por GET/cookie/header reais, sem afrouxar proteção.
- Regressão inicial 43/43. Regressão ampliada: 44, com 43 aprovados e falha de inventário fixo após provisionar tenant E2E. Teste corrigido compara inventário completo do registro SQL (incluindo A/B), não omite schemas. Reexecução MigrationBoundaryTest 5/5; próxima execução integral ainda pendente.
- Angular login/restore/logout implementado, access em memória, coordenação entre abas e retry de logout não confirmado. Revisão independente realizada; jornada/browser ainda em validação. Red UI real constatou formulário ausente no artefato anterior, depois de resolver pré-requisitos de browser e aguardar startup.
- Massa fictícia exclusiva em rm_test, host c4.localhost, certificado privado para HTTPS loopback :8089. Não é homologação. Processo temporário inicial encerrado antes de reconstruir JAR. Configuração/credenciais/relatórios somente privados.

## Último release saudável preservado

SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`; JAR SHA256 `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`. Serviço hml :8088, PostgreSQL :55432/rm_hml, migrations V1. Nenhuma migration V2/V3 aplicada a hml. Gates de deploy continuam recusando fingerprint diferente sem manutenção/backup. healthy.json aprova somente fundação. Não confundir target/JAR de teste com release servido.

## Pendências e próximo passo

1. Finalizar build identificado, auditoria, suíte integral e E2E login nos cinco projetos; corrigir falhas reais, não marcar skipped/flaky como aprovado. Publicar incremento WIP no PR3 e verificar CI/head remoto.
2. Sprint01: identidade SaaS, cadastro/verificação/recuperação/convites, reautenticação sensível, equipe/unidades/matriz, revogação de política/vínculos/eventos, último Admin concorrente e suspensão preservando operação. Contratos OpenAPI, retenção e rotação de chaves também pendentes.
3. Manutenção/backup/restore compatíveis ANTES de deploy com novas migrations. Homologação continua na fundação; ACESSO não deve anunciar login implantado.
4. Sprints02–05 e matriz T01–T28/X01–X15 integrais pendentes, sem redução de escopo. Integrações externas/piloto E01–E12 separados. Próximo ciclo deve conferir estado real, não confiar em build-gate antigo.

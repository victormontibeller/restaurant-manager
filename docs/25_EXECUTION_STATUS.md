# Checkpoint de execução

[Índice](README.md)

## Estado vigente — 2026-11-04

Sprint 00 em andamento, não concluída. Sprints 01–05 não iniciadas. Base documental `1b165e5`; branch `hermes/sprint-00-fundacao`. Conferir HEAD/GitHub e working tree na retomada. Um PR por Sprint; nenhum merge realizado.

Executor: Hermes com provedor openai-codex e autenticação atual, conforme adaptação autorizada. Supervisor externo único; não iniciar outro. Registro privado: rótulo `overnight` do projeto (fora do Git).

## Implementado e verificado neste incremento

- PostgreSQL nativo 16.15 em loopback, bancos dev/test/hml segregados e roles owner/app. Bootstrap reaplicado preservando dados e verificando proprietário/permissões.
- Java 21.0.13+9 e Maven 3.9.16 em prefixo privado; checksums oficiais conferidos. Node global não alterado.
- Spring Boot 3.5.16, Flyway public/tenant e Hibernate validate, pool neutro pg_catalog, domínio cadastrado e DTO de unidades. Sem fallback por header.
- Angular 22.2.4 compilado, typecheck aprovado, npm audit sem vulnerabilidades reportadas. Shell explicita que não aceita pedidos/pagamentos.
- 10 testes backend aprovados, zero ignorados: SQL/rollback/reuso da mesma conexão, transações A/B simultâneas, domínio inválido/header arbitrário, DDL negado/runtime e banco alheio, health mínimo, limpeza de contexto e abort em falha de reset. Migrations reaplicadas sem duplicação.
- Revisão independente somente leitura encontrou falha de reset do pool e bootstrap incompleto; corrigidas. Teste de abort falhou antes da correção e passou depois (TDD). Revisão não certifica áreas posteriores.
- Scripts de build/deploy/verificação e workflow CI criados; ainda precisam de execução identificada. Base Playwright criada, browsers e bibliotecas extraídos em prefixo privado; E2E ainda não executado neste checkpoint.

## Release

Até este registro: nenhum release publicado/validado. Nenhum SHA servido. Nenhum alvo anterior de retorno. A próxima fase é commit revisado, build identificado, deploy candidato e E2E.

## Pendências reais da Sprint 00

- Executar CI remoto, publicar/verificar PR e corrigir falhas; gates de dependências Java e análise de código a ampliar.
- Executar E2E nos cinco projetos, revisão visual, negativos de health/migration/deploy e recuperação do último saudável.
- Separar credenciais de migração do processo runtime; testar migrador e verificação efetiva de alvo do deploy.
- Registrar inventário T01–T28/X01–X15 sem aprovação artificial; atores completos dependem Sprint 01.
- Provisionamento empresarial completo e contas não existem; tenants A/B ativos são apenas fixtures exclusivas de integração rm_test. Homologação não tem contas fictícias ainda.
- Jobs/inbox/outbox: desenho registrado, não implementado. Mercado Pago/e-mail somente investigados; sem sandbox ou operação real.
- Backup/restore/carga e matriz completa permanecem pendentes; nenhum aparelho físico validado.

## Próximo passo concreto

Conferir estado real; rodar `python3 scripts/check-repository.py`, revisar diff/segredos, versionar incremento. Rodar build identificado, deploy loopback e Playwright, registrar SHA/hash e resultados reais. Não declarar Sprint completa nem criar CONCLUSAO.json.

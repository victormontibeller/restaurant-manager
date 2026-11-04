# Checkpoint de execução

[Índice](README.md) · [Fundação ciclo 3](evidencias/sprint-00-ciclo-3.md) · [Provisionamento ciclo 3](evidencias/sprint-01-ciclo-3.md) · [Cobertura](evidencias/cobertura.md)

## Estado — 2026-11-04, encerramento do ciclo 3

Sprint 00: fundação técnica validada, PR #2 OPEN/ready, tip documental `f354eb858382fd00a51a94ce06597e78e82e2f79`; CI aprovado nos runs 41777118963/41777111407. Integração em main pendente. Sprint 01 em andamento, provisionamento local testado; não concluída. Sprints 02–05 não iniciadas. Não existe CONCLUSAO.json.

Branch atual: `hermes/sprint-01-identidade-acessos`, criada de f354eb8 para preservar toda a fundação. Pedido específico de merge registrado na missão, mas restrição efetiva do executor impede merges; nenhum merge/commit direto em main ocorreu. PR da Sprint 01 deve ficar draft e explicitar dependência de #2. Confira HEAD/remoto/PR antes de retomar; não presumir commit por este texto.

Executor Hermes/openai-codex autenticado; supervisor externo único. Não iniciar outro coordenador. AGENTS contém frase histórica de somente documentação; atualização foi bloqueada pela proteção do executor e não foi contornada. Estado vigente está nas evidências/checkpoint.

## Último release saudável preservado

- SHA servido/validado `449ce3ccf941c73b34ac15a4754183c147f91aaa`.
- SHA-256 JAR `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`.
- Serviço nativo exclusivo, loopback :8088; PostgreSQL nativo :55432/rm_hml com roles segregadas, runtime sem DDL. Último PID verificado 41392.
- E2E20/20, zero falhas/skip/flaky, cinco projetos e screenshots revisados; mobile/tablet emulados. Startup falho/retorno real ao mesmo SHA/hash em59,918s, sem restoreDB/rede/serviços alheios.
- healthy.json aprova somente fundação. Sprint01/V2 NÃO implantada. Não confundir JAR do checkout com processo servido.

## Trabalho deste ciclo

Fundação: travas de retorno corrompido, listener ligado ao PID, inventário E2E obrigatório/hash, SHA inicial-final/checkout limpo e lock de build/deploy corrigidos após revisão independente e testes vermelhos. Build inicial falhou por JAVA_HOME na auditoria; correção/reexecução integral aprovadas.19testesPython+15backend na fundação, Angular/npm/OSV/CI aprovados.

Sprint01: migrations V2 public/tenant; serviço/repository/CLI privilegiados fora do runtime HTTP. Reserva durável, domínio único, BCrypt12, idempotência, migração do schema reservado, ativação atômica, auditoria e retomada. Runtime ignora schemas incompletos na validação global sem habilitar domínio incompleto. Provisionador só aceita dev/test, hml bloqueado até manutenção/backup.

Revisão independente encontrou migration global implícita no CLI antes da validação; teste vermelho demonstrou efeito indevido e correção removeu a migration global. Lock real exigido; diagnóstico sanitizado e causa preservada. Suíte final verify Maven em05:25:44UTC:34testes,0falhas/erros/skip, incluindo15provisionamento+4parser+15regressões; processo Java novo, concorrência e rollback PostgreSQL reais. Build-release identificado/OSV/CI do novo incremento ainda não executados/conferidos. Logs privados `overnight` listados na evidência.

## Próximo passo concreto

1. Conferir Git/refs/PRs e preservar qualquer alteração documental local. Verificar publicação do incremento Sprint01 e CI; corrigir antes de declarar PR pronta. Executar build-release completo identificado e auditoria.
2. Continuar Sprint01: sessões JWT/refresh/CSRF/revogação, identidade SaaS separada, convites/recuperação capturados, equipe/unidades/matriz e último Administrador concorrente; UI/API e negativos. Todas essas jornadas permanecem pendentes.
3. Implementar manutenção/backup/retorno compatível ANTES de deploy com migrations diferentes. Hml continua V1/449ce3c; rm_test foi migrado aV2. Não aplicar migrations V2 a hml para contornar trava.
4. Ampliar massa fictícia/perfis e ACESSO privado quando login real existir. Não inventar credenciais utilizáveis nem dizer que há produto completo.
5. Catálogo,pedidos,dinheiro,PWA,integrações externas,backup/restore completo,carga e matriz final T01–T28/X01–X15 pendentes. E01–E12/piloto separados. Não criar technical_complete=true.

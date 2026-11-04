# Checkpoint de execução

[Índice](README.md) · [Evidências do ciclo 2](evidencias/sprint-00-ciclo-2.md) · [Inventário integral](evidencias/cobertura.md)

## Estado vigente — 2026-11-04, ciclo 3 em execução

Sprint 00 em andamento, com baseline técnico validado, mas fechamento do PR/último incremento ainda pendente. Sprints 01–05 não iniciadas. Não declarar o projeto pronto. Não existe CONCLUSAO.json.

Branch: `hermes/sprint-00-fundacao`. Último commit publicado e conferido por `ls-remote`: `116aedd0ad25a19fadd4114afbae135d58506997`. PR #2 aberto, base `main`; nenhum merge realizado. Este checkpoint foi atualizado depois do commit e deve ser preservado como alteração local na retomada.

Executor: Hermes com provedor openai-codex e autenticação atual. Supervisor externo único; não iniciar outro. Registros privados sob o rótulo `overnight`, fora do Git. O limite efetivo desta chamada exigiu handoff; não foi conclusão do escopo.

## Release saudável preservado

- SHA servido/validado: `e72a8fece3ef9c03212d863b382c48ee11a58a68`.
- Hash do artefato: `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`.
- Serviço nativo exclusivo, loopback :8088; banco hml segregado. Último PID observado após ensaio: 32916; reconferir na retomada.
- Marcador privado `healthy.json` registra aprovação SOMENTE da fundação, não do produto completo. `validated.service` preserva a unidade de retorno.
- E2E: 15 aprovados, zero falhas/skip/flaky, nos cinco projetos; cinco screenshots inspecionados e CSS correto. API/PostgreSQL reais. Mobile/tablet emulados, não aparelhos físicos.
- Ensaio real de startup falho e retorno compatível: erro detectado, mesmo SHA/hash recuperado, PID alterado, 42,043 segundos. Banco não foi restaurado e serviços/rede alheios não foram alterados.
- `116aedd` NÃO foi implantado. Não confundir HEAD/build com o processo servido.

## Implementado e verificado

- Java 21/Maven privados; PostgreSQL nativo 16.15 em loopback, bancos dev/test/hml e roles owner/app segregados; instalações globais preservadas.
- Spring Boot 4.0.9 substitui 3.5.16, cujo gate OSV falhava. BOM oficial, namespaces Boot/Jackson adaptados, sem supressões artificiais de avisos.
- Migrador separado `--migrate-only`, identidade SQL efetiva/allowlist, advisory lock e registro por schema. Runtime não recebe credencial DDL e valida histórico/checksums/migrations pendentes antes do JPA.
- Deploy com staging/hash antes do migrador, lock, destino privado, fingerprint SQL e recusa de migrations diferentes sem procedimento de manutenção. Retorno exige baseline validado compatível; falha na recuperação para o serviço.
- Scripts de E2E vinculado a SHA/hash/PID, validação explícita após revisão visual e ensaio nativo de recuperação. Inventário mantém T01–T28/X01–X15 e atores ausentes explicitamente pendentes.
- Duas revisões independentes somente leitura realizadas; correções aplicadas para propriedades de erro, TOCTOU da cópia, compatibilidade de migrações e falha no retorno. Revisão adicional foi recusada pelo limite de subagentes; não foi simulada.

## Última execução de gates

Build completo de `116aedd` terminou em 2026-11-04 04:40:03 UTC:

- 15 testes backend aprovados, zero falhas/erros/ignorados, PostgreSQL real.
- 11 testes Python de travas aprovados. Esses testes determinísticos não substituem o ensaio nativo, executado separadamente.
- Angular build/typecheck e npm audit aprovados; OSV: 90 dependências empacotadas consultadas, zero achados na consulta.
- Links locais/padrões de segredo e diff conferidos antes do commit/push.
- Novo teste de checksum inicialmente falhou por pool de uma conexão insuficiente para o Flyway. Teste corrigido para duas (runtime usa quatro), com asserção específica de checksum mismatch, restauração do histórico em finally e validação posterior. Passou na regressão final; falha original preservada no log privado.

CI remoto: `116aedd` aprovado nos runs 41774279189/41774274332, conferido no ciclo 3. `e72a8fe` aprovado nos runs 41772833162/41772827761. `9197ffd` também passou CI, mas seu deploy foi rejeitado por health com grupos de probes; correção explícita desativou probes sem afrouxar o contrato. O build local não substitui CI.

Revisão independente do ciclo 3 encontrou quatro travas incompletas: retorno com marcador/JAR corrompido, listener não associado ao PID, cobertura parcial de E2E e HEAD mutável durante build. Correções e testes novos aplicados: 19 testes Python aprovados após falhas pertinentes registradas; verificador novo aprovado contra o baseline preservado. E2E agora exige quatro cenários em cinco projetos, checkout limpo e hash do relatório. Build segura lock e confere SHA inicial/final. Novo cenário de carregamento retarda a requisição sem fabricar resposta da API. Publicação/regressão desse incremento ainda pendentes neste checkpoint.

## Pendências reais e próximo trabalho

1. Conferir Git/refs/serviço/bancos contra este checkpoint; preservar a alteração documental local. Consultar CI e estado do PR #2 no SHA `116aedd`; corrigir se necessário.
2. Finalizar revisão do incremento de scripts/testes, publicar candidato identificado e reexecutar E2E/retorno pertinentes, preservando `e72a8fe` como último saudável até aprovação. Atualizar evidências para o SHA realmente servido.
3. Revisar todos os critérios da Sprint 00 com as evidências, atualizar checklist/documentos históricos ainda desatualizados e concluir PR somente se todos passarem. Não marcar concluído por haver shell, nem aprovar itens futuros. A missão privada registra o pedido vigente de PR por Sprint e merges após gates; nenhum merge foi executado neste ciclo.
4. Sprint 01 é o próximo trabalho de produto: provisionamento retomável, contas/sessões/autorização e matriz real. Contas fictícias completas ainda não existem; não inventar senhas ou jornada de login.
5. Antes da primeira migration diferente, implementar manutenção/backup/retorno compatível; deploy atual a recusa deliberadamente. Isso não é homologação de migration incompatível.
6. Catálogo, pedidos, finanças, provedores, PWA, backup/restore completo, carga e matriz final não implementados. Mercado Pago/e-mail sem sandbox/real; E01–E12 e piloto pendentes.

Não criar conclusão técnica artificial. Retomada deve avançar no trabalho real e manter separado baseline de homologação, código publicado e critérios ainda não executados.

# Sprint 01 — ciclo 9

[Checkpoint](../25_EXECUTION_STATUS.md) · [Cobertura](cobertura.md)

## Candidato herdado finalmente verificado

O build do commit `589ea43551727a95626cfe35bd8686da92a6ffcb` foi reconciliado com gate, JAR e XML: 77 testes backend aprovados, zero falhas/erros/skip. Hash SHA-256 do artefato: `9ad019a9f72b208e7a101cb2cb297b12fc203fae7ee2a7065e457aa5f991cc2c`.

Executados contra cópia imutável HTTPS em banco exclusivo rm_test:

- Identidade/acessos/unidades: 45 combinações, nove cenários S01-UI01–09 nos cinco projetos, todas aprovadas.
- Fundação: vinte combinações, quatro cenários nos cinco projetos, todas aprovadas.
- Agregação verificou unicidade/completude, zero retry/flaky/skip/erro, mesmo SHA/hash/PID antes e depois. Relatórios privados preservados.
- Revisadas capturas reais de login WebKit desktop e recortes mobile de acessos/unidades. Sem corte horizontal ou sobreposição observados nesses recortes; lista de cinquenta unidades produz rolagem vertical longa. Não equivale a inspeção de todas as capturas nem teste em aparelho físico.

A primeira tentativa do runner excedeu seu limite de prontidão de noventa segundos; startup efetivo levou aproximadamente 95 segundos. Nenhum cenário tinha começado. A execução seguinte aguardou o servidor já saudável e completou as duas suítes. Não ocultar essa tentativa nem tratá-la como falha funcional resolvida por retry de teste.

## Incremento novo: recuperação empresarial

API e Angular para solicitar/consumir código, sem enumeração síncrona, CSRF real, limites persistidos, senha BCrypt, invalidação dos demais códigos/sessões, auditoria e aviso transacionais. Outbox cifrada com chave exclusiva, captura privada idempotente, lease/retry/expiração e retenção técnica. Migrations V7/V8 aplicadas somente em rm_test. Não há provedor de e-mail real, cadastro/verificação/convites ou identidade SaaS nesta entrega.

TDD e revisão:

- Vermelho inicial contra o candidato herdado: solicitação retornava 403 em vez de 202, antes da implementação.
- Revisão independente apontou retenção de conteúdo em FALHOU, bloqueio da fila por ciphertext inválido e validade aferida antes de esperar lock.
- A primeira rodada de onze testes expôs dois desses defeitos e falha no próprio observador de lock: role owner não enxerga o wait_event de outra role. O teste aguardou indevidamente no encerramento do executor; uma consulta bloqueada da própria suíte foi cancelada após verificar banco/role/porta e bloqueador. Nenhum processo de homologação foi interrompido.
- Observador corrigido para pg_locks e ordem de fechamento segura. O vermelho isolado então comprovou o defeito real: código expirado durante espera retornava 204, esperado 422.
- Após correções, doze testes de recuperação/PostgreSQL e três testes de proteção/captura passaram: quinze aprovados, zero falhas/erros/skip. Rodada distinta do build herdado.
- Segunda revisão confirmou correções e encontrou conteúdo NULL ainda escapando do tratamento de corrupção. Novo vermelho reproduziu NullPointerException; corrigido para falha terminal sanitizada. Quatro testes de proteção/captura passaram na reexecução, zero falhas/erros/skip. Typecheck aplicação/E2E, diff e scanner documental/segredos passaram. Build integrado ainda é gate separado.

## Resultado final e gates ainda abertos

Commit `7818ba626cfa94aafa7015d835111d818c84579c` publicado, remoto e PR #3 draft relidos. Dois runs CI (`41813105884`, `41813113657`) conferidos com SHA exato e SUCCESS: 93 testes backend aprovados em cada execução, zero falhas/erros/skip; Angular/backend e auditorias aprovados. Não somar conjuntos repetidos.

O aviso de orçamento efetivo do executor impediu continuar a rodada local. Build local foi encerrado explicitamente pela ferramenta de processos; não aprovado, sem novo gate/hash confirmado. Nenhum candidato novo nem E2E S01-UI10–12 foi iniciado. A validação herdada permanece vinculada apenas ao 589ea43. Os registros finais são locais posteriores ao commit, sem novo push após o aviso.

### Estado anterior à confirmação da CI

Build identificado do incremento novo, CI e quinze combinações E2E S01-UI10–12 ainda pendentes nesta gravação. Cenários escritos cobrem recuperação capturada, código consumido, senha inválida, foco/teclado, offline e perda real da resposta de confirmação. Não somar aprovação do SHA herdado como aprovação da UI nova.

Homologação preserva o release de fundação `449ce3ccf941c73b34ac15a4754183c147f91aaa`, sem migration/deploy de identidade. Sprint 01 parcial e PR #3 draft; Sprint 02–05 e matriz completa T01–T28/X01–X15 permanecem abertas. Atualização de AGENTS.md foi bloqueada pelo mecanismo de proteção sem aprovação interativa; nenhuma tentativa alternativa de escrita foi feita. O guia/visão já registram a autorização específica vigente.

# Sprint 01 — incremento de provisionamento local

Data: 2026-11-04, ciclo 3. Branch `hermes/sprint-01-identidade-acessos`, baseada em `f354eb858382fd00a51a94ce06597e78e82e2f79` da fundação. Sprint em andamento, não aprovada integralmente. Incremento não implantado em homologação.

## Implementação exercitada

- Reserva transacional de empresa/domínio/plano/auditoria; schema interno derivado de UUID, sem nome SQL arbitrário do chamador.
- Plano durável com BCrypt custo 12, negado à role runtime; idempotência compara dados e senha sem armazenar senha em claro.
- Migração somente do schema reservado sob advisory lock compartilhado com migrador; exige posse efetiva do lock PostgreSQL.
- Unidade/Administrador/ativação/auditoria confirmados atomicamente. Falha SQL reverte cadastros e mantém reserva/diagnóstico para retomada.
- CLI local lê properties UTF-8 0600, recusa link, campo duplicado/desconhecido, tamanho indevido e entrada malformada. Saída não imprime senha. Não é endpoint HTTP de plataforma.
- Provisionador aceita somente dev/test; hml bloqueado até manutenção/backup de migrations comprovados. Nenhuma migration nova foi aplicada em hml.
- Runtime não valida schema ainda inexistente de empresa reservada, mas continua negando seu domínio e validando empresas ativas/suspensas.

## Testes reais

`bash scripts/with-env.sh test bash backend/mvnw -B -ntp -f backend/pom.xml verify` terminou com sucesso em 2026-11-04 05:25:44 UTC: 34 testes, zero falhas/erros/skip. XMLs Surefire agregados programaticamente: 15 ProvisionamentoTest, 4 ProvisionamentoCommandTest e 15 regressões da fundação.

Inclui duas tentativas simultâneas em conexões independentes, mesmo e-mail em empresas distintas, novo processo Java retomando reserva, CLI completo, payload divergente, domínio já reservado, runtime sem acesso ao plano, lock ausente, falha real de trigger durante ativação, rollback sem unidade parcial e recuperação posterior. Testes removem somente seus UUIDs/schemas em rm_test após conferir identidade SQL efetiva.

TDD registrado: classes ausentes antes da implementação; runtime falhava diante de schema reservado; comando inválido migrava outra empresa reservada (esperado zero schemas criados, observado um). Correções reexecutadas na regressão final. Revisão independente somente leitura identificou a migration global indevida no CLI; removida. Migration global permanece ação explícita de release. Diagnóstico preserva causa internamente e persiste código/SQLState sanitizados, sem payload.

Logs privados no registro `overnight`: `cycle3-provision-red.log`, `cycle3-provision-green.log`, `cycle3-partial-tenant-red.log`, `cycle3-provision-regression.log`, `cycle3-cli-red.log`, `cycle3-provision-final-tests.log`.

## Limites

Build-release identificado completo/OSV do novo commit e CI remoto deste incremento ainda pendentes no registro desta evidência. O verify Maven não os substitui. Último release saudável continua `449ce3ccf941c73b34ac15a4754183c147f91aaa`, validado apenas como fundação.

Não implementados: JWT/refresh/CSRF/login, verificação/recuperação/convites, operador SaaS autenticado, UI/APIs de provisionamento e suspensão, equipe/matriz efetiva/revogação e proteção concorrente do último Administrador. Tabelas de identidade/vínculos/política são base persistente, não prova dessas jornadas. T28 parcial; demais famílias e Sprints 02–05 permanecem pendentes. Sem conclusão técnica artificial.

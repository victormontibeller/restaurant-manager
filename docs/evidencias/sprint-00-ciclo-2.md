# Sprint 00 — evidências do ciclo 2

[Índice](../README.md) · [Cobertura](cobertura.md) · [Checkpoint](../25_EXECUTION_STATUS.md)

## Baseline realmente publicado

- SHA observado: `e72a8fece3ef9c03212d863b382c48ee11a58a68`.
- SHA-256 do JAR: `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`.
- Ambiente: homologação fictícia, PostgreSQL nativo exclusivo, bind loopback; sem produção, dados reais ou provedor externo.
- Build local: Angular/typecheck/npm audit, 14 testes Java com PostgreSQL real, nove testes Python de travas, OSV cobrindo 90 dependências empacotadas sem achados na consulta.
- CI do SHA: runs `41772833162` e `41772827761`, ambos SUCCESS, consultados pelo GitHub.
- PR #2 permanece na branch `hermes/sprint-00-fundacao`, base `main`.

## Navegadores e revisão

Em 2026-11-04 04:27 UTC, 15 testes Playwright aprovados; zero falhas, ignorados ou instáveis. Três cenários em Chromium desktop 1280, mobile 360 e tablet 768, Firefox desktop e WebKit desktop. API/PostgreSQL reais, sem substituição por mock. PID/SHA/hash conferidos antes e depois.

Cinco screenshots inspecionados: CSS aplicado, textos legíveis, sem sobreposição ou corte horizontal; botão com alvo mínimo 48 px comprovado por asserção. Mobile/tablet são emulação, não aparelhos físicos. Teclado, link de salto, foco e recuperação offline/online executados em todos os projetos.

Relatórios privados sob o rótulo `overnight`, diretório `e2e-e72a8fe`: HTML, JSON, screenshots e recibo `release-evidence.json`. Não há tokens nem dados reais nas evidências versionadas.

## Falhas encontradas e corrigidas

1. Gate do ciclo anterior recusou dependências Java. Migração de Boot 3.5.16 para 4.0.9 removeu os achados na consulta OSV, sem suprimir avisos. Revisão independente corrigiu também namespace de propriedades de erro.
2. Primeiro deploy de Boot 4 (`9197ffd`) foi rejeitado: health real incluía grupos de probes. Correção explícita mantém contrato mínimo; não foi afrouxado o verificador.
3. CSS anterior falhava sob CSP; teste de altura de botão passou após desativar inlining crítico no build Angular. CSP não foi relaxada para scripts inline.
4. Revisão independente do deploy apontou hash/cópia concorrente, migrations potencialmente incompatíveis e falha no próprio retorno. Staging é validado antes de executar o migrador; migrations diferentes são recusadas; retorno não verificável para o serviço.

## Migrações e recuperação

Migrador separado verifica banco/usuário/porta/endereço efetivos e mantém advisory lock durante public/template/tenants. Runtime contém somente credencial app, sem DDL, e valida histórico/checksums. Testes demonstraram rejeição de alvo, reaplicação, exclusão do segundo migrador e rollback de SQL falho com recuperação no banco exclusivo de teste.

Ensaio nativo `exercise-recovery.py` executado: startup do serviço próprio propositalmente falhou, o health foi rejeitado e a mesma função de retorno do deploy restaurou o SHA/hash acima. PID mudou de 31600 para 32916; retorno observado em 42,043 segundos. Marcador saudável permaneceu intacto. Não houve restore de banco nem alteração de rede/serviços alheios.

## Limites

Este baseline valida a fundação, não as jornadas do restaurante. Contas, catálogo, pedidos, pagamentos, jobs, mídia, PWA e matriz completa seguem não implementados. Integração Mercado Pago/e-mail não foi homologada em sandbox/real. Migrations diferentes ainda exigem implementar e ensaiar manutenção/backup; o deploy atual as recusa de forma segura. Backup/restore completo, carga e E01–E12 permanecem para as etapas correspondentes. Resultado parcial não encerra T01–T28/X01–X15.

Ampliações posteriores de testes/scripts neste ciclo devem ter seus comandos/resultados registrados no checkpoint e não são inferidas deste baseline.

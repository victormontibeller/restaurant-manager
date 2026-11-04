# Sprint 00 — fechamento técnico da fundação

Data: 2026-11-04. Release observado `449ce3ccf941c73b34ac15a4754183c147f91aaa`, artefato SHA-256 `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`. PR #2 continua aberto; fechamento técnico não significa merge nem produto pronto.

## Execução real

- `scripts/build-release.sh`: 15 testes backend com PostgreSQL real, zero falhas/erros/skip; 19 testes de travas Python; Angular build/typecheck, npm audit e auditoria OSV do JAR aprovados. CI do release aprovado nos runs 41776045898 e 41776040928.
- Primeiro build do ciclo falhou na auditoria porque Maven não recebia a toolchain privada. Correção carrega o mesmo ambiente isolado nessa etapa e limita workers/memória Angular. Reexecução integral aprovada; log original preservado.
- `scripts/deploy-hml.py`: migrador separado, health, listener loopback pertencente ao PID, SHA/hash conferidos; runtime sem credencial DDL.
- `scripts/e2e-hml.py`: 20 aprovados, zero falhas/skip/flaky, quatro cenários em Chromium desktop/mobile/tablet e Firefox/WebKit desktop. UI01: shell e API/banco reais; UI02: teclado/offline/retomada; UI03: carregamento com requisição real retardada, sem resposta fabricada; API01: domínio inválido, rota privada e health mínimo.
- Cinco screenshots inspecionados: CSS, texto legível, estado conectado, layout sem cortes e limitações da versão explícitas. Mobile/tablet são emulados, não aparelhos físicos.
- `scripts/validate-hml.py`: baseline aprovado somente no escopo fundação, com inventário e hash do relatório.
- `scripts/exercise-recovery.py`: startup falho real detectado, PID 40219 → 41392, mesmo SHA/hash recuperado em 59,918 segundos. Banco não restaurado. Rede/serviços alheios preservados.

## Revisão e correções

Revisor independente somente leitura identificou retorno que escapava para SHA nulo/JAR corrompido, health sem vínculo ao socket do PID, promoção por contagem E2E parcial e SHA de build mutável. Reproduções vermelhas registradas antes das correções; regressão aprovada. Teste de listener usa socket TCP real e nega processo alheio. Build/deploy compartilham lock; build/E2E verificam checkout limpo e SHA inicial/final. Relatório verde parcial, repetido, esperado-falhar ou com retry não promove o baseline.

## Rastreabilidade dos critérios da Sprint 00

| Critério | Evidência |
| --- | --- |
| Preflight, versões e retomada | ADR 0001, ciclos 1–3, identidade/refs reconferidos antes de mutações |
| Estrutura, configuração, erros e CI | Build local completo e dois runs CI; placeholders/segredos/links conferidos |
| PostgreSQL e migrations | Bancos/roles exclusivos, testes de identidade, reaplicação, checksum/SQL falho e lock concorrente |
| Pool e transações | Testes simultâneos A/B, rollback/reuso, reset falho aborta conexão |
| Jobs/idempotência/eventos | Desenho registrado no ADR; implementação adiada aos casos de uso, sem declarar jobs existentes |
| SDK e ingresso | POM/sources oficiais SDK 3.7.0 inspecionados; OAuth/sandbox e domínio/TLS externos explicitamente pendentes |
| Shell, carregamento, teclado/erro e mobile | Quatro cenários × cinco projetos, revisão visual |
| Release e retorno compatível | Publicação identificada e ensaio nativo acima; diferenças de migrations continuam recusadas |

Registros privados: rótulo `overnight`, arquivos `cycle3-foundation-build.log`, `cycle3-foundation-build-corrected.log`, `cycle3-guards-red.log`, `cycle3-evidence-red.log`, diretórios `e2e-449ce3c` e `recovery-449ce3c`. Não publicar screenshots/sessões ou caminhos privados desnecessários.

## Não aprovado por esta evidência

Contas/perfis e provisionamento de produto da Sprint 01, catálogo, pedidos, dinheiro, PWA, integrações externas, manutenção com migration diferente, backup/restore completo e carga. O [inventário integral](cobertura.md) mantém T01–T28/X01–X15 pendentes/parciais conforme a implementação; 20 testes da fundação não encerram essas famílias. E01–E12/piloto real permanecem pendentes.

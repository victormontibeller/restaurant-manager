# Revisão final do PR #9 — preparação local da Sprint 5

Revisão autorizada em 2026-11-09, na branch
`codex/sprint-05-preparacao-homologacao`, sobre o head inicial
`26084bf363cd615435fc6c0fd28ca30bc2eefd46` e base `main` em `8888234`.
O [PR #9](https://github.com/victormontibeller/restaurant-manager/pull/9)
permanece limitado à preparação local. Merge e produção não foram executados.

## Achados corrigidos

| Achado | Correção e regressão |
| --- | --- |
| Manifesto verificava apenas um subconjunto dos arquivos atuais; uma fonte removida ou mudança em configuração/arquivo público podia passar com JAR antigo | Comparação exata de conjunto e hashes de 517 fontes/configurações/assets; testes recusam arquivos novos, removidos e alterações nos inputs de build |
| Inventário por schemas existentes podia omitir empresa ativa/suspensa apontando schema ausente | Cobertura global do registro de empresas antes de cada inventário integral; negativo com outros tenants válidos; exceção explícita somente no snapshot parcial da mídia |
| Caminho de saída era concatenado nas opções de `pg_ctl`, interpretadas por shell | Recusa espaços/metacaracteres antes de qualquer escrita; regressões de espaços, separadores, substituição de comando, vírgula, aspas e nova linha |
| Checkpoint ainda descrevia a reexecução Linux/CI anterior como pendente | Registro da CI #184 no head inicial, preservando falhas históricas no Mac e separando CI da implantação Linux |

Os trechos corrigidos passaram por segunda revisão independente. Nenhum código
da aplicação, contrato HTTP ou migration foi alterado. Os dois arquivos locais
preexistentes mantêm seus hashes e continuam fora do commit, conforme a
[evidência inicial](sprint-05-preparacao-local-2026-11-09.md).

## Validação desta revisão

**50 testes focados passaram**, sem falhas, erros ou skips: 12 do ensaio local,
13 de recuperação e 25 guardas de release. Seleção e `TMPDIR` seguem o comando
da evidência inicial; o método real de listener `/proc` não é executável no Mac
e pertence à suíte integral da CI Linux.

A guarda de cobertura também foi exercitada no PostgreSQL real, em transação
somente leitura: aceitou 271 empresas ativas/suspensas nos 305 schemas
incluindo `public` e recusou a lista com um tenant omitido. Sem mutação da origem.

A [CI Fundação #184](https://github.com/victormontibeller/restaurant-manager/actions/runs/42667236141)
foi reconferida no head inicial: 173 testes dos scripts, 435 backend com zero
falhas/erros/skips, checks Angular e auditorias. Essa execução é o baseline;
a [CI do head final do PR](https://github.com/victormontibeller/restaurant-manager/pull/9/checks)
deve aprovar também as correções antes de retirar o rascunho. O resultado e o
SHA exatos ficam na descrição do PR após a execução; não herdar o baseline.

### Ensaio integrado após as correções

**Tentativa 08 aprovada**, de 17:12:34 a 17:19:38 (America/Sao_Paulo), com
PostgreSQL 18.4 e Java 21 no Mac. Mesmo JAR
`6afe9354cac1c402672a0dcedab0be97098650d3f45f5b67bb4fbf96601861de`,
agora com 517 entradas do manifesto verificadas integralmente.

| Prova | Resultado |
| --- | --- |
| Backup e restore | 31 dumps no mesmo snapshot, 59.998.759 bytes; 17.467 tabelas/146.623 linhas, 271 empresas ativas/suspensas e 304 schemas de tenant, além de `public`; conteúdo e metadados iguais |
| Tempos | Backup/inventário 152,950 s; restore/conferência 152,308 s; segundo roundtrip de mídia 33,854 s |
| Mídia e configuração | 104 imagens em três empresas, zero divergências/órfãos; dois positivos HTTP e dois negativos entre tenants; pacote efêmero recuperado por hash |
| Carga | 625 requisições em 20,594 s, zero erros; 30,35 req/s; p50 23,170 ms, p95 37,782 ms, p99 94,305 ms |
| Recursos | CPU agregada máxima 247,8%; RSS somado 1.233.868 KiB; banco 819.877.567 bytes; medidas locais, sem inferir capacidade do Linux |
| Recuperação | PIDs próprios 910 → 972; indisponibilidade e rollback da conexão interrompida comprovados; mesma intenção retornou um pedido cancelado, zero recebimentos e três eventos únicos de histórico |
| Prazo e limpeza | Restart + job em 27,995 s; atraso sintético 23,716815 s; cleanup sem erros, portas 8090/55433 livres e cluster próprio parado |

O snapshot até a primeira API pronta levou 370,159 s; não é meta de RPO/RTO.
A resposta inicial do pedido foi recebida e descartada pelo harness; não houve
falha de pacote nem operação financeira externa. As limitações de RSS, pool,
chaves originais e carga curta continuam as da evidência inicial.

O recibo registra `26084bf` como HEAD existente ao iniciar e os hashes exatos
dos módulos corrigidos ainda sem commit naquele instante. Esses hashes foram
conferidos novamente após a execução e correspondem ao código entregue nesta
revisão; o JAR e as fontes da aplicação permaneceram iguais. SHA-256 do recibo
`result.json`: `d5c1b28d606cef7f41770920ee23ceb9155793bce3cf9d815b883ff51a88b150`.
SHA-256 de `load.json`:
`c45a1c54055ba79b44bebe934dcbda2c44f93ce4762cd84d120fa22f4c453a34`.
Artefatos, dumps, configuração e logs ficam privados sob o rótulo
`sprint05-revisao-20261109-6afe9354cac1`.

Demonstração e PostgreSQL originais preservados nos PIDs 32641/59175.
Verificação documental: 831 arquivos, links/padrões de segredo e seis âncoras
locais conferidos; compilação Python e `git diff --check` passaram.

## Limites preservados

A tentativa 07 continua evidência histórica do harness inicial; suas medições
não são atribuídas ao código corrigido. A reexecução integrada desta revisão
usa diretório novo e recibo próprio.

Implantação e matriz completa no Linux, Mercado Pago sandbox, domínio/HTTPS
externo, e-mail real, backup operacional, aparelhos/tecnologia assistiva e
piloto permanecem pendentes. Responsáveis, treinamento, serviços externos e
aceite de operação continuam condicionando o piloto. Os critérios de fechamento
da [Sprint 5](../19_SPRINT_05.md) não foram marcados como concluídos.

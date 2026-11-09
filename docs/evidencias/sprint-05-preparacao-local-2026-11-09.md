# Sprint 5 — preparação local de homologação

## Escopo e identificação

Preparação autorizada em 2026-11-09 na branch
`codex/sprint-05-preparacao-homologacao`, partindo da `main` integrada em
`8888234602d6c2fbbc596a6180e0d2f7349d56c6` (PR #8). A atualização pendente do
checkpoint foi levada à branch, preservando as seções históricas.
Os dois arquivos não versionados preexistentes permanecem fora da entrega.

Ambiente: Mac, PostgreSQL 18.4/Homebrew, Java 21 local; banco fictício exclusivo
`rm_test`. Nenhum deploy Linux, sandbox Mercado Pago, e-mail real ou produção.
O JAR local da Sprint 4 foi reutilizado por hash:
`6afe9354cac1c402672a0dcedab0be97098650d3f45f5b67bb4fbf96601861de`.
O manifesto do build local confere 507 fontes/configurações de aplicação com
este checkout. Isso identifica a aplicação ensaiada; não é build de um novo
release de homologação nem reaproveitamento da aprovação histórica dos testes.

## Preparação realizada

- Roadmap, índice, Sprint 5, visão e guia de execução reconciliados com o escopo local.
- [Runbook](../22_PRODUCTION_RUNBOOK.md#ensaio-local-sprint-5) atualizado com comando,
  limites do ensaio e revisão dos procedimentos de instalação/configuração/build/deploy/retorno.
- `bootstrap-database.py` recusa Mac antes de escrever configuração de Linux/systemd.
- Configuração de release permite o grupo opcional de pagamentos de forma explícita,
  exige grupo completo/chave de 32 bytes/TLS/porta válida e mantém owner e override
  de provedor fictício fora do runtime. Essa prova de contrato não valida sandbox.
- [Ensaio local](../../scripts/local_rehearsal.py) e
  [perfil de carga](../../scripts/profiles/sprint05-local.json) versionados.

## Falhas e reexecuções

Tentativas são preservadas em diretórios privados independentes, identificados
por `rm-s05-ensaioNN`. Nenhuma falha é somada como aprovação final.

| Tentativa | Resultado observado | Correção / tratamento |
| --- | --- | --- |
| 01 | Inventário esgotou locks na origem, sem mutação de dados | Savepoints liberam locks de leitura por tabela no mesmo snapshot |
| 02 | Resposta agregada de metadados excedeu recursos de comunicação (`No buffer space available`); sessão desconectada | Inventário e metadados por schema, dumps em lotes de dez, mesmo snapshot; servidor permaneceu saudável |
| 03 | Backup concluído; restore recusou `CREATE SCHEMA public` porque o schema já existia | Tratar explicitamente a entrada de schema no restore seletivo |
| 04 | Todas as linhas restauradas iguais; comparação detectou ACL padrão de public ausente e casts equivalentes em constraints MIME/índices | Preservar public do template e sua ACL; excluir somente sua criação da lista de restore; normalizar exclusivamente casts de arrays literais varchar/text, sem ignorar permissões ou alterar valores/operadores |
| 05 | Comparação integral aprovada: 17.467 tabelas, 146.623 linhas, 271 empresas ativas/suspensas entre 304 schemas; origem sem imagens em duas empresas | Acrescentar PNGs fictícios somente no clone e ensaiar segundo backup/restore desses dois schemas, com escritores parados e comparação dos demais schemas |
| 06 | Banco, segundo roundtrip de mídia (104 imagens em três empresas) e pacote de configuração conferidos; startup recusou captura sob o diretório de execução | Separar diretório de trabalho do runtime da captura; diagnósticos privados preservam o recibo original de falha, sem aprovar o ensaio completo |
| Diagnóstico da 06 | Captura corrigida; a guarda inicialmente interpretou o descritor `f...` de `lsof -Fpn` como divergência; após correção, HTTP/mídia, 641 requisições e retomada passaram | Exigir PID/endereço corretos, aceitando o campo de descritor do lsof; repetir tudo na tentativa 07, sem usar o diagnóstico como aprovação integrada |
| 07 | Todos os passos e cleanup aprovados na mesma execução | Resultado integrado detalhado abaixo; código do harness congelado por hashes |

As conexões de origem foram somente leitura. Não houve restart de PostgreSQL
nem alteração de parâmetros globais. Cleanup das sete tentativas foi confirmado;
a demonstração e os serviços preexistentes foram preservados.

## Resultados locais

**Tentativa 07 aprovada**, 2026-11-09, de 14:31:13 a 14:37:06 (America/Sao_Paulo).
JAR idêntico durante toda a execução, PIDs próprios 90749 → 90800, listeners
127.0.0.1:8090 ligados aos PIDs pelo lsof; cluster privado em 55433. Aplicação
recebe somente a role runtime, sem credencial de migration. Não houve retries
de casos de carga nem skips; a indisponibilidade anterior ao startup é sondada
por health com prazo limitado.

| Prova | Resultado observado |
| --- | --- |
| Backup | 31 arquivos no mesmo snapshot, 59.998.759 bytes; inventário + dump em 112,112 s; ponto 14:31:13,856775 −03 |
| Restore do banco | 17.467 tabelas, 146.623 linhas, 304 schemas de tenant e 271 empresas ativas/suspensas; conteúdo e metadados iguais; restore + conferência em 129,998 s |
| Massa adicional de mídia | Dois PNGs fictícios criados apenas no clone; segundo backup/restore de seus schemas com escritores parados, 31,473 s; comparação integral confirmou os demais schemas inalterados |
| Mídia recuperada | 104 imagens em três empresas, zero hashes/tamanhos inválidos e zero referências órfãs; duas leituras HTTP conferidas byte a byte e dois negativos entre empresas com 404 |
| Configuração | Pacote novo JWT/comunicação/senha do clone/PKCS12 copiado, removido e recuperado por backup com hashes iguais; HTTPS com confiança explícita e hostname/IP conferidos |
| Carga | 20,333 s observados; quatro clientes, pausa de 100 ms e proporção 3:1 catálogo/carrinho; 635 requisições, zero erros, 31,23 req/s; p50 19,377 ms / p95 29,028 ms / p99 38,461 ms |
| Recursos na carga | Pico de CPU agregado 209,4%; RSS somado 1.202.656 KiB; quatro conexões runtime observadas, no máximo duas ativas nas amostras de 1 s; banco 819.861.183 bytes; espaço livre no volume 151.219.027.968 bytes |
| Falha/retomada | SIGKILL só na API própria; indisponibilidade comprovada; mesma intenção reenviada após restart; um pedido, `CANCELADO`, zero recebimentos; `PEDIDO_ENVIADO`, `ACEITE_ATRASADO` e `PEDIDO_EXPIRADO` uma vez cada |
| Job e transação | Restart + retomada em 24,840 s; atraso medido do job 20,712390 s após prazo fictício de 4 s; conexão interrompida com transação aberta deixou zero linhas confirmadas |
| Cleanup e preservação | API e cluster temporários parados, portas 8090/55433 livres; demonstração HTTPS saudável no mesmo PID 32641; os dois arquivos locais mantiveram os hashes iniciais |

O RSS somado inclui páginas compartilhadas e não equivale à memória física
exclusiva. A carga é fechada, curta e com pausa, sem promessa de SLA ou capacidade.
Pool é observado por conexões PostgreSQL, sem telemetria interna de espera do
Hikari; o job é medido na recuperação, separado da carga com workers desligados.

O cenário levou 299,397 s do ponto do snapshot à primeira API pronta, incluindo
backup, restauração, massa adicional e startup. Isso **não é meta operacional
de RPO/RTO**. Transações posteriores ao snapshot não pertencem ao ponto restaurado;
não houve contagem de perdas de operação real nem reconciliação de provedor.
As chaves originais, tokens e mensagens cifradas anteriores ao backup não foram
recuperados. A resposta inicial do pedido foi recebida e descartada pelo harness;
não houve perda de pacote injetada. Dinheiro online e devoluções externas não
participaram deste ensaio presencial.

SHA-256 de `result.json`:
`25b41c1a7c28535128e793c1ac2ae79d26fe4fea3e179c20455f48619e83e148`.
SHA-256 de `load.json`:
`94412772eaf9594065718891c9f8345c48403fbde2e5323ea1f082e723e3d30b`.
Os recibos contêm hashes dos 31 dumps, do segundo backup de mídia, do perfil e
dos três módulos do harness; estes conferiram com os arquivos finais do checkout.
Relatórios detalhados, configuração e dumps permanecem privados, sob o rótulo
`sprint05-20261109-6afe9354cac1`; não são publicados no Git.

**43 testes focados aprovados**, sem skips: oito guardas locais, dez de
backup/inventário e 25 guardas de release (o probe real de listener `/proc`
continua separado para Linux). Comando reproduzível: `PYTHONPATH=scripts python3
-m unittest test_local_rehearsal test_database_recovery` e seleção dos métodos
de `ReleaseGuardsTest` exceto `test_socket_real_exige_proprietario_do_processo`,
com `TMPDIR` privado fora do checkout e sem ancestrais graváveis por terceiros.

A execução exploratória anterior da suíte geral (`python3 -m unittest discover
-s scripts -p 'test_*.py'`) executou 171 testes e registrou 15 erros em dez métodos,
incluindo subcasos. Todos dependem de `/proc` na coordenação de build/fila,
smoke, provisionamento ou listener. A suíte geral não foi marcada como aprovada
nem recebeu skips para ficar verde. Reexecutá-la integralmente no Linux/CI;
testes novos posteriores à exploração estão cobertos na seleção focada.

`check-repository.py`: 830 arquivos conferidos, links locais/padrões de segredo
aprovados; 13 âncoras locais das alterações conferidas separadamente.
`git diff --check` e compilação Python dos scripts alterados aprovados.
Nenhum código de aplicação, contrato HTTP ou migration foi alterado; as suítes
históricas da Sprint 4 não são apresentadas como reexecutadas neste incremento.

## Dependências e critérios ainda pendentes

| Etapa | O que falta | Referência |
| --- | --- | --- |
| Linux | Inventário atual, checkout limpo, ferramentas/serviços, build identificado, manutenção/migrações compatíveis, deploy e retorno do release integrado; CPU/memória/disco/pool/jobs no host real | E03; [runbook](../22_PRODUCTION_RUNBOOK.md#ensaio-local-sprint-5) |
| Matriz de homologação | Todas as telas/jornadas/perfis/unidades, positivos e negativos UI/API, concorrência, navegadores/mobile e relatório ligado ao SHA servido; gate de promoção integrado | [Estratégia](../26_TEST_STRATEGY.md) |
| Mercado Pago sandbox | Contas/credenciais de teste, OAuth, Checkout Pro/Orders API, callbacks/webhooks públicos, reconciliação e devolução no provedor | P08, E02/E04; [integrações](../21_INTEGRATIONS.md) |
| Domínio/HTTPS | DNS/ingresso, proxy, certificado e renovação, cookies/callbacks e PWA segura no destino | E01–E03 |
| E-mail real | Provedor/remetente autorizado, adaptação de envio, autenticação/entrega/bounces/retry; captura local não encerra isso | E05 |
| Backup operacional | Destino externo, criptografia, retenção, agendamento, alertas, responsáveis e metas acordadas de RPO/RTO; recuperação das chaves originais e reconciliação externa | E07/E11 |
| Recuperação adicional | Manutenção/migração incompatível e deploy falho no release Linux; reboot/perda global de rede só em ambiente dedicado ou janela autorizada | Sprint 5; X15 |
| Piloto real | Responsáveis nomeados, treinamento/aparelhos reais, catálogo/horários, fiscal, privacidade, suporte, contingência e aceite do início | E01–E12; [piloto](../23_PILOT_IMPLEMENTATION.md) |

Não houve matriz final de homologação, teste de aparelho físico/leitor de tela,
pagamento real ou abertura de piloto. Os critérios de fechamento da
[Sprint 5](../19_SPRINT_05.md) permanecem desmarcados.

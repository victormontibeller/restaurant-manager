# Sprint 01 — Tenant, autenticação e acessos

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** implementação integrada em `main` pelo PR #3 (`b50b9d1`). Evidências de homologação abaixo pertencem ao candidato histórico; correções da revisão no Mac exigem validação própria. Não representa conclusão do produto nem aprovação do piloto.

[Índice da documentação](README.md)

**Status:** PR #3 integrado pelo proprietário em 2026-11-06 às 11:17 (Brasília),
confirmado no GitHub e na ancestralidade de `main` (`b50b9d1`). Revisão pré-Sprint 2
em branch dedicada no Mac. Homologação histórica aceita no artefato95d278e:175 testes backend e285
combinações únicas de navegador, sem falha/erro/skip/retry/flaky. Manutenção,
troca composta, contas preservadas e baseline foram conferidos por leitura.
Os cinco entregáveis e sete critérios abaixo têm evidências; marcar esses itens
não transfere a aprovação para correções posteriores, setup Mac, Sprints02–05 ou piloto.
[Evidência final35](evidencias/sprint-01-retomada-ciclo-35.md) e
[handoff Mac](27_HANDOFF_CODEX_MAC.md). A [revisão posterior ao merge](evidencias/revisao-pre-sprint-02-2026-11-06.md) registra correções e novas verificações locais.

Há identidade empresarial e SaaS, convites/verificação/recuperação,
matriz/equipe/unidades, eventos cadastrais, exportação mínima e provisionamento
assistido. Os registros abaixo são históricos; o estado vigente é o acima.

Atualização final ciclo34: matriz32 aprovada em215pares únicos do JAR95,
sem falha/skip/retry/flaky, fontes/hashes/resultados reabertos e candidato
recolhido.56capturas-alvo/complementos/adicionais vinculadas com limites
explícitos. Manutenção95 NÃO iniciou: preflight do coordenador chamou helper
restrito a test/hml com dev e foi recusado. Corrigir apenas essa chamada,
sem ampliar guardas nem repetir build/matriz. Troca, smokes e aceitação ainda
pendentes; sete critérios não encerrados. [Evidência34](evidencias/sprint-01-retomada-ciclo-34.md).

Histórico ciclo33: build95 aprovado,24XML/175backend sem falha/erro/skip.
Worker32 aprovou UI18×5 e identidade45,50pares únicos conferidos; eventos em
execução.32capturas95 inspecionadas e vinculadas, revisão integral ainda pendente.
Composição restrita login+frontend implementada/testada/revisada e conferida
nos JARs reais; não é troca nativa nem aprovação da Sprint. Manutenção,
restante da matriz/visual95, smokes e aceitação continuam pendentes.
[Evidência33](evidencias/sprint-01-retomada-ciclo-33.md).

Atualização ciclo32: revisão dos sete critérios identificou erro sem associação
ao campo. Publicado95d278e, ambos checksCI aprovados. Matriz31 terminou com215
pares únicos conferidos, mas pertence ao JAR5cce633; build novo95 está ativo e
sem gate final observado. Worker32 preparado, NÃO iniciado. Correção Angular
com vermelho/verde cobre códigos públicos e senhas de reautenticação;
probes nos três motores e typecheck passaram. Não promover candidato
intermediário. [Evidência32](evidencias/sprint-01-retomada-ciclo-32.md).

Registro inicial ciclo32: revisão dos sete critérios identificou erro sem associação
ao campo. Correção Angular com vermelho/verde cobre códigos públicos e senhas
de reautenticação, sem alterar backend/timeouts. Probes nos três motores e
typecheck passaram; E2E ampliados e novo artefato ainda pendentes. Matriz31
preservada, mas não aprova o Angular posterior. Não promover candidato
intermediário. [Evidência32](evidencias/sprint-01-retomada-ciclo-32.md).

Atualização ciclo31: consulta de login5cce633 interpretada no startup, com
vermelho/verde e quatro partidas frias UI18 aprovadas. Build nativo conferido:
24XML/175backend sem falha/erro/skip. Matriz nova em execução,50pares únicos
conferidos; não transferir os285 do JAR anterior. Opt-in de atualização binária
delimitada implementado/testado, ainda sem execução nativa. Manutenção,
smokes/aceitação e sete critérios permanecem abertos até consolidação.
[Evidência31](evidencias/sprint-01-retomada-ciclo-31.md).

A homologação
serve o candidato97d75b0 desde o ciclo28, sem promoção do baseline449ce3c. A matriz6cd8a86 passou
215 combinações, mas sua exportação foi reprovada visualmente por sucesso antigo
após nova falha. Não promover esse artefato nem transferir suas provas ao Angular
corrigido. A correção6f623bd foi consolidada no build97d75b0, aprovado com174
testes backend sem falha/erro/skip. A matriz26 terminou com215combinações
aprovadas no novo JAR. Exportação corrigida foi inspecionada mobile/desktop;
ajuste do enquadramento de convites mostrou o perfil inteiro em Chromium, mas
o reteste27 falhou emFirefox/WebKit por esperas HTTP/orçamento global. Não
aprovar a rodada nem ampliar timeout sem diagnóstico. O reteste28 instrumentado
passou as cinco combinações no MESMO JAR/fonte, sem reconstruir nem repetir as
outras famílias. A instabilidade anterior continua explicitamente pendente.
[Defeito anterior](evidencias/sprint-01-retomada-ciclo-25.md).
O ensaio de manutenção97 passou no ciclo28, com clone/retorno e verificações
reais de aplicação. A troca do frontend foi conferida, nove contas empresariais
foram revalidadas por API e a fundação hml passou20combinações. Jornada assistida
hml executada e aprovada no ciclo28, com read-back independente e reconciliação
sem reexecutar Java. Smoke das dez identidades passou as50combinações;
consolidação conferiu285pares únicos no mesmo JAR, mas mantém o gate bloqueado
pela instabilidade27. Aceitação permanece pendente. A revisão visual
materializada contém26capturas principais/20complementos, sem aprovar a
instabilidade. [Evidência28](evidencias/sprint-01-retomada-ciclo-28.md). Estado atual, resultados e
limites no [checkpoint](25_EXECUTION_STATUS.md).

No ciclo29, a revisão confirmou os mecanismos imediatos das falhas27:
aborto HTTP em Firefox e orçamento de jornada consumido em WebKit. Diagnóstico
instrumentado no mesmo JAR passou nos dois motores, sem demonstrar correção da
instabilidade. Os tempos absolutos JFR divergiram do término do processo; a
correlação por requisição foi invalidada, não usada para aprovar o candidato.
O consolidador agora recusa de fato achados abertos/autorização falsa, antes de
acessar o runtime; regressões e preflight real exercitados. Nenhuma promoção.
[Evidência29](evidencias/sprint-01-retomada-ciclo-29.md) e
[passagem Mac em preparação](27_HANDOFF_CODEX_MAC.md).

Itens compostos permanecem abertos. A retomada ciclo 4 acrescenta solicitação
HTTP/UI, consulta e retomada de provisionamento, com worker CLI separado por UUID.
O despacho automático por lote existe para dev/test; em hml, a operação segue
o fluxo assistido da [fonte de tenancy](06_MULTI_TENANT.md#despacho-assistido-por-uuid--ciclo-15),
cujo ensaio integrado passou no ciclo28. Não há timer automático hml instalado.
[Evidência](evidencias/sprint-01-retomada-ciclo-4.md).
A retomada ciclo 3 acrescenta suspensão e
reativação comercial versionadas na API/UI, em validação; não implementa pedidos
nem libera empresa incompleta. [Evidência](evidencias/sprint-01-retomada-ciclo-3.md).
A retomada ciclo 2 acrescenta identidade SaaS
e consulta de metadados empresariais em validação, sem provisionamento/suspensão
HTTP ou impersonação. Verificação de funcionários preexistentes passou nos cinco
projetos no candidato herdado. [Evidências atuais](evidencias/sprint-01-retomada-ciclo-2.md).
O primeiro incremento implementa reserva durável, domínio único, migração de schema
reservado, administrador/unidade e ativação atômica, com retomada por novo processo.
Não é provisionamento pela UI. [Evidências](evidencias/sprint-01-ciclo-3.md).

## Entregáveis

Retomada ciclo 5 acrescenta acompanhamento cadastral por unidade com persistência
e polling autenticado, em validação. Revogação/projeção deste caso não aprova
eventos de pedidos futuros nem encerra o gate integrado. [Evidência](evidencias/sprint-01-retomada-ciclo-5.md).

- [x] Registro de domínio/empresa, provisionamento retomável e migrações por schema.
- [x] Identidade empresarial/plataforma separada, JWT, refresh/revogação, convite e recuperação conforme P04.
- [x] Unidades, funcionários, perfis fixos, matriz com versão/auditoria e ações exclusivas do Administrador.
- [x] Política central de autorização e projeções de dados por função; escopo de unidade em consultas, mutações e eventos cadastrais.
- [x] Estado operacional da empresa e suspensão conforme P11, preservando reconciliação do provisionamento. Operações de pedidos/pagamentos ainda não existem.

## Dependências

Sprint 0 integrada. P04/P11 e política de sessões foram exercitadas no escopo
fictício implementado; não são homologação de cobrança SaaS nem de comunicação
externa. Captura local atende testes de e-mail; uso real exige provedor e domínio
do [registro do piloto](23_PILOT_IMPLEMENTATION.md#registro-externo).

## Critérios de aceite

### Rastreabilidade para o fechamento

Esta tabela localiza as provas. No ciclo35, os XML/JSON/hash/cobertura do
candidato95 foram reabertos e o gate integrado confirmou também o runtime de
homologação; o relato final vincula essas execuções. Nomes de métodos sozinhos
não constituem evidência, e esta aprovação não se transfere a código posterior.

| Critério abaixo | Suítes e jornadas correspondentes |
| --- | --- |
| Isolamento de tenant/unidade, escrita, exportação e eventos | AcessosTest, IdentidadeTest; S01-UI33–40/UI42–43 |
| Contexto após erro/cancelamento/job e falha fechada | FundacaoTest, PoolIsolationTest, TenantConnectionFailureTest, RetencaoIdentidadeJobTest |
| Revogação de ação/vínculo com JWT válido | AcessosTest; S01-UI33/UI35–40/UI43 |
| Refresh/login/recuperação/logout, cookies/CSRF e quotas | IdentidadeTest, AcessosTest (login simultâneo), PlataformaTest, RecuperacaoTest, CadastroClienteTest, ConvitesTest, VerificacaoEmailTest; S01-UI01–03/UI10–25 |
| Matriz concorrente e último Administrador | AcessosTest; S01-UI04/UI35 |
| Provisionamento interrompido/migrations | ProvisionamentoTest, SolicitacaoProvisionamentoTest, MigrationBoundaryTest; S01-UI29–31 e ensaio assistido hml |
| Mobile, erros por campo e foco | S01-UI02/UI04/UI11/UI14/UI19/UI21 e revisão visual mobile/desktop; probes isolados não substituem E2E |

Persistir auditoria de acessos não entrega sua consulta UI/API. A superfície
T22 continua pendente no [inventário](evidencias/cobertura.md), assim como as
jornadas operacionais futuras. O fechamento desta sprint não encerra essas
famílias nem dispensa sua implementação e matriz final.

- [x] Pelo menos duas empresas com IDs/e-mails semelhantes, uma delas com duas unidades, demonstram isolamento em listagem, detalhe, alteração, exportação e evento. Funcionário autorizado em uma filial é impedido de consultar, alterar e receber eventos da outra filial da mesma empresa; trocar domínio/ID/claim não concede acesso.
- [x] Reutilizar conexão/thread após erro, cancelamento ou job não mantém schema anterior. Host desconhecido, tenant incompatível e sessão revogada falham fechado.
- [x] Permissão removida e unidade retirada passam a valer mesmo com access JWT não expirado; acompanhamento de eventos por polling perde acesso correspondente. Não é prova de SSE/WebSocket futuro.
- [x] Refresh repetido, login concorrente, recuperação inválida/expirada e logout têm comportamento previsto; cookies/CSRF e limites de tentativa são verificados.
- [x] Edições simultâneas da matriz dão conflito explícito; impedir remoção do último Administrador inclusive sob concorrência.
- [x] Provisionamento interrompido retoma sem duplicação nem empresa parcialmente ativa; migração registra resultado por schema.
- [x] Login, recuperação e matriz são utilizáveis em viewport mobile emulado, com erro por campo, foco e sem exigir tabela horizontal inacessível para ações essenciais. Aparelhos físicos e auditoria integral de acessibilidade não foram executados.

**Revisão posterior ao merge:** integração de `b50b9d1` verificada no Mac;
correções pré-Sprint 2 ainda não são um novo release homologado. O aceite histórico
de baseline registra `sprint_complete=false`; esse recibo permanece preservado.
Resultados atuais e próximos gates ficam no [checkpoint](25_EXECUTION_STATUS.md).

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Tenancy](06_MULTI_TENANT.md)
- [Segurança](04_SECURITY.md)
- [Acessos](11_ACCESS_CONTROL.md)

# Sprint 01 — Tenant, autenticação e acessos

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

**Status:** em andamento desde 2026-11-04; não concluída. Há implementação
empresarial e SaaS, convites/verificação/recuperação, matriz/equipe/unidades,
eventos cadastrais, exportação mínima e provisionamento assistido.

Atualização ciclo32: revisão dos sete critérios identificou erro sem associação
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

- [ ] Registro de domínio/empresa, provisionamento retomável e migrações por schema.
- [ ] Identidade empresarial/plataforma separada, JWT, refresh/revogação, convite e recuperação conforme P04.
- [ ] Unidades, funcionários, perfis fixos, matriz com versão/auditoria e ações exclusivas do Administrador.
- [ ] Política central de autorização e projeções de dados por função; escopo de unidade em consultas, mutações e eventos.
- [ ] Estado operacional da empresa e regras de suspensão conforme P11, preservando reconciliação.

## Dependências

Sprint 0; validar P04/P11 e durações de sessão. Captura local atende testes de e-mail; uso real exige provedor e domínio do [registro do piloto](23_PILOT_IMPLEMENTATION.md#registro-externo).

## Critérios de aceite

### Rastreabilidade para o fechamento

Esta tabela indica onde procurar as provas, não aprova testes pendentes nem
converte nomes de métodos em evidência de execução. O gate final deve reler os
resultados do mesmo candidato e conferir também o runtime de homologação.

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

- [ ] Pelo menos duas empresas com IDs/e-mails semelhantes, uma delas com duas unidades, demonstram isolamento em listagem, detalhe, alteração, exportação e evento. Funcionário autorizado em uma filial é impedido de consultar, alterar e receber eventos da outra filial da mesma empresa; trocar domínio/ID/claim não concede acesso.
- [ ] Reutilizar conexão/thread após erro, cancelamento ou job não mantém schema anterior. Host desconhecido, tenant incompatível e sessão revogada falham fechado.
- [ ] Permissão removida e unidade retirada passam a valer mesmo com access JWT não expirado; conexão de eventos perde acesso correspondente.
- [ ] Refresh repetido, login concorrente, recuperação inválida/expirada e logout têm comportamento previsto; cookies/CSRF e limites de tentativa são verificados.
- [ ] Edições simultâneas da matriz dão conflito explícito; impedir remoção do último Administrador inclusive sob concorrência.
- [ ] Provisionamento interrompido retoma sem duplicação nem empresa parcialmente ativa; migração registra resultado por schema.
- [ ] Login, recuperação e matriz são utilizáveis no celular, com erro por campo, foco e sem exigir tabela horizontal inacessível para ações essenciais.

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Tenancy](06_MULTI_TENANT.md)
- [Segurança](04_SECURITY.md)
- [Acessos](11_ACCESS_CONTROL.md)

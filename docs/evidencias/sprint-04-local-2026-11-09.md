# Sprint 4 — implementação e validação local

**Situação:** implementação e validação técnica local concluídas.
Linux/Hermes e homologação permanecem pendentes por solicitação do proprietário.

Branch `codex/sprint-04-delivery-pagamentos`, base `7b522e7`; alterações ainda no
checkout de trabalho. Demonstração em 8095/`rm_dev` preservada. Validação usa
macOS, JDK 21.0.9, PostgreSQL 18.4 em `rm_test`, Node 26 e Playwright 1.64.1.
Não houve merge, publicação em produção ou uso de credenciais reais do provedor.

## Implementação

Domínios preservados: `delivery` concentra regiões, endereços pessoais e
expedição/ocorrências; `financeiro`, recebimentos, abatimentos e reservas/devoluções;
`pagamentos`, OAuth, checkout, inbox e reconciliação; `comunicacoes`, outbox e
captura; `relatorios`, projeção operacional por unidade/fuso. Pedidos coordenam
as transições e snapshots. Controllers, services, repositories e DTOs separados.
Novas migrações public V7 e tenant V22–V27; nenhuma migração anterior alterada.

Contratos e regras estão nas fontes de [API](../08_API_STANDARDS.md),
[negócio](../20_BUSINESS_RULES.md), [integrações](../21_INTEGRATIONS.md),
[acessos](../11_ACCESS_CONTROL.md) e [arquitetura](../02_ARCHITECTURE.md).

## Evidências já executadas

- `backend/mvnw -B -ntp -f backend/pom.xml clean verify`: **435 testes/63 XML**,
  zero falhas, erros ou skips, após fixar as dependências transitivas do SDK
  e repetir a suíte completa com evento da reconciliação e identificação de parcelas corrigidos.
  A última alteração é exclusiva de frontend: o novo gate conferiu as mesmas
  fontes backend por hashes e **506 entradas de classes/recursos/libs idênticas**
  à revisão executada. Os 63 XML e a prova de identidade estão preservados.
- Formatação, tipos, 20 grupos de lógica e 12 combinações de templates passaram.
  Probes de lógica/templates usam transporte controlado; não equivalem a E2E.
- Build Angular/PWA aprovado: inicial **294,87 kB**, limites 450/600 kB preservados;
  36 arquivos públicos no shell; 37 arquivos estáticos conferidos byte a byte no JAR.
- `npm audit --audit-level=moderate`: nenhum aviso. Auditoria OSV do JAR real:
  **112 pacotes**, nenhum aviso após as correções.
- 22 contratos OpenAPI e 409 referências locais conferidos. Links documentais e
  padrões de segredo conferidos; não constituem testes da aplicação.
- No candidato atual, API/JAR/PostgreSQL reais, provedor HTTP fictício persistente: resposta perdida
  após criar cobrança, reinício do candidato e recuperação da mesma referência;
  resposta perdida após devolver, novo reinício e confirmação por consulta.
  Resultado: uma cobrança, um recebimento, uma devolução local e uma devolução
  remota simulada; pedido permaneceu cancelado, R$ 20,00 devolvidos. Sem reset do banco.

**JAR validado localmente:**
`6afe9354cac1c402672a0dcedab0be97098650d3f45f5b67bb4fbf96601861de`.
Raiz privada `/private/tmp/rm-sprint04-candidato05`; build e dois reinícios
aprovados. **405 pares aprovados e consolidados** no PID **53922**,
mesmo JAR/PID, zero falhas, skips, retries ou flaky na seleção final.
Relatórios, fixtures, capturas, credenciais fictícias e conteúdo de mensagens
não são versionados. Nenhuma aprovação de navegador de outro candidato ou PID
foi herdada.

## Falhas e correções rastreadas

- Fixture antiga de listagem não copiava o início do aceite; corrigida para o
  novo contrato temporal. Erros de tipagem/expectativas de testes novos foram
  corrigidos, mantendo os estados canônicos `NA_FILA` e `CONCLUIDO`.
- Inbox pública usava transação JPA que exigia tenant: substituída por JDBC neutro.
  ID alfanumérico é normalizado antes da assinatura; payload do aviso não confirma pagamento.
- SDK 3.7.0 acrescentava chave de idempotência concorrente e a busca perdia o campo
  accessToken. Transporte preserva Authorization da requisição e a chave explícita;
  busca após resposta perdida recupera a mesma cobrança. Não há credencial global.
- Fila gerencial chamava auditoria administrativa; corrigida para autorizar/auditar
  a ação operacional. Replay financeiro autoriza antes de comparar payload anterior.
- Eventos financeiros/notificações automáticas incluem o proprietário e referência
  durável. Captura antes do reconhecimento no banco recupera o mesmo UUID/conteúdo.
- Rótulo Angular fazia o formatador acrescentar linhas vazias a cada passagem;
  markup estabilizado com `span`, preservando associação do rótulo ao campo.
  O mesmo comportamento reapareceu na expressão longa do item selecionado;
  ajustado e conferido em duas passagens consecutivas antes de repetir o gate.
- JAR intermediário `9db5ffb0747d5bdf21b769d89e52dafb5625bfa72f7384673ad4b768be87e515`
  rejeitado por quatro avisos OSV transitivos do SDK. BeanUtils 1.11.0, HttpClient
  5.6.3 e Core/H2 5.4.3 fixados; suíte completa, build e auditoria repetidos.
  Diagnósticos anteriores preservados em `/private/tmp/rm-sprint04-local`.

- Comanda sem consumo: teste novo reproduziu 404, depois aprovou retorno vazio
  autorizado, leitura sem criar cobrança e bloqueio ao Cliente. Interface informa
  ausência de consumo e desabilita operações; incluído no novo cenário UI03.
- Correções dos testes: rótulos de endereço, aceitação do diálogo nativo de remoção,
  espera do render ao remover/adicionar regiões e DTO de cálculo sem campo alheio.
  Falhas e traces permanecem privados. Artefato anterior não é aprovado por esses recortes.

- Revisão visual da devolução online encontrou aviso de pendência desatualizado.
  Teste ampliado reproduziu ausência do evento (esperado 1, observado 0).
  Checkout agora emite evento transacional somente quando muda de estado; a UI
  exige desaparecimento automático do aviso, sem recarregar manualmente.
  Suíte completa repetida; os 45 pares do candidato anterior não são herdados.

- A seleção de abatimento mostrava referências técnicas. Novo teste reproduziu
  duas descrições vazias e passou após projetar nome do snapshot, posição do item
  e unidade comercial. O nome permanece contratado após mudar o catálogo.
  Interface identifica o pedido e descreve o item selecionado fora do select;
  recebimentos têm numeração correspondente na lista e na seleção. Contrato
  financeiro atualizado sem alterar IDs de comandos ou migrações. Regressão
  completa de 435 testes aprovada; matriz integral final aprovada.

- Captura da comanda motivou asserção de saldo zero após fechamento; essa prova
  passou após esperar o painel. A prova adicional de ajuste externo reproduziu
  **API R$ 14,00 / painel aberto R$ 15,00**. Atualização do snapshot agora
  reconsulta o financeiro sem apagar rascunho do mesmo recurso ou abandonar
  intenção incerta. A UI também verifica preservação do valor digitado.
  Correção exclusiva de frontend; fontes backend verificadas por hashes contra
  a revisão dos 435 testes. Novo gate exige identidade do backend empacotado;
  a nova validação começou na raiz `/private/tmp/rm-sprint04-candidato04`, depois
  superada pelo candidato final descrito acima.

- O candidato `85d6ac0db61d…` aprovou 45 pares Sprint 4 e 65 de pedidos,
  mas a regressão parou após oito pares aprovados no lote de identidade.
  A fixture fixa possuía outros administradores: a tentativa de desativar a
  própria conta foi aceita, e os logins seguintes falharam. Falha de preparação,
  sem aprovação do lote ou reset de quotas/contas. Novo tenant exclusivo valida
  previamente a existência de um único administrador ativo. Orientação obsoleta
  da tela de acessos também corrigida. Nova raiz `/private/tmp/rm-sprint04-candidato05`;
  build, reinícios e todos os 405 pares foram repetidos e aprovados no novo JAR/PID.

A preparação do novo candidato teve duas interrupções do harness antes da matriz:
variáveis de ambiente não exportadas e adaptador privado de caminho do `psql`
ausente. Invocação e adaptador corrigidos; mesmos manifestos/contas preservados,
sem reset de dados ou quotas. Diagnósticos privados mantidos.

## Matriz de navegador — aprovada localmente

45 pares Sprint 4, 65 pares pedidos/mesas/cozinha e 295 de regressão: **405 aprovados**.
Chromium 1280/360/768, Firefox e WebKit. Um worker, sem retries; resultado ignorado,
bloqueado ou instável não é aprovado. Sprint 3/4 usam cinco tenants fictícios novos,
um por projeto; execução intercalada respeita quotas reais, sem limpar contadores.
Todos os pares pertencem ao mesmo JAR/PID final, sem aprovação herdada.
A consolidação revalidou os relatórios originais e os respectivos hashes, fontes,
fixtures e runtime. Zero falhas, skips, retries ou flaky na seleção final.
Execuções dos candidatos anteriores permanecem como histórico.

| Cenário novo | Famílias / perfis | Superfícies e prova |
| --- | --- | --- |
| S04-UI01 | T07; Cliente | `/conta`: endereço próprio, teclado, isolamento e remoção |
| S04-UI02 | T23; Administrador | `/gestao/configuracoes/delivery`: regiões, prazo, reautenticação e sobreposição rejeitada |
| S04-UI03 | T14/T17–T19; Administrador | `/gestao/mesas` e `/gestao/pedidos`: comanda vazia sem cobrança, dinheiro/troco, abatimento alocado, reserva e confirmação presencial |
| S04-UI04 | T18, X13; Caixa | Financeiro do pedido: resposta perdida após commit real e recuperação do mesmo recebimento |
| S04-UI05 | T13/T16/T18; Atendimento/Expedição/Gerente/Caixa | Pedido assistido, expedição, ocorrência, nova tentativa, cancelamento com/sem devolução de taxa e quitação de entrega/retirada |
| S04-UI06 | T22; Gerente/Cozinha | `/gestao/relatorios`: período/fuso e indicadores separados; API negada à Cozinha |
| S04-UI07 | T26; Administrador | `/gestao/integracoes`: OAuth fictício pela UI, callback e status sem credenciais |
| S04-UI08 | T08/T09/T19; Cliente/Gerente | Checkout externo, retorno pendente, recusa e nova tentativa, confirmação confiável, devolução parcial e cancelamento com devolução do remanescente |
| S04-UI09 | T26/T27; Gerente | `/gestao/pendencias`: reconciliação da mesma operação e metadados de notificações; integração administrativa negada |

## Preservação e revisão visual

Foram inspecionadas **13 capturas do candidato final**, com caminhos,
hashes e notas em `visual-review.json`; a inspeção é separada dos pares automatizados.
Evidências completas e snapshot das fontes não commitadas em
`/Users/mac/.local/share/restaurant-manager-manual/evidencias/sprint04-20261109-6afe9354cac1`: candidato final, diagnósticos anteriores,
435 testes/63 XML, provas de identidade de fontes/binários, reinícios, 405 pares,
traces/capturas, harness, manifestos e patch contra HEAD. O arquivo manual
preexistente do proprietário foi excluído do snapshot e permanece preservado.
Conteúdo privado de mensagens e credenciais fictícias não foi versionado.

Candidato e simulador próprios encerrados após a consolidação. Demonstração
8095/`rm_dev` e PostgreSQL mantidos, com saúde/identidade conferidas. Não houve
commit, push, merge ou publicação em produção nesta execução.

## Pendências externas

Linux/Hermes e homologação não executados. Mercado Pago sandbox/habilitação real,
URLs públicas, regras efetivas de prazo/meios no provedor e envio real de e-mail
permanecem pendentes. Captura não comprova entrega/leitura. Aparelhos físicos,
tecnologia assistiva, restauração operacional e critérios do piloto continuam
nas fontes correspondentes. A simulação local não aprova produção.

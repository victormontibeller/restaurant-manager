# Sprint 2 — implementação e validação local de 2026-11-06

**Conclusão local:** implementação e matriz de testes concluídas. Linux,
homologação, instalação em aparelho físico e piloto permanecem pendentes.

## Escopo e identificação

Branch `codex/sprint-02-catalogo-pwa`, baseada no merge do PR #4
`19dff9d625d03cdba9d23bf023e88846743dec03`. Um novo `git fetch origin`
confirmou essa base durante a validação. Alterações locais sem commit/push,
merge ou deploy. P05/P06/P12/P13 foram confirmadas pelo proprietário, que
orientou concluir desenvolvimento/testes locais e deixar Linux para depois.

Ambiente macOS, Java 21.0.9, PostgreSQL 18.4 exclusivo do projeto em
`127.0.0.1:55432/rm_test`, roles de migração/runtime separadas, Node 26.0.0,
Angular 22.2.4 e Playwright 1.64.1. Browsers próprios do projeto; nenhum banco
ou dependência dos projetos de referência foi alterado. HTTPS privado e
contas/mídias fictícias; e-mails capturados localmente, sem envio externo.

Candidato final, SHA-256 do JAR:
`b74888550192ac9fbaa3662ee982e8ab7bbba832981b90890f2c3a5e587326a5`.
Os sete arquivos estáticos coincidem com o build Angular. Os 178 fontes da
aplicação, hash do JAR e PID permaneceram iguais durante a matriz final;
correções posteriores ao empacotamento atingiram somente testes/documentação.
Relatórios privados rotulados `sprint02-local` conservam manifestos, XML,
resultados JSON/HTML, logs, capturas e as rodadas que falharam.

V13–V16 implementam funcionamento, catálogo/favoritos, mídia e vínculo
produto/mídia. Os domínios `unidades`, `catalogo`, `carrinho` e `midia` mantêm
suas fronteiras; frontend organiza catálogo/carrinho/PWA e reutiliza sessão e
acessos. Contratos: [horários](../api/funcionamento-unidades.yaml),
[catálogo](../api/catalogo.yaml), [carrinho](../api/carrinho.yaml) e
[mídia](../api/midias.yaml). Armazenamento no [ADR 0002](../adr/0002-midia-publica-transacional.md).

## Verificações aprovadas

- Backend: `clean verify`, **262 testes em 35 XML**, zero falha, erro ou skip.
- Frontend: build Angular/PWA, formatação e typecheck. Bundle inicial de
  358,29 kB; shell com seis arquivos e worker `40f5f3add2f77edd724f`.
- Lógica: 13 scripts de probes. Templates reais com transporte simulado:
  nove combinações (três suítes nos três motores), separados dos E2E.
- Navegadores: **295 pares únicos**, 59 cenários nos cinco projetos:
  Chromium desktop/360/768, Firefox e WebKit desktop. A seleção final não
  contém falha, skip, retry ou flaky. Inventário `--list` não conta como teste.

| Família | Pares aprovados |
| --- | ---: |
| Catálogo, combos, mídia, carrinho, favoritos e perfis | 50 |
| Funcionamento e consulta pública | 10 |
| PWA | 10 |
| Fundação | 20 |
| Identidade, acessos e unidades | 45 |
| Cadastro | 20 |
| Convites | 20 |
| Recuperação de senha | 15 |
| Verificação de e-mail | 15 |
| Eventos, perfis, vínculos e exportação | 55 |
| Plataforma | 15 |
| Estado da empresa | 15 |
| Solicitação de provisionamento — UI30 | 5 |
| **Total único** | **295** |

As cinco provas PWA02 usam o shell real em servidor local controlado, com
APIs indisponíveis declaradas, para testar troca de versão e consentimento.
As demais jornadas usam aplicação/API/PostgreSQL locais reais. As 15 provas
que injetam falha/gate de transporte bloqueiam o worker somente nesse contexto
(75 pares), conforme a [fronteira do Playwright](https://playwright.dev/docs/network#missing-network-events-and-service-workers).
Respostas de negócio, autorização e cálculo não são inventados. A suíte PWA
comprova o worker ativo; Chromium com certificado privado usa pin SPKI nessa
suíte. A regressão restante não constitui prova independente do worker no
Chromium com esse certificado. Homologação com TLS confiável continua pendente.

## Falhas, correções e reexecuções

- Tipos de consultas nativas e contratos HTTP corrigidos antes da matriz:
  parâmetros ausentes/multipart extra retornam 400, formato HTTP incompatível
  415 e excesso de upload 413; entradas inválidas não publicam mídia.
- Autorização é refeita após esperar locks de catálogo/favoritos, com contexto
  atualizado. Testes concorrentes comprovam que logout/revogação impede commit.
- Combo com componente inativo permite sua própria desativação/edição cadastral;
  publicação e mudança de composição continuam exigindo referências válidas.
- Dinheiro usa centavos exatos em texto/BigInt na UI. Prévia vem do servidor e
  é invalidada por edição, rede, contexto e resposta atrasada.
- Upload incerto preserva UUID, arquivo e rascunho por conta em memória, com
  retomada após logout e isolamento de outra conta. Busca de favoritos inclui
  descrição. Favoritos ocultos são limpos somente na nova inclusão do titular,
  sob lock, liberando a cota sem mutação no GET ou no outro cliente.
- Build Angular inicial foi interrompido pelo sandbox; execução nativa permitida
  passou. Inventário PWA corrigiu uso de `import.meta` em carregamento CommonJS.
- Backend r1 registrou suspensão/salto de aproximadamente 22 minutos no host:
  sessão expirou, produzindo 401 em vez de 422 (257 aprovações/uma falha).
  Rodadas completas posteriores passaram; a final r4 tem 262 testes. Não somar
  rodadas. Prevenção temporária de suspensão não mudou prazos da aplicação.
- O primeiro E2E iniciou antes da prontidão e foi recusado sem executar jornadas.
  No candidato anterior, catálogo passou nove de dez; o helper passou a aguardar
  GET/renderização após salvar. Essas execuções não entram na contagem final.

No candidato final, a regressão de identidade teve 41 aprovações e quatro
falhas WebKit (UI06–09): rotas registradas não eram executadas com worker.
O isolamento da fronteira foi seguido de **20/20 reexecuções** dos quatro
cenários nos cinco projetos. Os outros 25 pares permanecem do mesmo artefato.
Eventos repetiu seus seis casos afetados no Chromium; o lote final dos demais
motores passou 22/22. A consolidação substitui os resultados anteriores,
sem somar casos repetidos ou apagar falhas.

Catálogo inicialmente passou 46/50. A busca era verificada antes de a resposta
chegar; agora exige GET real, filtro/ID correto, lista única e renderização.
O replay binário por `route.fetch` no WebKit retornou 422, enquanto upload
normal retornou 201. Nesse teste, o SDK passa a transmitir o mesmo `File`
selecionado, comparando bytes, para a mesma URL/UUID antes de perder a resposta.
A reexecução aprovou upload nos cinco projetos, mas revelou quatro falhas do
helper com mais de 50 produtos: ele só procurava a partir da página atual.
Agora navega desde a primeira página, aguardando GET e rótulo a cada passo.
**UI03/UI04 passaram 10/10** após a correção. Os 50 pares finais de catálogo
combinam 35 de perfis, cinco de upload e dez de gestão/busca/carrinho, todos
no mesmo JAR. Asserções de commit, UUID único, valores e reconciliação foram
preservadas; nenhum timeout foi ampliado para encobrir a falha.

## Revisão visual

Horários: 16 capturas do candidato final inspecionadas — administrativo/público
nos cinco projetos e offline/reconectado no Chromium desktop, tablet e mobile.
São capturas do componente inteiro; não equivalem à viewport ou aparelho real.

PWA: dez capturas de viewport inspecionadas, offline e oferta de atualização
nos cinco projetos. Textos, avisos e botão legíveis, sem sobreposição. Imagens
mostram a oferta; cancelamento/aceite são comprovados pelas asserções. A mensagem
de API indisponível na prova controlada de atualização é esperada.

Catálogo: 24 capturas finais de viewport inspecionadas — dez mobile, quatro
desktop, quatro tablet, três Firefox e três WebKit. Incluem produto/adicional,
grupo/opção, mínimos/máximos, prévia de R$ 46/R$ 92 e resumo de R$ 163. Textos,
valores e aviso de nenhum pedido criado estão legíveis, sem sobreposição ou
overflow observado. A lista exata e hashes ficam no manifesto privado de imagens.

Foram inspecionadas 50 imagens finais no total. Selects nativos truncam nomes
longos no mobile; a composição mostra os nomes completos. No WebKit desktop,
a aparência nativa tem cerca de 23 px de altura. Um probe isolado com o CSS
original confirmou essa medida; não é garantia de alvo de 48 px para selects,
nem teste de aparelho físico. Botões, foco e operação por teclado têm as
asserções das jornadas. Essas limitações permanecem explícitas para o piloto.

## Configuração privada e encerramento

Uma saída de ferramenta expôs segredos de configuração local. Foram renovados
senha de `rm_test_app`, segredo JWT, chave de e-mail e senha PKCS12; senha antiga
do banco efetivamente recusada. Owner, outras bases e quotas não mudaram.
Não havia mensagens cifradas para migrar nessa configuração.

Durante o diagnóstico de trace, outra saída expôs a senha da conta fictícia
administrativa de c4. Ao terminar os testes, ela foi renovada e suas sessões
revogadas: senha antiga 401, nova 200, logout 204 e token novo revogado 401.
A fixture privada correspondente foi atualizada. Nenhum segredo foi versionado;
scanner adicional não encontrou 13 valores privados conhecidos nos 428 arquivos do checkout
ou nas 221 entradas de aplicação do JAR. Backups e provas permanecem privados.

Runtime HTTPS e PostgreSQL temporários encerrados; portas 8089/55432 sem
listener. Banco, fixtures, certificados e evidências preservados fora do Git.
Não iniciar artefato anterior contra V13–V16 sem verificar compatibilidade.

## Pendências externas

- Linux/Hermes não acessado, migrado, reiniciado ou publicado nesta execução.
- UI29/UI31 com worker/gates reais (dez combinações), 50 smokes e matriz do
  novo release em homologação continuam pendentes por orientação do proprietário.
  Não são skips aprovados nem herdam o aceite do release histórico.
- Instalação PWA em aparelho físico, restore Linux de banco/mídia, configuração
  externa e operação real exigem seus ensaios. Os testes locais não aprovam piloto.
- Cotação/composição não é pedido, reserva ou pagamento. Persistência do snapshot
  em pedidos, cozinha e integrações financeiras pertencem às próximas sprints.

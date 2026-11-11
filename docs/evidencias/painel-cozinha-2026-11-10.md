# Painel de produção da cozinha — 2026-11-10

Implementação solicitada pelo proprietário após avaliação da demonstração:
monitor com mouse, fila compartilhada, três colunas, ações rápidas por pedido,
seleção parcial opcional e aviso visual com som ativável.

## Implementação

- Na fila, Em preparo e Prontos simultâneos em monitor; abaixo de 1024 pixels,
  abas com teclado e relacionamento explícito entre controles e painéis.
- Cabeçalho compacto, unidade/conexão identificáveis, cartão próprio com
  mesa/canal, itens e componentes/adicionais, observações e quantidades por etapa.
- Cada pedido ocupa uma coluna pelo estado confirmado. Iniciar pedido atua
  somente na fila; Concluir em preparo somente nas unidades iniciadas. Combos
  continuam unidades comerciais completas; não há reversão automática de preparo.
- Histórico e orientações recolhidos; cancelamento em avaliação permanece visível.
- Prontos anteriores ao dia local ficam em grupo recolhido. O horário é derivado
  da conclusão das unidades prontas; dados legados sem conclusão permanecem nesse
  grupo, com horário ausente explícito. Não há exclusão, expiração ou conclusão
  automática. O contador Prontos inclui os dois grupos, com subtotal de hoje.
- Novo GET `/api/v1/cozinha/painel`, com totais globais e páginas de até 50 itens
  independentes em uma transação REPEATABLE READ. Mantidos endpoint anterior,
  permissões, autorização de unidade/tenant e projeção sem valores/contatos/endereço.
  Identificação de mesa e fuso usam os dados existentes; sem migration nova.
- Comandos mantêm versão, IDs e intenção idempotente. Resultado incerto pode
  ser recuperado também no painel, caso o cartão mude de coluna/página. Seleção
  válida persiste em consultas; conflito a limpa e pede revisão.
- SSE/polling preservados. Observador opcional de eventos recebe somente lotes
  posteriores ao replay inicial. Entrada é confirmada pelo detalhe operacional,
  inclusive fora da página atual; deduplicação por evento e pedido. Som começa
  desligado, exige clique e dura somente na aba; indisponibilidade mantém o aviso.
- Modos anteriores de uso foram preservados nas outras áreas. O cenário E2E
  S03-UI01 e seu helper foram adaptados para cartões, abas e paginação novos.

## Verificação local

Raiz privada: `/private/tmp/rm-cozinha-20261110`. Nenhuma senha, token, fixture
privada ou banco foi incluído no checkout.

- Rodada dirigida inicial: 19 testes backend, com uma falha de asserção nova
  (esperava 400 para página de negócio inválida, cujo contrato usa 422). Os
  testes existentes de cozinha, concorrência e replay passaram.
- Após ajustar a expectativa: quatro testes novos do painel aprovados, com
  grupos/preparo parcial, paginação de 52 pedidos, limite do dia no fuso
  Pacific/Kiritimati, isolamento e revogação. Não foi mudada a resposta da API
  para satisfazer o teste.
- Build Angular, tipos e lógica aprovados na rodada de desenvolvimento.
  O primeiro build dentro do sandbox abortou o processo do compilador;
  reexecução fora dessa restrição revelou e permitiu corrigir tipos do template.
- Probe do template real da cozinha aprovado em Chromium, Firefox e WebKit:
  preparo parcial, seleção após consulta, conflito, recuperação idempotente,
  teclado, 360/768/1280 e aviso de entrada. Transporte fictício nessa camada;
  isso não comprova jornada integrada com banco.

A suíte completa concluiu **468 testes em 69 suítes**, zero falhas, erros ou
skips. Tipos, formatação e 22 grupos de lógica passaram. Os 15 probes de
componentes/templates (cinco × três navegadores) passaram no Mac; o probe da
cozinha foi reexecutado após a correção de áudio abaixo. Não somar reexecuções.

A CI #216 do commit inicial `ec34635` reprovou no teste de áudio: o runner Linux
não dispunha de áudio e `AudioContext.resume()` podia aguardar indefinidamente.
A ativação ganhou limite de 1,5 s, bloqueio de cliques concorrentes e retorno
visual de indisponibilidade. O probe passou a controlar essa fronteira de
hardware, verificando sinal único/deduplicação e ausência de resposta do áudio.
Essa simulação não comprova saída de som física. Os três navegadores passaram
na reexecução; o restante do frontend e a API seguem reais nessa camada, com
transporte em memória explicitamente delimitado.

## Artefato publicado e conferência integrada

Fonte da aplicação final: `4c0f19375a2f7f0f437f8579da4a7b0fc460893f`.
JAR: SHA-256 `1501b7d71ae2c87859087bd1e367b00e064a779c05c8094870838292eeeb4a84`.
O acabamento final corrigiu o singular de pronta e a largura do seletor em
360 pixels; seu probe foi reexecutado nos três navegadores antes da publicação.
Os 534 arquivos do inventário foram vinculados ao commit e os recursos
empacotados conferidos contra o dist/classes. Classes Java e bibliotecas são
byte a byte iguais às do JAR anterior `23c373a6…beac5c`, que recebeu a suíte
backend completa e auditoria de 112 componentes sem achados. Não houve alteração
Java após esses testes. npm sem vulnerabilidades reportadas na consulta.

A [CI #218](https://github.com/victormontibeller/restaurant-manager/actions/runs/42931925768)
passou em `0aef67e`, após a correção do áudio. A
[CI #220](https://github.com/victormontibeller/restaurant-manager/actions/runs/42933927816)
do acabamento `4c0f193` estava em execução no registro deste incremento.
O SHA e o estado atuais da revisão ficam na
[PR #13](https://github.com/victormontibeller/restaurant-manager/pull/13).

A demonstração `https://demo.localhost:8095/cozinha` recebeu o JAR final;
API PID 58766 saudável e PostgreSQL compartilhado PID 59175 preservado.
Usuários, senhas, TLS e configurações anteriores foram conservados; somente o
SHA do release mudou no ambiente do runtime. Nenhuma migration nova foi criada
ou aplicada. O inventário SQL do JAR foi comparado ao da versão instalada antes
de cada troca. API e jobs foram parados antes dos backups, sem outros clientes
de `rm_dev` conectados, e retomados com o mesmo banco.

Backup final e recibos privados:
`~/.local/share/restaurant-manager-manual/backups/cozinha-20261111T004818Z/`.
Contêm dump completo custom, índice conferido e arquivo com artefato/configuração
anteriores. Não foi ensaiado restore nem backup externo. A primeira publicação
ficou em `cozinha-20261111T003247Z/`; ambas foram preservadas.

No JAR final foram aprovadas, separadamente:

- **15 verificações de API**, incluindo login/perfis, duas unidades, grupos,
  preparo parcial, combo, negativos de acesso e ausência de campos privados.
- **26 verificações integradas no Chromium**, com API Spring/PostgreSQL reais:
  ações rápidas, seleção/conclusão parcial, versão antiga de outro operador
  recusada, aviso de nova entrada, ativação do áudio, tela cheia, teclado,
  360/768/1280 e prontos anteriores. Na falha de transporte controlada, o backend
  confirmou antes da resposta ser abortada; recuperar reutilizou intenção,
  versão e unidades, sem novo incremento da versão. Outro painel confirmou
  o estado atualizado. Sem erros JS não tratados ou HTTP 5xx reais.
- **13 verificações do runtime**, com saúde TLS, identidade/loopback dos
  processos, artefato e preservação de credenciais/certificados.

A rodada integrada anterior aprovou 16 verificações de API e depois 25 de UI no
JAR anterior, sem somá-las à rodada final. As tentativas intermediárias do
roteiro foram preservadas: espera de tela cheia consultada antes da transição,
seletor de summary ambíguo com os históricos e cliente route.fetch sem a CA
local. A perda real de resposta foi então exercitada com HTTPS/CA validados,
mesmo corpo e identidade da requisição, sem desabilitar a validação TLS.
O contexto usado para injetar a perda bloqueou service worker; a navegação
normal usou worker permitido, sem homologar seu ciclo de instalação/atualização.

O erro de route.fetch imprimiu na saída da ferramenta um JWT temporário da
própria sessão de teste. Somente essa sessão foi revogada por ID; senhas e demais
sessões foram preservadas. O handler passou a capturar erros, sem imprimir
cabeçalhos de autenticação. Nenhum token ou configuração privada foi versionado.

A conferência de 12 pares explícitos de texto/fundo do CSS passou com razão
mínima 6,25:1; isso não representa avaliação integral de acessibilidade.
As capturas finais de 360, 768 e 1280 pixels foram inspecionadas, incluindo o
campo de canal legível e o singular correto. Não houve falhas observadas nesse
escopo. Dez pedidos fictícios identificados foram acrescentados ao longo dos
casos e mantidos para revisão, sem recebimentos, pagamentos ou exclusão dos
registros anteriores. Não são pedidos comerciais.

## Limites

Os resultados por camada não são somados como matriz completa. S03-UI01 e seus
helpers foram adaptados e passaram no typecheck; o caso completo da matriz não
foi reexecutado como tal. O smoke dirigido real está identificado separadamente.
A matriz global de 420 pares e suas capturas, PWA instalada, som em equipamento
físico, Linux, provedores externos, aparelhos reais, aceite assistivo e piloto
continuam pendentes. Esta publicação é demonstração local, não produção.

Consulte o [checkpoint](../25_EXECUTION_STATUS.md), as
[diretrizes de interface](../09_UI_GUIDELINES.md) e o
[contrato de pedidos](../api/pedidos.yaml).

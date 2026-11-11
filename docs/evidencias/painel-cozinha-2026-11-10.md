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

O empacotamento final e a publicação na demonstração serão registrados após
conclusão. A demonstração anterior ainda é a referência até
essa publicação. A matriz global de 420 pares e suas capturas não é aprovada
por estes checks dirigidos. Linux, provedores externos, aparelhos físicos,
aceite assistivo e piloto permanecem pendentes.

Consulte o [checkpoint](../25_EXECUTION_STATUS.md), as
[diretrizes de interface](../09_UI_GUIDELINES.md) e o
[contrato de pedidos](../api/pedidos.yaml).

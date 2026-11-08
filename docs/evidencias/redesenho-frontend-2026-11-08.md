# Redesenho do frontend — 2026-11-08

## Estado

Implementação local na branch `codex/redesenho-frontend`, sobre `14ca980` (PR #6 integrado).
A demonstração possui uma prévia **em validação**; a matriz final do candidato `c2e2c6df…`
está em execução. Esta evidência não aprova Linux, aparelhos físicos, leitores de tela ou piloto.

## Resultado implementado

Cliente, gestão e cozinha separados por rotas, layouts e permissões efetivas. Tema de
bistrô contemporâneo com Spartan Brain 1.9.0, CDK/Router/Forms 22.2.4 e Tailwind 4.3.5.
Tokens e atribuição upstream centralizados, conforme [ADR 0003](../adr/0003-spartan-navegacao-por-area.md).
Sessão, contexto de unidade, carrinho, rascunhos e intenções incertas permanecem em memória.
Contrato de nome público e filtros operacionais antes da paginação documentados na API.
Nenhuma migration ou regra de dinheiro foi alterada.

## Verificação local já realizada

- Backend: suíte completa de 402 testes, sem falhas/erros/skips; depois, 38 testes de rotas
  após o delta de cinco destinos. São rodadas distintas; não declarar uma suíte completa
  de 440 testes. As entradas não estáticas dos JARs seguintes foram comparadas byte a byte.
- Tipos, formatação, lógica, templates nos três motores e build Angular/PWA aprovados
  durante os incrementos. O build inicial caiu de aproximadamente 458 kB para 282 kB,
  mantendo os limites de aviso/erro de 450/600 kB.
- Pacotes npm instalados com peers compatíveis, versões exatas e auditoria sem achados.
- PWA inclui todos os chunks com hash misto e somente o banner público enumerado;
  APIs, mídia da empresa, credenciais e escritas permanecem fora do cache.
- Candidato `e1a98eae…` aprovou os 65 pares de pedidos/mesas/cozinha nos cinco projetos;
  a regressão seguinte detectou sobreposição do aviso offline móvel. Esse resultado
  anterior não aprova a matriz do código corrigido.
- Candidato `d24b128c…`, commit `6781d72`, corrigiu o aviso offline; PWA01 móvel com
  clique real passou. Na rodada seguinte, desktop da baseline completou 59/59; ainda
  houve falha de seletor do menu na identidade móvel e timeout no cenário volumoso
  de paginação. Resultados parciais não encerram a matriz.
- Revisão nativa no Chrome: zoom indicado de 200%, viewport CSS de 896 px e scrollWidth
  de 896 px, sem rolagem horizontal. Diálogo também permaneceu contido. O zoom foi
  restaurado para 100%. A revisão revelou retorno de foco ao body; corrigido capturando
  o acionador antes da consulta/desabilitação, com cobertura adicional no catálogo.

## Falhas e correções preservadas

Gestão vazia por acesso prematuro ao snapshot filho; skiplink com base `/` recarregando
a página; contraste da ação de saída da cozinha; aviso offline sobrepondo controles;
retorno do foco do configurador. Foram acrescentadas provas de regressão pertinentes.

Adaptações do harness preservam os cenários: navegação por RouterLinks, espera dos
estados realmente exibidos antes de comandos, seletores por papel acessível, fechamento
do botão do menu em vez do overlay, canal explícito e hosts ligados à fixture gerenciada.
A proteção do último Administrador usa tenant com um único administrador ativo.
Contas de verificação consumidas são substituídas por contas novas, sem reverter sua
verificação. Quotas não foram apagadas nem redefinidas. Logs, traces, snapshots e falhas
anteriores ficam preservados no registro privado da execução.

## Demonstração

Prévia em `https://demo.localhost:8095`, separada em banco `rm_dev`; matriz usa `rm_test`.
PostgreSQL compartilhado foi preservado. Backup consistente e cópia do JAR/configurações
anteriores permitem reversão. O artefato realmente servido foi conferido por hash do JS.

No candidato anterior `d24b128c…`, login administrativo, unidades, três larguras de tela
(360/768/1280) e logins de Administrador/Cozinha/Cliente passaram. Smoke novo de 30
verificações concluiu duas retiradas fictícias até PRONTO, com negativas 403 e consulta de
expedição; sem pagamentos. Duas fotos ilustrativas foram associadas aos produtos fictícios
correspondentes pela API. Acessos e certificado foram mantidos.

## Candidato final em execução

Candidato `c2e2c6dfbebf68db70ddf8f5613fd3bdba7820769a00cb2714824eee71d06352`,
fonte da aplicação `3ac3bf0`, prévia atualizada com backup novo, health, nome público,
login administrativo, duas unidades e bytes do JS servido conferidos. Probe de foco
aprovado em Chromium, Firefox e WebKit; PWA01 móvel também aprovado.

A primeira rodada deste JAR passou oito pares e parou em S03-UI09: consulta imediata
de visibilidade no harness confundia a renderização pendente do carrinho com a versão
móvel. O trace mostrou o item presente depois, sem navegação possível no instante
anterior. A correção `e1c0a32` aguarda fechamento do diálogo e botão de revisão anexado,
incluindo elementos ocultos por CSS. Desktop e celular passaram nos probes; uma falha
intermediária do probe móvel por omitir `includeHidden` também está preservada.

A rodada `redesenho-05-h02` reexecuta todos os 360 pares, sem aproveitar os oito
resultados anteriores. Apenas um worker total; quando uma família aguarda quota,
a outra pode prosseguir serialmente. Nenhum limite foi apagado ou reduzido. JAR,
PID, fontes, fixtures e harness permanecem identificados por hashes. Depois de o proprietário desbloquear o Mac, a atualização consentida e o retorno
do foco ao botão de origem foram conferidos no Chrome nativo, com o JS esperado.
A rodada foi pausada na fronteira de cenário para completar as abas da cozinha,
identificadas na conferência final do plano. Novo candidato será gerado com abas
Spartan Brain, setas/Home/End, ativação por Enter/espaço e filtros de servidor; a
regressão S03-UI01 passa a verificar esse comportamento.

## Critério de encerramento pendente

Gerar candidato com foco corrigido, confirmar o comportamento no navegador, reexecutar
os 360 pares no mesmo release integrado, revisar as capturas e consolidar sem skips,
instabilidade ou aprovações transferidas. Atualizar o estado da demonstração e este relato
somente conforme os resultados reais. Linux, aparelhos físicos e tecnologia assistiva
continuam distinguíveis da validação local.

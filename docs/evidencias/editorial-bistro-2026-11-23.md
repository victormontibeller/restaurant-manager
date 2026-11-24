# Integração do Editorial Bistrô — 2026-11-23

A [PR #23](https://github.com/victormontibeller/restaurant-manager/pull/23)
integra a identidade visual da [PR #22](https://github.com/victormontibeller/restaurant-manager/pull/22)
(`139ae79`) à base `68aa587` do Restaurant Manager. Foram mantidos os
fluxos e contratos vigentes. Minha conta usa `/api/v1/me/perfil`. A matriz,
as ofertas, a expedição, o preparo parcial e as ações da PWA usam os serviços
já integrados. Autoexclusão e encerramento das outras sessões continuam como
propostas de backend.

## Evidências locais

| Verificação | Resultado observado |
| --- | --- |
| Backend de main com PostgreSQL 18 exclusivo | 496 aprovados, zero falhas e zero ignorados |
| Formatação, tipos, lógica, build e auditoria npm | Aprovados. A auditoria npm retornou zero vulnerabilidades. |
| Sondas de templates nos três navegadores | 15 combinações aprovadas, com API simulada |
| Layout e contraste dos tokens de texto | 72 combinações de Cliente, Gestão, Cozinha e Plataforma em claro e escuro, a 360, 768 e 1280 px, em Chromium, Firefox e WebKit |
| Conta, tema, navegação, foco e rolagem | 20 combinações aprovadas nos cinco projetos Playwright |
| PWA | Shell offline, cache restrito e atualização com consentimento verificados no Chromium |
| Pedidos e operação | Envio, preparo parcial, autorização, endereço e taxa de delivery, pedido assistido, expedição, cancelamento e fechamento de mesa e reconexão verificados pela UI e pelo efeito no servidor |
| Acessos, ofertas e Plataforma | Administração e cliente receberam as respostas esperadas na UI e API. Dois preços por unidade e duas marcas por origem foram conferidos. A Plataforma enviou e consultou o provisionamento concluído pelo worker real. |

A rodada integrada usou HTTPS em loopback e dados fictícios em `rm_test`. Os
relatórios privados registram as reexecuções. Foram corrigidos filtros,
foco do menu, nomes longos na Plataforma e a transição da conferência para o
envio. Na reexecução com novas massas, os contadores de login foram preservados.
Os testes Python que dependem de `/proc` apresentam erros no Mac e entram
no CI Linux. A homologação completa, pagamento com provedor real e testes em
aparelhos físicos continuam pendentes.

O código da publicação local tem referência `5c14d77`. O JAR usado para
reexecutar mesa e reconexão tem SHA-256
`a8b385a009181c23c6e58b73613eb88800adca5071d75cda8e359466d43ce4c3`
e PWA `df3751a1574508d75e9b`.

## Demo local

O publicador confirmou a [demo do Mac](https://demo.localhost:8095/cardapio)
às 17h31. O SHA servido é `5c14d77e234fb0fa13dc4d9b9818133debade407`.
O JAR da demo coincide com o JAR ensaiado acima. As 375 classes Java e as
37 migrações SQL coincidem byte a byte com a versão anterior. O publicador
conservou a release anterior para retorno.

Após a troca, o Chromium confirmou cardápio, filtros, retorno de foco,
tema, carrinho, fila de pedidos, acessos, cozinha e expedição. O HTTPS
confirmou saúde e serviu a versão `df3751a1574508d75e9b` da PWA.

## Capturas

- [Cardápio claro, 1280 px](editorial-bistro/cardapio-claro-1280.png)
- [Gestão escura, 1280 px](editorial-bistro/gestao-escuro-1280.png)
- [Cozinha escura, 768 px](editorial-bistro/cozinha-escuro-768.png)
- [Plataforma clara, 360 px](editorial-bistro/plataforma-claro-360.png)

Capturas do candidato `3693cab` com dados fictícios. A referência visual está
na PR #22. As adaptações mais visíveis são a navegação e a densidade da Gestão
e da Cozinha, onde permanecem disponíveis as ações da versão atual.

## Ajuste de Minha conta e Unidades

O commit `da80d27` reaproveita a cartela de Minha conta, a composição em
painéis e os cartões de Unidades da PR #22. O formulário de conta consome
`/api/v1/me/perfil` e usa o cadastro atual de endereços. CPF e operações
de segurança propostas na PR #22 seguem dependendo de backend. Na Gestão,
os cartões mostram os dados de cada unidade e mantêm a abertura explícita
dos editores, a proteção do rascunho e os fluxos de recuperação. Horários e
canais agora incluem a semana de inícios de turno baseada no rascunho.

No JAR de SHA-256
`143205520a48c4cb39f7248101d890d703ada9c7e019c50a859f5d0d4be9f826`
passaram 6 combinações de edição e recarga da conta, para cliente e gerente,
e 3 de cadastro, conflito otimista e inativação de unidade. As duas suítes
usaram HTTPS e PostgreSQL isolado em Chromium desktop, Chromium móvel e
WebKit desktop. As sondas de reautenticação e horários passaram com API
simulada. A revisão visual aprovou 12 combinações em 360, 768 e 1280 px
nos dois temas, além do quadro semanal na edição de horários.

- [Minha conta clara, 1280 px](editorial-bistro/conta-claro-1280.png)
- [Minha conta escura, 360 px](editorial-bistro/conta-escuro-360.png)
- [Unidades clara, 1280 px](editorial-bistro/unidades-claro-1280.png)
- [Unidades escura, 360 px](editorial-bistro/unidades-escuro-360.png)
- [Quadro de horários, 1280 px](editorial-bistro/unidades-horarios.png)

## Revisão de todas as áreas

Referência visual e de código em [PR #22](https://github.com/victormontibeller/restaurant-manager/pull/22),
commit `139ae79`. Candidato de aplicação `d7df6d9`, PWA `33e79deac9c3ce612224`
e JAR `ebcca118bf20cd7fab474ef6f3f075e6d5576da4fbb70a863dc0993684ffd279`.
A comparação de pacotes confirmou 375 classes Java e 37 migrações SQL idênticas à release anterior.

| Área | Rotas e estados conferidos |
| --- | --- |
| Cliente | Cardápio, carrinho, acesso à mesa por código e link, Meus pedidos, Minha conta, login, cadastro, recuperação, convite, verificação de e-mail, acesso negado e página desconhecida no roteador Angular. |
| Gestão diária | Pedidos, pedido assistido, Mesas e comandas, Expedição, Vendas e movimentos e Pendências e notificações. |
| Gestão comercial e administração | Catálogo e ofertas, Regiões e checkout, Mercado Pago, Equipe, Acessos, Convites, Unidades e horários, Prazos de aceite, Atualizações, entrada da equipe e Minha conta da equipe. |
| Cozinha | Painel em largura total, colunas e abas por etapa, ferramenta de unidade, menu contextual e cartões para preparo parcial. |
| Plataforma e componentes | Entrada e sessão do console SaaS, formulário de provisionamento e catálogo de componentes. |

A revisão trouxe a barra própria e os cartões da Cozinha, os cartões e filtros
de Pedidos, os painéis de Vendas e Pendências, o catálogo administrativo, os
cartões de regiões e da equipe e o configurador com mídia e composição lado a lado.
O acesso à mesa e a entrada receberam seus cabeçalhos editoriais.
A Expedição usa a etiqueta dentro dos detalhes do pedido. O teste confirma que o
endereço fica recolhido e que uma revogação o retira da tela e bloqueia a consulta.

As telas representam os contratos atuais. A matriz tem uma rota própria, o
checkout confirma composição e envio em etapas distintas e o KDS seleciona
unidades de produção com as permissões efetivas. CPF, autoexclusão e encerramento
de outras sessões continuam no backlog de API. O servidor entrega a página de
erro nativa em URLs desconhecidas. A captura da página editorial dessa condição
exerceu o *fallback* do Angular a partir do shell da aplicação em HTTPS.

### Capturas da revisão

- [Cozinha clara, 1280 px](editorial-bistro/auditoria-cozinha-claro-1280.png) e [escura, 360 px](editorial-bistro/auditoria-cozinha-escuro-360.png).
- [Pedidos e filtros rápidos](editorial-bistro/auditoria-pedidos-claro-1280.png) e [Vendas e movimentos](editorial-bistro/auditoria-relatorios-claro-1280.png).
- [Pendências e notificações em escuro](editorial-bistro/auditoria-pendencias-escuro-1280.png).
- [Catálogo da Gestão](editorial-bistro/auditoria-catalogo-claro-1280.png) e [Regiões e checkout](editorial-bistro/auditoria-regioes-claro-1280.png).
- [Entrada na mesa](editorial-bistro/auditoria-mesa-claro-1280.png).

### Validação da revisão

- Formatação, tipos, lógica, sondas de templates e build da PWA aprovados.
- S03-UI01, UI02, UI06 e UI09 no Chromium, com carrinho e envio, mesa, perfis e unidades, preparo parcial e pedido assistido.
- S04-UI02, UI05, UI06, UI09 e UI10 no Chromium, com rejeição de região sobreposta, despacho, ocorrência, cobrança, relatórios, pendências, e revogação da expedição. S04-UI07 passou na reexecução com a página de autorização fictícia e o callback local.
- Serviço e banco de teste isolados em HTTPS e PostgreSQL. O provedor de pagamentos usado nos testes é simulado. Homologação em dispositivos físicos e no Hermes segue pendente.
- Matriz de 612 combinações em Chromium, Firefox e WebKit, abrangendo 34 telas e estados, temas claro e escuro e larguras de 360, 768 e 1280 px. O WebKit terminou sem erros nem rolagem horizontal ampla após aguardar o carregamento do cardápio antes de mudar de rota.
- Mais 24 combinações com dados para [configurador](editorial-bistro/auditoria-configurador-claro-1280.png), [carrinho preenchido](editorial-bistro/auditoria-carrinho-escuro-360.png), [checkout](editorial-bistro/auditoria-checkout-claro-1280.png) e [acompanhamento](editorial-bistro/auditoria-acompanhar-pedido-escuro-360.png). O configurador abriu com teclado, recebeu foco no botão de fechar e devolveu o foco ao item depois de Escape.
- A [Cozinha com estados mistos](editorial-bistro/auditoria-cozinha-preparo-parcial.png) verificou unidades em fila, em preparo e prontas no mesmo pedido.
- Novas execuções confirmaram ofertas e marca por unidade e empresa, acesso permitido e negado à matriz na interface e na API, e provisionamento com processamento e consulta em PostgreSQL.
- S02-PWA01 e S02-PWA02 no Chromium confirmaram o shell offline, a exclusão de API e sessão do cache e a atualização após consentimento.

### Publicação na demo

O publicador confirmou `d7df6d9` às 18h16. O artefato servido tem o mesmo
SHA-256 do candidato ensaiado e a PWA respondeu com `33e79deac9c3ce612224`.
O Chromium confirmou Minha conta, Unidades e horários, Cozinha, Pedidos, Mesas,
Expedição, Vendas, Pendências, Catálogo e Acessos na demo. A release `da80d27`
segue disponível para retorno com o mesmo banco local.

### Contraste no tema escuro

A inspeção das capturas identificou links com pouco contraste no acesso e no
acompanhamento do pedido. O commit `4725422` aplica a cor de texto do tema
aos links, navegação ativa, indicadores e controles afetados. Foram verificados
quatro pares de cores por tema, todos acima de 4,5:1, e a cor renderizada
do link de retorno e da navegação móvel no acompanhamento. As quatro etapas
da jornada de compra foram reexecutadas em 24 combinações. As verificações
de offline e atualização da PWA passaram novamente.

O ajuste foi confirmado na demo às 18h25. A release `4725422` serve a PWA
`f59f127e311dfea694fc` e o JAR
`796623888792cb7787f5ed0a3e1e865701241ff275e6c5e5d4addfca539cd746`.
O pacote publicado coincide com o ensaiado. A versão `d7df6d9` permanece
disponível para retorno local.

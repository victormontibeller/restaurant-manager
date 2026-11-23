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

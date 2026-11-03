# Sprint 02 — Catálogo e PWA

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

**Status:** não iniciada.

Entregas, testes e homologações abaixo estão planejados; nenhum item está marcado como concluído.

## Entregáveis

- [ ] Unidades/horários, categorias, produtos, imagens, adicionais, combos personalizáveis por grupos/opções e disponibilidade/preço por unidade, conforme D17.
- [ ] Vitrine visual, busca, favoritos/sugestões conforme P06, detalhes e carrinho com resumo calculado pelo servidor.
- [ ] PWA instalável onde suportado, política de cache, estados de conexão e controle de atualização.
- [ ] Upload validado, mídia pública autorizada e separação de arquivos privados.

## Dependências

Sprint 1; validar P05/P06/P12/P13; catálogo e mídias fictícios podem atender a sprint, mas conteúdo real autorizado é necessário para o piloto.

## Critérios de aceite

- [ ] Cliente não força preço, adicional inválido, quantidade fora do limite, produto de outra empresa/unidade ou canal indisponível.
- [ ] Mudança de catálogo/preço durante edição do carrinho pede nova confirmação; snapshot definido para pedido não usa valor futuro do catálogo.
- [ ] Combo valida escolhas/limites por unidade comercial; preço base mais acréscimos/adicionais é calculado no servidor sem somar preço avulso indevidamente. Duas configurações diferentes geram linhas independentes.
- [ ] Adicionais multiplicam a quantidade do componente escolhido e depois a quantidade comercial: base R$ 30 mais duas escolhas de R$ 5 + R$ 3 resultam em R$ 46 por combo; configurações distintas de adicionais permanecem separadas.
- [ ] Opção indisponível exige escolha explícita, sem substituição silenciosa; alternativas válidas mantêm o combo vendável. Carrinho e snapshot preservam composição e preço que a cozinha receberá.
- [ ] Perfil sem ação não altera catálogo; mudança empresarial compartilhada informa impacto nas filiais, e alteração local respeita unidade atribuída.
- [ ] Upload inválido/excessivo é negado sem deixar arquivo público indevido; falha de upload permite recuperação sem duplicar cadastro.
- [ ] Em rede lenta/offline, vitrine informa estado e nenhum pedido/pagamento é confirmado localmente. Inspeção do cache não encontra respostas privadas ou tokens.
- [ ] Jornadas de busca, configuração e carrinho passam em 360/768/1280 pixels, teclado e navegadores definidos, com imagens otimizadas e botões acessíveis.
- [ ] Configurar um combo no celular mostra mínimos/máximos, opções incluídas, acréscimos e total sem depender de hover ou tela larga.

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Requisitos e jornadas](01_PRD.md)
- [Interface/PWA](09_UI_GUIDELINES.md)
- [Regras de catálogo](20_BUSINESS_RULES.md)

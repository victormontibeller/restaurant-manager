# Sprint 02 — Catálogo e PWA

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** implementação e testes locais concluídos; homologação pendente. Decisões e premissas seguem o [registro central](00_PROJECT_VISION.md).

[Índice da documentação](README.md)

**Status:** implementação e testes locais concluídos em 2026-11-06, com
271 testes backend e 295 pares de navegador aprovados no candidato da revisão final.
Horários, catálogo, combos, mídia, favoritos, carrinho e PWA mantêm a organização
por domínio. Linux/homologação ficam pendentes por orientação do proprietário.

A base inclui o PR #4 e P05/P06/P12/P13 confirmadas. Os checks abaixo registram
aceite da parcela local implementada; não aprovam gates operacionais, instalação
em aparelho físico ou persistência de pedidos das próximas sprints.

## Entregáveis

- [x] Unidades/horários, categorias, produtos, imagens, adicionais, combos personalizáveis por grupos/opções e disponibilidade/preço por unidade, conforme D17.
- [x] Vitrine visual, busca, favoritos/sugestões conforme P06, detalhes e carrinho com resumo calculado pelo servidor.
- [x] PWA instalável onde suportado, política de cache, estados de conexão e controle de atualização.
- [x] Upload validado, mídia pública autorizada e separação de arquivos privados.

## Dependências

Sprint 1 e revisão pré-Sprint 2 integradas em `main` pelo PR #4. P05/P06/P12/P13
foram confirmadas pelo proprietário no [registro central](00_PROJECT_VISION.md#premissas-propostas).
Catálogo e mídias fictícios podem atender a sprint; conteúdo real autorizado
continua necessário para o piloto.

## Base e gates de execução

- Partir da `main` integrada em branch dedicada, preservando a revisão de
  modularidade e legibilidade. SHA, CI e estado efetivamente observado ficam
  no [checkpoint](25_EXECUTION_STATUS.md), sem herdar resultados históricos.
- Antes de homologar, reconciliar Git, banco, processos e release no Linux;
  executar os gates do [guia](24_AGENT_EXECUTION.md#publicacao-homologacao).
  CI no runner Ubuntu não comprova estado do Hermes, worker real, UI29/UI31,
  50 smokes ou matriz integrada da revisão anterior.
- Desenvolvimento local pode avançar conforme a orientação de 2026-11-06.
  A falta de acesso Linux bloqueia seu aceite operacional, não é convertida
  em teste ignorado/aprovado nem contornada por mocks.

## Incrementos verificáveis

Cada incremento inclui backend, contrato, UI aplicável, casos negativos e
evidência. Os módulos futuros são criados quando usados, conforme a
[arquitetura](02_ARCHITECTURE.md); não reorganizar a base por conveniência.

| Ordem | Entrega e domínio | Prova para avançar |
| --- | --- | --- |
| S02-01 | Horários/canais em `unidades`, edição administrativa e consulta pública mínima | Fuso/madrugada, limites/sobreposição, unidade inativa, tenant, reautenticação, conflito concorrente, resposta perdida e estados de rede |
| S02-02 | Categorias/produtos em `catalogo`, preço/disponibilidade por unidade e administração | Ações empresariais versus locais, revogação, impacto nas filiais, constraints e concorrência em PostgreSQL |
| S02-03 | Upload e publicação de mídia com fronteira própria | Tipo real/tamanho/resolução, falha/retomada sem duplicação, mídia privada isolada e recuperação consistente de banco/mídia |
| S02-04 | Adicionais e combos de D17 em catálogo/cálculo | Limites e opções por unidade comercial, R$ 46 por combo no caso de aceite, configurações independentes e alternativa explícita |
| S02-05 | Vitrine, busca, favoritos, sugestões e carrinho | Propriedade do cliente, cálculo do servidor, revalidação ao trocar unidade e reconfirmação de preço/composição |
| S02-06 | Shell/PWA, cache permitido, conexão/atualização e integração | Cache sem credenciais/respostas privadas, separação por empresa, atualização segura, matriz do release e regressão das jornadas existentes |

O contrato do carrinho prepara os dados que formarão o snapshot. Persistência
de pedido, cozinha, cancelamento e pagamento pertencem às sprints seguintes;
não simular conclusão desses fluxos para aprovar a Sprint 2.

## Rastreabilidade de testes

Vincular as novas telas e ações ao [inventário](evidencias/cobertura.md) e à
[matriz completa](26_TEST_STRATEGY.md). Famílias principais: T01–T05, T20–T21 e
a parcela de horários/canais de T23. X01, X05 e X12–X15 têm cobertura pertinente
ao incremento; estados de produção, regiões e devoluções continuam futuros.

Testar público, dois clientes, seis perfis empresariais, concessão/revogação
nos cinco configuráveis e negativos SaaS. Usar duas empresas e duas unidades
em uma delas, funcionário restrito a uma filial e expectativas independentes
da política testada. Cobrir UI e API diretas, PostgreSQL real, sessão revogada,
ação removida, contexto alheio, entrada adulterada, concorrência e recuperação.

Manter os cinco projetos de navegador definidos e 360/768/1280 px, teclado,
foco, nomes acessíveis e erros. Para encerrar a sprint, executar a matriz
aplicável no release integrado de homologação, incluindo a regressão de
identidade/acessos. A emulação não comprova instalação em aparelho real.

## Evidência do primeiro incremento

S02-01: edição administrativa e consulta pública de horários/canais implementadas.
Validação local com PostgreSQL real, 208 testes backend, 10 pares novos de
navegador e 20 de regressão da fundação, além de probes e verificações Angular.
[Falhas, correções, artefato e limites](evidencias/sprint-02-funcionamento-2026-11-06.md).
Esse resultado histórico não é somado à matriz final. S02-02–06 e a regressão
aplicável passaram no candidato integrado identificado na evidência abaixo,
com homologação Linux separada e pendente.

[Evidência integrada local, falhas/reexecuções e limites](evidencias/sprint-02-local-2026-11-06.md).
Após a padronização das camadas Java no PR #5, os 262 testes backend e os
295 pares de navegador foram executados novamente no novo artefato, conforme
a [evidência da refatoração](evidencias/refatoracao-camadas-java-2026-11-06.md).
A [revisão final do PR #5](evidencias/revisao-final-pr-05-2026-11-06.md)
corrigiu recuperação de combos, orientação das imagens, alvos WebKit e
fronteiras entre domínios. O novo candidato passou 271 testes backend e os
295 pares completos; registros anteriores permanecem como histórico.

## Critérios de aceite

- [x] Cliente não força preço, adicional inválido, quantidade fora do limite, produto de outra empresa/unidade ou canal indisponível.
- [x] Mudança de catálogo/preço durante edição do carrinho pede nova confirmação; snapshot definido para pedido não usa valor futuro do catálogo.
- [x] Combo valida escolhas/limites por unidade comercial; preço base mais acréscimos/adicionais é calculado no servidor sem somar preço avulso indevidamente. Duas configurações diferentes geram linhas independentes.
- [x] Adicionais multiplicam a quantidade do componente escolhido e depois a quantidade comercial: base R$ 30 mais duas escolhas de R$ 5 + R$ 3 resultam em R$ 46 por combo; configurações distintas de adicionais permanecem separadas.
- [x] Opção indisponível exige escolha explícita, sem substituição silenciosa; alternativas válidas mantêm o combo vendável. Carrinho e snapshot preservam composição e preço que a cozinha receberá.
- [x] Perfil sem ação não altera catálogo; mudança empresarial compartilhada informa impacto nas filiais, e alteração local respeita unidade atribuída.
- [x] Upload inválido/excessivo é negado sem deixar arquivo público indevido; falha de upload permite recuperação sem duplicar cadastro.
- [x] Em rede lenta/offline, vitrine informa estado e nenhum pedido/pagamento é confirmado localmente. Inspeção do cache não encontra respostas privadas ou tokens.
- [x] Jornadas de busca, configuração e carrinho passam em 360/768/1280 pixels, teclado e navegadores definidos, com imagens otimizadas e botões acessíveis.
- [x] Configurar um combo no celular mostra mínimos/máximos, opções incluídas, acréscimos e total sem depender de hover ou tela larga.

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Requisitos e jornadas](01_PRD.md)
- [Interface/PWA](09_UI_GUIDELINES.md)
- [Regras de catálogo](20_BUSINESS_RULES.md)

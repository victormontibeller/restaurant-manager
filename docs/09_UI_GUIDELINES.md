# Interface, acessibilidade e PWA

> **Escopo:** experiência responsiva, estados de conexão, acessibilidade e comportamento da PWA.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Usabilidade e PWA

- Interface responsiva de verdade: cliente com uma mão no celular, atendimento em tablet, caixa/cozinha em telas maiores. Validar larguras representativas de 360, 768 e 1280 pixels e ao menos aparelhos reais definidos para o piloto.
- Teclado, foco visível, rótulos, ordem de navegação, leitores de tela e contraste. Meta proposta: WCAG 2.2 nível AA nas jornadas do piloto, com verificação manual além de ferramenta automática.
- Cards visuais com preço e ação legíveis; imagens responsivas, carregamento gradual e sem vídeos com autoplay sonoro. Vídeo é melhoria posterior caso prejudique desempenho do piloto.
- Carrinho sempre mostra unidade, canal, itens, adicionais, taxa e total. Explicar diferença entre aguardar pagamento, aceite e preparo.
- Painéis mostram relógio/atraso, conexão, última atualização e pendências. Alerta não depende apenas de cor ou som; som pode exigir gesto/permissão do navegador.
- Se a rede cair, mostrar estado desatualizado e impedir falsa confirmação. Reconciliar envio incerto com a mesma chave de idempotência; não gerar nova cobrança por um retry de interface.
- PWA é instalação opcional conforme suporte do navegador. Não prometer instalação/push/background idênticos em todas as plataformas.
- Cache apenas do shell e conteúdo público explicitamente permitido, segregado por empresa. Não armazenar respostas autenticadas, tokens, endereço, pagamento ou eventos de escrita no service worker.
- Rascunho local de carrinho, se adotado, deve ser limitado a dados não sensíveis, identificado por tenant/unidade e revalidado no servidor; nunca equivale a pedido aceito.
- Atualização da aplicação não deve interromper silenciosamente checkout ou atendimento. Informar nova versão e preservar/reconciliar operação em andamento.

## Diretrizes de implementação

- Na configuração de combo, mostrar grupos, limites, opções incluídas e acréscimos antes de confirmar. Diferenciar configurações de duas unidades e exigir nova escolha se uma opção ficar indisponível, conforme [Regras de negócio](20_BUSINESS_RULES.md#combos-personalizaveis).
- No KDS, exibir componentes/adicionais de cada combo e contagens por unidade comercial. Iniciar/concluir uma quantidade identifica as unidades afetadas; não ocultar preparo parcial da linha. Cancelamento por componente não aparece como ação de consumo.

- Angular responsivo/PWA, HTML semântico, teclado, foco visível, rótulos e erros compreensíveis. Valide computador, tablet e celular; não dependa de hover nem somente de cor/som.
- Dê retorno para carregamento, vazio, indisponibilidade, envio pendente e falha de conexão. Preserve contexto para reconciliar uma operação cujo resultado não chegou.
- Não confirme pedido ou pagamento offline. Service worker não deve armazenar tokens, respostas privadas ou operações de escrita para envio automático.
- Guardas de rota e visibilidade refletem permissões; a API continua responsável por garanti-las. Evite retornar dados que o perfil não precisa.

## Documentos relacionados

- [Jornadas do produto](01_PRD.md)
- [Permissões e visibilidade](11_ACCESS_CONTROL.md)
- [API e portabilidade](08_API_STANDARDS.md)

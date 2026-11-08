# ADR 0003 — Spartan UI e navegação por área

- **Status:** aceito em 2026-11-08, por escolha explícita do proprietário no plano de redesenho. Validação integrada em andamento; não equivale a homologação Linux.
- **Contexto:** a página única misturava cardápio, autenticação, cadastros e operação. O objetivo é organizar cliente, gestão e cozinha com identidade de bistrô contemporâneo, preservando os contratos e a recuperação de operações incertas.
- **Decisão:** Angular Router 22.2.4 com layouts por área e carregamento sob demanda. Spartan Brain 1.9.0, Angular CDK/Forms 22.2.4 e Tailwind CSS/PostCSS 4.3.5 fixados no lockfile. Os peers publicados do Spartan aceitam Angular/CDK 21 e 22. A diretiva Helm de botão foi adaptada do código MIT oficial; tema e componentes locais ficam em `frontend/src/app/ui/` e tokens em `frontend/src/styles.css`. Não há dependência de CDN nem fonte remota.
- **Alternativas:** Angular Material mantém convenções visuais mais definidas; PrimeNG 22 tem modelo Community/Commercial que exige avaliação específica. Spartan foi escolhido pela liberdade de compor a identidade do restaurante. Não misturar bibliotecas visuais por área.
- **Consequências:** mantemos o código visual adaptado e revisamos atualizações upstream; não basta atualizar o pacote Brain para atualizar estilos locais. Componentes nativos continuam semânticos e usam o mesmo tema. Diálogo de configuração usa `dialog.showModal()`, foco inicial, Escape e retorno do foco. A biblioteca não comprova acessibilidade por si só.

## Manutenção e limites

Consultar [Spartan](https://www.spartan.ng/documentation/installation), [suporte Angular](https://www.spartan.ng/documentation/version-support) e [origem do botão](https://github.com/spartan-ng/spartan/blob/main/libs/helm/button/src/lib/hlm-button.ts). A origem é distribuída sob [licença MIT](https://github.com/spartan-ng/spartan/blob/main/LICENSE); a cópia local conserva sua atribuição em [LICENSE.spartan](../../frontend/src/app/ui/LICENSE.spartan).

A amostra de componentes está em `/design-system`. Mudanças na fundação devem ser revisadas em 360/768/1280 pixels, com teclado, foco, contraste, zoom e redução de movimento. Os limites de build permanecem 450 kB (aviso) e 600 kB (erro). A PWA enumera todos os chunks com hash do build, incluindo letras minúsculas, hífen e underscore; imagens de catálogo e APIs continuam fora do cache.

## Imagens ilustrativas

Imagens criadas com a ferramenta nativa `imagegen`, sem referência a marcas ou pessoas. Os PNGs originais foram convertidos para JPEG, sem edição de conteúdo. Não representam pratos reais nem operação comercial.

- Cabeçalho: `frontend/public/assets/bistro-banner.jpg`. Prompt: fotografia editorial de bistrô brasileiro contemporâneo, risoto de cogumelos em prato de cerâmica, legumes grelhados, mesa de nogueira, guardanapo terracota, luz natural; enquadramento horizontal, área calma à esquerda, sem texto, marca ou watermark. Exibe identificação de imagem ilustrativa.
- Demonstração: [burger.jpg](../assets/demo/burger.jpg). Prompt: fotografia editorial de hambúrguer artesanal com queijo, alface, tomate, molho da casa e pão brioche em prato de cerâmica; nogueira, terracota, luz natural; sem batatas, texto, marca ou watermark.
- Demonstração: [pizza.jpg](../assets/demo/pizza.jpg). Prompt: fotografia editorial de pizza Margherita inteira, muçarela, tomate, manjericão e borda dourada em prato de cerâmica; nogueira, terracota, luz natural; sem texto, marca ou watermark.

As duas fotos de produto serão associadas somente aos produtos fictícios correspondentes pela API de mídia da demonstração; não há associação automática pelo nome no código da aplicação.

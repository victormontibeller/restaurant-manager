# Sprint 2.1 · Correções da Jornada do Cliente, Cardápio & Mesa Participante

- **Data:** 2026-11-15
- **Telas / Rotas:** `/cardapio` (vitrine, configurador de item e horários públicos), `/carrinho` e modal **Revisar meu pedido**, `/pedidos` e `/pedidos/:id` (Checkout Pro Mercado Pago + cancelamento), `/mesa` e `/mesa/:mesaId`, `/entrar`, `/cadastro`, `/conta` e `/design-system`
- **Área:** Área do Cliente (Ponta a Ponta)
- **Responsável técnico:** Coordenador (camada lógica, sinais, fluxos de checkout/entrega/vitrine/mesa e `BE-23`–`BE-25`) + subagente `artesao-ux-bistro` (refatoração visual `.html`/`.css` e estabilização do layout em `360px`, `768px` e `1280px`)
- **Arquivos alterados na Sprint 2.1:**
  - **Cardápio & Configurador:** [`vitrine.component.ts`](../../../frontend/src/app/catalogo/vitrine.component.ts), [`vitrine.component.html`](../../../frontend/src/app/catalogo/vitrine.component.html), [`vitrine.css`](../../../frontend/src/app/catalogo/vitrine.css), [`catalogo.css`](../../../frontend/src/app/catalogo/catalogo.css), [`configurador-produto.component.ts`](../../../frontend/src/app/catalogo/configurador-produto.component.ts), [`modelos.ts`](../../../frontend/src/app/catalogo/modelos.ts)
  - **Contexto, Carrinho, Entrega & Checkout:** [`contexto-vitrine.service.ts`](../../../frontend/src/app/rotas/contexto-vitrine.service.ts), [`carrinho.component.ts`](../../../frontend/src/app/carrinho/carrinho.component.ts), [`carrinho.css`](../../../frontend/src/app/carrinho/carrinho.css), [`enderecos.component.ts`](../../../frontend/src/app/delivery/enderecos.component.ts), [`confirmar-pedido.component.ts`](../../../frontend/src/app/pedidos/confirmar-pedido.component.ts), [`confirmar-pedido.component.html`](../../../frontend/src/app/pedidos/confirmar-pedido.component.html)
  - **Pedidos, Pagamento & Mesa:** [`meus-pedidos.component.ts`](../../../frontend/src/app/pedidos/meus-pedidos.component.ts), [`meus-pedidos.component.html`](../../../frontend/src/app/pedidos/meus-pedidos.component.html), [`pagamento-pedido.component.html`](../../../frontend/src/app/pagamentos/pagamento-pedido.component.html), [`participante-mesa.component.ts`](../../../frontend/src/app/mesas/participante-mesa.component.ts), [`participante-mesa.component.html`](../../../frontend/src/app/mesas/participante-mesa.component.html), [`disponibilidade.component.ts`](../../../frontend/src/app/unidades/disponibilidade.component.ts)
  - **Shell, Identidade & Referência Visual:** [`paginas-cliente.ts`](../../../frontend/src/app/rotas/paginas-cliente.ts), [`icone.component.ts`](../../../frontend/src/app/rotas/icone.component.ts), [`cliente-layout.css`](../../../frontend/src/app/rotas/cliente-layout.css), [`identidade.component.ts`](../../../frontend/src/app/identidade/identidade.component.ts), [`cadastro.component.ts`](../../../frontend/src/app/identidade/cadastro.component.ts), [`catalogo.component.ts`](../../../frontend/src/app/ui/catalogo.component.ts), [`operacao.css`](../../../frontend/src/app/operacao.css), [`styles.css`](../../../frontend/src/styles.css)
  - **Documentação:** [`RELATORIO-PENDENCIAS-BACKEND.md`](RELATORIO-PENDENCIAS-BACKEND.md) (`BE-23` a `BE-25`) e [`README.md`](README.md)

---

## 1. Como era antes

Durante os testes funcionais das Sprints 1 e 2 no navegador (`1280×900`, `768×1024` e `360×800`), foram identificados problemas reais de usabilidade, layout e bloqueio de fluxo:

1. **Menu de categorias e densidade de colunas em `/cardapio`:** a barra lateral vertical ocupava largura permanente à esquerda em desktop, comprimindo a vitrine para 1–2 colunas. Além disso, o bloco **Sugestões da casa** empilhava itens em grade comum sem rolagem/navegação horizontal, e filtros horizontais (`Meus favoritos`, categorias, combos) podiam ocultar produtos marcados como `sugerido`.
2. **Modal do produto (`ConfiguradorProdutoComponent`):** exibia botão redundante `"Calcular total desta configuração"` mesmo com o total já atualizado ao vivo no CTA `"Adicionar ao carrinho"`, não oferecia seleção de **ponto da carne** nem campo de **observação por item** para pratos preparados na cozinha (ex.: hambúrgueres), enquanto precisava omitir esses campos para bebidas industrializadas.
3. **Canal Mesa e troca Delivery/Retirada sem perder itens:** o canal **Mesa** aparecia fora do contexto de QR Code / sessão de mesa ativa, faltava alternância clara entre **Delivery** e **Retirada** mantendo os itens no carrinho, e faltava explicitar no canal **Retirada** que é aceito pagamento online ou presencial no balcão (com preparo iniciado após confirmação do pagamento).
4. **Alinhamento em `/carrinho`, fluxo pop-up e cálculo automático de entrega (`EnderecosComponent`):** o seletor de quantidade `(− 1 +)` e textos auxiliares ficavam desalinhados; faltava o modal dedicado **"Revisar e enviar pedido"** partindo de `/carrinho`; o usuário não via motivo explícito quando o envio permanecia bloqueado; e em `EnderecosComponent.carregar()`, o método chamava `void this.calcular()` enquanto `this.consultando()` ainda estava `true`, fazendo a função `calcular()` retornar antes de consultar a taxa para o endereço principal selecionado automaticamente (deixando o botão `"Enviar pedido para aceite"` travado sem explicação clara).
5. **`/pedidos` e Checkout Pro (`/pedidos/:id`):** cartões na lista tinham alturas diferentes por quantidade variável de detalhes visíveis, sem recolhimento compacto com expansão sob demanda; e o fluxo local após recusa em Checkout Pro + conferência precisava evidenciar claramente o retorno ao estado aguardando pagamento para nova tentativa.
6. **`/mesa`, disponibilidade em `/cardapio`, `/entrar`, `/cadastro`, `/conta` e `/design-system`:** na mesa autenticada, faltava resposta visual mais clara nas ações (**Pedir ajuda à equipe** e **Solicitar a conta**) e estabilidade contra layout shift ou rejeição não tratada (`repetirSolicitacao()`); a lista suspensa em `<app-disponibilidade>` não seguia o padrão visual `.bistro-select-pill`; o cabeçalho `/cadastro` sem aviso claro quando já autenticado; placeholder longo de CPF mascarado truncando em `/conta`; e texto técnico pouco claro no cabeçalho de `/design-system`.

---

## 2. Representação visual — Antes × Depois

Comparativo completo entre as capturas da **Sprint 1/2 (Antes)** (área útil sanitizada das sessões de teste) e o resultado final da **Sprint 2.1 (Depois)** gerado a partir do build AOT de produção (`frontend/dist/restaurant-manager/browser`) em Microsoft Edge headless sobre viewports `1280×900`, `768×1024` e `360×800`. *(No editor de texto do VS Code / Antigravity, pressione `Ctrl+Shift+V` para visualizar as imagens renderizadas em Markdown Preview.)*

### 2.1. Cardápio (`/cardapio`), Horários (`<app-disponibilidade>`) & Modais de Produto

| Tela / Fluxo | Antes (Sprint 1/2) | Depois (Sprint 2.1) |
| --- | --- | --- |
| **Vitrine `/cardapio` (Desktop)**<br>Menu lateral -> Menu horizontal + 3 colunas + carrossel `<` `>` | ![Cardápio Sprint 1/2 antes com menu lateral](imagens/sprint2-1-antes-cardapio-desktop.png) | ![Cardápio Sprint 2.1 depois horizontal e 3 colunas](imagens/sprint2-1-cardapio-desktop-1280.png) |
| **Modal Burger (`ConfiguradorProduto`)**<br>Sem `"Calcular total"`, com Ponto da carne + Observação | ![Modal burger antes com Calcular total](imagens/sprint2-1-antes-modal-burger.png) | ![Modal burger depois com ponto da carne e observação](imagens/sprint2-1-modal-burger-ponto.png) |
| **Modal Bebida Industrializada**<br>Sem ponto da carne nem observação de preparo | *(antes incluía botão "Calcular total")* | ![Modal bebida simples sem ponto nem observação](imagens/sprint2-1-modal-bebida-simples.png) |
| **`<app-disponibilidade>` + Mobile `360×800`**<br>Dropdown `.bistro-select-pill` e cabeçalho `>= 48px` | ![Disponibilidade antes com dropdown nativo](imagens/sprint2-1-antes-disponibilidade.png) | ![Cardápio mobile 360 e disponibilidade estilizada](imagens/sprint2-1-cardapio-mobile-360.png) |

### 2.2. Comanda Lateral, `/carrinho` & Pop-up `Revisar e enviar pedido`

| Tela / Fluxo | Antes (Sprint 1/2) | Depois (Sprint 2.1) |
| --- | --- | --- |
| **Comanda lateral e Cálculo**<br>Correção de `3. × Refrigerante` + checkout movido para pop-up no carrinho | ![Comanda lateral antes no cardápio](imagens/sprint2-1-antes-cardapio-comanda.png) | ![Carrinho alinhado com ponto e observação](imagens/sprint2-1-carrinho-desktop.png) |
| **Pop-up `Revisar e enviar pedido` + Delivery**<br>Cotação automática de frete destravando envio | ![Carrinho antes sem pop-up de revisão](imagens/sprint2-1-antes-carrinho.png) | ![Pop-up revisar e enviar pedido com frete calculado](imagens/sprint2-1-carrinho-e-revisao-modal.png) |

### 2.3. Meus Pedidos (`/pedidos`, `/pedidos/:id`), Mesa (`/mesa`), Conta (`/conta`, `/entrar`) & Design System (`/design-system`)

| Tela / Fluxo | Antes (Sprint 1/2) | Depois (Sprint 2.1) |
| --- | --- | --- |
| **Lista `/pedidos`**<br>Cartões compactos padronizados + `"Ver resumo"` | ![Pedidos antes com alturas irregulares](imagens/sprint2-1-antes-pedidos-lista.png) | ![Pedidos depois compactos e alinhados](imagens/sprint2-1-pedidos-lista.png) |
| **Detalhe `/pedidos/ped-101` (Checkout Pro)**<br>Recusa local MP + `"Conferir pagamento"` evidenciado | — | ![Detalhe pedido após recusa MP e conferir](imagens/sprint2-1-pedidos-lista-e-detalhe.png) |
| **Mesa Ativa (`/mesa`) — Desktop**<br>Remoção do `'Aa'`, retorno claro das ações da comanda | ![Mesa ativa antes exibindo Aa](imagens/sprint2-1-antes-mesa-ativa.png) | ![Mesa ativa desktop depois](imagens/sprint2-1-mesa-desktop.png) |
| **Mesa Ativa (`/mesa`) — Responsivo `360×800`**<br>Leitura confortável e zero overflow horizontal | — | ![Mesa ativa mobile 360 depois](imagens/sprint2-1-mesa-desktop-e-mobile.png) |
| **Identidade (`/entrar` & `/conta`)**<br>Desbloqueio após saída pendente e placeholder curto de CPF | ![Entrar antes bloqueado com tentativa de saída](imagens/sprint2-1-antes-entrar-bloqueado.png)<br><br>![Conta antes com CPF truncado](imagens/sprint2-1-antes-conta-cpf.png) | ![Minha conta depois com CPF curto](imagens/sprint2-1-conta-entrar-ds.png) |
| **`/design-system`**<br>Guia técnica inequívoca + vínculo `BE-02` | ![Design System antes](imagens/sprint1-design-system-antes-desktop.png) | ![Design System depois](imagens/sprint2-1-design-system.png) |

---

## 3. O que foi alterado

| Tela / Bloco | Como estava | O que foi alterado na Sprint 2.1 | Arquivos |
| --- | --- | --- | --- |
| Barra de categorias, grid e sugestões (`/cardapio`) | Menu lateral comprimindo desktop e carrossel estático; filtros zeravam seções com `sugerido: true` | Menu de categorias convertido para barra horizontal no topo liberando **grid de 3 colunas** em desktop; **Sugestões da casa** com trilho horizontal arrastável/rolável + setas `<` `>`; `temSugestoesVisiveis()`, `temProdutosNaCategoria()` e template corrigidos para exibir favoritos, categorias e combos sem esconder pratos sugeridos; ausência do canal `Mesa` sem QR Code / sessão ativa | [`vitrine.component.ts`](../../../frontend/src/app/catalogo/vitrine.component.ts), [`vitrine.component.html`](../../../frontend/src/app/catalogo/vitrine.component.html), [`vitrine.css`](../../../frontend/src/app/catalogo/vitrine.css), [`catalogo.css`](../../../frontend/src/app/catalogo/catalogo.css) |
| Configurador de produto (modal) | Botão `"Calcular total desta configuração"`, sem ponto da carne e sem observação no item | Removido `"Calcular total desta configuração"` (cálculo ao vivo direto no CTA `"Adicionar ao carrinho"`); adicionado seletor de **ponto da carne** (`Mal passado` a `Bem passado`) e campo **observação deste item** (`textarea` até 160 caracteres) para pratos preparados/carnes, ocultos em bebidas industrializadas | [`configurador-produto.component.ts`](../../../frontend/src/app/catalogo/configurador-produto.component.ts), [`modelos.ts`](../../../frontend/src/app/catalogo/modelos.ts) |
| `/carrinho` & Pop-up Revisão / Entrega (`EnderecosComponent`) | `(− 1 +)` e textos desalinhados; `calcular()` falhava silenciosamente dentro de `carregar()` com `consultando() === true`; envio bloqueado sem mensagem clara | Alinhamento vertical/horizontal do stepper `(− 1 +)` e ações `Editar`/`Remover`; introdução do modal `<dialog class="cfg-dlg revisao-dlg">` **"Revisar e enviar pedido"**; troca `Delivery` ↔ `Retirada` preservando itens; nota de pagamento online/presencial na Retirada; motivo explícito via `motivoBloqueioEnvio()`; e correção em `EnderecosComponent.carregar()`/`usar()` para disparar `calcular()` após liberar `consultando` e quando `unidadeId()`/`subtotal()` atualizam no checkout | [`carrinho.component.ts`](../../../frontend/src/app/carrinho/carrinho.component.ts), [`carrinho.css`](../../../frontend/src/app/carrinho/carrinho.css), [`enderecos.component.ts`](../../../frontend/src/app/delivery/enderecos.component.ts), [`confirmar-pedido.component.ts`](../../../frontend/src/app/pedidos/confirmar-pedido.component.ts), [`confirmar-pedido.component.html`](../../../frontend/src/app/pedidos/confirmar-pedido.component.html) |
| Lista & Detalhe de Pedidos (`/pedidos`, `/pedidos/:id`) | Cards de lista com alturas irregulares; conferência pós-recusa pouco evidente | Cards compactos `.pedido-card-resumo` com altura padronizada em grid 3 colunas, botão `"Ver resumo"`/`"Recolher resumo"` expandindo `<app-pedido-detalhe>` sob demanda e reforço visual no estado `RECUSADO` + `"Conferir pagamento"` | [`meus-pedidos.component.ts`](../../../frontend/src/app/pedidos/meus-pedidos.component.ts), [`meus-pedidos.component.html`](../../../frontend/src/app/pedidos/meus-pedidos.component.html), [`pagamento-pedido.component.html`](../../../frontend/src/app/pagamentos/pagamento-pedido.component.html), [`operacao.css`](../../../frontend/src/app/operacao.css) |
| Mesa participante (`/mesa`, `/mesa/:mesaId`) e Horários (`/cardapio`) | Unhandled rejection em `repetirSolicitacao()` (`void this.consultar(true)`); dropdown de horários fora do padrão; layout shift em consultas | Corrigido `repetirSolicitacao()` para `void this.consultar()` evitando rejeição não tratada no polling; redesenho responsivo do painel `.mesa-painel`, ações **Pedir ajuda à equipe** / **Solicitar a conta** com status claro; `<app-disponibilidade>` convertido para `.bistro-select-pill` e cabeçalho do acordeão em `/cardapio` com `min-height: 52px` (`>= 48px`) | [`participante-mesa.component.ts`](../../../frontend/src/app/mesas/participante-mesa.component.ts), [`participante-mesa.component.html`](../../../frontend/src/app/mesas/participante-mesa.component.html), [`disponibilidade.component.ts`](../../../frontend/src/app/unidades/disponibilidade.component.ts), [`paginas-cliente.ts`](../../../frontend/src/app/rotas/paginas-cliente.ts), [`icone.component.ts`](../../../frontend/src/app/rotas/icone.component.ts) |
| Identidade, Conta & Design System | Placeholder de CPF truncado; `/cadastro` sem aviso para usuário já autenticado; `/design-system` pouco explicativo | Placeholder curto (`***.456.789-** (salvo)`); orientação em `/cadastro` quando sessão já ativa + aviso de encerramento em `/entrar`; texto técnico esclarecendo escopo de `/design-system` e vínculo com `BE-02` | [`identidade.component.ts`](../../../frontend/src/app/identidade/identidade.component.ts), [`cadastro.component.ts`](../../../frontend/src/app/identidade/cadastro.component.ts), [`catalogo.component.ts`](../../../frontend/src/app/ui/catalogo.component.ts), [`cliente-layout.css`](../../../frontend/src/app/rotas/cliente-layout.css), [`styles.css`](../../../frontend/src/styles.css) |

---

## 4. Por quê

- **Impacto na experiência do usuário (UX):** elimina os bloqueios silenciosos no checkout de entrega (calculando automaticamente a taxa para o endereço principal selecionado e explicando pendências com `motivoBloqueioEnvio()`), aproveita a largura desktop com menu horizontal + 3 colunas, torna o modal de produto natural ao contexto gastronômico (ponto da carne e observação apenas onde faz sentido), padroniza o alinhamento em `/carrinho` e `/pedidos`, e assegura leitura responsiva e alvos táteis `>= 48px` em `360px`, `768px` e `1280px`.
- **Conformidade com as normas do projeto:** mantém multi-tenancy 100% dinâmico via `MarcaService` (nenhuma marca ou inicial hardcoded), preserva contraste WCAG 2.2 AA e segue [Interface/PWA](../../09_UI_GUIDELINES.md), [Regras de negócio](../../20_BUSINESS_RULES.md) e [ADR 0003](../../adr/0003-spartan-navegacao-por-area.md).
- **Preservação estrutural:** zero edições em `backend/`; toda necessidade estrutural de servidor descoberta durante a Sprint 2.1 foi documentada em `RELATORIO-PENDENCIAS-BACKEND.md`.

---

## 5. Pendências e Requisitos para o Backend

Nenhuma edição foi realizada em `backend/`. As necessidades estruturais de servidor identificadas nesta etapa permanecem registradas em [RELATORIO-PENDENCIAS-BACKEND.md](RELATORIO-PENDENCIAS-BACKEND.md) sob os itens **`BE-23` a `BE-25`** (atributos dedicados de ponto da carne e observação por item no DTO de catálogo/pedido e metadados de categoria/preparo em restaurante).

---

## 6. Validações executadas e limites de ambiente

Resultados literais observados **após a última edição de código em `frontend/`**:

- **Formatação (`Prettier`):**
  - `npm --prefix frontend run format:check`: **passou** (`exit 0` — `All matched files use Prettier code style!`).
  - Prettier explícito em `frontend/src/app/catalogo/vitrine.component.html`, `vitrine.css`, `catalogo.css`, `carrinho/carrinho.css`, `rotas/cliente-layout.css` e `styles.css`: **passou** (`exit 0` — `All matched files use Prettier code style!`).
- **Tipos e template compiler (`TypeScript` / `ngc`):**
  - `npm --prefix frontend run typecheck` (`tsc --noEmit -p tsconfig.app.json && tsc -p tsconfig.e2e.json`): **passou** (`exit 0`).
  - `npx --prefix frontend ngc -p frontend/tsconfig.app.json --noEmit`: **passou** (`exit 0`). *(Apenas alerta preexistente `NG8113` de import não utilizado de `IconeComponent` em `pagina-pedido.component.ts`.)*
- **Build AOT de produção + manifesto PWA:**
  - `ng build --configuration production` (executado com VS Node `v24.12.0` e shim em memória `process.versions.node = '24.15.0'` para atender à checagem de versão do `@angular/cli`): **passou** (`exit 0` — `Initial total 319.72 kB` raw / `88.14 kB` transferido, dentro do limite `450 kB`).
  - `node scripts/build-pwa.cjs`: **passou** (`exit 0` — `PWA: 33 arquivos públicos; versão 870ae82cf1a425416bfa; APIs excluídas.`).
- **Suíte lógica JIT (`node scripts/test-frontend.cjs` — 22 scripts) e probes executáveis:**
  - `node scripts/test-frontend.cjs`: **passou** (`exit 0` — todas as 22 suítes/scripts aprovadas, incluindo `test_mesa_context.cjs`, `test_order_recovery.cjs`, `test_pending_intentions.cjs`, `test_public_hours.cjs`, `test_pwa.cjs`, `test_route_shell.cjs` e `test_platform_session.cjs`).
  - `node scripts/check_contrast.cjs --self-test`: **passou** (`exit 0` — `14 verificações ... aprovadas; nenhuma navegação executada.`).
  - `node scripts/test_pwa.cjs`, `node scripts/test_route_shell.cjs`, `node scripts/test_platform_session.cjs`: **passaram** (`exit 0`).
  - `node scripts/test_mesa_navigation_templates.cjs` (com `RM_CHROMIUM_EXECUTABLE=...msedge.exe`): **passou** (`exit 0` — geometria `360/768/1280` e fontes `16/20`, foco, filas SSE e envio bloqueado aprovados em ambiente simulado).
- **Auditoria E2E & visual AOT em Microsoft Edge (`verify-sprint2-1.cjs` contra servidor local simulado):** **passou** (`exit 0` — `VERIFICACAO_SPRINT2_1_COMPLETA_OK`):
  - Zero `pageerror`, zero `console.error` inesperado e zero overflow horizontal (`scrollWidth <= clientWidth + 2`) em `360×800`, `768×1024` e `1280×900` nas jornadas `/cardapio`, `/carrinho`, `/pedidos`, `/mesa` e `/conta` (além de `1280×900` em `/cadastro`, `/design-system`, `/entrar` e `/pedidos/:id`).
  - Comprovados na UI real do build AOT: filtro horizontal de categorias/favoritos/combos preservando itens sugeridos; remoção de `"Calcular total"`; ponto da carne `"Ao ponto"` + observação em burger vs omissão em refrigerante; stepper `(− 1 +)` alinhado; cálculo automático de frete ao abrir Delivery com endereço principal destravando `"Enviar pedido para aceite"`; cards compactos em `/pedidos` + expansão inline; recusa local em `/pedidos/ped-101` + `"Conferir pagamento"`; bloqueio de autocancelamento em `/pedidos/ped-103`; rejeição de código `999999` vs entrada `123456` em `/mesa/mesa-04` sem artefato `'Aa'`; e cabeçalho `>= 48px` com dropdown estilizado em `<app-disponibilidade>`.
- **Probes não executados / bloqueados no host Windows local:**
  - `scripts/test_identity_forms.cjs`, `scripts/test_profile_selects.cjs` e `scripts/test_unit_schedule_templates.cjs`: **bloqueados neste host** (`Executable doesn't exist at ...chrome-headless-shell-win64\chrome-headless-shell.exe`).
  - `scripts/test_kitchen_templates.cjs`: **bloqueado neste host** (`ERR_UNSUPPORTED_ESM_URL_SCHEME: ... Received protocol 'c:'` ao resolver import absoluto Windows no loader ESM).
  - Suítes E2E completas contra backend Spring/PostgreSQL (`e2e-pedidos`, `e2e-sprint04`, `e2e-catalogo`, etc.): **não executadas localmente** (ausência de PostgreSQL/Docker/WSL nesta estação; pendentes de homologação Linux).
- **Consistência do repositório:** `python scripts/check-repository.py` → `exit 0` (`959 arquivos conferidos; links locais e padrões de segredo aprovados. Âncoras exigem revisão adicional.`).

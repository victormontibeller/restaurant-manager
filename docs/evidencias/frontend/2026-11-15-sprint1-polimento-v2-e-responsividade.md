# Sprint 1 · Polimento Visual v2 e Responsividade (`360px`, `768px`, `1280px`)

- **Data:** 2026-11-15
- **Telas / Rotas:** `/cadastro`, `/recuperar-senha`, `/verificar-email`, `/aceitar-convite`, `/sem-acesso`, `/404`, `/design-system`, `<app-pwa>`
- **Área:** Autenticação Secundária · Páginas Informativas · Catálogo Interno & Rodapé PWA
- **Responsável técnico:** subagente `artesao-ux-bistro` (camada visual v2 nos 7 componentes de interface) + coordenador (preparo estrutural de wrapper/signals, shells/rotas `/cardapio`, `/mesa`, `main.ts`, `styles.css`, ajustes de polimento pós-auditoria AOT e validação final em Microsoft Edge)
- **Arquivos alterados nesta etapa v2:**
  - [styles.css](../../../frontend/src/styles.css)
  - [main.ts](../../../frontend/src/main.ts)
  - [cliente-layout.css](../../../frontend/src/app/rotas/cliente-layout.css)
  - [paginas-cliente.ts](../../../frontend/src/app/rotas/paginas-cliente.ts)
  - [identidade.component.ts](../../../frontend/src/app/identidade/identidade.component.ts)
  - [cadastro.component.ts](../../../frontend/src/app/identidade/cadastro.component.ts)
  - [recuperacao.component.ts](../../../frontend/src/app/identidade/recuperacao.component.ts)
  - [verificacao.component.ts](../../../frontend/src/app/identidade/verificacao.component.ts)
  - [aceitar-convite.component.ts](../../../frontend/src/app/identidade/aceitar-convite.component.ts)
  - [pagina-informativa.component.ts](../../../frontend/src/app/rotas/pagina-informativa.component.ts)
  - [catalogo.component.ts](../../../frontend/src/app/ui/catalogo.component.ts)
  - [pwa.component.ts](../../../frontend/src/app/pwa/pwa.component.ts)
  - [RELATORIO-PENDENCIAS-BACKEND.md](RELATORIO-PENDENCIAS-BACKEND.md) (`BE-16` a `BE-20`)

---

## 1. Como era antes (após Sprint 1 v1)

Embora a entrega inicial da Sprint 1 ([2026-11-14-fundacao-e-auth-secundaria.md](2026-11-14-fundacao-e-auth-secundaria.md)) já tivesse unificado tokens de cor e alvos de `48px`, a revisão de uso em `1280×900`, `768×1024` e `360×800` apontou oportunidades de polimento na versão **v2**:

1. **Subformulários de identidade em largura estreita no desktop:** `/cadastro`, `/recuperar-senha`, `/verificar-email` e `/aceitar-convite` empilhavam tudo em coluna única, subutilizando o container `.auth-card--dossie` (`64rem`) no desktop e empurrando os inputs para baixo da dobra em `360px` devido aos textos introdutórios longos.
2. **Jargão técnico e feedback de senha:** os textos visíveis de criação/redefinição de senha mencionavam `"12 a 72 bytes em UTF-8"`, não ofereciam alternância `Mostrar`/`Ocultar` nem medidor visual de progresso de caracteres.
3. **Páginas `/sem-acesso` e `/404` (`pagina-informativa.component.ts`):** cartão centralizado estreito (`560px`) sem painel lateral de atalhos diretos da casa nem atalho para `/gestao/entrar` quando o bloqueio é de acesso da equipe.
4. **Vitrine interna `/design-system` (`catalogo.component.ts`):** título genérico (`Uma experiência à mesa.`) sem explicitar que se trata de rota técnica de auditoria do sistema visual e sem swatch de contraste do estado desabilitado (`#efe9e0` / `#594e46`).
5. **Simetria do `<app-pwa>` no celular:** `max-width: 480px` no `:host` e `.offline-notice` podia destoar em largura do acordeão de conexão vizinho dentro de `.app-utilities` abaixo de `800px`, além de botões não ocuparem `100%` abaixo de `520px`.

---

## 2. Representação visual — Antes × Depois

Capturas geradas a partir do build AOT de produção (`frontend/dist/restaurant-manager/browser`) em Microsoft Edge headless nos viewports `1280×900` (desktop) e `360×800` (celular), com auditoria complementar em `768×1024` (tablet).

### Desktop (`1280×900`) — Antes × Depois

| Tela | Antes (v1) | Depois (v2 final) |
| --- | --- | --- |
| `/cadastro` | ![Cadastro antes desktop](imagens/sprint1-cadastro-antes-desktop.png) | ![Cadastro depois desktop](imagens/sprint1-cadastro-depois-desktop.png) |
| `/recuperar-senha` | — | ![Recuperação depois desktop](imagens/sprint1-recuperacao-depois-desktop.png) |
| `/verificar-email` | — | ![Verificação depois desktop](imagens/sprint1-verificacao-depois-desktop.png) |
| `/aceitar-convite` | ![Convite antes desktop](imagens/sprint1-convite-antes-desktop.png) | ![Convite depois desktop](imagens/sprint1-convite-depois-desktop.png) |
| `/mesa` | ![Mesa antes desktop](imagens/sprint1-mesa-antes-desktop.png) | ![Mesa depois desktop](imagens/sprint1-mesa-depois-desktop.png) |
| `/sem-acesso` | ![Sem acesso antes desktop](imagens/sprint1-sem-acesso-antes-desktop.png) | ![Sem acesso depois desktop](imagens/sprint1-sem-acesso-depois-desktop.png) |
| `/404` | — | ![404 depois desktop](imagens/sprint1-404-depois-desktop.png) |
| `/design-system` | ![Design System antes desktop](imagens/sprint1-design-system-antes-desktop.png) | ![Design System depois desktop](imagens/sprint1-design-system-depois-desktop.png) |
| `<app-pwa>` & horários | ![Rodapé PWA antes desktop](imagens/sprint1-rodape-pwa-antes-desktop.png) | ![Rodapé PWA depois desktop](imagens/sprint1-rodape-pwa-depois-desktop.png) |

### Celular (`360×800`) — Refatoração responsiva

| Tela | Antes (v1) | Depois (v2 final) |
| --- | --- | --- |
| `/cadastro` | ![Cadastro antes celular 360](imagens/sprint1-cadastro-antes-celular-360.png) | ![Cadastro depois celular 360](imagens/sprint1-cadastro-depois-celular-360.png) |
| `/recuperar-senha` | — | ![Recuperação depois celular 360](imagens/sprint1-recuperacao-depois-celular-360.png) |
| `/verificar-email` | — | ![Verificação depois celular 360](imagens/sprint1-verificacao-depois-celular-360.png) |
| `/aceitar-convite` | — | ![Convite depois celular 360](imagens/sprint1-convite-depois-celular-360.png) |
| `/mesa` | — | ![Mesa depois celular 360](imagens/sprint1-mesa-depois-celular-360.png) |
| `/sem-acesso` | — | ![Sem acesso depois celular 360](imagens/sprint1-sem-acesso-depois-celular-360.png) |
| `/404` | — | ![404 depois celular 360](imagens/sprint1-404-depois-celular-360.png) |
| `/design-system` | — | ![Design System depois celular 360](imagens/sprint1-design-system-depois-celular-360.png) |
| `<app-pwa>` & rodapé | — | ![Rodapé PWA depois celular 360](imagens/sprint1-rodape-pwa-depois-celular-360.png) |

---

## 3. O que foi alterado

| Tela / Elemento | Antes (v1) | Depois (v2) | Arquivo |
| --- | --- | --- | --- |
| Cadastro de cliente (`/cadastro`) | Coluna única, nota de `bytes`/`UTF-8`, sem revelar senha ou medidor | Dossiê `315px minmax(0, 1fr)` (`>= 860px`) com cartela lateral dinâmica (`MarcaService`), arco creme, guia pontilhada e nota de `Minha conta`; mobile com `.mob-marca-topo` e `<details class="mob-beneficios">` recolhido por padrão; `#senha-cadastro` com botão `Mostrar`/`Ocultar` (`48px`), medidor visual `textoForcaSenha()` **sem `role="status"`**, dica humana sem `bytes`/`UTF-8` e único `role="status"` em `#resultado` | [cadastro.component.ts](../../../frontend/src/app/identidade/cadastro.component.ts) |
| Recuperar senha (`/recuperar-senha`) | Coluna única sem resumo recolhível nem grade para senhas | Dossiê `315px minmax(0, 1fr)` com talão `COMO FUNCIONA O REACESSO`; mobile com `<details class="mob-resumo">` recolhido; bloco `02` com grade `.pw-grid-2` (`>= 680px`) para `#nova-senha` (`Mostrar`/`Ocultar`, barra/feedback sem `role="status"`) e `#confirmar-senha`, regra humana `#regra-senha` e único `role="status"` em `#resultado` | [recuperacao.component.ts](../../../frontend/src/app/identidade/recuperacao.component.ts) |
| Verificar e-mail (`/verificar-email`) | Bloco simples sem painel explicativo lateral nem pílulas | Dossiê `315px minmax(0, 1fr)` com talão `POR QUE CONFIRMAR SEU E-MAIL?` (`Identidade · E-mail validado`, `Senha e perfil · Preservados`, `Comprovantes · Sem bloqueios`, `Código · Uso único · 15 min`); mobile com `.mob-marca-topo`, pílulas `01 · E-mail` / `02 · Código` e `<details class="mob-resumo">` (`summary` `48px`); único `role="status"` em `#resultado` | [verificacao.component.ts](../../../frontend/src/app/identidade/verificacao.component.ts) |
| Aceitar convite (`/aceitar-convite`) | Formulário simples com menção a `bytes`/`UTF-8` | Dossiê `315px minmax(0, 1fr)` com talão picotado `CRACHÁ DA EQUIPE · {{ marca.nome() }}` e passo a passo pós-aceite (`/gestao/entrar`); mobile com `.mob-cracha` compacto horizontal no topo; grade `.pw-grid-2` para `#senha-convite` (com `Mostrar`/`Ocultar` `48px`, medidor e `textoForcaSenha()` sem `role="status"`) e `#confirmacao-convite`, regra humana `#regra-convite` e único `role="status"` em `#resultado` | [aceitar-convite.component.ts](../../../frontend/src/app/identidade/aceitar-convite.component.ts) |
| Sem acesso e 404 (`/sem-acesso`, `/404`) | Card estreito (`560px`) em coluna única sem atalhos diretos | Card `max-width: 960px` em 2 colunas (`1.15fr 0.85fr` `>= 820px`): esquerda com selo/logo dinâmico `MarcaService`, `<h1>` exato (`Esta área não <em>está no seu acesso.</em>` / `Essa página <em>saiu do cardápio.</em>`), ações `Ver cardápio`, `Minha conta` e botão `variant="secondary"` `Área da equipe` (`/gestao/entrar`) quando `acesso`; direita `#faf7f2` `Atalhos da casa · Navegação rápida` com 4 links pontilhados `>= 48px` (`/cardapio`, `/carrinho`, `/mesa`, `/pedidos`) e rodapé de suporte; empilhamento e botões `100%` `<= 600px` | [pagina-informativa.component.ts](../../../frontend/src/app/rotas/pagina-informativa.component.ts) |
| Design System (`/design-system`) | Título amplo e grade com 7 tokens | Cabeçalho inequívoco (`ROTA INTERNA · GUIA DE INTERFACE`, pill `Referência técnica de componentes`, `<h1>Sistema Visual & Componentes</h1>` e lead explicando escopo técnico e referência a `BE-02`); adição do token `Estado desabilitado` (`#efe9e0`, `Texto #594e46 · 6.69:1`) e ajuste confortável em `360px` preservando 100% de `.bistro-select-wrap` ↔ `#ui-unidade`, `RM_TABS` e `<dialog>` | [catalogo.component.ts](../../../frontend/src/app/ui/catalogo.component.ts) |
| Painel PWA no rodapé (`<app-pwa>`) | `:host` e `.offline-notice` travados em `max-width: 480px` | `@media (max-width: 800px)` com `:host { width: 100%; max-width: none; }` e `.offline-notice { max-width: none; }`; `@media (max-width: 520px)` com `.pwa-acoes` e botões `width: 100%` para simetria no celular `360px` | [pwa.component.ts](../../../frontend/src/app/pwa/pwa.component.ts) |
| Shell, foco global, `/cardapio`, `/mesa` e seletor `/design-system` | Contorno `:focus-visible` contornava `<main id="conteudo">` ao navegar; `..` após slogan em `/mesa`; placeholder truncado em `360px` (`aceitar-convite`, `cadastro`, `recuperacao`); possível race no clique da opção do seletor customizado | `main#conteudo:focus, main#conteudo:focus-visible { outline: none; }` mantendo anel intacto em controles interativos; `sloganPontuado()` em `PaginaMesaComponent` eliminando `..`; placeholder `"12 ou mais caracteres"` + `.pw-toggle` compacto (`68px`) e padding mobile sem corte em `360px`; `(mousedown)="$event.preventDefault()"` + sincronia direta de `<select #selUnidade>` em `CatalogoUiComponent`; ajustes de padding mobile em `.auth-card--dossie`, `cliente-layout.css` e `main.ts` | [styles.css](../../../frontend/src/styles.css), [paginas-cliente.ts](../../../frontend/src/app/rotas/paginas-cliente.ts), [catalogo.component.ts](../../../frontend/src/app/ui/catalogo.component.ts), [identidade.component.ts](../../../frontend/src/app/identidade/identidade.component.ts), [cliente-layout.css](../../../frontend/src/app/rotas/cliente-layout.css), [main.ts](../../../frontend/src/main.ts) |

---

## 4. Por quê

- **Impacto na experiência do usuário (UX):** elimina sobrecarga vertical no celular (`360×800`) mantendo o campo inicial e as etapas visíveis sem rolagem excessiva e sem truncamento de placeholders; remove o anel de foco programático ao redor de todo `<main id="conteudo">` ao carregar rotas preservando 100% do foco por teclado nos botões, links e campos; substitui jargões de engenharia (`bytes`/`UTF-8`) por orientação humana clara; adiciona alternância tátil `Mostrar`/`Ocultar` nas 3 telas de senha; elimina pontuação duplicada no hero `/mesa`; e aproveita larguras desktop (`1280px`) com dossiês informativos consistentes com `/cardapio`.
- **Conformidade com as normas do projeto:** segue integralmente [Interface e PWA](../../09_UI_GUIDELINES.md), [ADR 0003](../../adr/0003-spartan-navegacao-por-area.md), paleta oficial (`#faf7f2`, `#ffffff`, `#292521`, `#a53e2b`, `#7f2f20`, `#30523b`, `#6e6259`, `#594e46`), multi-tenancy dinâmico via `MarcaService` (zero marca ou inicial fixa), alvos `>= 48px` e `@media (prefers-reduced-motion: reduce)`.
- **Garantia estrutural:** nenhuma alteração em `backend/`, serviços HTTP de domínio, contratos de API existentes, rotas, `package*.json`, `angular.json` ou `service-worker.js`. Todos os `template:`/`styles:` dos 4 subcomponentes de identidade permanecem **inline** para o compilador JIT, mantendo todos os `id`, `for`, `tabindex="-1"`, `aria-describedby`, `aria-invalid`, `role="alert"` e o **único `role="status"`** (`#resultado`).

---

## 5. Pendências e Requisitos para o Backend

As evoluções estruturais levantadas durante a Sprint 1 foram registradas pelo coordenador em [RELATORIO-PENDENCIAS-BACKEND.md](RELATORIO-PENDENCIAS-BACKEND.md) (`BE-16` a `BE-20`); nenhuma tag técnica interna (`BE-16A`, etc.) ou controle fictício foi exibido nas telas finais de produção.

---

## 6. Validações executadas

Resultados literais observados **após a última edição de código em `frontend/`**:

- **`npm --prefix frontend run format:check`:** **passou** (`exit 0` — `All matched files use Prettier code style!`).
- **`npm --prefix frontend run typecheck`:** **passou** (`exit 0` — `tsc --noEmit -p tsconfig.app.json && tsc -p tsconfig.e2e.json`).
- **`npx ngc -p tsconfig.app.json --noEmit`:** **passou** (`exit 0`).
- **`npm --prefix frontend run test:logic`:** **passou** (`exit 0` — todas as verificações unitárias em `scripts/test-frontend.cjs` aprovadas).
- **`node scripts/check_contrast.cjs --self-test`:** **passou** (`exit 0` — `14 verificações de matemática, limites, destino e reutilização de sessão aprovadas; nenhuma navegação executada.`).
- **`node scripts/test_pwa.cjs`:** **passou** (`exit 0` — `PWA: cache somente do shell, query sensível descartada, APIs/credenciais excluídas, atualização explícita e falha atômica; ambiente simulado.`).
- **Build AOT de produção (`ng build --configuration production` + `node ../scripts/build-pwa.cjs`):** **passou** (`exit 0` — `Initial total 315.02 kB` / `87.36 kB`; `PWA: 34 arquivos públicos; versão 964cbf9e91777c7abffb; APIs excluídas.`). Observação de ambiente: executado com VS Node `v24.12.0` aplicando shim em memória de `process.versions.node = '26.0.0'` para o `@angular/cli`.
- **Sonda JIT de identidade (`scripts/test_identity_forms.cjs`) em Microsoft Edge:** **passou** (`exit 0` — `chromium: foco nas quatro jornadas, erros de senha associados, UTF-8, limpeza, resultado incerto e handler de retorno aprovados; transporte fictício/JIT.`), executada em `msedge.exe` por ausência do binário `chrome-headless-shell.exe` nesta estação.
- **Auditoria multi-viewport AOT em Microsoft Edge (`1280×900`, `768×1024`, `360×800`) com API simulada local:** **passou** (`exit 0` — `ALL_AOT_SPRINT1_V2_CHECKS_PASSED`):
  - `PAGE_ERRORS: []` e `0` falhas em todas as **27 verificações** (`cadastro`, `recuperacao`, `verificacao`, `convite`, `sem-acesso`, `404`, `mesa`, `design-system`, `rodape-pwa` × 3 viewports) com `ovf=false`, `jargon=false`, `demo=false` e `small=[]` (`>= 40px` em controles visíveis).
  - Interações validadas após renderização: feedback curto (`"Faltam 8 caracteres para atingir o mínimo de 12."`), feedback suficiente (`"Tamanho bom para proteger sua conta."`), alternância `Mostrar` -> `type="text"` confirmada em `/cadastro`, `/recuperar-senha` e `/aceitar-convite`, seleção de unidade no `/design-system` sincronizando `#ui-unidade` e `.bistro-select-val` para `"Jardins"`, e retorno de foco para `"Abrir exemplo"` ao fechar o diálogo (`triggerFocusedAfterClose: true`).
- **`python scripts/check-repository.py`:** **passou** (`exit 0` — `914 arquivos conferidos; links locais e padrões de segredo aprovados. Âncoras exigem revisão adicional.`).

---

## 7. Limites de ambiente

- As execuções de navegador utilizaram Microsoft Edge (`msedge.exe`) com backend HTTP simulado para rotas de API/marca porque `chrome-headless-shell.exe` não está presente no cache do Playwright neste host; testes E2E integrados contra backend PostgreSQL real ficam para homologação.

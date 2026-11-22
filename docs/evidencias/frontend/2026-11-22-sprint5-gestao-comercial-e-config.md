# Sprint 5 — Gestão Comercial & Configurações de Loja em Tema Claro + Escuro (`/gestao/*`)

- **Data:** 2026-11-22
- **Telas / Rotas:** `/gestao/catalogo`, `/gestao/configuracoes/delivery`, `/gestao/configuracoes/prazos` e `/gestao/integracoes`
- **Área:** Gestão Comercial & Configurações Administrativas (multi-tenant white-label)
- **Responsável técnico:** Coordenador (Fase A: helpers puros TypeScript, imports de `HlmButton` e criação de `gestao-catalogo.css`) + subagente `artesao-ux-bistro` (Fase B: camada visual completa Claro + Escuro)
- **Arquivos alterados na Fase B:**
  - [gestao-catalogo.css](../../../frontend/src/app/catalogo/gestao-catalogo.css)
  - [gestao-catalogo.component.html](../../../frontend/src/app/catalogo/gestao-catalogo.component.html)
  - [categoria-editor.component.ts](../../../frontend/src/app/catalogo/categoria-editor.component.ts) *(apenas `template:` inline)*
  - [produto-editor.component.ts](../../../frontend/src/app/catalogo/produto-editor.component.ts) *(apenas `template:` inline)*
  - [adicionais-editor.component.ts](../../../frontend/src/app/catalogo/adicionais-editor.component.ts) *(apenas `template:` inline)*
  - [grupos-editor.component.ts](../../../frontend/src/app/catalogo/grupos-editor.component.ts) *(apenas `template:` inline)*
  - [midia-editor.component.ts](../../../frontend/src/app/catalogo/midia-editor.component.ts) *(apenas `template:` inline)*
  - [oferta-unidade.component.ts](../../../frontend/src/app/catalogo/oferta-unidade.component.ts) *(apenas `template:` inline)*
  - [config-delivery.component.html](../../../frontend/src/app/delivery/config-delivery.component.html)
  - [prazos-aceite.component.html](../../../frontend/src/app/unidades/prazos-aceite.component.html)
  - [prazos-aceite.component.css](../../../frontend/src/app/unidades/prazos-aceite.component.css)
  - [integracao.component.html](../../../frontend/src/app/pagamentos/integracao.component.html)
  - [operacao.css](../../../frontend/src/app/operacao.css)

---

## 1. Como era antes

Na inspeção estática dos templates e folhas de estilo das quatro jornadas administrativas da Sprint 5 sob `<app-equipe-layout>`, foram identificados os seguintes problemas de hierarquia, ergonomia tátil e responsividade:

1. **Títulos redundantes sob o shell da equipe:** `Gestão do catálogo`, `Regiões de entrega e checkout` e `Prazos de aceite` repetiam subtítulos visíveis (`<h2>` / `<h3>`) imediatamente abaixo do cabeçalho editorial do `<app-equipe-layout>`, reduzindo o espaço útil acima da dobra em `360×800` e `768×1024`.
2. **Catálogo administrativo (`/gestao/catalogo`):**
   - Grade genérica sem barra de filtros rápidos (busca textual, filtro por categoria e pílulas de status `Todos` / `Ativos` / `Inativos` / `Sugestões`), sem miniatura/monograma nos cards de produto e com botões extensos repetindo o nome do item em todos os cards (`Editar produto ...`, `Oferta de ...`, `Editar categoria ...`).
   - Editores inline (`categoria-editor`, `produto-editor`, `adicionais-editor`, `grupos-editor`, `midia-editor`, `oferta-unidade`) com `<fieldset>` encaixotados em múltiplas bordas aninhadas, `<select>` nativos crus e `<input type="file">` sem proteção de largura em `360px`.
   - Folha compartilhada apenas com `catalogo.css`, sem isolamento administrativo para o modo operacional e editores.
3. **Regiões de Delivery e Checkout (`/gestao/configuracoes/delivery`):** formulário linear longo com `<fieldset>` empilhados sem resumo de KPIs no topo, sem alerta visual prévio de CEPs sobrepostos antes do envio e sem agrupamento proporcional de `CEP inicial` / `CEP final` e `Taxa` / `Mínimo` em celular (`360px`).
4. **Prazos de Aceite (`/gestao/configuracoes/prazos`):** select nativo simples para o escopo, inputs de segundos crus sem conversão legível para minutos/segundos, ausência de atalhos rápidos de SLA (`Ágil 2m/5m`, `Padrão 3m/8m`, `Pico 5m/15m`) e ausência de barra visual da linha do tempo até o cancelamento.
5. **Integração Mercado Pago (`/gestao/integracoes`):** texto único corrido com `Conta vendedora: ...` sem talão de status, sem metadados separados (`Conta vendedora`, `Situação`, `Validade da autorização`) e sem banner de retorno OAuth (`?conexao=concluida`).

---

## 2. Representação visual — Antes × Depois

A representação visual interativa da Sprint 5 (Desktop `1280px`, Tablet `768px` e Celular `360px`, em **Tema Claro + Tema Escuro** e alternância multi-tenant) foi validada e aprovada pelo usuário antes desta etapa de implementação.

Como este ambiente de execução concentra apenas a etapa estática e de compilação frontend (sem servidor Java/PostgreSQL local nem navegador Playwright conectado para geração de PNGs em runtime), não foram geradas capturas de tela em `docs/evidencias/frontend/imagens/` nesta sessão. A bateria completa de capturas em navegador real permanece vinculada à etapa de integração e homologação E2E.

---

## 3. O que foi alterado

| Elemento / Bloco | Antes | Depois | Arquivo(s) |
| --- | --- | --- | --- |
| Folha administrativa do catálogo | Misturada às regras genéricas de `catalogo.css` | Folha isolada `.gc-*` com tokens oficiais Claro + Escuro, sem impactar `/cardapio`, `/carrinho` ou configurador | `frontend/src/app/catalogo/gestao-catalogo.css` |
| Listagem, filtros e navegação do catálogo | Abas simples e cards sem filtros nem miniaturas | Abas segmentadas `.gc-seg-tabs`, barra de busca + seletor de categoria `.bistro-select-wrap` + pílulas 2×2, thumbs `48×48` com fallback em inicial e botões 50/50 com sufixo `.sr-only` | `frontend/src/app/catalogo/gestao-catalogo.component.html` |
| Editores inline de catálogo e oferta | `<fieldset>` aninhados crus, `<select>` nativos e botões sem hierarquia | Painéis `.gc-editor-panel`, fieldsets `.gc-fieldset-flat` / `.gc-subcard` preservando `getByRole('group')`, switches `.gc-tactile-switch`, chips `.gc-check-chip`, seletores `.bistro-select-wrap` completos com ícone `.bistro-select-ico`, `tabindex="-1"`, `.bistro-select-opt-main`, check `<svg>` e alvo `>= 48px`, `gc-file-input` protegido contra overflow e CTA `[hlmBtn]` padrão Terracota (`--primary`) na oferta da unidade | `categoria-editor.component.ts`, `produto-editor.component.ts`, `adicionais-editor.component.ts`, `grupos-editor.component.ts`, `midia-editor.component.ts`, `oferta-unidade.component.ts` |
| Delivery e regiões por CEP | Lista linear sem KPIs nem agrupamento responsivo | Faixa de 3 KPIs (`2+1` em `<= 640px`), alerta informativo para `sobreposicoesCep()` sem bloquear envio, cards `.del-regiao-card` com `CEP inicial`/`CEP final` e `Taxa`/`Mínimo` em pares `50/50` alinhados pela base no mobile, botão `Adicionar região` em `width: 100%` no mobile e talão de confirmação | `frontend/src/app/delivery/config-delivery.component.html`, `frontend/src/app/operacao.css` |
| Prazos de aceite e SLA | Campos numéricos crus sem presets nem linha visual | Seletor `.bistro-select-wrap` completo para escopo (`trocarEscopoValor`), presets em 3 colunas (`Ágil 2m/5m`, `Padrão 3m/8m`, `Pico 5m/15m`) com `min-height: 48px`, pílulas de duração humanizada, erro inline, linha do tempo visual `.sla-timeline` e botão `Consultar prazos atuais` em `width: 100%` em `<= 640px` | `frontend/src/app/unidades/prazos-aceite.component.html`, `prazos-aceite.component.css`, `frontend/src/app/operacao.css` |
| Mercado Pago (OAuth) | Parágrafo simples com texto de status | Talão `.s5-talao` mantendo `<h2>Mercado Pago do restaurante</h2>` visível (`S04-UI09`), badge de situação, resumo visível em linha única preservando `/Conta vendedora:.*Conectada/` (`S04-UI07`), grade de 3 metadados, retorno OAuth e botões `.mp-actions` simétricos (`width: 100%` empilhados no mobile com CTA primário acima) | `frontend/src/app/pagamentos/integracao.component.html`, `frontend/src/app/operacao.css` |

### Detalhes de conformidade técnica e visual e correções anti-regressão (Regra 7)

- **Paleta oficial estrita (Claro + Escuro) e zero botão verde em cadastros:** aplicados exclusivamente os tokens definidos em `frontend/src/styles.css`. Removida a classe indevida `.btn-servir-mesa` de `oferta-unidade.component.ts` (`Salvar oferta da unidade` voltou ao `[hlmBtn]` padrão Terracota `--primary`) e excluída a definição de `.btn-servir-mesa` de `gestao-catalogo.css`. Zero ocorrências de botão verde ou azul/verde legado na Sprint 5.
- **Padronização canônica dos 7 dropdowns `.bistro-select-wrap` (`>= 48px`):** padronizados `#catalogo-operacional-unidade`, `#gestao-filtro-categoria`, `#produto-categoria`, `#produto-tipo`, `#{{ opcao.id }}-produto`, `#oferta-unidade` e `#escopo-prazos` exatamente conforme `operacao-pedidos.component.html` e `equipe-layout.component.html`:
  - Ícone `<svg class="bistro-select-ico">` dentro de `.bistro-select-pill` antes de `.bistro-select-val`;
  - Remoção do override conflitante em `gestao-catalogo.css` mantendo `padding: 0 36px 0 40px` e `min-height: 48px; height: 100%;` em `select.bistro-select-native` (exigido por `verificarAlvoDeToque` em `e2e-catalogo`);
  - Botões `.bistro-select-opt` com `tabindex="-1"`, `<span class="bistro-select-opt-main"><span>...</span></span>`, `<svg width="15" height="15" viewBox="0 0 24 24">` dentro de `.bistro-select-opt-check` (substituindo `✓` textual), sincronização de `select.value` e devolução de `.focus()` ao `<select>` nativo no clique;
  - Proteção mobile (`<= 640px`): `.bistro-select-popover` com `left: 0; right: 0; min-width: 0; max-width: calc(100vw - 32px);` em `gestao-catalogo.css` e `.s5-painel` em `operacao.css` para impedir vazamento fora da viewport em `360px`.
- **Alinhamento, ordem e toque (`360px`, `768px`, `1280px`):**
  - `.gc-prod-info` com `min-width: 0`, `.gc-prod-title-row` com `flex-wrap: wrap` e `h3` com `flex: 1 1 8.5rem; min-width: 0` em `gestao-catalogo.css` para que o título do produto não seja comprimido quando o preço ou `'Indisponível'` aparecer ao lado em `360px`;
  - `.gc-seg-tab`, `.gc-pill-btn` e `.sla-preset-btn` elevados para `min-height: 48px`;
  - `.gc-toolbar-row--end`, `.s5-acoes-bloco`, `.s5-grid-2 > button` e `.mp-actions` ajustados para alinhamento pela base no desktop e `width: 100%` empilhado (CTA primário acima dos secundários) em `<= 640px`, sem `style="flex: 1 1 12rem"` inline em `integracao.component.html`, e `align-items: end` em `.del-regiao-top` / `.del-regiao-bot`.
- **Preservação integral de contratos E2E:** mantidos `<fieldset>`/`<legend>`, IDs, rótulos, `role="alert"`, `role="status"`, `Alterar tipo e limpar composição` via `selecionarTipoValor(...)`, botão `Salvar regiões e prazo` sempre habilitado mesmo com `sobreposicoesCep().length > 0` (`S04-UI02`), inputs livres de segundos em prazos (`S03-UI05`), título visível `Mercado Pago do restaurante` (`S04-UI09`) e resumo acessível da conta vendedora (`S04-UI07`).

---

## 4. Por quê

- **Impacto na experiência do usuário (UX):** padroniza toda a gestão comercial e de configurações da loja com a mesma clareza editorial e tátil de `/cardapio`, reduz fadiga visual em botões repetitivos, evita estouro horizontal em `360px` (inclusive em upload de mídia e faixas de CEP) e oferece feedback imediato de duração humana, sobreposição de CEPs e linha de SLA.
- **Conformidade com as normas do projeto:** atende [Interface, acessibilidade e PWA](../../09_UI_GUIDELINES.md), [Padrões de código](../../10_CODING_STANDARDS.md), [Definition of Done](../../12_DEFINITION_OF_DONE.md), [ADR 0003 — Spartan UI e navegação por área](../../adr/0003-spartan-navegacao-por-area.md) e critérios WCAG 2.2 AA (alvos `>= 48px`, `tabular-nums`, contraste opaco em Claro/Escuro e `prefers-reduced-motion`).
- **Garantia não-estrutural:** nenhum arquivo de backend, serviço, modelo, rota, guarda, teste E2E ou script foi alterado na Fase B; todos os fluxos de rede, idempotência, reconciliação e contratos de automação foram preservados.

---

## 5. Pendências e Requisitos para o Backend

Nenhuma tela desta Sprint está bloqueada. O botão de desconexão direta do Mercado Pago continua omitido na interface até disponibilização de endpoint específico no backend (`BE-11`), mantendo o fluxo atual de reconexão/troca via `"Conectar ou autorizar novamente"`.

---

## 6. Validações executadas

Comandos executados após a última edição da camada visual (incluindo correções da Regra 7):

- **`npx --prefix frontend prettier --check` nos 9 arquivos alterados (`gestao-catalogo.css`, `gestao-catalogo.component.html`, `produto-editor.component.ts`, `grupos-editor.component.ts`, `oferta-unidade.component.ts`, `config-delivery.component.html`, `prazos-aceite.component.html`, `integracao.component.html`, `operacao.css`) + `npm --prefix frontend run format:check`:** aprovado (`All matched files use Prettier code style!`, código `0`).
- **`npm --prefix frontend run typecheck` (`tsc --noEmit -p tsconfig.app.json && tsc -p tsconfig.e2e.json`):** aprovado (`0` erros, código `0`).
- **`npx --prefix frontend ngc -p frontend/tsconfig.app.json --noEmit`:** aprovado (`0` erros de template/AOT estrito, código `0`).
- **`npm --prefix frontend run test:logic` (`node ../scripts/test-frontend.cjs`):** aprovado (`0` falhas, código `0`).
- **`node scripts/test_catalog_media.cjs`, `node scripts/test_catalog_recovery.cjs`, `node scripts/test_catalog_cart.cjs` e `node scripts/test_route_shell.cjs`:** aprovados (código `0` em todos).
- **`node scripts/check_contrast.cjs --self-test`:** aprovado (`14 verificações de matemática, limites, destino e reutilização de sessão aprovadas; nenhuma navegação executada`, código `0`).
- **`npm --prefix frontend run build` (`ng build && node ../scripts/build-pwa.cjs`):** falhou com código `1` por versão do Node local (`Node.js version v24.12.0 detected. The Angular CLI requires a minimum Node.js version of v22.22.3 or v24.15.0 or v26.0.0.`).
- **Sondas visuais / E2E Playwright (`360×800`, `768×1024`, `1280×900`):** não executadas em ambiente integrado por ausência de servidor backend/frontend ativo.
- **`python scripts/check-repository.py`:** aprovado após a última edição.

---

## 7. Limites e próximos passos

- Executar `npm --prefix frontend run build` no ambiente com Node compatível (`>= 24.15.0`) para confirmar orçamento de bundle (`<= 450 kB`) e PWA.
- Executar a bateria Playwright (`e2e-catalogo`, `e2e-pedidos`, `e2e-sprint04`) e capturar evidências visuais em `360×800`, `768×1024` e `1280×900` (Claro + Escuro) contra o ambiente integrado.

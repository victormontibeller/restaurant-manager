# Evidências e Relatórios de Alteração Visual (Frontend)

Este diretório concentra os relatórios nominais gerados pelo subagente especialista **`artesao-ux-bistro`** (plugin `atelier-bistro`) para cada intervenção de interface nas áreas **Cliente**, **Gestão** e **Cozinha/KDS**.

Referências canônicas obrigatórias:
- [Interface, acessibilidade e PWA](../../09_UI_GUIDELINES.md)
- [ADR 0003 — Spartan UI e navegação por área](../../adr/0003-spartan-navegacao-por-area.md)
- [Padrões de código](../../10_CODING_STANDARDS.md)
- [Estratégia de validação](../../26_TEST_STRATEGY.md)

## Convenção obrigatória de arquivos e fluxo de Sprints

- **Gate obrigatório de abertura de Sprint (Planejamento + Representação Visual):** antes de qualquer alteração de código ao iniciar uma Sprint, o agente deve apresentar ao usuário o plano da Sprint com uma **representação visual** das telas/fluxos (`360px` / `768px` / `1280px`, via protótipo HTML visual, widget/imagem ou mockup comparativo) e **aguardar aprovação explícita** antes de editar arquivos do sistema.
- **Fluxo Git:** commits locais por sprint/etapa concluída na branch `feat/frontend-bistro-sprints`, consolidando **um único Pull Request somente ao final de todas as sprints**.
- Padrão de nome: `YYYY-MM-DD-<tela>-<melhoria>.md` (nunca nomes genéricos como `relatorio.md` ou `frontend.md`).
- Toda entrega com mudança em `frontend/` deve registrar no relatório:
  1. **Como era antes** (diagnóstico visual, ergonomia e estado inicial em `360px`, `768px` e `1280px`);
  2. **Representação visual — Antes × Depois** (capturas de tela sanitizadas, sem dados pessoais ou abas privadas do navegador, gravadas em `docs/evidencias/frontend/imagens/` e embutidas no relatório para comparação direta em desktop e celular);
  3. **O que foi alterado** (quadro comparativo + lista exata de arquivos `.html`, `.css`, assets ou trechos visuais tocados);
  4. **Por quê** (justificativa UX + aderência às normas do projeto + declaração explícita de preservação estrutural);
  5. **Pendências e Requisitos para o Backend** (sempre que a tela consumir ou preparar campos/endpoints novos ainda pendentes de integração no servidor);
  6. **Validações executadas** (resultados literais de Prettier, `typecheck`, `test:logic`, contraste, sondas aplicáveis, `build` e `scripts/check-repository.py`).

## Índice de entregas visuais

| Data | Tela / Área | Relatório | Escopo |
| --- | --- | --- | --- |
| 2026-11-08 | Visão geral · Redesenho Spartan | [redesenho-frontend-2026-11-08.md](../redesenho-frontend-2026-11-08.md) | Migração inicial de áreas e tokens iniciais |
| 2026-11-10 | Cozinha · Painel KDS | [painel-cozinha-2026-11-10.md](../painel-cozinha-2026-11-10.md) | Painel em 3 colunas, abas responsivas e cartão KDS |
| 2026-11-14 | Cliente · `/cardapio` e Comanda | [2026-11-14-cardapio-vitrine-e-comanda.md](2026-11-14-cardapio-vitrine-e-comanda.md) | Vitrine, remoção do `'M'` fixo, suporte visual a `logoUrl`/`bannerUrl` via `MarcaService`, fallback neutro e requisitos de backend |
| 2026-11-14 | Identidade & Delivery · `/conta` e `/entrar` | [2026-11-14-conta-dossie-multi-tenant-e-seguranca.md](2026-11-14-conta-dossie-multi-tenant-e-seguranca.md) | Redesenho v3 multi-tenant em 2 colunas, verificação inline, Checkout Pro, LGPD, talões de `app-enderecos` e requisitos de backend |
| 2026-11-14 | Sprint 1 · Fundação, Shells & Auth Secundária | [2026-11-14-fundacao-e-auth-secundaria.md](2026-11-14-fundacao-e-auth-secundaria.md) | Tokens/utilitários em CSS plano, PWA, `main.ts`, `/mesa` header + horários, `/sem-acesso`/404, `/design-system` e subformulários de identidade |
| 2026-11-15 | Sprint 1 · Polimento v2 e Responsividade | [2026-11-15-sprint1-polimento-v2-e-responsividade.md](2026-11-15-sprint1-polimento-v2-e-responsividade.md) | Dossiês em 2 colunas nas 4 sub-rotas de auth, `/sem-acesso`/404 com atalhos pontilhados, `/design-system` v2, largura simétrica PWA e responsividade `360px`/`768px`/`1280px` |
| 2026-11-15 | Sprint 2 · Jornada Completa do Cliente | [2026-11-15-sprint2-jornada-cliente.md](2026-11-15-sprint2-jornada-cliente.md) | Checkout (`confirmar-pedido`), `/pedidos`, `/pedidos/:id`, Checkout Pro MP, `/mesa` (pré e pós-entrada), disponibilidade pública em `/cardapio`, paleta bistrô em `operacao.css` e `BE-21`/`BE-22` |
| 2026-11-15 | Sprint 2.1 · Correções da Jornada do Cliente | [2026-11-15-sprint2-1-correcoes-cliente.md](2026-11-15-sprint2-1-correcoes-cliente.md) | Cardápio em 3 colunas + abas horizontais + carrossel, ponto da carne sem botão redundante, revisão/checkout em modal, cotação automática Delivery, `/pedidos` compactos, `/mesa` responsiva sem canal fixo fora da mesa, `/entrar`/`/cadastro`/`/conta` e `/design-system` |
| 2026-11-15 | Pós-Sprint 2.1 · Carrinho & Pedidos | [2026-11-15-carrinho-e-pedidos-polimento.md](2026-11-15-carrinho-e-pedidos-polimento.md) | Miniaturas em `/carrinho` e modal de revisão (comanda lateral enxuta mantida), simetria de **Ver resumo** / **Acompanhar detalhe** em `/pedidos`, e cabeçalho, prioridade de pagamento e fotos de itens em `/pedidos/:id` |
| 2026-11-16 | Pós-Sprint 2.1 · Fluxo único em Meus Pedidos (`/pedidos`) | [2026-11-16-meus-pedidos-fluxo-unico.md](2026-11-16-meus-pedidos-fluxo-unico.md) | Remoção de `"Ver resumo"` e `<app-pedido-detalhe>` inline em `/pedidos` (`!mesa()`), resumo rico com miniaturas `36×36` / monograma, alertas de pagamento/cancelamento e CTA único `>= 48px` para `/pedidos/:id` |

## Planejamento de Sprints e Fronteira com o Backend

- [Plano Master de Sprints — Frontend](PLANO-SPRINTS-FRONTEND.md): organização passo a passo do restante de `frontend/` em 7 Sprints isoladas (com prompts prontos para novo chat e restrições de JIT/testes).
- [Relatório de Pendências e Evoluções para o Backend](RELATORIO-PENDENCIAS-BACKEND.md): inventário `BE-01`–`BE-25` consolidado para execução posterior no backend sem editar `backend/` durante o ciclo visual.

| Sprint | Escopo resumido | Status |
| --- | --- | --- |
| Sprint 1 | Fundação global (`styles.css`, `main.ts`, PWA, `/sem-acesso`, `/mesa` header, `/design-system`) e auth secundária (`cadastro`, `recuperacao`, `verificacao`, `aceitar-convite`) | Concluída |
| Sprint 2 | Jornada do cliente pós-carrinho (`confirmar-pedido`, `/pedidos`, `/pedidos/:id`, Checkout Pro, `/mesa`, disponibilidade) | Concluída |
| Sprint 2.1 | Correções pós-inspeção de toda a jornada do cliente (`/cardapio`, configurador, `/carrinho`, `/pedidos`, `/mesa`, `/entrar`, `/cadastro`, `/conta`, `/design-system`, `BE-23`–`BE-25`) + polimento de miniaturas e fluxo único em `/pedidos` | Concluída |
| Sprint 3 | Shell da equipe (`equipe-layout`) e Painel KDS (`/cozinha`) na paleta bistrô de alto contraste | Planejada |
| Sprint 4 | Gestão operacional diária (Pedidos, Mesas/Salão, Expedição, Financeiro, Pendências e Vendas) | Planejada |
| Sprint 5 | Gestão comercial e configurações (Catálogo admin, Mídia, Delivery, Prazos e Mercado Pago) | Planejada |
| Sprint 6 | Gestão corporativa JIT (`acessos`, `convites`, `unidades`, `funcionamento`, `eventos-unidade`) | Planejada |
| Sprint 7 | Console SaaS (`/plataforma`) e auditoria transversal final (WCAG AA, 0 legado, PWA) | Planejada |

# Relatório de Pendências e Evoluções para o Backend (Backlog Pós-Frontend)

Este relatório consolida **todos os requisitos, lacunas de contrato e evoluções de API** identificados durante a execução das entregas v3 de `/cardapio`, `/conta`, `/entrar` e durante o planejamento completo de todo o frontend em [Plano Master de Sprints — Frontend](PLANO-SPRINTS-FRONTEND.md).

**Regra de fronteira:** o ciclo de sprints do frontend **não edita** `backend/`. Todos os itens abaixo ficam documentados para execução posterior pela frente de backend (Java/Spring Boot + PostgreSQL), preservando integralmente as regras canônicas de [Segurança](../../04_SECURITY.md), [Tenancy](../../06_MULTI_TENANT.md), [API](../../08_API_STANDARDS.md) e [Acessos](../../11_ACCESS_CONTROL.md).

---

## 1. Matriz Resumo de Itens (`BE-01` a `BE-25`)

| ID | Prioridade | Categoria | Resumo do requisito | Origem / Sprint |
| --- | --- | --- | --- | --- |
| `BE-01` | **P0** | Contrato já consumido | Ampliar `GET /api/v1/restaurante` com `logoUrl`, `bannerUrl` e `slogan` | `/cardapio`, `/conta` (`MarcaService`) |
| `BE-02` | **P0** | Contrato multi-tenant | Gestão e upload seguro de marca/logo/banner por `ADMINISTRADOR` | `/cardapio`, Sprint 5 |
| `BE-03` | **P0** | Contrato já consumido | Ampliar `GET /api/v1/auth/me` com dossiê seguro do usuário (`versao`, `cpfMascarado`, etc.) | `/conta` (`SessaoService`) |
| `BE-04` | **P0** | Contrato já consumido | Criar `PUT /api/v1/auth/me` para atualizar dados cadastrais + LGPD/CPF com `versao` otimista | `/conta` (`SessaoService`) |
| `BE-05` | **P0** | Contrato já consumido | Criar `POST /api/v1/auth/verificacao/reenviar` e suportar confirmação inline em `POST /api/v1/auth/verificacao/confirmar` | `/conta` (`SessaoService`) |
| `BE-06` | **P0** | Contrato já consumido | Criar `POST /api/v1/auth/senha` (alteração de senha logada) | `/conta` (`SessaoService`) |
| `BE-07` | **P0** | Contrato já consumido | Criar `POST /api/v1/auth/sessoes/encerrar-outras` | `/conta` (`SessaoService`) |
| `BE-08` | **P0** | Contrato já consumido | Criar `POST /api/v1/auth/exclusao` (autoexclusão / anonimização LGPD) | `/conta` (`SessaoService`) |
| `BE-09` | **P0** | Contrato já consumido | Suportar `principal` (único por cliente ativo) e `DELETE` opcional em `/api/v1/clientes/me/enderecos` | `app-enderecos` (`EnderecosService`) |
| `BE-10` | **P1** | Nova evolução UX | Expor `nome` em `FuncionarioResumo` (`GET /api/v1/equipe`) e opcionalmente nos convites | Sprint 6 (`acessos`, `convites`) |
| `BE-11` | **P1** | Nova evolução UX | Endpoint de desconexão segura do Mercado Pago (`POST /api/v1/integracoes/mercadopago/desconectar`) | Sprint 5 (`integracao`) |
| `BE-12` | **P1** | Nova evolução UX | Enriquecer `NotificacaoOperacional` (`criadaEm`, resumo) e permitir marcar notificação reconhecida/reenviada | Sprint 4 (`pendencias`) |
| `BE-13` | **P1** | Nova evolução UX | Quebra por canal/pagamento e exportação auditada em `GET /api/v1/relatorios/vendas` | Sprint 4 (`vendas`) |
| `BE-14` | **P2** | Evolução operacional | Endpoint agregado leve de contadores por unidade para badges da navegação (`GET /api/v1/operacao/resumo`) | Sprints 3 e 4 (`equipe-layout`) |
| `BE-15` | **P2** | Evolução de escala | Filtros server-side adicionais (`estado` em `/me/pedidos`, `busca` em `/operacao/pedidos`, status em `/operacao/mesas`) | Sprints 2 e 4 |
| `BE-16` | **P1/P2** | Experiência de cadastro/reacesso | Retornar `cooldownReenvioSegundos` nas solicitações de código (`BE-16A`) e aceitar `nome` / `receberEmailsPedido` opcionais ao confirmar `/cadastro` (`BE-16B`) | Sprint 1 (`/cadastro`, `/recuperar-senha`, `/verificar-email`) |
| `BE-17` | **P2** | Experiência de convite | Avaliação de pré-consulta segura (com proteção anti-enumeração/rate-limit) para exibir perfil/unidades no crachá do convite antes do aceite | Sprint 1 (`/aceitar-convite`) |
| `BE-18` | **P1** | Suporte público da casa | Extensão opcional de `GET /api/v1/restaurante` (`BE-01`) com `telefoneContato`, `whatsappContato` e `emailContato` para ajuda em `/sem-acesso`, `/404` e `/cadastro` | Sprint 1 (`/sem-acesso`, `/404`, `/cadastro`) |
| `BE-19` | **P2** | Hospitalidade no salão | `GET /api/v1/mesas/publico/{mesaId}` retornando apenas rótulo amigável e setor da mesa (sem código ou dados de comanda) | Sprint 1 e 2 (`/mesa/:mesaId`) |
| `BE-20` | **P2** | Observabilidade pública leve | Campos opcionais não sensíveis (`versaoAplicacao` / `avisoOperacional`) em `GET /api/v1/status`, preservando `/actuator/health` exato | Sprint 1 (Rodapé técnico e PWA) |
| `BE-21` | **P1/P2** | Clareza de acompanhamento | Incluir `unidadeNome` e `mesaNome` em `PedidoDetalhe` (`GET /api/v1/me/pedidos` e `/pedidos/{id}`) | Sprint 2 (`/pedidos`, `/pedidos/:id`, `/mesa`) |
| `BE-22` | **P2** | Transparência no Checkout Pro | Incluir `criadoEm` e `valor` em `CheckoutResumo` (`GET /api/v1/me/pedidos/{id}/pagamento`) | Sprint 2 (`<app-pagamento-pedido>`) |
| `BE-23` | **P1** | Personalização por item | Suportar `observacao` por linha em `Linha`, `SnapshotLinha`, `LinhaPedido` e `LinhaPreparo` (além da nota geral do pedido) | Sprint 2.1 (`ConfiguradorProdutoComponent`, KDS) |
| `BE-24` | **P1** | Metadados estruturados de produto | Expor flags/atributos de catálogo em `ProdutoPublico` para `exigePontoCarne` / `aceitaObservacao` (evitando campo de preparo em bebidas industrializadas) | Sprint 2.1 (`VitrineComponent`, `ConfiguradorProdutoComponent`) |
| `BE-25` | **P0/P1** | Regra operacional de Retirada | Para canal `RETIRADA`, manter `ONLINE` e `PRESENCIAL` no envio, mas bloquear `cozinha.iniciar` enquanto houver saldo a receber (exigindo pagamento confirmado na recepção/caixa ou online antes do preparo) | Sprint 2.1 (`EnvioPedidoService`, `PedidoComandoService`) |

---

## 2. Parte A — Contratos Já Consumidos ou Preparados pelo Frontend (`P0`)

Os endpoints abaixo **já possuem código cliente implementado** no frontend (em `MarcaService`, `SessaoService`, `IdentidadeComponent` e `EnderecosComponent`). Enquanto retornarem apenas os campos mínimos atuais ou `404`/`405`/`501`, a interface opera em modo degradado seguro exibindo aviso transparente ao usuário.

### `BE-01` — Identidade Visual Pública Multi-Tenant (`GET /api/v1/restaurante`)
- **Situação verificada hoje:** [`RestauranteController.java`](../../../backend/src/main/java/br/com/restaurantmanager/tenancy/controllers/RestauranteController.java) retorna apenas `RestaurantePublico(String nome)`.
- **Consumidor no frontend:** [`marca.service.ts`](../../../frontend/src/app/rotas/marca.service.ts) (`RespostaMarcaPublica`).
- **Especificação esperada (`200 OK`, JSON):**
  ```json
  {
    "nome": "Nome do Estabelecimento",
    "logoUrl": "https://cdn.exemplo.com/tenants/.../logo.webp",
    "bannerUrl": "https://cdn.exemplo.com/tenants/.../banner.webp",
    "slogan": "Slogan curto da casa"
  }
  ```
- **Regras obrigatórias:**
  - `logoUrl`, `bannerUrl` e `slogan` podem ser `null` ou omitidos quando não configurados.
  - Resolução **estrita** pelo host/subdomínio/contexto de tenant da requisição, sem aceitar parâmetro arbitrário do chamador (`?empresaId=...`).
  - `logoUrl` e `bannerUrl` devem ser apenas caminhos relativos seguros (`/api/v1/...` ou `/assets/...`, nunca `//...`) ou URLs `https://` válidas sem `"'()\\\r\n`, com máximo de `500` caracteres.
  - `slogan` limitado a `120` caracteres.

### `BE-02` — Gestão Administrativa e Upload de Identidade Visual da Marca
- **Situação verificada hoje:** Não há endpoint autenticado para alterar `nome`, `slogan` ou fazer upload de `logo` e `banner` da empresa.
- **Consumidor planejado:** Área administrativa da Sprint 5 (ou painel de configurações do tenant autenticado).
- **Especificação esperada:**
  - `GET /api/v1/configuracoes/restaurante` e `PUT /api/v1/configuracoes/restaurante` (autorizado exclusivamente a `ADMINISTRADOR` do tenant ativo, com concorrência otimista via `versao`).
  - Upload multipart seguro de imagem para logo e banner (reaproveitando padrões de [`MidiaController.java`](../../../backend/src/main/java/br/com/restaurantmanager/midia/controllers/MidiaController.java)): validação real de MIME por magic bytes (`PNG`, `JPEG`, `WebP`), limite de tamanho, remoção de metadados EXIF, nome opaco sem path traversal, armazenamento isolado por `empresaId` e leitura pública isolada por tenant.

### `BE-03` — Dossiê Seguro da Conta Autenticada (`GET /api/v1/auth/me`)
- **Situação verificada hoje:** [`IdentidadeController.java`](../../../backend/src/main/java/br/com/restaurantmanager/identidade/controllers/IdentidadeController.java) retorna `IdentidadeAtual(usuarioId, sessaoId, empresaId, perfil, emailVerificado)`.
- **Consumidor no frontend:** [`sessao.service.ts`](../../../frontend/src/app/identidade/sessao.service.ts) (`Identidade`) e [`identidade.component.ts`](../../../frontend/src/app/identidade/identidade.component.ts).
- **Campos adicionais esperados no JSON:**
  - `email` (`string`)
  - `nome` (`string | null`)
  - `telefone` (`string | null`)
  - `cpfMascarado` (`string | null` — ex.: `***.456.789-**`; **nunca** devolver os 11 dígitos em aberto)
  - `cpfInformado` (`boolean`)
  - `receberEmailsPedido` (`boolean`)
  - `versao` (`number` — controle otimista para atualização)

### `BE-04` — Atualização de Dados Pessoais e Preferências (`PUT /api/v1/auth/me`)
- **Situação verificada hoje:** Endpoint inexistente em `IdentidadeController`.
- **Payload enviado pelo frontend (`SessaoService.atualizarPerfil`):**
  ```json
  {
    "versao": 1,
    "nome": "Nome Completo",
    "telefone": "(11) 99999-0000",
    "cpf": "12345678909",
    "receberEmailsPedido": true
  }
  ```
  *(Nota: `cpf` é enviado somente quando o usuário preenche novo valor no campo; se mantido vazio, não exigir reenvio ao alterar nome/telefone/e-mails.)*
- **Regras obrigatórias:**
  - Concorrência otimista por `versao` (`409 Conflict` se desatualizada).
  - Validações: `nome` entre `2` e `120` caracteres; `telefone` até `40` caracteres com `8` a `15` dígitos; quando `cpf` enviado, validar 11 dígitos e dígitos verificadores oficiais.
  - Códigos esperados em `422`: `NOME_INVALIDO`, `TELEFONE_INVALIDO`, `CPF_INVALIDO`.
  - Retorno `200 OK`: DTO `Identidade` completo (`BE-03`) atualizado com nova `versao` e `cpfMascarado`.

### `BE-05` — Verificação Inline de E-mail Autenticado (`POST /api/v1/auth/verificacao/reenviar` e `/confirmar`)
- **Situação verificada hoje:** [`VerificacaoEmailController.java`](../../../backend/src/main/java/br/com/restaurantmanager/identidade/controllers/VerificacaoEmailController.java) atende apenas o fluxo deslogado (`/api/v1/auth/verificacao` recebendo e-mail).
- **Consumidor no frontend:** [`SessaoService.reenviarVerificacao`](../../../frontend/src/app/identidade/sessao.service.ts#L177-L180) e `IdentidadeComponent.confirmarVerificacao` (que envia `{ codigo }` autenticado com CSRF para `/api/v1/auth/verificacao/confirmar`).
- **Esperado:**
  - `POST /api/v1/auth/verificacao/reenviar`: requer usuário autenticado, dispara novo código para o e-mail da conta com rate limiting (`429`) e retorna `{ "mensagem": "..." }`.
  - `POST /api/v1/auth/verificacao/confirmar`: validar o `{ codigo }` sem exigir logout prévio, marcar `emailVerificado = true` de forma que a chamada imediata a `GET /api/v1/auth/me` já reflita o novo estado.

### `BE-06` — Troca de Senha em Sessão Ativa (`POST /api/v1/auth/senha`)
- **Situação verificada hoje:** Inexistente em `IdentidadeController`.
- **Payload enviado (`SessaoService.alterarSenha`):** `{ "senhaAtual": "...", "novaSenha": "..." }`.
- **Regras esperadas:**
  - Validar senha atual (`422` com `codigo: "CONFIRMACAO_INVALIDA"` se incorreta).
  - Aplicar mesma política de cadastro/recuperação: mínimo `12` caracteres válidos (rejeitar apenas espaços em branco) e máximo `72` bytes UTF-8 (`422` com `SENHA_FRACA` ou `SENHA_IGUAL` quando repetida).
  - Revogar demais sessões/refresh tokens após troca bem-sucedida.

### `BE-07` — Encerramento de Demais Sessões (`POST /api/v1/auth/sessoes/encerrar-outras`)
- **Situação verificada hoje:** Inexistente.
- **Consumidor (`SessaoService.encerrarOutrasSessoes`):** `POST /api/v1/auth/sessoes/encerrar-outras` (sem corpo obrigatório).
- **Comportamento esperado:** Revogar todos os refresh tokens / sessões ativas do titular no tenant **exceto** a `sessaoId` corrente; retornar `200 OK` com `{ "mensagem": "..." }` (ou `204`).

### `BE-08` — Autoexclusão e Anonimização LGPD (`POST /api/v1/auth/exclusao`)
- **Situação verificada hoje:** Inexistente.
- **Payload enviado (`SessaoService.solicitarExclusaoConta`):** `{ "senhaAtual": "..." }`.
- **Comportamento esperado:** Reautenticar pela senha atual, registrar auditoria, executar/protocolar anonimização de dados pessoais elegíveis preservando integridade fiscal e histórica de pedidos/financeiro já consolidados (conforme LGPD), revogar sessões ativas quando aplicável e retornar `{ "mensagem": "..." }`.

### `BE-09` — Endereço Principal & Remoção de Endereços (`GET/PUT/DELETE /api/v1/clientes/me/enderecos`)
- **Situação verificada hoje:** [`EnderecoClienteController.java`](../../../backend/src/main/java/br/com/restaurantmanager/delivery/controllers/EnderecoClienteController.java) possui `GET /api/v1/clientes/me/enderecos` e `PUT /api/v1/clientes/me/enderecos/{id}` usando DTO `EnderecoCliente(id, versao, descricao, endereco, ativo)` — sem campo `principal` e sem endpoint `@DeleteMapping`.
- **Consumidor no frontend:** [`enderecos.component.ts`](../../../frontend/src/app/delivery/enderecos.component.ts) e [`delivery/modelos.ts`](../../../frontend/src/app/delivery/modelos.ts).
- **Esperado:**
  - Incluir `boolean principal` no DTO de resposta e na carga do `PUT`.
  - Garantir transacionalmente no servidor a invariante de **no máximo um endereço ativo marcado como `principal: true`** por cliente/empresa (ao marcar outro como principal, desmarcar o anterior).
  - Preservar concorrência otimista por `versao` (`409` em conflito) e, opcionalmente, expor `DELETE /api/v1/clientes/me/enderecos/{id}` para remoção semântica equivalente ao soft-delete (`ativo: false`).

---

## 3. Parte B — Lacunas e Evoluções para Novas Funcionalidades (`P1` / `P2`)

Os itens abaixo foram identificados ao mapear todas as telas das Sprints 2 a 7 e compará-las com os controllers existentes. **Nenhuma Sprint está bloqueada por eles**, mas cada implementação abaixo desbloqueia recursos de UX superiores no frontend.

### `BE-10` *(P1 · Sprint 6)* — Nome do Funcionário em Equipe e Convites
- **Constatação verificada:** [`FuncionarioResumo.java`](../../../backend/src/main/java/br/com/restaurantmanager/identidade/dtos/FuncionarioResumo.java) retorna apenas `(UUID id, String email, String perfil, boolean ativo, long versao, List<UUID> unidades)`. Em restaurantes com vários atendentes/cozinheiros ou e-mails operacionais parecidos, o gestor enxerga somente e-mails.
- **Proposta Backend:** Incluir `String nome` (opcional/`null` caso ainda não informado em `/auth/me`) em `GET /api/v1/equipe` e, opcionalmente, permitir campo sugestivo `nome` no convite (`GET/POST /api/v1/equipe/convites`).

### `BE-11` *(P1 · Sprint 5)* — Desconexão OAuth do Mercado Pago
- **Constatação verificada:** [`ConexaoPagamentoController.java`](../../../backend/src/main/java/br/com/restaurantmanager/pagamentos/controllers/ConexaoPagamentoController.java) expõe apenas `GET /api/v1/integracoes/mercadopago`, `POST .../autorizar` e `GET .../retorno`. Não há rota para desvincular a conta vendedora conectada.
- **Proposta Backend:** Criar `POST /api/v1/integracoes/mercadopago/desconectar` restrito a `ADMINISTRADOR` com reautenticação prévia, registro em auditoria e tratamento seguro de estornos/reconciliações já em curso antes da troca de conta.

### `BE-12` *(P1 · Sprint 4)* — Ciclo de Vida e Contexto em Notificações Operacionais
- **Constatação verificada:** [`NotificacaoController.java`](../../../backend/src/main/java/br/com/restaurantmanager/comunicacoes/controllers/NotificacaoController.java) expõe somente `GET /api/v1/operacao/notificacoes`, e [`NotificacaoOperacional.java`](../../../backend/src/main/java/br/com/restaurantmanager/comunicacoes/dtos/NotificacaoOperacional.java) contém apenas `(id, pedidoId, tipo, estado, tentativas)`. Faltam data/hora, motivo resumido e ação para limpar falhas antigas tratadas.
- **Proposta Backend:**
  - Incluir `criadaEm` (`Instant`), `atualizadaEm` (`Instant`) e `detalheCurto` (sanitizado, sem segredos/PII) em `NotificacaoOperacional`.
  - Criar comando autenticado idempotente (ex.: `POST /api/v1/operacao/notificacoes/{id}/reconhecer` ou `POST .../reenviar`) para que a fila em `/gestao/pendencias` possa ser higienizada pela operação.

### `BE-13` *(P1 · Sprint 4)* — Quebra Analítica e Exportação no Relatório de Vendas
- **Constatação verificada:** [`RelatorioVendasController.java`](../../../backend/src/main/java/br/com/restaurantmanager/relatorios/controllers/RelatorioVendasController.java) e [`RelatorioVendas.java`](../../../backend/src/main/java/br/com/restaurantmanager/relatorios/dtos/RelatorioVendas.java) retornam apenas 9 totais agregados do período sem segmentação.
- **Proposta Backend:**
  - Expandir `RelatorioVendas` (ou criar endpoint complementar `/api/v1/relatorios/vendas/detalhes`) com totais por canal (`MESA`, `RETIRADA`, `DELIVERY`) e por meio (`ONLINE`, `PRESENCIAL`).
  - Endpoint auditado para exportação CSV do período (`GET /api/v1/relatorios/vendas/exportar`) respeitando isolamento por unidade/permissão `relatorio.consultar`.

### `BE-14` *(P2 · Sprints 3 e 4)* — Resumo Operacional Leve para Badges de Navegação
- **Constatação verificada:** Hoje o menu lateral em `equipe-layout` não sabe quantos pedidos aguardam aceite ou quantos chamados de mesa estão abertos até que o operador abra cada rota individualmente.
- **Proposta Backend:** Criar `GET /api/v1/operacao/resumo?unidadeId={uuid}` retornando contagens enxutas autorizadas pelo perfil do ator: `{ aguardandoAceite, naFilaCozinha, emPreparoCozinha, prontos, solicitacoesMesaAbertas, pendenciasPagamento }`, atualizável sob demanda via eventos SSE já existentes em [`EventosOperacionaisController.java`](../../../backend/src/main/java/br/com/restaurantmanager/eventos/controllers/EventosOperacionaisController.java).

### `BE-15` *(P2 · Sprints 2 e 4)* — Filtros Server-Side para Escala em Pedidos e Mesas
- **Constatação verificada:**
  - [`PedidoClienteController.java`](../../../backend/src/main/java/br/com/restaurantmanager/pedidos/controllers/PedidoClienteController.java): `GET /api/v1/me/pedidos` aceita apenas `pagina` (sem filtro de `estados`).
  - [`PedidoOperacaoController.java`](../../../backend/src/main/java/br/com/restaurantmanager/pedidos/controllers/PedidoOperacaoController.java): `GET /api/v1/operacao/pedidos` aceita `estados`, `canal` e `ordenacao`, mas não possui `busca` textual (ex.: prefixo curto de pedido/mesa).
  - [`MesaController.java`](../../../backend/src/main/java/br/com/restaurantmanager/mesas/controllers/MesaController.java): `GET /api/v1/operacao/mesas` retorna páginas de 50 mesas sem filtro opcional `somenteAbertas` / `somenteAtivas`.
- **Proposta Backend:** Adicionar esses parâmetros opcionais mantendo valores padrão idênticos aos atuais para preservar 100% de retrocompatibilidade.

### `BE-16` *(P1/P2 · Sprint 1)* — Cooldown de Reenvio e Onboarding Inline em `/cadastro`, `/recuperar-senha` e `/verificar-email`
- **Constatação verificada:**
  - [`CadastroClienteController.java`](../../../backend/src/main/java/br/com/restaurantmanager/identidade/controllers/CadastroClienteController.java), [`RecuperacaoController.java`](../../../backend/src/main/java/br/com/restaurantmanager/identidade/controllers/RecuperacaoController.java) e [`VerificacaoEmailController.java`](../../../backend/src/main/java/br/com/restaurantmanager/identidade/controllers/VerificacaoEmailController.java) retornam em `202 Accepted` apenas `RespostaMensagem(String mensagem)` e recebem no `/confirmar` de cadastro apenas `(codigo, senha)`.
- **Proposta Backend:**
  - **`BE-16A` *(P1)*:** Retornar campos opcionais não sensíveis (`cooldownReenvioSegundos`, `validadeMinutos`) na resposta das solicitações de código (preservando resposta neutra contra enumeração de contas), permitindo exibir contagem regressiva real na UI antes de novo reenvio.
  - **`BE-16B` *(P2)*:** Permitir opcionalmente enviar `nome` e `receberEmailsPedido` já em `POST /api/v1/auth/cadastro/confirmar` (enquanto o backend não recebe esses campos, a interface orienta concluir os dados pessoais em `Minha conta`).

### `BE-17` *(P2 · Sprint 1)* — Pré-Consulta Segura do Crachá em `/aceitar-convite`
- **Constatação verificada:** [`ConviteController.java`](../../../backend/src/main/java/br/com/restaurantmanager/identidade/controllers/ConviteController.java) expõe para o público apenas `POST /api/v1/auth/convites/aceitar`.
- **Proposta Backend:** Avaliar endpoint ou retorno protegido com rate-limit rigoroso (sem jamais vazar dados em enumeração de tokens) para exibir cargo/perfil e unidades autorizadas no Crachá da Equipe antes do aceite definitivo.

### `BE-18` *(P1 · Sprint 1, extensão de `BE-01`)* — Canais Públicos de Atendimento do Estabelecimento
- **Constatação verificada:** [`RestauranteController.java`](../../../backend/src/main/java/br/com/restaurantmanager/tenancy/controllers/RestauranteController.java) expõe hoje `GET /api/v1/restaurante` com o nome da empresa.
- **Proposta Backend:** Incluir campos públicos opcionais (`telefoneContato`, `whatsappContato`, `emailContato`) no DTO de resposta pública (junto a `logoUrl`, `bannerUrl` e `slogan` previstos em `BE-01`), alimentando atalhos reais de ajuda em `/sem-acesso`, `/404`, `/cadastro` e rodapé do cliente.

### `BE-19` *(P2 · Sprints 1 e 2)* — Rótulo Público Sanitizado da Mesa (`/mesa/:mesaId`)
- **Constatação verificada:** Ao acessar `/mesa/:mesaId` pela leitura de QR Code, o cliente visualiza o UUID da rota no formulário de participação antes de receber o código temporário da equipe.
- **Proposta Backend:** Criar endpoint público sanitizado `GET /api/v1/mesas/publico/{mesaId}` retornando apenas informações não sensíveis da mesa ativa (`identificadorCurto`, `nomeMesa`, `setor`, sem código de acesso, saldo ou itens de comanda), permitindo saudação contextual ("Mesa 07 · Varanda").

### `BE-20` *(P2 · Sprint 1)* — Metadados Operacionais no Endpoint de Status (`GET /api/v1/status`)
- **Constatação verificada:** [`StatusController.java`](../../../backend/src/main/java/br/com/restaurantmanager/shared/controllers/StatusController.java) retorna `{ ambiente, etapa }`, enquanto `/actuator/health` devolve exatamente `{ status: "UP" }` (validado literalmente pelos testes E2E em [`fundacao.spec.ts`](../../../frontend/e2e/fundacao.spec.ts)).
- **Proposta Backend:** Caso o produto deseje exibir versão da entrega ou aviso operacional leve no rodapé técnico e no painel PWA, incluir campos opcionais em `GET /api/v1/status` (como `versaoAplicacao` e `avisoOperacional`), **nunca** alterando o payload de `/actuator/health`.

### `BE-21` *(P1/P2 · Sprint 2)* — Rótulo Amigável de Unidade e Mesa em `PedidoDetalhe`
- **Constatação verificada:** [`PedidoDetalhe.java`](../../../backend/src/main/java/br/com/restaurantmanager/pedidos/dtos/PedidoDetalhe.java) expõe `unidadeId`, `comandaId`, `endereco` e `entrega`, mas ainda não inclui o nome da unidade nem da mesa; [`PedidoClienteController.java`](../../../backend/src/main/java/br/com/restaurantmanager/pedidos/controllers/PedidoClienteController.java) devolve esse mesmo DTO em `GET /api/v1/me/pedidos` e `GET /api/v1/me/pedidos/{id}`. Sem esses rótulos, o cartão do pedido exibe apenas canal e prefixo curto do identificador (`Pedido #...`) em estabelecimentos multi-unidade ou atendimentos de salão.
- **Proposta Backend:** Incluir campos opcionais `String unidadeNome` e `String mesaNome` (null para delivery/retirada) em `PedidoDetalhe`, preservando autorização estrita por tenant/usuário. (Como melhoria complementar futura no frontend, [`pedidos/modelos.ts`](../../../frontend/src/app/pedidos/modelos.ts) e [`pedido-detalhe.component.html`](../../../frontend/src/app/pedidos/pedido-detalhe.component.html) também poderão exibir o endereço e os novos rótulos sem recorrer a fallbacks técnicos.)

### `BE-22` *(P2 · Sprint 2)* — Data/Hora e Valor nas Tentativas de Pagamento (`CheckoutResumo`)
- **Constatação verificada:** [`CheckoutResumo.java`](../../../backend/src/main/java/br/com/restaurantmanager/pagamentos/dtos/CheckoutResumo.java) retorna apenas `(UUID id, String estado, String checkoutUrl, String ultimaFalha)` no endpoint `GET /api/v1/me/pedidos/{id}/pagamento`. No histórico colapsado (`<details>Histórico de tentativas anteriores</details>`), o cliente vê apenas o estado da tentativa sem saber quando ela ocorreu ou qual quantia foi processada.
- **Proposta Backend:** Acrescentar `Instant criadoEm` e `BigDecimal valor` em `CheckoutResumo` (de forma retrocompatível), permitindo exibir linha temporal clara em `<app-pagamento-pedido>`.

### `BE-23` *(P1 · Sprint 2.1)* — Observação Individual por Item (`Linha`, `SnapshotLinha`, `LinhaPreparo`)
- **Constatação verificada:** Hoje [`Linha.java`](../../../backend/src/main/java/br/com/restaurantmanager/carrinho/dtos/Linha.java) aceita apenas `(id, produtoId, quantidade, adicionais, escolhas)`, e somente [`EnviarPedido.java`](../../../backend/src/main/java/br/com/restaurantmanager/pedidos/dtos/EnviarPedido.java) possui `observacao` única por pedido (máximo 500 caracteres). Na Sprint 2.1, o cliente passou a escolher **ponto da carne** e **observação específica por prato** já dentro do configurador; enquanto o backend não armazena `observacao` por linha, o frontend mantém a `Linha` da API limpa (para não violar checksum/DTO estrito) e compõe automaticamente o resumo estruturado dos itens em `EnviarPedido.observacao`.
- **Proposta Backend:**
  - Incluir `String observacao` (`@Size(max = 200)`, rejeitando caracteres de controle exceto espaço) opcional em `Linha`, [`SnapshotLinha.java`](../../../backend/src/main/java/br/com/restaurantmanager/carrinho/dtos/SnapshotLinha.java), [`LinhaPreparo.java`](../../../backend/src/main/java/br/com/restaurantmanager/pedidos/dtos/LinhaPreparo.java) e na projeção de `PedidoDetalhe`, preservando `observacao` nula/vazia em itens sem nota e mantendo retrocompatibilidade total com clientes que enviam apenas `observacao` geral em `EnviarPedido`.

### `BE-24` *(P1 · Sprint 2.1)* — Metadados Estruturados de Produto (`ProdutoPublico`)
- **Constatação verificada:** [`ProdutoPublico.java`](../../../backend/src/main/java/br/com/restaurantmanager/catalogo/dtos/ProdutoPublico.java) expõe `(id, versao, nome, descricao, categoriaId, tipo, sugerido, midiaId, preco, disponivel, adicionais, grupos)`, sem flags de preparo. Na Sprint 2.1, o frontend passou a oferecer seletor de ponto da carne para hambúrgueres/carnes na brasa e a ocultar o campo de observação livre para bebidas industrializadas não preparadas pela casa via inferência de catálogo/categoria.
- **Proposta Backend:** Incluir campos booleanos opcionais com padrão seguro em `ProdutoPublico` (e na edição administrativa de produtos): `exigePontoCarne` (ou grupo obrigatório configurável no catálogo) e `aceitaObservacao` (ex.: `false` para bebidas lacradas/industrializadas, `true` para pratos preparados na cozinha).

### `BE-25` *(P0/P1 · Sprint 2.1)* — Bloqueio de Início de Preparo na Retirada Antes do Pagamento
- **Constatação verificada:** [`EnvioPedidoService.java`](../../../backend/src/main/java/br/com/restaurantmanager/pedidos/services/EnvioPedidoService.java) já aceita `ONLINE` e `PRESENCIAL` para os canais `DELIVERY` e `RETIRADA`. Porém, na regra de negócio validada com o produto na Sprint 2.1, pedidos de **Retirada na loja** podem ser pagos online ou presencialmente no balcão/caixa, **mas só iniciam o preparo na cozinha após o pagamento estar integralmente confirmado**; hoje [`PedidoComandoService.java`](../../../backend/src/main/java/br/com/restaurantmanager/pedidos/services/PedidoComandoService.java#L236-L273) (`produzir`, ação `"iniciar"`) verifica apenas `estado == NA_FILA || EM_PREPARO`, sem checar saldo pendente no canal `RETIRADA`.
- **Proposta Backend:**
  - No `PedidoComandoService.produzir(...)`, quando `acao.equals("iniciar")` e `pedido.canal() == CanalAtendimento.RETIRADA`, consultar o resumo financeiro do pedido e rejeitar com `409`/`422` caso haja `saldoAReceber > 0` (`"Pedido de retirada só pode iniciar o preparo após confirmação do pagamento online ou no caixa."`).
  - Na suíte Java (em ambiente Linux/CI com PostgreSQL real), acrescentar teste de integração cobrindo pedido `RETIRADA` + `PRESENCIAL`: bloqueio de `cozinha.iniciar` antes do lançamento no caixa e liberação imediata após quitação integral (`FinanceiroTest` / `CozinhaTest`).

---

## 4. Diretrizes de Integração Backend → Frontend após Entrega

Quando o backend implementar qualquer grupo (`BE-01..BE-25`), seguir o protocolo abaixo:

1. **Contratos `BE-01` e `BE-03..BE-09` (P0):** o frontend atual já possui as chamadas implementadas e tolerantes; basta subir a nova API e validar os fluxos reais em `/cardapio`, `/conta` e checkout Delivery (removendo mensagens de recurso pendente nos testes E2E).
2. **Contratos `BE-02` e `BE-10..BE-25` (P1/P2):** abrir microtarefa específica no frontend após o endpoint estar publicado em contrato e testado em Java/PostgreSQL, evitando código morto ou suposições de payload antecipadas. No caso de `BE-23`/`BE-24`, o frontend da Sprint 2.1 já opera com composição segura em `EnviarPedido.observacao` e inferência local até a ativação nativa dos campos no servidor.
3. **Nunca enfraquecer validação no servidor:** limites de tamanho, máscaras de CPF, concorrência otimista (`versao`), escopo por `empresaId` + `unidadeId` e reautenticação de 5 minutos para ações sensíveis permanecem autoridade exclusiva do backend.

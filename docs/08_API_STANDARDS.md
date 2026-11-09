# Padrões de API

> **Escopo:** famílias HTTP, DTOs, erros, transições explícitas e portabilidade dos contratos.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## API HTTP

Proposta de prefixo `/api/v1`. Endpoints finais, DTOs e códigos serão especificados com OpenAPI nas sprints; a tabela define famílias e limites, não rotas já implementadas.

| Família ilustrativa | Autenticação | Responsabilidade |
| --- | --- | --- |
| `/catalogo`, `/unidades` | Público, tenant resolvido | Somente dados públicos do estabelecimento |
| `/auth/*` | Conforme login/refresh/recuperação | Identidade empresarial, sessão e proteção contra abuso |
| `/mesa/autorizar`, `/mesa/sessao` | Código temporário / JWT restrito | Vínculo com atendimento ativo |
| `/clientes/me`, `/me/pedidos` | Cliente | Conta, endereços e pedidos próprios |
| `/pedidos` e ações específicas | Cliente, mesa ou funcionário conforme caso | Enviar, aceitar, cancelar e acompanhar com política por ator |
| `/operacao/mesas`, `/comandas`, `/cozinha`, `/expedicao` | Funcionário | Operações por ação/unidade |
| `/recebimentos`, `/devolucoes` | Funcionário autorizado / sistema | Registro, saldo e operações financeiras auditáveis |
| `/configuracoes/acessos`, `/equipe`, `/integracoes` | Administrador | Configuração protegida do restaurante |
| `/eventos` | Usuário/sessão autorizada | Atualizações filtradas pelo contexto |
| `/webhooks/mercadopago` | Validação do provedor | Receber evento, deduplicar e reconciliar; não usa JWT de cliente |
| `/plataforma/*` | Operador da plataforma | Registro público e provisionamento, política separada |

Não oferecer PATCH irrestrito para qualquer status/valor do pedido. Transições são comandos com autorização e payload específico. Listagens têm paginação, filtros permitidos e limites; relatórios seguem o mesmo escopo da operação.

Contrato de erro proposto: código estável, mensagem PT-BR, erros de campo quando aplicáveis e identificador de correlação, sem stack trace ou segredo. Usar 400 para estrutura inválida, 401 para autenticação ausente/inválida, 403 para ação negada, 404 para recurso inexistente ou alheio, 409 para conflito de versão/estado/idempotência e 422 para regra semântica quando essa distinção ajudar. 500 fica para falha interna inesperada; indisponibilidade externa tem mensagem e tratamento próprios.

## Contratos de portabilidade

A API não deve depender de DOM, cookie exclusivo do Angular ou chamadas locais entre frontend e banco para executar regras. Um aplicativo mobile futuro poderá usar os mesmos casos de uso, com contrato de sessão próprio e armazenamento seguro na plataforma. Isso não inclui implementar app nativo agora. Arquivos, caminhos, encoding, timezone e scripts precisam funcionar em desenvolvimento macOS e execução Linux sem caminhos pessoais fixos.

## Consistência dos contratos

Contrato público de identificação: [nome do restaurante](api/restaurante.yaml),
resolvido pelo domínio cadastrado, sem identificadores técnicos. A consulta
permanece disponível durante suspensão para identificar operações existentes.

Contratos acrescentados na retomada ciclo17: [identidade empresarial](api/identidade.yaml)
(CSRF, login, refresh, logout, identidade e confirmação de senha) e
[matriz, equipe e acessos efetivos](api/acessos.yaml). Documentam os DTOs e
comportamentos existentes, sem criar novas rotas ou aprovar funcionalidades futuras
somente porque suas ações aparecem no catálogo. O contrato distingue os limites
de bytes da senha e a versão primitiva atual; consumidores devem enviar a versão
consultada. Validação estrutural/referências e consultas HTTP reais são evidências
separadas da matriz E2E e dos testes de escrita/concorrência.

Contratos parciais: [configuração administrativa de unidades](api/unidades.yaml), com idempotência de criação, versão de edição, paginação e erros; [recuperação de senha](api/recuperacao.yaml), com CSRF, resposta neutra, consumo único e limites; [cadastro verificado de cliente](api/cadastro.yaml), no candidato do ciclo 10, sem atribuição pública de perfil/unidades nem senha anterior à prova de e-mail. Não representam OpenAPI completo das demais famílias.

- DTOs, OpenAPI, tipos Angular e exemplos de consumo devem evoluir juntos. Não exponha entidades JPA como contratos HTTP.
- Inteiros não aceitam truncamento de valores fracionários e enums não aceitam
  ordinais numéricos. Payloads assim são rejeitados como estrutura inválida.

Contrato da Sprint 2: [horários/canais e disponibilidade pública de unidades](api/funcionamento-unidades.yaml),
com versão própria, agenda semanal, consulta no fuso da unidade e escrita
administrativa reautenticada. Validação local e homologação são registradas
separadamente no checkpoint.

Contratos adicionais da Sprint 2: [catálogo e favoritos](api/catalogo.yaml),
[cálculo do carrinho](api/carrinho.yaml) e [mídia pública](api/midias.yaml).
Preços de entrada são texto decimal BRL, configurações são versionadas e
o cálculo público não cria pedido, reserva ou pagamento. Escritas de catálogo
revalidam ação/sessão após aguardar o lock do agregado. Favoritos pertencem ao
cliente autenticado, sem identificador de proprietário no payload.

Contrato adicional do ciclo 11: [convites de funcionários](api/convites.yaml), com intenção durável, consulta por UUID, revogação e aceite público protegido por CSRF. Candidato em validação, sem publicação em homologação.

Contrato da retomada: [verificação de conta existente](api/verificacao.yaml),
sem alteração de senha/perfil nem criação de sessão. Implementação em validação;
resultados e artefatos aprovados são registrados no checkpoint.

Contrato SaaS parcial: [identidade de operador e consulta de empresas](api/plataforma.yaml).
Audiência, sessões, CSRF e origem separados; não há acesso implícito aos schemas
empresariais. A retomada ciclo 3 acrescenta confirmação de senha SaaS, consulta
exata e suspensão/reativação versionada. A retomada ciclo 4 acrescenta
[solicitação/consulta/retomada de provisionamento](api/provisionamento.yaml),
em validação, com execução DDL separada por CLI e sem promoção para homologação.

Contrato de acompanhamento cadastral: [eventos de unidade](api/eventos-unidade.yaml),
em validação na retomada ciclo 5. Cursor por versão, paginação, projeção mínima,
política e sessão revalidadas por consulta. Não é contrato de eventos financeiros.

## Contratos da Sprint 3 local

[Pedidos, produção e prazos](api/pedidos.yaml),
[mesas, participantes e comandas](api/mesas.yaml) e
[eventos operacionais](api/eventos-operacionais.yaml) documentam o candidato
local em validação. A lista `/operacao/unidades-existentes` mantém as unidades
atribuídas, inclusive inativas, para resolver operações anteriores; não autoriza
novo consumo. A lista pública e a elegibilidade de novas vendas seguem exigindo
unidade ativa. O checkpoint identifica testes executados e pendências externas.

## Contratos da Sprint 4 local

[Delivery e endereços](api/delivery.yaml), [recebimentos e devoluções](api/financeiro.yaml),
[pagamentos e comunicações](api/pagamentos.yaml) e [relatório operacional](api/relatorios.yaml)
complementam [pedidos](api/pedidos.yaml). A versão de configuração/cotação é
revalidada no backend; intenção financeira é durável e o replay usa o mesmo
payload. Respostas 204 não contêm JSON. Webhook é público, assinado e neutro;
callback OAuth usa o state vinculado à sessão original. Credenciais nunca são DTOs.
Implementação local em validação; resultados e limites ficam no checkpoint.

## Documentos relacionados

- [JWT e sessões](04_SECURITY.md#jwt-e-sessoes)
- [Regras de negócio](20_BUSINESS_RULES.md)
- [Integrações](21_INTEGRATIONS.md)
- [Critérios de entrega](12_DEFINITION_OF_DONE.md)

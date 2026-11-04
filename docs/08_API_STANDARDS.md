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

Contratos parciais: [configuração administrativa de unidades](api/unidades.yaml), com idempotência de criação, versão de edição, paginação e erros; [recuperação de senha](api/recuperacao.yaml), com CSRF, resposta neutra, consumo único e limites; [cadastro verificado de cliente](api/cadastro.yaml), no candidato do ciclo 10, sem atribuição pública de perfil/unidades nem senha anterior à prova de e-mail. Não representam OpenAPI completo das demais famílias.

- DTOs, OpenAPI, tipos Angular e exemplos de consumo devem evoluir juntos. Não exponha entidades JPA como contratos HTTP.

Contrato adicional do ciclo 11: [convites de funcionários](api/convites.yaml), com intenção durável, consulta por UUID, revogação e aceite público protegido por CSRF. Candidato em validação, sem publicação em homologação.

Contrato da retomada: [verificação de conta existente](api/verificacao.yaml),
sem alteração de senha/perfil nem criação de sessão. Implementação em validação;
resultados e artefatos aprovados são registrados no checkpoint.

Contrato SaaS parcial: [identidade de operador e consulta de empresas](api/plataforma.yaml).
Audiência, sessões, CSRF e origem separados; não há acesso implícito aos schemas
empresariais. Provisionamento HTTP e suspensão ainda não são contratos entregues.

## Documentos relacionados

- [JWT e sessões](04_SECURITY.md#jwt-e-sessoes)
- [Regras de negócio](20_BUSINESS_RULES.md)
- [Integrações](21_INTEGRATIONS.md)
- [Critérios de entrega](12_DEFINITION_OF_DONE.md)

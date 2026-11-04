# Multi-tenant e unidades

> **Escopo:** schema por empresa, contexto público/empresarial, provisionamento e migrações por tenant.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Schema por empresa

O schema `public` mantém cadastro de empresas, domínios, estado de provisionamento, metadados de assinatura e identidade dos operadores da plataforma. Os schemas empresariais mantêm funcionários, clientes, sessões, unidades, catálogo e registros operacionais/financeiros. O mesmo e-mail em duas empresas representa contas independentes.

Nas requisições empresariais, o tenant é resolvido em registro confiável a partir do domínio autorizado. Administração da plataforma usa o contexto público separado; webhooks seguem validação do provedor e mapeamento de conta/recurso descritos em [Integrações — Mercado Pago](21_INTEGRATIONS.md#mercado-pago). Em desenvolvimento, usar nomes locais mapeados explicitamente; não habilitar header arbitrário de tenant em produção. O identificador externo não é o nome SQL do schema. `Host`/`Forwarded` só são aceitos conforme a configuração do proxy confiável; domínio desconhecido falha fechado.

Schemas organizam e separam dados, mas não são por si uma barreira de acesso quando um usuário de banco tem privilégios em vários deles. A aplicação deve aplicar o contexto correto, limitar privilégios e comprovar isolamento em pool, consultas e tarefas. Referência: [PostgreSQL — schemas e privilégios](https://www.postgresql.org/docs/current/ddl-schemas.html).

Controles obrigatórios:

1. Obter nome de schema somente do registro interno validado; nunca interpolar entrada de HTTP/JWT em SQL de seleção/provisionamento.
2. Nas rotas empresariais, resolver tenant antes de autenticar e exigir correspondência entre domínio, sessão, JWT e recurso. Manter as rotas públicas da plataforma e de webhook em fluxos próprios, sem fallback de autenticação empresarial.
3. Definir explicitamente o contexto ao usar conexão; restaurar um estado neutro seguro ao devolvê-la, inclusive após exceções. Nenhuma consulta empresarial pode executar sem tenant definido.
4. Manter acesso a `public` explícito; não usar fallback de tabelas empresariais em `public`. Configurar privilégios/search path sem confiar em schemas graváveis por usuários não confiáveis.
5. Usar credencial de runtime sem permissão de DDL sempre que possível; operações de migração/provisionamento usam credencial separada e controlada.
6. Jobs, eventos, cache e caminhos de arquivos carregam contexto explícito. Limpar também ThreadLocal e contexto de executor; não herdar tenant de thread reciclada.
7. Validar unidade de todos os recursos vinculados; FK dentro do schema não impede vincular um pedido da unidade A à mesa B sem restrição adicional.
8. Consultas agregadas, paginação, exports, mídia privada e eventos em tempo real têm o mesmo isolamento das mutações.

## Provisionamento, migrações e suspensão

Proposta de estados: `PROVISIONANDO`, `ATIVO`, `FALHOU`, `SUSPENSO`. Provisionar de forma retomável: reservar identificador/domínio único, criar schema controlado, aplicar migrações, criar unidade/Administrador, validar e ativar. Falhas ficam visíveis, sem disponibilizar empresa incompleta; repetição não duplica empresa ou administrador.

Flyway terá migrações de `public` e migrações empresariais, com histórico por schema. O orquestrador registra sucesso/falha por empresa, evita dois migradores concorrentes, permite retomar e verifica compatibilidade entre aplicação e schema. Não depender de requisição de cliente para migrar. Uma empresa atrasada não deve operar com schema incompatível nem impedir observação das demais sem diagnóstico.

Suspensão comercial não deve abandonar pedidos já pagos, atendimentos abertos ou devoluções. Proposta: bloquear novos pedidos/provisionamento comercial e permitir aos responsáveis concluir operação existente, consultar pendências e reconciliar dinheiro. O acesso de segurança pode ser revogado independentemente de suspensão comercial. Política detalhada será validada na Sprint 1.

## Diretrizes de implementação

- Nas requisições empresariais, resolva o tenant por domínio confiável cadastrado antes de autenticar. JWT, sessão, recurso e unidade devem corresponder ao contexto. Plataforma usa contexto público separado; webhooks validam o provedor e resolvem tenant pelo mapeamento interno de conta/recurso. Nunca derive um schema diretamente de entrada arbitrária.
- Separe o contexto público da plataforma do contexto empresarial. Limpe contexto de tenant e conexão do pool em sucesso, erro e cancelamento; falha de resolução não pode cair em outro tenant.
- Inclua tenant/unidade no escopo de caches, arquivos privados, jobs, eventos em tempo real e idempotência. Listagens, exportações e relatórios também precisam de autorização.

## Documentos relacionados

- [Modelo de dados](05_DATABASE.md)
- [Sessões](04_SECURITY.md#jwt-e-sessoes)
- [Permissões por ação e unidade](11_ACCESS_CONTROL.md)
- [Webhooks](21_INTEGRATIONS.md#mercado-pago)

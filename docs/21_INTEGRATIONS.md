# Integrações e comunicação técnica

> **Escopo:** SDKs, Mercado Pago, webhook, e-mail e eventos operacionais.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

<a id="sdk-first"></a>
## Preferência por SDKs

- Prefira SDK oficial, mantido e compatível. Use um adaptador pequeno por integração para isolar configuração, erros e resultados. HTTP direto é exceção documentada quando o SDK não existe ou não atende à operação.
- Não use configuração global mutável de SDK para credenciais de restaurantes diferentes. Configure o cliente/requisição com o contexto correto e teste concorrência entre tenants.

<a id="mercado-pago"></a>
## Mercado Pago por restaurante

O restaurante recebe em sua conta. A integração SaaS precisa identificar o vendedor autorizado, guardar credenciais com segurança e impedir que uma cobrança use a conta de outro tenant. OAuth é a premissa de conexão, sujeita à habilitação real; [documentação oficial dos fluxos OAuth](https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation).

Na Sprint 0, investigar compatibilidade do SDK Java e requisitos da integração; na Sprint 4, fixar modalidade, métodos de pagamento, URLs, permissões e operação de devolução. Checkout hospedado é proposta, não implementação já escolhida. Não coletar dados brutos de cartão na aplicação.

Fluxo de webhook:

1. Validar autenticidade conforme a documentação vigente do produto contratado; não aceitar tenant informado livremente pelo chamador.
2. Resolver conta/recurso por mapeamento interno mínimo; persistir evento recebido e deduplicar no contexto correto.
3. Responder confirmação somente depois do registro durável. Processar de forma retomável.
4. Consultar situação confiável no provedor quando exigido; conferir vendedor, referência, moeda e valor esperados.
5. Aplicar transição permitida de forma transacional; evento repetido ou fora de ordem não duplica recebimento nem regride estado confirmado.
6. Para resposta incerta, reconciliar antes de repetir efeito financeiro. Disponibilizar fila de falhas para operação autorizada.

O adaptador traduz resultados do SDK em conceitos do domínio. Retry depende da semântica da operação e da idempotência do provedor; não repetir cegamente cobrança/devolução. Credenciais de vendedores não podem ficar em configuração estática global do SDK compartilhada por threads.

## E-mail e atualizações operacionais

Provedor de e-mail é dependência externa. Preferir SDK oficial adequado; separar transporte de template e regra de notificação. Outbox registra eventos na transação de negócio; worker aplica retry, deduplicação e registro de falha. Ambiente local usa captura de mensagens com dados fictícios, sem envio real implícito.

SSE é proposta para notificações da cozinha/aceite/mesas. A implementação precisa transportar autenticação de forma segura: usar streaming compatível com header Bearer ou mecanismo de sessão especificamente projetado; não colocar JWT em query string para contornar limitações de `EventSource`. Definir replay/cursor e alternativa por polling; a consulta de estado persistido continua sendo fonte de verdade. Reautenticar e revisar permissões em conexão longa e revogação.

## Documentos relacionados

- [Regras financeiras e comunicação do produto](20_BUSINESS_RULES.md)
- [Segurança](04_SECURITY.md)
- [Tenancy](06_MULTI_TENANT.md)
- [Dependências externas](23_PILOT_IMPLEMENTATION.md#registro-externo)

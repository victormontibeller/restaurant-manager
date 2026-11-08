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

P10 confirma SSE autenticado para cozinha/aceite/mesas, com fallback por polling.
A implementação da Sprint 3 está descrita abaixo; sua evidência local e as
pendências de homologação ficam no checkpoint.

## Captura de identidade — candidato do ciclo 9

Recuperação e aviso de alteração de senha usam outbox empresarial durável; não usam provedor externo nem envio real. `RM_EMAIL_CAPTURE_DIRECTORY` aponta para diretório absoluto privado fora do checkout. Capturas são segregadas por schema interno e UUID da mensagem, com diretórios 0700 e arquivos 0600. Ambiente fora de dev/test/hml é recusado. O conteúdo do código nunca é retornado pela API.

O candidato do ciclo 10 reutiliza esse transporte para cadastro/verificação de cliente, com finalidade e tabela de códigos separadas da recuperação. Repetir entrega após lease mantém o mesmo código; conta já existente é ignorada antes da preparação. Não equivale a verificação de entrega externa nem à implementação de convites de funcionários.

Worker pagina empresas registradas, processa até vinte mensagens por empresa/ciclo e não mantém transação durante escrita do arquivo. Claim com lock/SKIP LOCKED, lease de dois minutos e identidade da tentativa impedem conclusão por worker atrasado. A captura usa arquivo temporário, sincronização e rename atômico; reexecução com mesmo UUID/conteúdo reutiliza a captura. Falha tem backoff de trinta segundos multiplicados pela tentativa, no máximo cinco tentativas. Reinício recupera leases vencidos; captura realizada antes da confirmação no banco não exige outro código.

O estado `CAPTURADO` significa somente persistência local, nunca entrega/lida por destinatário real. A interface informa essa fronteira. Provedor real, domínio/remetente e homologação externa permanecem E05; contratos futuros devem conservar intenção/retry e deduplicação sem prometer envio exatamente uma vez. Resultados efetivamente executados ficam no checkpoint.

Falha terminal/corrupção elimina imediatamente conteúdo cifrado recuperável, conservando estado técnico até o expurgo. A cada ciclo, expurgo limitado remove até cem tokens e cem mensagens por tenant cuja expiração passou há mais de 24 horas. Capturas e temporários próprios com mais de 24 horas são removidos em lotes de até cem arquivos; não segue links simbólicos. Essa retenção técnica de dados fictícios não substitui política jurídica nem backup externo. Ausência de worker impede o expurgo agendado e exige manutenção explícita.

O ciclo 11 acrescenta mensagens `CONVITE` preparadas na transação administrativa, com código único já cifrado. O mesmo lease/retry reutiliza o conteúdo; revogação impede aceite, mas não promete recolher captura em andamento. Captura continua local e fictícia; E05 não está encerrado.

## Atualizações cadastrais — retomada ciclo 5

Primeiro consumidor de eventos no candidato: acompanhamento de unidade por
polling autenticado, conforme [Acessos](11_ACCESS_CONTROL.md). Persistência local
acompanha a transação e o cursor permite replay; não há transporte externo nem
SSE nesse consumidor cadastral. Os streams operacionais da Sprint 3 são
separados e não alteram seu contrato.

## Streams e prazos operacionais — Sprint 3

O frontend abre SSE com `fetch` e Bearer no header; token não integra URL nem
cache. Cursor e página de eventos são os mesmos do polling de cinco segundos.
Reconexão retoma o cursor; eventos invalidam o snapshot autorizado, sem repetir
comandos de negócio. Entrega do evento não significa leitura do alerta.

A API limita conexões simultâneas e duração do stream. Revalida sessão,
permissões e unidade em cada consulta, encerra na expiração do token e libera a
transação antes de escrever na conexão. Participantes usam a audiência de mesa,
seu stream próprio e eventos mínimos da comanda. O cursor é exclusivo desse
contexto, sem expor atividade de outras unidades ou clientes.

Jobs PostgreSQL são executados no processo da API. Claim limitado usa lease de
dois minutos; falha tem backoff de trinta segundos multiplicados pela tentativa,
até cinco tentativas. Lease vencido pode ser retomado; esgotamento fica
persistido como bloqueado, sem retry infinito. Não existe console operacional
de desbloqueio nesta sprint. Reinício retoma vencimentos duráveis; unicidade e
lock do pedido impedem alertas ou cancelamentos duplicados. Prazos de 120/300
segundos são copiados ao pedido e preservados após alterações administrativas.

Contratos: [eventos](api/eventos-operacionais.yaml), [pedidos](api/pedidos.yaml)
e [mesas](api/mesas.yaml). Provedor financeiro, recebimento real, envio externo e
monitoramento com responsáveis continuam pendentes nas sprints correspondentes.

## Documentos relacionados

- [Regras financeiras e comunicação do produto](20_BUSINESS_RULES.md)
- [Segurança](04_SECURITY.md)
- [Tenancy](06_MULTI_TENANT.md)
- [Dependências externas](23_PILOT_IMPLEMENTATION.md#registro-externo)

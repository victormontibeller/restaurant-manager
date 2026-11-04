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

### Incremento disponível da Sprint 01

O provisionamento local usa processo privilegiado separado, não bean/runtime HTTP. `--provisionar` lê arquivo privado 0600, reserva UUID/domínio/plano/auditoria em uma transação, migra somente o schema interno derivado do UUID e confirma unidade/Administrador/ativação em outra transação. O plano guarda BCrypt custo 12, não senha em claro; repetição divergente de dados ou senha conflita. `--retomar-provisionamento UUID` conclui a reserva persistida em novo processo. Erro preserva reserva, registra SQLState/código sanitizado e não publica empresa incompleta. Ambos compartilham advisory lock com o migrador global; chamada sem lock real é recusada.

O comando não migra public nem todas as empresas implicitamente: migrations globais são pré-requisito explícito do release. Nesta etapa só `dev`/`test` são aceitos pelo provisionador; `hml` permanece bloqueado até manutenção/backup/retorno das novas migrations serem demonstrados. Runtime valida schemas ATIVO/SUSPENSO; empresa incompleta falha fechado no resolvedor sem impedir startup das ativas. A retomada acrescenta identidade SaaS e consulta de metadados em validação, conforme [Segurança](04_SECURITY.md). Provisionamento HTTP permanece pendente; suspensão comercial está descrita abaixo.

JDBC atende à infraestrutura privilegiada de provisionamento/migração e ao registro
público explícito da identidade SaaS, fora do EntityManager que exige tenant já
provisionado. O serviço SaaS utiliza apenas credencial runtime e transação própria;
não herda credenciais de DDL. Persistência empresarial continua JPA/Hibernate.
Bootstrap não concede poderes SaaS a uma sessão empresarial nem libera DDL HTTP.

- Nas requisições empresariais, resolva o tenant por domínio confiável cadastrado antes de autenticar. JWT, sessão, recurso e unidade devem corresponder ao contexto. Plataforma usa contexto público separado; webhooks validam o provedor e resolvem tenant pelo mapeamento interno de conta/recurso. Nunca derive um schema diretamente de entrada arbitrária.
- Separe o contexto público da plataforma do contexto empresarial. Limpe contexto de tenant e conexão do pool em sucesso, erro e cancelamento; falha de resolução não pode cair em outro tenant.
- Inclua tenant/unidade no escopo de caches, arquivos privados, jobs, eventos em tempo real e idempotência. Listagens, exportações e relatórios também precisam de autorização.

## Estado comercial — retomada ciclo 3

O candidato permite ao operador SaaS alternar somente `ATIVO` e `SUSPENSO`, com
versão esperada, motivo obrigatório de até 240 caracteres e confirmação recente
da senha. `PROVISIONANDO`/`FALHOU` não podem ser ativados por essa rota. Mudança
repetida, versão antiga ou transição sem mudança retornam 409: consultar o estado
atual antes de enviar nova decisão, sem retry automático da escrita.

Usuário e sessão SaaS são revalidados sob locks antes da empresa; após esperar
a empresa, o prazo de sessão/reautenticação é conferido novamente. Estado, versão
e auditoria de operador/sessão/antes/depois/motivo confirmam na mesma transação.
Auditoria permanece após expurgo técnico da sessão; runtime não pode alterá-la.

Suspensão comercial não é revogação de segurança. O resolvedor continua aceitando
o domínio de empresa `SUSPENSO`, mantendo login, recuperação e consultas/gestão
empresariais existentes, sem conceder acesso a outro tenant. Empresas incompletas
continuam indisponíveis. Não há pedidos/recebimentos implementados neste candidato:
o bloqueio transacional de novas vendas e a conclusão/reconciliação de pedidos
existentes deverão consumir essa política nas Sprints 03–04, com testes próprios.
Não alegar esse gate demonstrado por alteração de um estado cadastral.

UI consulta a empresa por UUID, confirma senha, informa efeito e exige nova
consulta após resposta incerta/conflito. Consulta exata também sincroniza o cartão
da lista quando presente. [Contrato](api/plataforma.yaml); resultados e limitações
na [evidência do ciclo 3](evidencias/sprint-01-retomada-ciclo-3.md).

## Solicitação SaaS de provisionamento — retomada ciclo 4

O candidato acrescenta API/UI para solicitar, listar, consultar e retomar
provisionamento, sem credencial owner ou DDL no HTTP. A intenção UUID guarda
autor, dados normalizados e BCrypt; consulta não retorna e-mail/senha/hash/schema.
Mesmo autor/payload/senha reutiliza o resultado; divergência retorna 409. Domínio
local e UUID são reservados também contra o CLI legado, usando o mesmo advisory
lock do migrador. Se o processo privilegiado estiver ocupado, a API não espera
a migration mantendo locks: rejeita com 409 e preserva a intenção para consulta.

`SOLICITADO` é uma fila persistida, não empresa ativa. O comando privilegiado
`--processar-solicitacao UUID` reserva/migra/ativa pelo mecanismo existente e
confirma `CONCLUIDO`; falha sanitizada resulta em `FALHOU`. A retomada HTTP exige
versão e reautenticação, audita e recoloca em `SOLICITADO`. Não altera payload nem
senha. Queda entre ativação e confirmação é reconciliável sem duplicar usuário
ou unidade e sem reativar empresa suspensa depois. Não há retry infinito de falha.

O worker deste incremento é uma invocação explícita por UUID, não um agendamento
instalado. O provisionamento continua limitado a dev/test; homologação e execução
automática da fila dependem do gate operacional de manutenção/backup. Não
confundir a jornada E2E que chama o CLI real com um worker de homologação ativo.

UI conserva somente o UUID de resultado incerto em memória por operador/origem,
inclusive entre logout/login na mesma página. Campos/senha precisam ser
reinformados para replay; fechar/recarregar perde esse rascunho, com aviso. Consulta
exata permite reconciliar um UUID guardado privadamente. Respostas de sessões
anteriores/instâncias destruídas não podem limpar intenção nem encerrar login novo.
[Contrato](api/provisionamento.yaml); [evidência](evidencias/sprint-01-retomada-ciclo-4.md).

## Documentos relacionados

- [Modelo de dados](05_DATABASE.md)
- [Sessões](04_SECURITY.md#jwt-e-sessoes)
- [Permissões por ação e unidade](11_ACCESS_CONTROL.md)
- [Webhooks](21_INTEGRATIONS.md#mercado-pago)

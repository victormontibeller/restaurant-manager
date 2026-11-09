# Perfis, permissões e unidades

> **Escopo:** modelo de autorização, tela configurável, matriz inicial e ações protegidas.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Modelo de autorização

- Perfis fixos: **Administrador, Gerente, Atendimento, Caixa, Cozinha e Expedição**. Sem criação de perfis livres no MVP.
- Cada funcionário tem um perfil e um conjunto de unidades. Administrador tem cobertura integral da empresa; os demais ficam restritos às unidades atribuídas.
- A matriz de ações é configurada por empresa e perfil. Não há exceções individuais nem matriz diferente por unidade no primeiro modelo: o acesso efetivo combina a mesma matriz com as unidades do usuário.
- Ações sobre dados empresariais compartilhados, como editar um produto comum a filiais, são identificadas como escopo empresa; a tela avisa o impacto. Preço/disponibilidade por unidade continuam sujeitos à unidade permitida.
- Cliente e participante de mesa têm políticas próprias por propriedade/vínculo do recurso; não entram na matriz de funcionários.
- Operador do SaaS usa contexto público e autorização separada.

Autorização efetiva = identidade/sessão ativa + tenant correspondente + ação permitida + unidade autorizada quando aplicável + vínculo com recurso + regra de estado. Permissão nunca ignora uma regra financeira ou transição inválida.

## Tela Configurações → Acessos

Administrador edita uma matriz com grupos de módulos nas linhas e os cinco perfis operacionais nas colunas. Cada grupo exibe apenas as ações suportadas, com busca, descrição e dependências. Administrador é protegido e não editável. O salvamento exige versão da configuração, registra antes/depois e revalida o ator.

Permitir uma ação que depende de consulta deve incluir apenas a consulta mínima necessária e deixar essa dependência visível. Mudança de permissão vale na próxima operação, inclusive com JWT ainda válido. Assinaturas de eventos devem ser revistas/revogadas quando perderem acesso. Seeds criam padrões ausentes; não sobrescrevem a configuração do restaurante.

<a id="matriz-inicial"></a>
## Matriz inicial proposta

`✓` = permitido inicialmente; `—` = negado inicialmente. A matriz dos cinco perfis é editável. Administrador tem todas as ações empresariais, sujeito às mesmas invariantes.

| Ação / grupo | Gerente | Atendimento | Caixa | Cozinha | Expedição |
| --- | --- | --- | --- | --- | --- |
| Consultar catálogo operacional | ✓ | ✓ | ✓ | ✓ | ✓ |
| Criar/editar/desativar catálogo compartilhado | ✓ | — | — | — | — |
| Alterar preço/disponibilidade na unidade | ✓ | — | — | — | — |
| Consultar pedidos com dados mínimos para a função | ✓ | ✓ | ✓ | ✓ | ✓ |
| Criar pedido assistido / abrir atendimento | ✓ | ✓ | — | — | — |
| Aceitar ou recusar delivery/retirada | ✓ | ✓ | — | — | — |
| Iniciar preparo / marcar pronto | ✓ | — | — | ✓ | — |
| Marcar servido na mesa | ✓ | ✓ | — | — | ✓ |
| Marcar retirada / saída / entrega | ✓ | — | — | — | ✓ |
| Cancelar antes de qualquer preparo, com motivo | ✓ | ✓ | — | — | — |
| Cancelar após início do preparo, com motivo | ✓ | — | — | — | — |
| Atender solicitações de mesa | ✓ | ✓ | — | — | — |
| Iniciar fechamento / reabrir antes do primeiro recebimento | ✓ | — | ✓ | — | — |
| Registrar recebimento / concluir fechamento | ✓ | — | ✓ | — | — |
| Ajuste financeiro após recebimento | ✓ | — | — | — | — |
| Solicitar devolução integral ou parcial | ✓ | — | — | — | — |
| Consultar relatórios de vendas da unidade | ✓ | — | ✓ | — | — |
| Consultar auditoria empresarial operacional | ✓ | — | — | — | — |

Gerenciar funcionários, conceder permissões, configurar unidades, credenciais de integração e parâmetros da empresa são ações exclusivas do Administrador no MVP. Não pertencem à matriz delegável. Cozinha recebe dados de preparo; Expedição recebe dados de entrega necessários; Caixa recebe dados financeiros necessários. Ter `pedido.consultar` não libera o payload completo de outros contextos.

## Catálogo de ações

Os nomes finais serão fixados no contrato da Sprint 1. Convenção proposta: `recurso.acao`, por exemplo `pedido.aceitar`, `pedido.recusar`, `pedido.cancelar_antes_preparo`, `pedido.cancelar_apos_preparo`, `cozinha.iniciar`, `cozinha.concluir`, `comanda.iniciar_fechamento`, `comanda.reabrir`, `recebimento.registrar`, `financeiro.ajustar` e `devolucao.solicitar`.

CRUD não cobre automaticamente ações de negócio. `pedido.editar` não permite alterar preço calculado, receber, cancelar ou devolver. Devolução automática por recusa/expiração usa um ator de sistema e uma regra auditável; não depende de um operador humano estar conectado.

## Proteções

- Impedir exclusão, inativação ou rebaixamento que elimine o último Administrador ativo.
- Usuário sem autorização não consulta, altera, exporta nem assina eventos de outra unidade/empresa.
- Atribuição de perfil e unidade exige Administrador e é auditada. Não aceitar perfil/unidades enviados pelo cadastro público.
- Negar por padrão ações novas até que recebam regra/seed deliberados.
- Alterações concorrentes da matriz retornam conflito, sem sobrescrever silenciosamente outra edição.
- Auditoria técnica da plataforma não deve se transformar em relatório comercial de todos os tenants.

## Incremento da Sprint 01 — ciclo 5

Implementados: catálogo explícito `Acao`, seeds aditivos por migration, matriz dos cinco perfis com dependências de consulta, versão/conflito e auditoria antes/depois; listagem paginada e edição dos funcionários existentes; perfil, unidades e inativação com revogação durável. Configuração de unidades, convites e eventos cadastrais estão descritos abaixo. Resultados por artefato e release efetivamente servido ficam no [checkpoint](25_EXECUTION_STATUS.md); estes contratos não aprovam a Sprint.

Mutações de equipe/matriz serializam no registro empresarial `politica_acesso`, revalidam ator/sessão e protegem o último Administrador. A política central adquire lock compartilhado dentro da transação do caso de uso e consulta vínculos/permissões atuais. Consumidores futuros precisam chamar essa política e validar recurso/estado/projeções; enumerar uma ação NÃO implementa pedido, catálogo ou finanças. O acompanhamento cadastral abaixo aplica essa política; eventos operacionais de pedidos continuam fora deste incremento.

UI usa um perfil por vez e checkboxes verticais pesquisáveis, sem tabela horizontal obrigatória. Edições sensíveis exigem confirmação explícita da senha na sessão, válida por cinco minutos. Resultado de testes e limitações ficam no checkpoint; não inferir homologação a partir deste contrato.

No incremento local do ciclo20, a lista de funcionários mantém perfil, atividade
e salvamento visíveis, mas monta os checkboxes de unidades somente para um
funcionário aberto por vez. O botão com estado expandido/controle associado
funciona por teclado e apresenta a contagem de vínculos em edição. Fechar ou
abrir outro cartão não salva nem perde as escolhas em memória; a escrita
continua explícita, versionada e autorizada no backend. Recarga/paginação bem
sucedida fecha o editor junto da substituição da lista; falha mantém os dados e
o editor anteriores. Vínculos inativos continuam removíveis no editor aberto.
Essa alteração evita multiplicar todos os controles por funcionários × unidades.
Probes de componente com API fictícia não substituem E2E do novo artefato;
publicação e homologação devem ser conferidas no checkpoint.

### Contratos disponíveis no candidato

Esquemas de entrada/saída, segurança e erros em [OpenAPI de acessos](api/acessos.yaml);
login/refresh/confirmação em [OpenAPI de identidade](api/identidade.yaml).

- `GET/PUT /api/v1/configuracoes/acessos`: consulta e substituição das ações de um perfil com `versao`, `perfil`, `acoes`; dependências mínimas são adicionadas pelo servidor.
- `GET /api/v1/equipe?pagina=0`: até 50 funcionários, sem clientes/segredos.
- `PUT /api/v1/equipe/{id}`: `versao`, `perfil`, `ativo`, `unidades`; Administrador não recebe vínculos individuais e nunca pode ser eliminado como último ativo.
- `GET /api/v1/acessos/efetivos` e `GET /api/v1/operacao/unidades[/{id}]`: identidade atual, ações e unidades permitidas. A lista pública `/unidades` permanece somente dados públicos, não é lista operacional.
- `POST /api/v1/auth/reautenticar`: Bearer e `senha`; falha de confirmação não deve invalidar a sessão existente. Limite por usuário e prazo conferidos no backend.

## Configuração de unidades — incremento do ciclo 6

Somente o Administrador consulta o cadastro administrativo completo e cria/edita/inativa unidades; mutações exigem a mesma reautenticação de cinco minutos. Listagem de até 50 registros por página inclui inativas. O servidor valida nome não vazio, tamanho, ausência de caracteres de controle e fuso IANA reconhecido. A lista pública continua retornando apenas dados públicos de unidades ativas.

Criação recebe um UUID de intenção gerado pelo cliente. Sob o mesmo lock empresarial da equipe, persiste ator/payload normalizado original; reenvio idêntico retorna o estado atual sem duplicar unidade/auditoria, mesmo após uma edição. Mesmo ID com dados/ator divergentes conflita. A intenção permanece enquanto o cadastro existir. PUT exige versão; edições concorrentes não sobrescrevem silenciosamente. Auditoria acompanha a transação e usa `INEXISTENTE` como estado anterior da criação, não SQL NULL.

Inativação é lógica: preserva cadastro e vínculos, mas remove imediatamente a elegibilidade nas consultas e ações operacionais atuais. Reativação restaura essa elegibilidade para vínculos ainda existentes. Não confundir inativação de unidade com suspensão comercial da empresa. Antes de introduzir pedidos/comandas, a Sprint 03 precisa proteger a conclusão de operações existentes também nesse fluxo; não há pedidos nesta entrega.

Editar/inativar funcionário pode preservar ou remover seus vínculos já existentes
com unidades inativas; não permite conceder vínculo novo a unidade inativa.
A UI identifica esses vínculos e mantém o checkbox durante a edição, permitindo
desfazer antes de salvar sem perder foco. Removido e salvo, o vínculo não retorna
quando a unidade é reativada. Inativar funcionário revoga as sessões mesmo que
suas unidades estejam inativas. Reativação não ressuscita sessões revogadas.

Rotas: `GET/POST /api/v1/configuracoes/unidades`, `GET/PUT /api/v1/configuracoes/unidades/{id}`. [Contrato OpenAPI parcial](api/unidades.yaml). UI separa unidades e acessos em navegação interna e mostra conflitos. Horários, canais, regiões e parâmetros ainda dependem das sprints seguintes.

No candidato do ciclo 7, a criação incerta conserva UUID/payload em memória, segregados por conta e origem, inclusive após logout e novo login na mesma página. Rejeição de um retry não apaga intenção anterior: consulta por UUID reconcilia o resultado. Navegação entre seções aguarda operações; página/lista só mudam juntas após resposta válida. Logout continua permitido por segurança e login fica bloqueado enquanto o encerramento anterior não for confirmado. Nenhum token ou payload é gravado em armazenamento do navegador; fechar/recarregar a página ainda perde o rascunho, com aviso de saída enquanto houver pendência. Não afirmar recuperação durável de navegador encerrado. Os testes e o SHA efetivamente validado estão no checkpoint.

## Convites — incremento do ciclo 11

O candidato acrescenta criação idempotente, listagem paginada, consulta exata e revogação de convites exclusivamente pelo Administrador; escrita exige reautenticação. Aceite cria somente conta nova com os vínculos persistidos e prova de e-mail. Condições, concorrência e retenção estão na [fonte de segurança](04_SECURITY.md); [OpenAPI](api/convites.yaml). A UI Gerenciar convites é separada de equipe/matriz. Não equivale à verificação de funcionários já existentes nem à jornada SaaS. Resultado e limitações no checkpoint.

## Acompanhamento cadastral por unidade — retomada ciclo 5

O candidato acrescenta `unidade.acompanhar`, ação delegável de escopo UNIDADE,
inicialmente concedida aos cinco perfis operacionais; Administrador continua
cobrindo a empresa. Não concede consulta a pedidos, clientes ou finanças.
O seed V12 acrescenta somente essa ação, sem restaurar permissões antigas removidas.

`GET /api/v1/operacao/unidades/{id}/eventos?depois=-1` recupera estado atual e
até cinquenta eventos de cadastro. A próxima consulta usa `proximo`, cursor
decimal transportado como string, exclusivo da unidade. Não há contador global
que revele volume de outra filial. Política/sessão/vínculos são revalidados a cada
GET sob lock compartilhado; escritores mantêm lock exclusivo até confirmar
unidade, auditoria e evento. Retirada de ação retorna 403; unidade alheia/inativa
retorna 404; sessão revogada retorna 401, mesmo com JWT ainda não expirado.

Projeção contém somente unidade, nome, fuso, versão, tipo, atividade e instante.
Não expõe autor, e-mail, payload de criação nem estados de acesso de terceiros.
PUT sem mudança não fabrica versão/evento; reenvio da criação não duplica evento.
O snapshot atual também cobre cadastros anteriores ao recurso, sem inventar
histórico retroativo. Eventos deste incremento permanecem no banco; não há
expurgo de histórico nem SLA de entrega prometido.

Angular usa polling sequencial de cinco segundos, sem token em URL/storage.
Revogação encerra o acompanhamento e limpa dados; desconexão informa ausência
de confirmação e recupera estado/histórico ao voltar. Tela fechada não mantém
assinatura; retorno reconsulta o banco. Não é SSE nem comprova eventos de pedidos.
[Contrato](api/eventos-unidade.yaml); [evidência](evidencias/sprint-01-retomada-ciclo-5.md).

### Exportação cadastral — incremento do ciclo 14

O candidato acrescenta exportação JSON do cadastro da unidade acompanhada:
somente id, nome, fuso e versão. O clique faz nova consulta ao endpoint autorizado
de acompanhamento, com sessão, ação e vínculo revalidados no backend; nunca
transforma o cache da tela em arquivo depois de falha/revogação. Reutiliza a
política `unidade.acompanhar`, sem introduzir rota pública ou autorização por botão.

Trocar unidade, encerrar sessão ou destruir a tela descarta respostas pendentes.
Download usa URL temporária revogada após acionamento, sem token em URL/storage.
A UI diferencia arquivo solicitado ao navegador de download efetivamente salvo.
Não exporta histórico, equipe, contatos ou dados financeiros. Este escopo não
antecipa relatórios da Sprint04. O checkpoint registra testes de lógica,
E2E/UI42–43, build e revisão visual do artefato correspondente; aprovação de uma
versão anterior não aprova o Angular alterado.

## Ações acrescentadas na Sprint 4 local

`entrega.registrar_ocorrencia` é concedida inicialmente a Gerente e Expedição;
`entrega.decidir_ocorrencia` e `pagamento.reconciliar` ao Gerente. Todas são de
unidade e dependem de `pedido.consultar`. Administrador conserva escopo empresarial.
Configuração de regiões/checkout e OAuth são exclusivas do Administrador e exigem
reautenticação; consulta da conexão também é exclusiva, sem retornar credenciais.

Receber continua separado de retirar/despachar/entregar. Confirmação presencial de
devolução exige `devolucao.solicitar`; online só é confirmada por consulta confiável
do provedor. A fila de notificações e a recuperação financeira usam
`pagamento.reconciliar`; relatório usa `relatorio.consultar`. Revalidar política,
sessão e unidade na ação, inclusive no replay. Endereço pessoal exige cliente e
propriedade; expedição recebe endereço por projeção específica. Cozinha não recebe
endereço, contato ou campos de pagamento no JSON.

## Referências relacionadas

- [Validação positiva e negativa de todos os perfis](26_TEST_STRATEGY.md)
- [Jornadas por perfil](01_PRD.md)
- [Autenticação e sessões](04_SECURITY.md)
- [Isolamento](06_MULTI_TENANT.md)
- [Estados e regras das ações](20_BUSINESS_RULES.md)

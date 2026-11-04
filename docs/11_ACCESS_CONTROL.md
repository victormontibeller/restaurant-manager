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

Implementados no candidato de desenvolvimento: catálogo explícito `Acao`, seeds aditivos por migration, matriz dos cinco perfis com dependências de consulta, versão/conflito e auditoria antes/depois; listagem paginada e edição dos funcionários existentes; perfil, unidades e inativação com revogação durável. Convites/criação de funcionários ainda não estão entregues. O ciclo 6 acrescenta a configuração de unidades descrita abaixo; resultados e release efetivamente servido ficam no checkpoint.

Mutações de equipe/matriz serializam no registro empresarial `politica_acesso`, revalidam ator/sessão e protegem o último Administrador. A política central adquire lock compartilhado dentro da transação do caso de uso e consulta vínculos/permissões atuais. Consumidores futuros precisam chamar essa política e validar recurso/estado/projeções; enumerar uma ação NÃO implementa pedido, catálogo ou finanças. Eventos ainda não existem e sua revogação permanece pendente.

UI usa um perfil por vez e checkboxes verticais pesquisáveis, sem tabela horizontal obrigatória. Edições sensíveis exigem confirmação explícita da senha na sessão, válida por cinco minutos. Resultado de testes e limitações ficam no checkpoint; não inferir homologação a partir deste contrato.

### Contratos disponíveis no candidato

- `GET/PUT /api/v1/configuracoes/acessos`: consulta e substituição das ações de um perfil com `versao`, `perfil`, `acoes`; dependências mínimas são adicionadas pelo servidor.
- `GET /api/v1/equipe?pagina=0`: até 50 funcionários, sem clientes/segredos.
- `PUT /api/v1/equipe/{id}`: `versao`, `perfil`, `ativo`, `unidades`; Administrador não recebe vínculos individuais e nunca pode ser eliminado como último ativo.
- `GET /api/v1/acessos/efetivos` e `GET /api/v1/operacao/unidades[/{id}]`: identidade atual, ações e unidades permitidas. A lista pública `/unidades` permanece somente dados públicos, não é lista operacional.
- `POST /api/v1/auth/reautenticar`: Bearer e `senha`; falha de confirmação não deve invalidar a sessão existente. Limite por usuário e prazo conferidos no backend.

## Configuração de unidades — incremento do ciclo 6

Somente o Administrador consulta o cadastro administrativo completo e cria/edita/inativa unidades; mutações exigem a mesma reautenticação de cinco minutos. Listagem de até 50 registros por página inclui inativas. O servidor valida nome não vazio, tamanho, ausência de caracteres de controle e fuso IANA reconhecido. A lista pública continua retornando apenas dados públicos de unidades ativas.

Criação recebe um UUID de intenção gerado pelo cliente. Sob o mesmo lock empresarial da equipe, persiste ator/payload normalizado original; reenvio idêntico retorna o estado atual sem duplicar unidade/auditoria, mesmo após uma edição. Mesmo ID com dados/ator divergentes conflita. A intenção permanece enquanto o cadastro existir. PUT exige versão; edições concorrentes não sobrescrevem silenciosamente. Auditoria acompanha a transação e usa `INEXISTENTE` como estado anterior da criação, não SQL NULL.

Inativação é lógica: preserva cadastro e vínculos, mas remove imediatamente a elegibilidade nas consultas e ações operacionais atuais. Reativação restaura essa elegibilidade para vínculos ainda existentes. Não confundir inativação de unidade com suspensão comercial da empresa. Antes de introduzir pedidos/comandas, a Sprint 03 precisa proteger a conclusão de operações existentes também nesse fluxo; não há pedidos nesta entrega.

Rotas: `GET/POST /api/v1/configuracoes/unidades`, `GET/PUT /api/v1/configuracoes/unidades/{id}`. [Contrato OpenAPI parcial](api/unidades.yaml). UI separa unidades e acessos em navegação interna e mostra conflitos. Horários, canais, regiões e parâmetros ainda dependem das sprints seguintes.

No candidato do ciclo 7, a criação incerta conserva UUID/payload em memória, segregados por conta e origem, inclusive após logout e novo login na mesma página. Rejeição de um retry não apaga intenção anterior: consulta por UUID reconcilia o resultado. Navegação entre seções aguarda operações; página/lista só mudam juntas após resposta válida. Logout continua permitido por segurança e login fica bloqueado enquanto o encerramento anterior não for confirmado. Nenhum token ou payload é gravado em armazenamento do navegador; fechar/recarregar a página ainda perde o rascunho, com aviso de saída enquanto houver pendência. Não afirmar recuperação durável de navegador encerrado. Os testes e o SHA efetivamente validado estão no checkpoint.

## Referências relacionadas

- [Validação positiva e negativa de todos os perfis](26_TEST_STRATEGY.md)
- [Jornadas por perfil](01_PRD.md)
- [Autenticação e sessões](04_SECURITY.md)
- [Isolamento](06_MULTI_TENANT.md)
- [Estados e regras das ações](20_BUSINESS_RULES.md)

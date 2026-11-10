# Estratégia de testes e validação completa

> **Escopo:** testes durante o desenvolvimento, critérios para homologação automática e validação final de telas, jornadas e níveis de acesso.
> **Situação:** plano obrigatório de validação, com implementação e suítes em andamento. A presença de um cenário abaixo não comprova execução; resultados por artefato ficam no [inventário de cobertura](evidencias/cobertura.md) e no [checkpoint](25_EXECUTION_STATUS.md).

[Índice da documentação](README.md)

## O que significa a entrega completa

O Hermes deve implementar, testar, corrigir e repetir as verificações afetadas autonomamente. Ao final, validar o release integrado em homologação, usando a aplicação Angular, a API Spring e PostgreSQL reais. O objetivo não é apenas abrir páginas: comprovar resultado funcional, autorização, persistência, recuperação e comportamento visual das jornadas.

“Completo” significa cobrir todas as telas/ações implementadas dentro do escopo do projeto, todos os atores definidos, os estados e negativos aplicáveis e os critérios das sprints. Não significa testar toda combinação matemática imaginável nem declarar garantias além da evidência. Tela, rota ou ação nova exige atualização do catálogo de cobertura; nenhuma pode desaparecer da avaliação por não ter teste.

Os perfis e suas permissões são definidos em [Acessos](11_ACCESS_CONTROL.md). As expectativas de teste devem ser independentes da função de autorização testada: não gerar o resultado esperado chamando a mesma função cuja correção se pretende demonstrar.

## Camadas e ferramentas

| Camada | Cobertura necessária |
| --- | --- |
| Unidade do backend | Cálculo monetário, limites, configurações de combo, regras de transição, exceções e invariantes isoláveis |
| Integração com PostgreSQL | Schemas, migrations, constraints, consultas, transações, locks, concorrência, inbox/outbox e recuperação |
| API e segurança | JWT/sessão, CSRF onde aplicável, ações, propriedade de recursos, unidade/tenant, adulteração de entrada, idempotência e contratos de erro |
| Frontend | Validações de formulário, estados de UI, componentes compartilhados, resumo de preço, permissões exibidas e reconexão |
| E2E no navegador | Percursos entre telas com frontend/backend/banco reais, operações permitidas e negadas, resultado persistido e atualização operacional |
| Provedores | Testes determinísticos de falha/retry com adaptadores controlados, separados de homologação em sandbox e validação real autorizada |
| Operação | Instalação do release, health, reinício, migration compatível/incompatível, retorno e restauração de banco/mídia |

Usar Playwright como ferramenta de automação E2E, com versão fixada e comandos criados na Sprint 0. Projetos permitem organizar execuções por navegador/dispositivo; relatórios HTML e formato estruturado permitem inspecionar resultados. Referências: [projetos](https://playwright.dev/docs/test-projects) e [relatórios](https://playwright.dev/docs/test-reporters).

Mocks são permitidos nos testes de unidade e nas fronteiras externas controladas. Na suíte que comprova jornada integrada, não substituir a API, a autorização, o cálculo do pedido nem o PostgreSQL por respostas prontas. Se Mercado Pago/e-mail forem simulados, marcar esse contexto como simulado; não apresentá-lo como homologação do provedor.

Provas de interrupção de transporte com `page.route` isolam o service worker
somente nesse contexto, pois ele pode impedir a interceptação pelo Playwright.
Preservar a chamada real ao backend, asserções de commit/reconciliação e
evidência de que a falha foi injetada. As jornadas normais e a suíte PWA mantêm
o worker ativo. Essa fronteira e suas reexecuções ficam identificadas no
relatório; não comprovam o comportamento da PWA por si sós.

## Massa de dados e isolamento da execução

- Pelo menos duas empresas fictícias, A e B. A possui unidades A1 e A2; um funcionário operacional tem acesso somente a A1. Cada empresa possui suas identidades, dados e integração fictícia/sandbox segregados.
- Contas de todos os seis perfis de funcionário, operador da plataforma, dois clientes diferentes e participantes de atendimentos/mesas diferentes.
- Catálogo com produto simples, adicionais, combo personalizável, opções indisponíveis, configurações diferentes e múltiplas unidades comerciais.
- Pedidos dos três canais em estados necessários, comandas abertas/em fechamento/fechadas, recebimentos parciais e devoluções confirmadas/pendentes/falhas.
- Seeds reproduzíveis, somente em ambientes identificados como testes/homologação. Gerar senhas/tokens por execução; nunca publicar credenciais fixas, dumps, sessões de navegador ou dados reais.
- Compartilhar servidor não permite limpar o banco de outro processo. Usar bancos/schemas isolados por execução concorrente ou serializar. Verificar conexão efetiva antes de operações destrutivas.

## Catálogo obrigatório de telas e ações

A tabela é o inventário inicial de superfícies. Durante a implementação, cada tela real, rota, formulário, diálogo de negócio e ação deve ter uma entrada rastreável com ID próprio, cenário de teste, perfis e resultados esperados. Desdobrar famílias abaixo quando gerarem mais de uma tela; não usar um único teste de abertura para cobrir toda a família.

| ID | Superfície / família | Jornada a demonstrar |
| --- | --- | --- |
| T01 | Domínio, unidade e horários | Resolver empresa, escolher unidade e canal, informar indisponibilidade |
| T02 | Vitrine, categorias, busca e favoritos | Localizar produto, navegar, favoritar quando autenticado e voltar ao contexto |
| T03 | Detalhe de produto e adicionais | Configurar quantidades/limites e visualizar preço correto |
| T04 | Configurador de combo | Escolher componentes/adicionais, validar grupos, acréscimos e configurações diferentes |
| T05 | Carrinho e revisão | Editar/remover itens, trocar unidade com revalidação, confirmar total alterado |
| T06 | Cadastro, login, verificação e recuperação | Criar/acessar conta, recuperar senha, tratar token inválido/expirado e sair |
| T07 | Conta, endereços e histórico | Gerenciar somente dados próprios e localizar pedido anterior |
| T08 | Checkout e retorno do provedor | Escolher meio habilitado, tratar pendência/recusa/retorno sem falsa confirmação |
| T09 | Acompanhamento e cancelamento | Percorrer estados, cancelar quando elegível, solicitar avaliação e ver devolução |
| T10 | QR, código e sessão de mesa | Autorizar atendimento ativo, negar código/sessão antigos e encerrar acesso |
| T11 | Rodadas e resumo da comanda | Enviar itens, acompanhar consumo autorizado, pedir ajuda/conta |
| T12 | Painel e fila de aceite | Consultar unidade, aceitar/recusar, observar alerta e expiração |
| T13 | Pedido assistido e detalhe operacional | Lançar configuração, preservar autoria, histórico e consequências da ação |
| T14 | Mesas, atendimentos e solicitações | Abrir atendimento, autorizar participantes, atender pedidos e servir |
| T15 | KDS e produção | Iniciar/concluir unidades, exibir componentes, recuperar fila após reconexão |
| T16 | Expedição, retirada e entrega | Conferir prontos, sair/entregar/retirar, registrar ocorrência sem conclusão falsa |
| T17 | Comanda e fechamento | Bloquear rodadas, reabrir somente quando elegível, encerrar sem dívida/pendência |
| T18 | Recebimentos por valor e troco | Registrar parcelas, métodos e saldo sem sobre-recebimento |
| T19 | Ajustes e devoluções | Autorizar valor/motivo, calcular remanescente e acompanhar falhas/reconciliação |
| T20 | Catálogo administrativo | Categorias, produtos, mídia, adicionais, grupos/opções de combo e desativação |
| T21 | Preço e disponibilidade por unidade | Alterar unidade permitida, informar impacto e preservar snapshots |
| T22 | Relatórios e auditoria | Filtrar período/unidade, conferir totais e rastrear ações sem excesso de dados |
| T23 | Unidades, horários, regiões e parâmetros | Configurar canais, prazos, faixas/taxas e validar limites/coerência |
| T24 | Funcionários, convites e unidades | Gerenciar perfil/vínculos, revogar acesso e proteger último Administrador |
| T25 | Matriz Configurações → Acessos | Consultar/editar política, tratar conflito e aplicar concessão/revogação |
| T26 | Integrações do restaurante | Conectar/verificar configuração sem revelar credenciais nem misturar empresas |
| T27 | Notificações e pendências | Mostrar eventos pertinentes, estado de leitura quando existir e falhas recuperáveis |
| T28 | Administração SaaS | Provisionar, acompanhar falha/retomada, domínio e suspensão/reativação |

Para cada tela aplicável, verificar carregamento, vazio, sucesso, validação de entrada, erro recuperável, acesso negado, foco/teclado e responsividade. Testar as ações de negócio em sequência até o resultado, não somente o DOM inicial. Estados que não se aplicam precisam de justificativa; falha de implementação não é “não aplicável”.

## Matriz de jornadas por ator

| Ator | Percurso completo | Negativos mínimos |
| --- | --- | --- |
| Público | Domínio/unidade → catálogo → configuração → carrinho | Domínio desconhecido, preço adulterado, opção indisponível, checkout sem identidade exigida |
| Cliente | Conta → endereço → delivery/retirada → pagamento → acompanhamento → cancelamento/devolução | Pedido/endereço alheio, outro tenant, pagamento não confirmado, autocancelamento após preparo |
| Participante de mesa | QR/código → configuração → rodada → acompanhamento → ajuda/conta → encerramento | Código antigo, atendimento encerrado, outra mesa, rodada alheia, caixa/cozinha e envio durante fechamento |
| Administrador | Unidades/equipe → matriz → parâmetros/integrações → auditoria | Outra empresa, último administrador, conflito de edição e reautenticação sensível ausente |
| Gerente | Operação → catálogo → exceções/cancelamento → ajuste/devolução → relatório | Unidade não atribuída, devolução excedente, ação removida e estado de negócio inválido |
| Atendimento | Abrir mesa → pedido assistido → aceite/recusa → solicitações → servir | Receber/devolver sem permissão, cancelar após preparo sem ação específica, outra filial e duplicação |
| Caixa | Consultar comanda → iniciar fechamento → parcelas/troco → concluir | Recebimento excedente/concorrente, reabrir após recebimento, fechar com pendência e ações de cozinha/catálogo não concedidas |
| Cozinha | Selecionar unidade → KDS → iniciar quantidade → concluir → pronto | Endereço/dados financeiros, unidade cancelada, quantidade inválida, eventos alheios e sessão/permissão revogada |
| Expedição | Conferir prontos → retirada/saída/entrega ou serviço na mesa | Concluir delivery/retirada com saldo devido, receber sem ação própria e outra unidade |
| Operador SaaS | Provisionar → falha/retomada → domínio → suspensão/reativação | Impersonação, consumo/clientes empresariais, empresa incompleta ativa e abandono de operações existentes |

As ações dos cinco perfis configuráveis dependem da política testada; não embutir uma negação eterna quando a ação pode ser delegada. Administrador tem escopo empresarial; restrição de unidade dos funcionários não deve ser aplicada indevidamente a ele. Ações compartilhadas da empresa têm seu escopo próprio, conforme [Acessos](11_ACCESS_CONTROL.md).

## Autorização: testes positivos e negativos

Para cada ação do catálogo de permissões, cobrir cada perfil fixo com resultado esperado da matriz inicial. Nos cinco perfis configuráveis, testar concessão e revogação das ações delegáveis, preservando as exclusivas do Administrador. Cobrir dependências de consulta mínima sem liberar payloads adicionais.

Executar combinações obrigatórias:

1. Usuário autorizado, recurso permitido e estado válido: ação produz efeito correto e auditado.
2. Sem permissão: menu/botão coerente e tentativa por URL/requisição direta negada; banco e eventos não mudam.
3. Mesmo tenant, unidade não atribuída: negar detalhe, lista, busca, alteração, exportação, arquivo privado e assinatura de evento, quando aplicáveis.
4. Outro tenant, mesmo tipo/ID semelhante: não revelar existência/dados, não executar ação nem reutilizar cache/conexão.
5. Outro cliente/participante: negar recursos alheios, respeitando o resumo compartilhado autorizado da comanda.
6. Política ou vínculo removido enquanto JWT ainda é válido: próxima operação é negada e eventos deixam de ser acessíveis. Não depender de novo login.
7. Sessão encerrada/inativada/expirada: negar mutações e acesso residual, inclusive após voltar no navegador.
8. Papel/campo/unidade adulterados no payload: não elevar privilégios. Permissão válida não permite transição de estado inválida.

Revisar também campos retornados: tela sem endereço não pode receber o endereço escondido no JSON. Uma captura de tela com botão oculto não comprova autorização no backend.

## Cenários transversais obrigatórios

| ID | Cenário | Evidência esperada |
| --- | --- | --- |
| X01 | Duplo clique, reenvio e resposta perdida | Uma intenção/resultado; payload diferente com a mesma chave conflita |
| X02 | Aceite versus expiração e restart | Um vencedor, prazos persistidos, mesa fora do relógio de aceite |
| X03 | Cancelamento versus primeiro preparo | Transição única; primeiro preparo não é apagado ao cancelar a unidade iniciada |
| X04 | Enviar rodada versus fechar comanda | Rodada aceita antes do bloqueio ou negada depois, sem consumo perdido |
| X05 | Quantidades e combos | Configurações distintas, cálculo R$ 30 + 2 × (R$ 5 + R$ 3) = R$ 46, estados por unidade e cancelamento do combo inteiro |
| X06 | Recebimentos concorrentes e troco | Nunca aplicar mais que o saldo; dinheiro entregue e troco não criam crédito indevido |
| X07 | Comanda parcialmente paga e cancelada | R$ 120 de consumo, R$ 50 recebidos e R$ 80 cancelados deixam R$ 10 a devolver |
| X08 | Ajuste/devolução anterior e cancelamento | Combo R$ 40 com R$ 10 ajustados cancela só R$ 30 restantes; reservas + devoluções não excedem o recebido |
| X09 | Webhook inválido, repetido, fora de ordem ou tardio | Conta/tenant corretos, deduplicação e pedido cancelado não reativado |
| X10 | Timeout de cobrança/devolução | Resultado incerto reconciliado antes de repetir; obrigação não ocultada |
| X11 | Falha de e-mail/eventos e reconexão | Pedido persiste, retry controlado e UI recupera estado sem falsa confirmação |
| X12 | Alteração de preço/composição/região | Reconfirmação do carrinho e preservação do snapshot passado |
| X13 | Pool, threads, jobs e mídia | Nenhum contexto empresarial vaza após erro/reuso/reinício |
| X14 | PWA, sessão e rede | Cache sem tokens/dados privados; sem confirmar pedido offline; atualização não duplica operação |
| X15 | Release, migrações e restore | Artefato identificado, banco/mídia consistentes, retorno compatível e reconciliação externa registrada |

Concorrência deve ser reproduzida com operações simultâneas, transações independentes e verificação da invariante final. Repetir dois comandos sequencialmente não demonstra ausência de corrida. Controlar tempo/eventos nos testes quando necessário, sem depender de pausas arbitrárias frágeis.

## Navegadores, mobile e revisão visual

- Suíte final de todas as jornadas aplicáveis em Chromium, Firefox e WebKit desktop; layouts mobile de 360 px e tablet de 768 px em projetos dedicados, além de desktop de 1280 px.
- Cada ator percorre as telas de sua jornada em desktop e no dispositivo móvel pertinente. Adaptar o layout da matriz de permissões e do KDS sem retirar ações essenciais no mobile.
- Em cada navegador, cobrir login/sessão, configuração/carrinho, retorno de checkout, eventos, reconexão e fluxos operacionais correspondentes ao ator. Registrar exatamente quais combinações foram executadas.
- Verificar foco, teclado, nomes acessíveis, validações, contraste, overflow, alvo de toque e estados de erro. Screenshots/trace ajudam a revisão, mas não substituem asserções de efeito e inspeção visual.
- Emulação valida viewport/touch e outras condições configuradas; aparelhos reais, instalação PWA e comportamento operacional do restaurante são evidência adicional do piloto, não inferência a partir de emulação. [Emulação no Playwright](https://playwright.dev/docs/emulation).
- No servidor de 8 GB, executar sequencialmente ou com concorrência medida. Falta de recursos deve resultar em execução parcelada e retomável, sem reduzir silenciosamente a cobertura.

## Quando executar

| Momento | Verificação |
| --- | --- |
| Cada incremento | Testes da mudança, regressões das regras afetadas, análise de diff/segredos e build quando aplicável |
| Alteração de autorização/tenancy/financeiro | Suíte crítica correspondente, incluindo negativos e concorrência com PostgreSQL |
| Candidato a homologação | Verificar SHA/artefato, migrações e configuração isolada; executar gates do [guia de publicação](24_AGENT_EXECUTION.md#publicacao-homologacao) |
| Após deploy de homologação | Health, smoke das jornadas já disponíveis e regressões relevantes contra a versão realmente publicada |
| Fim de sprint | Critérios da sprint mais regressão integrada dos fluxos entregues até ali |
| Encerramento técnico do projeto | Suíte completa deste documento no release final integrado, sem reaproveitar um relatório de código anterior como evidência atual |

Não é necessário rodar todos os testes de todas as camadas a cada alteração documental. A autonomia exige escolher verificações proporcionais durante o desenvolvimento e executar a matriz completa ao final. Durante as correções da rodada final, repetir cenários afetados e regressões pertinentes. Para encerrar, executar a matriz completa no último release integrado; não montar uma aprovação final somando resultados de versões diferentes.

## Falhas, retries e critérios de conclusão

- Falha funcional, autorização incorreta, vazamento, divergência financeira ou perda de dados exige correção e nova verificação. Não remover o teste, afrouxar asserção ou marcar como ignorado para obter resultado verde.
- Retry é diagnóstico de instabilidade, não apagamento da falha original. Relatar testes instáveis; uma jornada obrigatória instável permanece pendente até causa e correção verificadas. [Retries no Playwright](https://playwright.dev/docs/test-retries).
- Resultados possíveis: aprovado, falhou, bloqueado, não executado e não aplicável com justificativa. Bloqueado/ignorado/não executado não conta como aprovado.
- Dependência externa ausente não impede tarefas independentes. O relatório final separa validação técnica integrada, sandbox de provedor e verificações reais/piloto.
- Conclusão técnica exige todas as telas/ações do inventário mapeadas, jornadas/negativos obrigatórios aprovados e ausência de falhas relevantes abertas. Se faltarem evidências de dispositivo/provedor/infraestrutura, declarar essas limitações e não afirmar prontidão completa do piloto.
- Produção permanece fora do deploy automático autorizado. Aprovação da suíte não cria autorização de produção.

## Relatório final e evidências

O Hermes deve entregar um relatório navegável contendo:

1. SHA e branch do código, identificação/hash do artefato, ambiente, versões, data e ID da execução.
2. Inventário de telas/rotas/ações e seus testes; perfil, tenant/unidade, versão da política e dados fictícios utilizados.
3. Resultado por cenário e jornada, navegador/dispositivo, contagens totais e lista explícita de falhas, bloqueios e não executados.
4. Comandos executados, saídas relevantes e código de término; logs sanitizados, screenshots de estados relevantes e traces de falhas.
5. Bugs encontrados, correções e reexecuções vinculadas; evidência financeira e de isolamento quando pertinente.
6. Referência da versão em homologação, último release validado, pendências externas e próximo passo.

Resumo sanitizado versionável em `docs/evidencias/` quando houver uma execução real de testes; relatório HTML, traces, vídeos e estados autenticados ficam em armazenamento privado apropriado, com acesso informado ao usuário. Não publicar cookies, tokens, credenciais ou dados pessoais no repositório público. Até a suíte existir, não criar relatórios preenchidos com resultados fictícios.

## Executor local da matriz integrada

O executor [sprint05_matrix.py](../scripts/sprint05_matrix.py) inventaria **84
cenários × cinco projetos = 420 pares**, incluindo os workers reais de
provisionamento S01-UI29/S01-UI31 e a revogação de acesso à expedição S04-UI10.
A cobertura independente associa cada cenário
a telas T01–T28, perfis, unidades e resultados esperados. No Mac, o worker aceita
`RM_TEST_PSQL` absoluto para o cliente PostgreSQL instalado; mantém as guardas
de banco exclusivo, tenant, configuração e artefato.

O plano privado identifica recibo do build, SHA, hash/caminho do JAR, PID/porta,
fixtures e probe somente leitura de quotas. Os comandos `inventory`, `run` e
`consolidate` usam o mesmo `--plan` e `--output`; execução pode ser parcelada por
`--suite`/`--project` ou `--pair`. O inventário confere os testes reais listados
pelo Playwright antes de executar. Um lote bloqueado pela quota aguarda sua
janela; não há limpeza de contadores ou aprovação de teste bloqueado.

O gate congela fontes, configurações, fixtures e início/comando do processo;
confere todos os bytes/arquivos públicos do PWA com o JAR. Mudança nessas
entradas invalida a retomada da mesma execução. A consolidação recusa pares
faltantes/duplicados, skips, retries, resultados instáveis, falha esperada e
recibos de outro candidato. Aprovação visual exige inspeção registrada das 28
telas em desktop e mobile, vinculada aos hashes de capturas reais. O HTML/JSON
permanece privado; o resumo sanitizado e os limites pertencem à evidência da
execução identificada no [checkpoint vigente](25_EXECUTION_STATUS.md).
Este executor local não aprova implantação Linux, serviços externos ou piloto.

## Documentos relacionados

- [Jornadas do produto](01_PRD.md)
- [Permissões](11_ACCESS_CONTROL.md)
- [Definition of Done](12_DEFINITION_OF_DONE.md)
- [Sprint de homologação](19_SPRINT_05.md)
- [Regras e invariantes](20_BUSINESS_RULES.md)
- [Execução autônoma](24_AGENT_EXECUTION.md)
- [Checkpoint](25_EXECUTION_STATUS.md)

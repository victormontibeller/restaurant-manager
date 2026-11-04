# Execução pelo Hermes e Codex

> **Escopo:** desenvolvimento autônomo, branches/commits, publicação em homologação e continuidade entre execuções.
> **Situação:** execução Linux iniciada em 2026-11-04; fundação e retomadas verificadas no checkpoint. Este documento não inicia outro coordenador.

[Índice da documentação](README.md)

## Fluxo e responsabilidades

Na execução noturna autorizada em 2026-11-03, o Hermes executa diretamente com o provedor `openai-codex` e autenticação atual, sem instalar o Codex CLI. O desenvolvimento e os testes acontecem no Linux, em checkout e bancos exclusivos. O Mac continua ambiente adicional, sem ser dependência da execução.

- **Hermes:** inicia o fluxo solicitado, fornece diretório/contexto, acompanha término e retoma o próximo incremento até concluir o escopo técnico, sem nova aprovação a cada tarefa ou sprint.
- **Hermes coordenador com openai-codex:** consulta documentação, implementa, distribui subtarefas, integra e verifica critérios/checkpoint.
- **Subagentes:** recebem escopo e resultado esperado explícitos. Não precisam de nomes ou configurações permanentes para iniciar o projeto.
- **Usuário:** define escopo de produto, fornece dependências realmente ausentes e decide produção/piloto real. Desenvolvimento, testes, push e deploy de homologação já estão autorizados dentro deste fluxo.

A aplicação em produção usa serviços nativos; seu funcionamento não depende de Hermes, Codex ou uma sessão de conversa aberta.

<a id="autonomia"></a>
## Autonomia definida

A autorização abaixo cobre a execução contínua do roadmap, quando o fluxo for iniciado no Linux. Não pedir aprovação repetida para avançar entre tarefas/sprints, criar commits, fazer push ou publicar em homologação. Esta atualização documental não executa o fluxo nem configura sozinha um supervisor no servidor.

| Ação | Política |
| --- | --- |
| Ler, implementar, corrigir, testar e avançar no roadmap | Autorizado no checkout e ambientes de desenvolvimento/testes/homologação do projeto; respeitar dependências e critérios |
| Definir detalhes técnicos compatíveis com as decisões | Autorizado, com justificativa e versões registradas; mudanças de produto/escopo permanecem explícitas |
| Criar branches, commits e fazer push | Autorizado por incremento/commit principal, após revisão de diff, segredos e verificações pertinentes |
| Abrir PR | Autorizado, um por Sprint na missão vigente |
| Fazer merge em `main` | Expressamente autorizado nesta missão após revisão, testes, CI e gates da Sprint; verificar PR mesclado, SHA remoto e árvore. Commit direto e auto-merge não fazem parte do fluxo |
| Force push, apagar histórico ou descartar trabalho alheio | Fora da autorização automática |
| Deploy, serviço e migrations de homologação | Autorizado automaticamente no ambiente exclusivo de homologação, com testes, verificação do alvo e recuperação conforme este guia |
| Deploy, reinício/alteração de serviços de produção, migração de produção | Fora do fluxo automático; somente quando o usuário pedir a operação correspondente |
| Pagamentos reais, envio real de comunicações e uso de dados de clientes | Somente no escopo de homologação/operação autorizado; não usar como teste implícito |

Convenção desta missão: uma branch `hermes/sprint-NN-tema` e um PR por Sprint. Correções da mesma sprint geram commits adicionais, sem reescrever histórico. O proprietário solicitou também merges após os gates; nunca confundir essa solicitação com critério aprovado, nem fazer commit direto em main. Restrições efetivas do executor e gates pendentes devem ser preservados no checkpoint. Produção permanece fora do escopo.

Cada nova Sprint parte da `main` atualizada após o merge verificado da anterior. Branch existente empilhada deve ter o PR redirecionado para `main` após a integração de sua base, preservando commits e trabalho local. Subagentes com trabalho isolado são integrados pelo coordenador antes dessa passagem.

Manter separados o **tip integrado de desenvolvimento** e o **último release validado em homologação**. Retornar um binário não retrocede a base do código nem apaga commits posteriores. Commit/push de trabalho incompleto pode preservar progresso, identificado como tal, mas não habilita deploy nem conclusão de critério. Alterações somente documentais não exigem novo release da aplicação.

## Preparação e entrega do contexto

Antes da primeira execução:

1. Disponibilizar a documentação revisada no checkout Linux, por uma versão Git identificada. Enquanto os arquivos existirem apenas no Mac, clonar o repositório vazio não transfere o planejamento.
2. Conferir repositório, branch, base e alterações locais. A preparação da primeira sprint deve incluir o versionamento inicial dos documentos; não pressupor que já existe um commit em `main`.
3. Registrar distribuição Linux, CPU, memória disponível, disco, versões das ferramentas e serviços existentes. Não substituir instalações globais por conveniência.
4. Definir caminho do checkout e diretório privado de execução/logs no Linux. São valores locais, não caminhos pessoais fixados no código ou no repositório público.
5. Verificar o executor autorizado no host e autenticação atual. Nesta missão é Hermes/openai-codex, não Codex CLI; não instalar nem trocar autenticação.
6. Preparar acesso somente aos bancos e recursos de desenvolvimento/testes/homologação. Não disponibilizar credenciais de produção ao processo de desenvolvimento.

Se o remoto ainda estiver vazio, preparar o primeiro commit documental na primeira branch de incremento, no ambiente que já possui os arquivos, como parte da preparação do fluxo. Depois do push, obter essa branch no Linux e conferir a base; não depender de uma branch `main` ainda inexistente no remoto nem tentar iniciar um executor que não recebeu os documentos.

Leitura de cada execução: [AGENTS.md](../AGENTS.md) → [índice](README.md) → [decisões](00_PROJECT_VISION.md) → [checkpoint](25_EXECUTION_STATUS.md) → arquivo da sprint e fontes dos assuntos envolvidos.

A documentação é suficiente para recuperar as decisões deste projeto sem o histórico do chat. Quando for necessário consultar código da loja-virtual ou Schools, usar um checkout de referência identificado e somente para leitura. Sua ausência não autoriza inventar APIs, copiar segredos ou modificar os projetos de referência.

## Autenticação e chamada do Codex

Usar a autenticação local do Codex escolhida pelo usuário. `codex login status` verifica o método ativo; se necessário, o usuário conclui `codex login` no host autorizado. Não colocar tokens, arquivos de autenticação ou credenciais no Git, no prompt, no checkpoint ou em exemplos. Referência: [autenticação oficial](https://learn.chatgpt.com/docs/auth).

`codex exec` permite execução por script e reutiliza a autenticação salva do CLI. A integração deve registrar resultado, falhas e término da execução; o texto final do agente sozinho não comprova testes aprovados. Referência: [modo não interativo](https://learn.chatgpt.com/docs/non-interactive-mode).

Exemplo de chamada **a conferir no Linux**, depois de atribuir a tarefa e substituir os placeholders:

```bash
codex exec \
  --cd "<CHECKOUT_LINUX_DO_PROJETO>" \
  --sandbox workspace-write \
  --json \
  --output-last-message "<DIRETORIO_PRIVADO_DE_EXECUCAO>/resultado.md" \
  "Leia AGENTS.md, docs/24_AGENT_EXECUTION.md, docs/25_EXECUTION_STATUS.md e docs/26_TEST_STRATEGY.md. Execute o proximo incremento do fluxo autorizado, teste, corrija e registre o resultado e o proximo passo."
```

O diretório de resultado deve existir e ser gravável pelo operador. A captura do fluxo JSON e do código de saída cabe ao chamador. Não ampliar automaticamente permissões quando uma operação for bloqueada; registrar a necessidade concreta e continuar apenas trabalho independente autorizado. Não usar bypass global de sandbox como padrão.

A autenticação permanece no host privado do operador. Não transferir a sessão da conta para CI público ou para execução de contribuições não revisadas. A escolha de modelo usa a configuração disponível e autorizada; não inventar disponibilidade de modelos nem mudar para uma modalidade de cobrança diferente silenciosamente.

Os comandos reais criados na Sprint 0 estão no README. O exemplo histórico de Codex CLI acima não é o mecanismo usado nesta execução e não exige instalação/autenticação adicional. O supervisor externo já existe: não iniciar outro coordenador.

## Base técnica e bancos

A Sprint 0 resolve P01/P02 e o desenho inicial de P09/P10 por inventário e verificação de compatibilidade. O Codex pode escolher versões suportadas, pacote-base Java, ferramentas e organização técnica coerentes com a arquitetura, registrar a escolha e fixá-la nos arquivos de build/lock. Java 21 é candidato, não obrigação de instalar uma versão incompatível.

O PostgreSQL de desenvolvimento, testes e homologação fica no Linux de execução, em bancos diferentes entre si e de produção, com credenciais próprias. Se já existir uma instância adequada, usar bancos segregados sem reiniciar o cluster ou alterar outros projetos. Preparar recursos próprios de homologação faz parte do fluxo autorizado; se houver conflito com serviços existentes ou faltar acesso, registrar o impedimento concreto sem alterar produção para contorná-lo.

Antes de reset/limpeza de testes, conferir configuração e conexão efetiva: servidor, porta, banco atual e identidade autorizados. Recusar banco de desenvolvimento, produção ou de outro projeto. Testes concorrentes não compartilham um alvo destrutivo sem isolamento planejado.

Builds e testes usam diretórios/processos de desenvolvimento separados dos releases e serviços de produção. No servidor de 8 GB, começar com um build ou suíte pesada por vez; medir consumo antes de ampliar paralelismo. Compartilhar host não torna seguro reiniciar serviços ou consumir todos os recursos. CPU, disco e carga existente ainda precisam ser verificados.

Ensaios automáticos de falha ficam restritos aos processos, conexões e recursos exclusivos de homologação/testes. Reboot do host compartilhado, corte global de rede e alterações que atinjam outros serviços não fazem parte dessa autonomia; sua validação operacional exige ambiente dedicado ou janela autorizada.

## Ciclo de trabalho e limites

1. Selecionar uma tarefa verificável do roadmap autorizado e registrar escopo/base na branch de incremento.
2. Conferir estado real do checkout, ambiente e dependências. Resolver escolhas técnicas dentro do escopo; sinalizar decisão de produto realmente ausente.
3. Implementar o incremento e seus casos de erro/recuperação, atualizando a fonte documental afetada.
4. Executar verificações pertinentes, revisar o diff e integrar os resultados dos subagentes.
5. Atualizar checkpoint e critérios demonstrados; criar commit e fazer push na branch do incremento. Publicar incrementos executáveis em homologação após os gates abaixo.
6. Continuar para a próxima tarefa/sprint quando seus pré-requisitos estiverem atendidos, sem pedir nova aprovação. Ao terminar o desenvolvimento integrado, executar a [validação completa](26_TEST_STRATEGY.md) e entregar relatório por tela, jornada e nível de acesso.

Uma chamada pode terminar após um incremento e ser retomada. Falha transitória pode receber retry limitado; repetição sem progresso exige diagnóstico e checkpoint, sem laço infinito. Expiração de sessão, limite de uso, dependência externa ausente ou dúvida material de produto devem produzir uma pendência clara. Isso não impede trabalho independente dentro do escopo.

Respeitar limites de sessão, conta, recursos e qualquer prazo/orçamento definido pelo usuário. Uma execução curta não encerra o objetivo: o Hermes retoma pelo checkpoint enquanto houver trabalho autorizado e condições para progredir. Não criar laço infinito em uma falha idêntica nem mascarar trabalho incompleto como concluído. Dependência ausente bloqueia somente o que depende dela; prosseguir em frentes independentes e comunicar o impedimento acionável.

Autonomia exige implementação da supervisão no Hermes: iniciar a chamada, ler término/estado, persistir checkpoint e retomar. O AGENTS.md ou esta política, isoladamente, não instalam essa rotina. A Sprint 0 deve verificar uma retomada real no Linux antes de confiar nela para longas execuções.

<a id="publicacao-homologacao"></a>
## Publicação automática em homologação

Homologação deve ter banco, credenciais, mídia, serviço, porta/origem e diretórios de release próprios, separados de desenvolvimento, testes e produção. Usar dados fictícios, e-mail capturado e provedores simulados/sandbox conforme o teste. A origem pode começar restrita ao ambiente de desenvolvimento; uma URL externa/HTTPS é dependência dos cenários que realmente a exigem, não autorização para alterar domínio/serviço de produção.

Um coordenador controla um lock de publicação que cobre migrations, instalação, verificação e eventual retorno. Para cada incremento executável:

1. Identificar SHA candidato, testes pertinentes aprovados, artefato reproduzível e seu hash. Mudança no código invalida a evidência afetada; build não pode incluir arquivos locais sem commit por acidente.
2. Verificar identidade efetiva do serviço/banco de homologação, configuração, espaço e recursos. Bloquear alvo ambíguo ou de produção. Garantir ponto de recuperação de banco/mídia quando a alteração exigir.
3. Aplicar migrations com registro de `public` e de cada tenant; compatibilidade e manutenção seguem o [runbook](22_PRODUCTION_RUNBOOK.md). Falha parcial não conta como release concluído.
4. Instalar o artefato e reiniciar somente o serviço próprio de homologação. Observar o SHA/artefato efetivamente servido por metadado técnico protegido ou manifesto verificado; o HEAD do checkout não é prova do runtime.
5. Executar health, smoke e regressões aplicáveis contra a versão publicada. Enquanto isso, marcar como candidato/em validação; não atualizar o último release validado antecipadamente.
6. Se aprovado, registrar a versão validada e continuar. Se falhar, diagnosticar, corrigir em novo commit e repetir os checks afetados; não insistir publicando o mesmo artefato defeituoso.
7. Quando necessário, retornar automaticamente ao release anterior somente se compatível com o banco atual. Não executar down migration destrutiva implícita. Restore automático limita-se ao banco/mídia exclusivos de homologação com dados fictícios, ponto consistente identificado, evidências preservadas e escritores parados; caso contrário, preservar o estado e corrigir adiante ou registrar bloqueio.

O deploy de homologação não depende de nova aprovação a cada incremento. Produção, contas/pagamentos reais, comunicações reais e abertura do piloto permanecem fora dessa autorização automática. O teste completo final deve apontar para o SHA realmente implantado e incluir o resultado de todos os cenários obrigatórios; testes de versões anteriores não encerram esse requisito.

## Subagentes e concorrência

- Coordenador único mantém escopo, integração e checkpoint.
- Leituras e revisões independentes podem ser paralelas. Revisores recebem orientação de não editar.
- Escritas paralelas precisam de escopos de arquivos separados; contratos centrais, dependências, migrações, documentação de decisões e checkpoint são integrados de forma serializada.
- Evitar dois executores independentes escrevendo no mesmo checkout/branch. Worktrees podem separar código, mas não isolam automaticamente banco, portas ou serviços.
- Identificar processos e recursos temporários criados pela execução. Encerrar somente os que pertencem à tarefa; nunca matar processos desconhecidos para liberar uma porta.

<a id="checkpoint"></a>
## Checkpoint e retomada

[25_EXECUTION_STATUS.md](25_EXECUTION_STATUS.md) é o resumo vigente e sanitizado. Registros detalhados de execução e dados locais ficam fora do Git; apenas evidências apropriadas ao repositório público podem ser versionadas.

Atualizar após incremento verificável, antes de interrupção/handoff e ao encontrar impedimento. Registrar:

- Sprint, tarefa, critério de aceite e status real.
- Branch, commit de implementação conhecido, base e alterações ainda sem commit.
- Tip integrado, SHA candidato/testado, hash do artefato, SHA observado em homologação, último release validado e alvo compatível de retorno; não confundir esses registros.
- Estado do deploy (`não publicado`, `em validação`, `falhou`, `implantado sem validação completa` ou `validado`), resultados de migrations por schema e evidências do pós-deploy.
- Arquivos/áreas alterados e resultados verificados.
- Comandos executados, resultado e ambiente, distinguindo simulação, sandbox e operação real.
- Decisões adotadas, premissas ainda abertas e dependências externas relacionadas.
- Processos/recursos temporários, seu proprietário e forma de encerramento.
- Próximo passo concreto, sem segredos, dados de clientes ou caminho privado desnecessário.

O caminho real do checkout, localização dos logs, identidade do host e detalhes sensíveis do ambiente ficam em registro privado do operador, referenciado por um rótulo no checkpoint público. Não tentar incluir o hash de um commit dentro dele mesmo: registrar a base/último commit conhecido e conferir o HEAD real ao retomar.

Na retomada, comparar checkpoint com Git, arquivos, banco e processos atuais. Se divergirem, reconciliar antes de sobrescrever trabalho. Verificar resultado de push/comando externo que terminou sem resposta; não repeti-lo cegamente. A sessão anterior pode ajudar, mas o checkpoint e o estado real permitem continuar em uma sessão nova.

## Entrada do fluxo autônomo

Ao iniciar a execução no Linux, realizar primeiro o inventário/preflight e preparar a base documental versionada. Em seguida, criar o menor esqueleto backend/frontend que compile e use configuração isolada, com comandos de execução/teste reais documentados. Prosseguir autonomamente pelas sprints, acumulando o código nas branches encadeadas e publicando em homologação os incrementos validados.

Critério desse primeiro incremento: versões registradas, checkout correto, ausência de segredos, build reproduzível, separação dos bancos demonstrada quando provisionados e checkpoint útil para uma sessão nova. Se uma condição não puder ser verificada, registrar exatamente o que falta; não encerrar a Sprint 0 inteira por concluir somente esse incremento.

O fechamento técnico exige o relatório da [matriz completa de testes](26_TEST_STRATEGY.md). A parte operacional de piloto da Sprint 5 continua separada quando depender de dados reais, pessoas ou autorização de produção; registrar cada pendência sem marcar o piloto como concluído por testes fictícios.

## Documentos relacionados

- [Decisões e premissas](00_PROJECT_VISION.md)
- [Roadmap](13_ROADMAP.md)
- [Sprint 0](14_SPRINT_00.md)
- [Critérios de entrega](12_DEFINITION_OF_DONE.md)
- [Validação completa de telas, jornadas e acessos](26_TEST_STRATEGY.md)
- [Ambientes e operação da aplicação](22_PRODUCTION_RUNBOOK.md)

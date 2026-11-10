# Sprint 05 — Homologação e piloto

> **Escopo:** preparação e validação local/CI, resultados e critérios pendentes; não altera as fontes normativas dos assuntos.
> **Situação:** preparação inicial integrada pelo PR #9; validação complementar no Mac/CI concluída no PR #10. Homologação técnica no Linux e piloto real pendentes. Decisões e limites seguem o [registro central](00_PROJECT_VISION.md).

[Índice da documentação](README.md)

**Status atual:** o proprietário autorizou concluir os testes possíveis no
Mac/CI, corrigir falhas e remover a cópia antiga da Sprint 4. O incremento segue
na branch `codex/sprint-05-registro-entregas`,
[PR #10](https://github.com/victormontibeller/restaurant-manager/pull/10),
sobre a `main` integrada em `5ea8324`. A
[evidência complementar](evidencias/sprint-05-validacao-mac-ci-2026-11-09.md)
separa resultados aprovados, falhas preservadas e dependências externas.
Implantação e matriz completa no Linux ficam para etapa própria.

Os itens marcados abaixo têm evidência de execução local no Mac ou de CI.
Os critérios de fechamento técnico e do piloto continuam pendentes; a aprovação
da preparação local não encerra a Sprint 5 inteira.

Esta sprint tem dois fechamentos separados: **homologação técnica**, executável autonomamente com dados fictícios/sandbox, e **piloto real**, dependente de pessoas, serviços reais e autorização de produção. Pode haver homologação técnica concluída com piloto pendente; não marcar a sprint inteira como concluída nesse caso.

## Entregáveis

### Preparação inicial integrada — PR #9

- [x] Criar a branch a partir da `main` integrada, levar a atualização pendente do checkpoint e preservar por hash os dois arquivos locais preexistentes.
- [x] Atualizar roadmap e revisar instalação, configuração, build, deploy e recuperação; procedimentos, limites e lacunas Linux registrados no [runbook](22_PRODUCTION_RUNBOOK.md#ensaio-local-sprint-5).
- [x] Validar o grupo opcional de pagamentos no runtime e a recusa da instalação Linux no Mac; essas guardas não comprovam integração com o provedor nem instalação no servidor.
- [x] Ensaiar backup/restore de PostgreSQL e mídia, com comparação integral e negativos entre tenants, em cluster privado com dados fictícios; recuperar por hash um pacote de configuração novo e efêmero.
- [x] Executar carga sintética com [perfil versionado](../scripts/profiles/sprint05-local.json), interrupção da API/conexão próprias e retomada sem duplicação de pedido ou recebimento.
- [x] Corrigir na revisão final o manifesto incompleto, a omissão de tenants com schema ausente e o caminho inseguro nas opções do PostgreSQL; repetir o ensaio integrado com as guardas corrigidas.
- [x] Registrar falhas/reexecuções e limites nas [evidências iniciais](evidencias/sprint-05-preparacao-local-2026-11-09.md) e na [revisão final](evidencias/revisao-final-sprint-05-2026-11-09.md); aprovar a CI do head final e integrar o PR #9 com autorização do proprietário.

### Validação complementar no Mac/CI — PR #10 concluída

- [x] Executar build completo com 435 testes backend, checks Angular e auditorias; após a correção CSS, recompilar frontend e conferir a identidade dos componentes backend no novo JAR.
- [x] Ampliar a prova de autorização e timeout com 17 casos novos; aprovar a reexecução dirigida de 51 testes em sete classes, preservando a primeira rodada reprovada.
- [x] Aprovar 234 testes portáveis de scripts no Mac, sem falhas, erros ou skips; registrar separadamente os dez métodos dependentes de `/proc`.
- [x] Ensaiar perda real de resposta HTTP de cobrança/devolução no provedor fictício, reinício próprio e reconciliação sem duplicação; rodada financeira 01 do candidato 02 aprovada, sem sandbox ou pagamento real.
- [x] Corrigir três textos de baixo contraste do shell da equipe e melhorar a legibilidade do placeholder decorativo de produto; medição dos 38 casos concluída.
- [x] Remover a cópia antiga não versionada da Sprint 4 após comparação; preservar o documento oficial e o arquivo manual local.
- [x] Aprovar a tentativa 09 no clone: chaves e dados anteriores ao backup, manutenção/retorno compatível, perda real de resposta, carga/pool, diagnósticos e cleanup sem erros. As provas reais e limites estão na evidência complementar.
- [x] Concluir os 38 casos de contraste, em uma única rodada no candidato 02, sem falhas ou revisões pendentes; preservar tentativas anteriores interrompidas e seus motivos.
- [x] Executar e consolidar os 415 pares da matriz integrada, sem falhas, skips, retries ou instabilidade; revisar 56 capturas das 28 telas em desktop/mobile e gerar relatório navegável. Todos os pares e imagens pertencem ao candidato corrigido.
- [x] Aprovar a CI integral #194 em `730949c`: 244 testes de scripts, incluindo os métodos dependentes de `/proc`, 452 backend sem falhas/erros/skips, checks Angular e auditorias; reforço final de timeout incluído.

### Homologação técnica autônoma no Linux

- [ ] Instalar e operar o release versionado com os scripts e runbook de Linux/systemd/proxy/PostgreSQL; conferir configuração segura, health e diagnóstico no host do Hermes.
- [ ] Ambiente de homologação isolado e deploy automático com artefato/SHA observado, migrations por schema, validação pós-deploy e recuperação compatível.
- [ ] Matriz completa de telas/ações, jornadas e níveis de acesso executada no release Linux conforme [estratégia de testes](26_TEST_STRATEGY.md), com relatório navegável, bugs corrigidos e evidências por cenário. A matriz local de 415 pares foi aprovada no candidato corrigido; não substitui essa execução no Linux.
- [ ] Restore técnico ensaiado em dados fictícios, alertas e procedimento de contingência/retorno no Linux. **Parcela local:** banco, mídia e configuração efêmera passaram no PR #9; a tentativa 09 aprovou manutenção, dados/chaves pré-backup, transporte, pool e diagnósticos. Diagnósticos de pagamento/devolução incertos e sua normalização passaram no ensaio financeiro novo do candidato 02.

### Preparação e operação do piloto real

- [ ] Domínio/HTTPS/ingresso funcionais, callbacks e e-mail reais validados sob condições controladas autorizadas.
- [ ] Backup externo operacional, retenção/RPO/RTO e responsáveis confirmados, além do ensaio técnico.
- [ ] Catálogo real, contas dos responsáveis, matriz aprovada, treinamento e roteiro por perfil.
- [ ] Plano de piloto com horários, volume acompanhado, critérios de interrupção, suporte e registro diário de incidentes/resultados.

## Resultados do incremento atual

O JAR local é
`123f48ee1a2d58ee890067ea76121c10762ab52cb9baedae73de2bd6f97d0efd`.
As fontes e os arquivos públicos estão identificados no manifesto; nenhum
contrato ou migration foi alterado. Resultados detalhados e limites estão na
[evidência complementar](evidencias/sprint-05-validacao-mac-ci-2026-11-09.md).

| Verificação | Resultado comprovado | Limite ou etapa posterior |
| --- | --- | --- |
| Build e regressão backend | Build inicial: 435 testes/63 relatórios, zero falhas, erros ou skips; checks Angular e auditorias aprovados. Após CSS, frontend recompilado e 506 entradas compiladas/dependências backend conferidas como idênticas | 452 testes aprovados na CI integral #194; homologação do release Linux é etapa própria |
| Autorização e timeout | 51/51 testes dirigidos aprovados na rodada 02: matriz independente de 28 ações × seis perfis, concessão/revogação com o mesmo JWT, negativos de unidade/tenant e dois timeouts HTTP reais | Repetição no release Linux |
| Scripts | 234 testes portáveis aprovados no Mac e 244 testes integrais na CI #194, incluindo os dez métodos dependentes de `/proc` | Exploração integral anterior no Mac preservada como reprovada por dependências de `/proc`; execução no host Linux é etapa própria |
| Recuperação financeira | Candidato 02, rodada financeira 01: duas perdas reais de resposta HTTP no simulador, dois reinícios próprios, uma cobrança/um recebimento/uma devolução, R$ 20,00 devolvidos e diagnósticos normalizados | Sandbox/serviços reais; este ensaio não restaura pagamentos externos |
| Contraste | Três textos corrigidos para razões entre 5,13:1 e 5,91:1; placeholder decorativo de 3,23:1 para 5,15:1. 38/38 casos medidos sem falhas ou revisões pendentes | Aceite assistivo e aparelhos reais no piloto |
| Backup, manutenção, recuperação e carga | Tentativa 09 aprovada: 33 dumps, 18.859 tabelas/146.606 linhas, 104 imagens; manutenção e chaves pré-backup; 641 requisições sem erros/187 amostras Hikari; perda real de resposta e retomada; cleanup sem erros | Release Linux, reconciliação externa e metas operacionais |
| Navegadores | 415/415 pares e 56 capturas revisadas aprovados: 83 cenários × cinco projetos, incluindo workers reais S01-UI29/S01-UI31 | Repetição no release Linux; aparelhos reais no piloto |

As rodadas dirigidas 01 e financeira 01 do candidato anterior permanecem
reprovadas, com reexecuções completas dos respectivos escopos. As tentativas
antigas de contraste 01/02 foram interrompidas por seletores. A matriz anterior
foi interrompida com 313 pares aprovados após a revisão visual encontrar três
textos obsoletos. Os textos foram corrigidos; o candidato 02 recebeu novo build,
fixtures, recuperação financeira e rodada integral de contraste. A matriz e as
capturas novas passaram integralmente sem herdar os resultados anteriores.
Não somar contagens de camadas diferentes como se fossem uma única suíte.

## Histórico da preparação integrada — PR #9

A **tentativa 08**, realizada após as correções da revisão final, é a evidência
integrada do código entregue pelo
[PR #9](https://github.com/victormontibeller/restaurant-manager/pull/9),
merge `5ea8324`, em 2026-11-09. Essa execução partiu de `8888234`, na branch
`codex/sprint-05-preparacao-homologacao`; o head revisado foi `c768c80`.
Ela não aprova o incremento atual do PR #10. Suas contagens não são somadas às
das tentativas anteriores ou à validação complementar. Identificação completa
do JAR, hashes, comandos, períodos e recibos estão na
[revisão final](evidencias/revisao-final-sprint-05-2026-11-09.md).

| Verificação | Resultado registrado | Escopo |
| --- | --- | --- |
| Correspondência do artefato | 517 fontes, configurações e arquivos públicos conferidos; hashes dos scripts executados correspondem ao head `c768c80` | JAR local identificado, sem novo release homologado |
| Banco | 31 dumps no mesmo snapshot; 17.467 tabelas e 146.623 linhas restauradas; 271 empresas ativas/suspensas; conteúdo e metadados iguais | PostgreSQL real, origem somente leitura e clone privado no Mac |
| Mídia e configuração | 104 imagens em três empresas; zero divergências ou referências órfãs; dois positivos HTTP e dois negativos entre tenants; pacote efêmero recuperado por hash | Não recupera as chaves originais nem comprova backup operacional externo |
| Carga | 625 requisições, zero erros, quatro clientes; 20,594 s; p95 de 37,782 ms | Perfil sintético curto; não define capacidade do Linux ou SLA |
| Falha e retomada | Indisponibilidade da API e rollback da conexão interrompida comprovados; um pedido cancelado, zero recebimentos e histórico sem duplicação; restart + job em 27,995 s | Processos próprios; resposta recebida e descartada pelo ensaio, sem perda de pacote injetada ou pagamento externo |
| Testes focados | 50 testes aprovados, sem falhas, erros ou skips; guarda de cobertura também conferida no PostgreSQL real | Mac; dependências de `/proc` verificadas separadamente na CI |
| CI do head final | [Fundação #186](https://github.com/victormontibeller/restaurant-manager/actions/runs/42692093114) aprovada em `c768c80`: 180 testes de scripts, 435 backend com zero falhas/erros/skips, checks Angular e auditorias | CI Linux; não é implantação ou matriz no servidor de homologação |
| Integração e preservação | PR #9 mesclado em `5ea8324`; `main` local sincronizada; processos do ensaio encerrados e arquivos/serviços preexistentes preservados | Integração de código, sem deploy ou produção |

A tabela preserva os resultados históricos, inclusive a preservação dos dois
arquivos locais naquela integração. A cópia antiga da Sprint 4 foi removida
depois, no incremento atual autorizado. O [checkpoint](25_EXECUTION_STATUS.md)
registra a confirmação do merge e o estado de retomada.

## Dependências

Para homologação técnica: Sprints anteriores, ambiente isolado e recursos necessários aos cenários executados. Dependência externa ausente bloqueia somente os testes correspondentes e fica explícita no relatório; não substituí-la por simulação com o rótulo de real.

Para piloto real: itens E01–E12 do [registro do piloto](23_PILOT_IMPLEMENTATION.md#registro-externo). Responsável pelo restaurante e responsável técnico precisam aceitar a operação antes de receber dados/pagamentos reais. O deploy automático autorizado de homologação não libera produção.

**Parcela Mac/CI concluída:** matriz 415/415, revisão visual 56/56 e cleanup
aprovados; demonstração e PostgreSQL preexistentes preservados. A próxima
etapa técnica é a homologação no release Linux.

**Etapa Linux posterior:** inventariar o ambiente, preparar checkout limpo e
release identificado, adequar manutenção/migrações e retorno ao banco encontrado
e implantar em homologação para executar a matriz completa no SHA servido.
Mercado Pago sandbox, domínio/HTTPS externo, e-mail real e backup operacional
continuam pendentes, assim como responsáveis, treinamento e aceite do piloto.

## Critérios de aceite

Critérios compostos permanecem abertos até que todas as suas partes tenham
evidência. As entregas comprovadas no Mac/CI estão marcadas nas seções próprias;
os itens abaixo delimitam o fechamento no release de homologação e no piloto.
Uma parcela local aprovada não encerra o critério externo correspondente.

### Fechamento técnico no release Linux

- [ ] Inventário de todas as telas/ações validado no release Linux, com jornadas por ator e positivos/negativos de permissão, unidade, tenant e propriedade. **Parcela local:** 415 pares integrados e 51 testes dirigidos aprovados, com cobertura por cenário e perfil. Nenhum cenário obrigatório bloqueado, ignorado, instável ou não executado conta como aprovado.
- [ ] Percursos integrados de delivery, retirada e mesa passam contra o SHA realmente implantado em homologação; testes usam Angular/API/PostgreSQL reais e identificam qualquer fronteira externa simulada.
- [ ] Teste negativo entre empresas/unidades com pelo menos dois tenants fictícios no ambiente de homologação; público da plataforma não acessa dados empresariais. **Parcela local:** negativos complementares passaram em PostgreSQL real; falta execução no release Linux.
- [ ] Perfil de carga sintético versionado explicita volume, concorrência, duração e massa fictícia; mede latência, memória, CPU, disco, pool e atraso de jobs. Registrar limites observados, sem extrapolar número de tenants suportados nem tratar o ensaio como meta operacional acordada. **Parcela local:** tentativa 09 aprovada com 641 requisições sem erros, p95 29,240 ms e 187 amostras Hikari; não houve espera nas amostras e a latência de aquisição não foi medida. Falta executar e avaliar o perfil no release Linux.
- [ ] Reinício da API/jobs e falhas de rede/provedor restritas aos processos/conexões de homologação têm procedimento testado, sem duplicar pedido/dinheiro ao retomar. Ensaiar migração incompatível com manutenção, drenagem/parada dos escritores próprios e caminho de retorno compatível. Não reiniciar o host compartilhado nem interromper sua rede global para executar esta suíte. **Parcela local:** reinício, rollback de conexão e perda real de resposta no provedor fictício/reconciliação aprovados; manutenção/retorno e perda efetiva de resposta no clone aprovados na tentativa 09. Falta validação do release Linux e das fronteiras externas aplicáveis.
- [ ] Restore isolado recupera banco/mídia/configuração e confirma segregação; registrar ponto recuperado, intervalo de dados potencialmente perdido, tempo efetivo de recuperação e reconciliação externa necessária. Validar referências de mídia com alterações concorrentes ou com a parada documentada dos escritores, conforme a estratégia escolhida. As medições técnicas não substituem metas de RPO/RTO ainda pendentes. **Parcela local:** banco, mídia, segregação e chaves correspondentes a sessão/token/ciphertext anteriores ao snapshot adicional aprovados na tentativa 09. Faltam ensaio Linux e reconciliação externa aplicável; o ensaio financeiro novo do candidato 02 prova reinício, não restore de pagamento externo.
- [ ] Suíte final nos navegadores e projetos mobile previstos, revisão visual e testes de teclado/foco mostram jornadas funcionais; relatório identifica quais dispositivos foram emulados. **Parcela local:** contraste corrigido, 38/38 casos medidos, 415/415 pares e 56 capturas revisadas aprovados. Aparelhos reais e aceite assistivo permanecem no piloto.
- [ ] Deploy de homologação falho não promove candidato; recuperação não apaga commits nem migrações inadvertidamente. Relatório vincula SHA, artefato, versão servida, comandos/resultados e último release validado. **Parcela local:** gate de startup real e retorno por OID após DDL/histórico sintéticos passaram no ensaio 09; não demonstram promoção com systemd/proxy no Linux.
- [ ] Falhas relevantes da matriz do release Linux foram corrigidas e reexecutadas. **Parcela local:** candidato anterior rejeitado, três textos corrigidos e matriz nova aprovada integralmente; cobertura por tela, perfil e cenário registrada, além da contagem geral de testes.

### Fechamento do piloto real

- [ ] Jornada completa real de delivery, retirada e mesa com cancelamento, recebimento parcial e devolução controlada, conforme os meios efetivamente habilitados e autorizados.
- [ ] Domínio, certificado, e-mail e notificações funcionam nos aparelhos reais escolhidos. Cliente e cada perfil operacional completam sua jornada com teclado/touch e erros compreensíveis.
- [ ] Recuperação após reboot do servidor e perda global de conectividade é validada em ambiente dedicado ou janela operacional autorizada, considerando outros serviços e a retomada do próprio Hermes; não confundir esse resultado com o ensaio restrito de homologação.
- [ ] Carga representativa do restaurante, limites operacionais e metas de RPO/RTO foram acordados e demonstrados pelos ensaios correspondentes, conforme E07/E11; registrar responsáveis e critérios de pausa.
- [ ] Operadores sabem identificar aceite atrasado, pedido incerto, devolução pendente e falha de backup, com responsáveis e canais conhecidos.
- [ ] Não restam falhas críticas de isolamento, autorização, integridade financeira ou perda de dados. Pendências não críticas têm responsável, prazo e aceitação expressa do piloto.
- [ ] Registrar decisão de iniciar, critérios de pausa e resultado do período acompanhado. Código concluído sem esses registros permanece em homologação.

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Operação](22_PRODUCTION_RUNBOOK.md)
- [Implantação do piloto](23_PILOT_IMPLEMENTATION.md)
- [Observabilidade](07_OBSERVABILITY.md)
- [Matriz completa de validação](26_TEST_STRATEGY.md)
- [Publicação automática em homologação](24_AGENT_EXECUTION.md#publicacao-homologacao)

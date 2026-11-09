# Sprint 05 — Homologação e piloto

> **Escopo:** execução da preparação local, resultados e critérios pendentes; não altera as fontes normativas dos assuntos.
> **Situação:** preparação local concluída, revisada e integrada; homologação técnica no Linux e piloto real pendentes. Decisões e limites seguem o [registro central](00_PROJECT_VISION.md).

[Índice da documentação](README.md)

**Status:** preparação local integrada em `main` pelo
[PR #9](https://github.com/victormontibeller/restaurant-manager/pull/9), merge
`5ea8324`, em 2026-11-09. A execução partiu de `8888234`, na branch
`codex/sprint-05-preparacao-homologacao`; o head revisado foi `c768c80`.
Implantação e matriz completa no Linux ficam para etapa própria.

Os itens marcados abaixo têm evidência de execução local no Mac ou de CI.
Os critérios de fechamento técnico e do piloto continuam pendentes; a aprovação
da preparação local não encerra a Sprint 5 inteira.

Esta sprint tem dois fechamentos separados: **homologação técnica**, executável autonomamente com dados fictícios/sandbox, e **piloto real**, dependente de pessoas, serviços reais e autorização de produção. Pode haver homologação técnica concluída com piloto pendente; não marcar a sprint inteira como concluída nesse caso.

## Entregáveis

### Preparação local concluída

- [x] Criar a branch a partir da `main` integrada, levar a atualização pendente do checkpoint e preservar por hash os dois arquivos locais preexistentes.
- [x] Atualizar roadmap e revisar instalação, configuração, build, deploy e recuperação; procedimentos, limites e lacunas Linux registrados no [runbook](22_PRODUCTION_RUNBOOK.md#ensaio-local-sprint-5).
- [x] Validar o grupo opcional de pagamentos no runtime e a recusa da instalação Linux no Mac; essas guardas não comprovam integração com o provedor nem instalação no servidor.
- [x] Ensaiar backup/restore de PostgreSQL e mídia, com comparação integral e negativos entre tenants, em cluster privado com dados fictícios; recuperar por hash um pacote de configuração novo e efêmero.
- [x] Executar carga sintética com [perfil versionado](../scripts/profiles/sprint05-local.json), interrupção da API/conexão próprias e retomada sem duplicação de pedido ou recebimento.
- [x] Corrigir na revisão final o manifesto incompleto, a omissão de tenants com schema ausente e o caminho inseguro nas opções do PostgreSQL; repetir o ensaio integrado com as guardas corrigidas.
- [x] Registrar falhas/reexecuções e limites nas [evidências iniciais](evidencias/sprint-05-preparacao-local-2026-11-09.md) e na [revisão final](evidencias/revisao-final-sprint-05-2026-11-09.md); aprovar a CI do head final e integrar o PR #9 com autorização do proprietário.

### Homologação técnica autônoma

- [ ] Release versionado, scripts e runbook de Linux/systemd/proxy/PostgreSQL, configuração segura, health e diagnóstico com Hermes.
- [ ] Ambiente de homologação isolado e deploy automático com artefato/SHA observado, migrations por schema, validação pós-deploy e recuperação compatível.
- [ ] Matriz completa de telas/ações, jornadas e níveis de acesso executada conforme [estratégia de testes](26_TEST_STRATEGY.md), com relatório navegável, bugs corrigidos e evidências por cenário.
- [ ] Restore técnico ensaiado em dados fictícios, alertas e procedimento de contingência/retorno. **Parcial:** banco, mídia e configuração efêmera passaram no Mac; ainda faltam validação no Linux, alertas e retorno do release implantado.

### Preparação e operação do piloto real

- [ ] Domínio/HTTPS/ingresso funcionais, callbacks e e-mail reais validados sob condições controladas autorizadas.
- [ ] Backup externo operacional, retenção/RPO/RTO e responsáveis confirmados, além do ensaio técnico.
- [ ] Catálogo real, contas dos responsáveis, matriz aprovada, treinamento e roteiro por perfil.
- [ ] Plano de piloto com horários, volume acompanhado, critérios de interrupção, suporte e registro diário de incidentes/resultados.

## Resultados da preparação local

A **tentativa 08**, realizada após as correções da revisão final, é a evidência
integrada do código entregue. As tentativas anteriores permanecem no histórico;
suas contagens não são somadas às desta rodada. Identificação completa do JAR,
hashes, comandos, períodos e recibos estão na
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

Esta atualização documental registra resultados já executados; não constitui
nova execução dos testes. O [checkpoint](25_EXECUTION_STATUS.md) registra a
confirmação do merge e o estado de retomada.

## Dependências

Para homologação técnica: Sprints anteriores, ambiente isolado e recursos necessários aos cenários executados. Dependência externa ausente bloqueia somente os testes correspondentes e fica explícita no relatório; não substituí-la por simulação com o rótulo de real.

Para piloto real: itens E01–E12 do [registro do piloto](23_PILOT_IMPLEMENTATION.md#registro-externo). Responsável pelo restaurante e responsável técnico precisam aceitar a operação antes de receber dados/pagamentos reais. O deploy automático autorizado de homologação não libera produção.

**Próximo incremento:** inventariar o Linux, preparar checkout limpo e release
identificado, adequar manutenção/migrações e retorno ao banco encontrado e
implantar em homologação para executar a matriz completa no SHA servido.
Mercado Pago sandbox, domínio/HTTPS externo, e-mail real e backup operacional
continuam pendentes, assim como responsáveis, treinamento e aceite do piloto.

## Critérios de aceite

Critérios compostos permanecem abertos até que todas as suas partes tenham
evidência. A indicação **Parcial** abaixo reconhece os ensaios locais já
aprovados e identifica a parte restante; os sete entregáveis locais concluídos
estão marcados na seção de preparação.

### Fechamento técnico

- [ ] Todas as telas/ações implementadas estão no inventário de testes, com jornadas por ator e positivos/negativos de permissão, unidade, tenant e propriedade. Nenhum cenário obrigatório bloqueado, ignorado, instável ou não executado conta como aprovado.
- [ ] Percursos integrados de delivery, retirada e mesa passam contra o SHA realmente implantado em homologação; testes usam Angular/API/PostgreSQL reais e identificam qualquer fronteira externa simulada.
- [ ] Teste negativo entre empresas/unidades com pelo menos dois tenants fictícios no ambiente de homologação; público da plataforma não acessa dados empresariais.
- [ ] Perfil de carga sintético versionado explicita volume, concorrência, duração e massa fictícia; mede latência, memória, CPU, disco, pool e atraso de jobs. Registrar limites observados, sem extrapolar número de tenants suportados nem tratar o ensaio como meta operacional acordada. **Parcial:** perfil e medições locais registrados; falta executar e avaliar o perfil no release Linux. A observação local de conexões PostgreSQL não mede a espera interna do pool.
- [ ] Reinício da API/jobs e falhas de rede/provedor restritas aos processos/conexões de homologação têm procedimento testado, sem duplicar pedido/dinheiro ao retomar. Ensaiar migração incompatível com manutenção, drenagem/parada dos escritores próprios e caminho de retorno compatível. Não reiniciar o host compartilhado nem interromper sua rede global para executar esta suíte. **Parcial:** interrupção/retomada da API e rollback de conexão aprovados no Mac; faltam execução Linux, falhas de rede/provedor e manutenção/retorno do release alvo.
- [ ] Restore isolado recupera banco/mídia/configuração e confirma segregação; registrar ponto recuperado, intervalo de dados potencialmente perdido, tempo efetivo de recuperação e reconciliação externa necessária. Validar referências de mídia com alterações concorrentes ou com a parada documentada dos escritores, conforme a estratégia escolhida. As medições técnicas não substituem metas de RPO/RTO ainda pendentes. **Parcial:** banco, mídia, segregação e pacote efêmero aprovados no clone local; faltam ensaio Linux, recuperação das chaves originais e validação da reconciliação externa aplicável.
- [ ] Suíte final nos navegadores e projetos mobile previstos, revisão visual e testes de teclado/foco mostram jornadas funcionais; relatório identifica quais dispositivos foram emulados.
- [ ] Deploy de homologação falho não promove candidato; recuperação não apaga commits nem migrações inadvertidamente. Relatório vincula SHA, artefato, versão servida, comandos/resultados e último release validado.
- [ ] Falhas relevantes da matriz foram corrigidas e reexecutadas. Entregar cobertura por tela, perfil e cenário, além da contagem geral de testes.

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

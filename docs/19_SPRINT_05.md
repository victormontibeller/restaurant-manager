# Sprint 05 — Homologação e piloto

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

**Status:** não iniciada.

Entregas, testes e homologações abaixo estão planejados; nenhum item está marcado como concluído.

Esta sprint tem dois fechamentos separados: **homologação técnica**, executável autonomamente com dados fictícios/sandbox, e **piloto real**, dependente de pessoas, serviços reais e autorização de produção. Pode haver homologação técnica concluída com piloto pendente; não marcar a sprint inteira como concluída nesse caso.

## Entregáveis

### Homologação técnica autônoma

- [ ] Release versionado, scripts e runbook de Linux/systemd/proxy/PostgreSQL, configuração segura, health e diagnóstico com Hermes.
- [ ] Ambiente de homologação isolado e deploy automático com artefato/SHA observado, migrations por schema, validação pós-deploy e recuperação compatível.
- [ ] Matriz completa de telas/ações, jornadas e níveis de acesso executada conforme [estratégia de testes](26_TEST_STRATEGY.md), com relatório navegável, bugs corrigidos e evidências por cenário.
- [ ] Restore técnico ensaiado em dados fictícios, alertas e procedimento de contingência/retorno; distinguir ensaio de infraestrutura operacional real.

### Preparação e operação do piloto real

- [ ] Domínio/HTTPS/ingresso funcionais, callbacks e e-mail reais validados sob condições controladas autorizadas.
- [ ] Backup externo operacional, retenção/RPO/RTO e responsáveis confirmados, além do ensaio técnico.
- [ ] Catálogo real, contas dos responsáveis, matriz aprovada, treinamento e roteiro por perfil.
- [ ] Plano de piloto com horários, volume acompanhado, critérios de interrupção, suporte e registro diário de incidentes/resultados.

## Dependências

Para homologação técnica: Sprints anteriores, ambiente isolado e recursos necessários aos cenários executados. Dependência externa ausente bloqueia somente os testes correspondentes e fica explícita no relatório; não substituí-la por simulação com o rótulo de real.

Para piloto real: itens E01–E12 do [registro do piloto](23_PILOT_IMPLEMENTATION.md#registro-externo). Responsável pelo restaurante e responsável técnico precisam aceitar a operação antes de receber dados/pagamentos reais. O deploy automático autorizado de homologação não libera produção.

## Critérios de aceite

### Fechamento técnico

- [ ] Todas as telas/ações implementadas estão no inventário de testes, com jornadas por ator e positivos/negativos de permissão, unidade, tenant e propriedade. Nenhum cenário obrigatório bloqueado, ignorado, instável ou não executado conta como aprovado.
- [ ] Percursos integrados de delivery, retirada e mesa passam contra o SHA realmente implantado em homologação; testes usam Angular/API/PostgreSQL reais e identificam qualquer fronteira externa simulada.
- [ ] Teste negativo entre empresas/unidades com pelo menos dois tenants fictícios no ambiente de homologação; público da plataforma não acessa dados empresariais.
- [ ] Perfil de carga sintético versionado explicita volume, concorrência, duração e massa fictícia; mede latência, memória, CPU, disco, pool e atraso de jobs. Registrar limites observados, sem extrapolar número de tenants suportados nem tratar o ensaio como meta operacional acordada.
- [ ] Reinício da API/jobs e falhas de rede/provedor restritas aos processos/conexões de homologação têm procedimento testado, sem duplicar pedido/dinheiro ao retomar. Ensaiar migração incompatível com manutenção, drenagem/parada dos escritores próprios e caminho de retorno compatível. Não reiniciar o host compartilhado nem interromper sua rede global para executar esta suíte.
- [ ] Restore isolado recupera banco/mídia/configuração e confirma segregação; registrar ponto recuperado, intervalo de dados potencialmente perdido, tempo efetivo de recuperação e reconciliação externa necessária. Validar referências de mídia com alterações concorrentes ou com a parada documentada dos escritores, conforme a estratégia escolhida. As medições técnicas não substituem metas de RPO/RTO ainda pendentes.
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

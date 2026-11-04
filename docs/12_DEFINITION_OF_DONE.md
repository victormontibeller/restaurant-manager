# Critérios de entrega

> **Escopo:** verificações proporcionais à mudança e distinção entre implementação, simulação e validação real.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Critérios gerais

1. Entregar a jornada autorizada, com estados de erro e recuperação proporcionais à mudança.
2. Manter regras, permissões, contratos, migrações e documentação coerentes.
3. Para código crítico, verificar caminho normal e casos negativos: outro tenant/unidade, usuário sem ação, concorrência, repetição e falha externa, conforme o caso.
4. Executar os checks pertinentes à mudança. Não criar testes que apenas repetem a implementação; mudanças documentais exigem revisão de consistência e links, não uma suíte fictícia da aplicação.
5. Verificar acessibilidade e uso mobile nas interfaces alteradas; validar cenários reais no piloto.
6. Informar o que mudou, verificações executadas, resultados e pendências. Separar evidência local, simulação, sandbox do provedor e validação real.
7. Remover código substituído e atualizar consumidores na mesma mudança, preservando compatibilidade necessária e migrações já utilizadas.
8. Não apresentar checks verdes como autorização ou prova de prontidão para produção. Domínio, integrações, restauração e operação do piloto têm critérios próprios.

## Verificação documental

Conferir links locais e âncoras, fontes por assunto e consistência entre jornadas, permissões, estados e sprints. Ao dividir ou mover documentos, preservar requisitos e IDs D/P/E, atualizar referências textuais e retirar cópias integrais superadas. Exemplos permanecem com placeholders.

Revisão documental não executa testes da aplicação nem comprova prontidão operacional.

## Evidências de implementação e piloto

Em execuções pelo Hermes, atualizar o [checkpoint](25_EXECUTION_STATUS.md) com critério verificado, comandos/resultados, branch/base, candidato, artefato e SHA realmente observado em homologação, pendências e próximo passo. Conferir diff/segredos antes de commit/push. Aplicar os gates de [publicação automática em homologação](24_AGENT_EXECUTION.md#publicacao-homologacao), sem depender de nova aprovação por incremento. Produção continua separada.

O encerramento técnico exige a [validação completa](26_TEST_STRATEGY.md) de todas as telas/ações implementadas e jornadas por perfil/unidade, incluindo tentativas negadas pela UI/API, revogação, isolamento, concorrência e mobile. Relatório deve identificar release, ambiente, cobertura, falhas e evidências. Corrigir e reexecutar o que for necessário; testes ignorados, instáveis, bloqueados ou não executados não contam como aprovados. Não declarar conclusão apenas pelo texto final do agente.

Cada [sprint](13_ROADMAP.md) define seus critérios específicos. Isolamento, constraints e concorrência usam PostgreSQL real, conforme [Banco de dados](05_DATABASE.md). Condições externas e autorização do piloto ficam em [Implantação do piloto](23_PILOT_IMPLEMENTATION.md).

## Documentos relacionados

- [Engenharia](03_ENGINEERING_RULES.md)
- [Segurança](04_SECURITY.md)
- [Interface](09_UI_GUIDELINES.md)

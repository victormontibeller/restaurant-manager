# Padrões de código

> **Escopo:** convenções Java, mensagens, valores monetários e seleção de ferramentas.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Java e contratos de erro

- Em Java, use imports explícitos, anotações curtas, injeção por construtor e exceções específicas. Evite `catch (Exception)` que transforma falha em sucesso ou esconde sua causa.
- Preserve mensagens literais de validação em PT-BR; não exponha valores secretos rejeitados. Diferencie ausência, regra inválida, falta de autenticação, falta de permissão e falha interna.
- Use `BigDecimal` para dinheiro, escala/arredondamento explícitos e snapshots dos valores do pedido. Datas técnicas em UTC; horários do estabelecimento com fuso definido.

## Ferramentas e versões

As versões e ferramentas serão fixadas na [Sprint 0](14_SPRINT_00.md), conforme P01/P02 em [Visão do projeto](00_PROJECT_VISION.md#premissas-propostas). Não importar comandos Python, regras de migração Django ou infraestrutura do Schools para este projeto Java/Angular.

Consulte os padrões existentes antes de criar abstrações; a [arquitetura](02_ARCHITECTURE.md) e as [regras de engenharia](03_ENGINEERING_RULES.md) definem as responsabilidades das camadas.

## Integrações e frontend

A preferência por SDKs e o isolamento de credenciais estão em [Integrações](21_INTEGRATIONS.md#sdk-first). Os padrões Angular/PWA e de acessibilidade ficam em [Interface](09_UI_GUIDELINES.md).

## Documentos relacionados

- [Regras de engenharia](03_ENGINEERING_RULES.md)
- [Contratos HTTP](08_API_STANDARDS.md)
- [Critérios de entrega](12_DEFINITION_OF_DONE.md)

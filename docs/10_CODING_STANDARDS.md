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

### Legibilidade e organização Angular

- Preserve a divisão por domínio: `identidade`, `acessos`, `unidades`,
  `plataforma`, `catalogo`, `carrinho` e `pwa`. Componentes, serviços e tipos
  relacionados permanecem próximos;
  novas pastas ou abstrações compartilhadas precisam de consumidores reais.
- Separe declarações, métodos e etapas de uma jornada com linhas em branco.
  Evite acumular várias instruções na mesma linha. Comentários explicam uma
  decisão ou transição importante, sem repetir o nome do método.
- Mantenha os templates e estilos inline existentes em blocos legíveis. Ao
  quebrar HTML em linhas, preserve os espaços significativos entre texto,
  interpolação e elementos; a disposição do fonte não pode mudar a interface.
- Nos testes, deixe preparação, ação, resultado e recuperação reconhecíveis.
  Refatorações de legibilidade preservam asserções, ordem, seletores, massas,
  timeouts e tentativas; não esconda a jornada em helpers genéricos.
- Use o Prettier fixado em `frontend/package-lock.json`, com a configuração da
  raiz. `npm --prefix frontend run format` formata TypeScript e probes CJS;
  `npm --prefix frontend run format:check` verifica o padrão no CI e no build
  de release. A formatação automática de linguagens embutidas fica desativada
  para preservar strings executáveis e espaços de templates; esses blocos
  exigem revisão e validação próprias quando editados.

## Documentos relacionados

- [Regras de engenharia](03_ENGINEERING_RULES.md)
- [Contratos HTTP](08_API_STANDARDS.md)
- [Critérios de entrega](12_DEFINITION_OF_DONE.md)

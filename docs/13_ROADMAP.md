# Roadmap

> **Escopo:** ordem de implementação, dependências e rastreabilidade das seis sprints.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Organização e evidência

As sprints abaixo são incrementos de escopo, sem promessa de duração. Estimar calendário depois de conhecer capacidade, disponibilidade do restaurante e retorno dos provedores. O estado atual de cada sprint fica no seu plano e no checkpoint. Dependências externas podem ser investigadas cedo, mas não podem ser marcadas como concluídas por um mock.

| Sprint | Foco | Depende de | Resultado demonstrável |
| --- | --- | --- | --- |
| [Sprint 00](14_SPRINT_00.md) | Fundação | Repositório e desenho aprovados | Estrutura executável, ambiente reproduzível e base técnica verificada |
| [Sprint 01](15_SPRINT_01.md) | Tenant, autenticação e acessos | [Sprint 00](14_SPRINT_00.md) | Duas empresas isoladas, sessões e matriz por ação/unidade |
| [Sprint 02](16_SPRINT_02.md) | Catálogo e PWA | [Sprint 01](15_SPRINT_01.md) | Cardápio e carrinho utilizáveis no mobile com cálculo de servidor |
| [Sprint 03](17_SPRINT_03.md) | Pedidos, mesas e cozinha | 1 e 2 | Fluxos operacionais completos sem depender de provedor financeiro real |
| [Sprint 04](18_SPRINT_04.md) | Delivery e pagamentos | 3; contratos externos preparados | Cobrança, recebimento, entrega e devolução reconciliáveis |
| [Sprint 05](19_SPRINT_05.md) | Homologação técnica e preparação do piloto | 0–4 para fechamento técnico; dependências externas para piloto real | Release homologado com matriz completa; piloto real acompanhado quando seus gates forem cumpridos |

Para cada sprint: vincular requisitos a cenários, registrar testes executados/resultados, limitações e evidências da demonstração. Bugs que quebram isolamento, autorização, integridade financeira ou recuperação do fluxo entregue impedem aceite. Verificações fora do escopo implementado ficam explicitamente pendentes.

## Como acompanhar as sprints

Cada sprint possui arquivo próprio com status, entregáveis, dependências e critérios de aceite. A fundação e as Sprints 01–04 estão integradas em `main`; a Sprint 4 entrou pelo PR #8 em `8888234`. A preparação inicial da Sprint 5 foi integrada pelo PR #9 em `5ea8324`, com revisão operacional e ensaios fictícios no Mac. Essas implementações e validações locais não herdam a aprovação do candidato histórico de homologação.

O incremento concluído no [PR #10](https://github.com/victormontibeller/restaurant-manager/pull/10), concluiu as validações então previstas no Mac/CI. Estão comprovados build/regressão backend, autorização/timeout, scripts, recuperação financeira fictícia, clone da tentativa 09, manutenção/retorno, carga/pool e diagnósticos. O candidato corrigido `123f48ee1a2d`, commit `730949c`, passou nos 38 casos de contraste e na CI #194 (244 testes de scripts e 452 backend). A nova matriz aprovou 415/415 pares, sem falhas, skips, retries ou instabilidade, com 56 capturas revisadas das 28 telas em desktop/mobile. Não herdou os 313 pares do candidato rejeitado por textos obsoletos. Processos próprios encerrados, com demonstração e PostgreSQL preexistentes preservados. Resultados e limites ficam na [Sprint 5](19_SPRINT_05.md) e na [evidência complementar](evidencias/sprint-05-validacao-mac-ci-2026-11-09.md). Implantação/matriz no Linux, serviços externos e piloto permanecem pendentes.

A revisão geral de 2026-11-10 corrige pagamentos, retenção, agendamento e interfaces, com limpeza pontual de dependências e testes. O novo inventário contém 420 pares; seus resultados pertencem à [evidência da revisão](evidencias/revisao-geral-pre-testes-2026-11-10.md) e ao [checkpoint](25_EXECUTION_STATUS.md), sem herdar aprovação da rodada anterior.

Não há duração fixada. Ao implementar, registrar resultados e limitações no arquivo correspondente; a regra vigente permanece no documento do assunto. Relatos históricos não substituem a especificação atual nem provam homologação externa.

A execução segue o [guia](24_AGENT_EXECUTION.md) e mantém o [checkpoint](25_EXECUTION_STATUS.md). A missão anterior do Hermes terminou na Sprint 01/handoff. A orientação de 2026-11-10 autoriza a revisão geral e a limpeza pontual, com validação no Mac/CI; implantação e matriz completa no Linux ficam para etapa própria. Cada próxima sprint parte da main integrada, em branch dedicada. Sem commit direto em `main`, auto-merge ou force push; merge pelo agente exige autorização explícita, como ocorreu no PR #9. Produção não faz parte desta execução. Nenhuma autorização permite marcar critérios sem evidência. A [matriz final](26_TEST_STRATEGY.md) é obrigatória para o fechamento técnico; piloto real tem condições separadas.

## Rastreabilidade mínima da revisão

| Regra / risco | Jornada / permissão | Estado / dado | Evidência nas sprints |
| --- | --- | --- | --- |
| Isolamento por empresa/unidade | Todos os atores | Tenant, sessão, UsuarioUnidade | 1: testes negativos/pool; 5: homologação |
| Política atual e último Administrador | Configurações → Acessos | VersaoPolitica, sessão | 1: revogação e edição concorrente |
| Preço/configuração do servidor | Cliente e catálogo | Snapshot de item/cobrança | 2: adulteração; 3: pedido histórico |
| Combo personalizável e unidade comercial | Cliente, cozinha e equipe autorizada | Grupos/opções, snapshot e unidades de produção | 2: configuração/preço; 3: quantidades/preparo; 4: cancelamento/devolução |
| Mesa autorizada e fim de sessão | Participante e Atendimento | Atendimento, comanda, JWT restrito | 3: QR/token antigo; 4: fechamento |
| Aceite manual, alerta e expiração | Atendimento/Gerente | AGUARDANDO_ACEITE e deadlines | 3: corrida/restart; 4: pedido pago |
| Cancelamento antes do preparo | Cliente / ação de cancelamento | NA_FILA, item iniciado, ajuste | 3: corrida; 4: devolução |
| Divisão por valor / troco | Caixa / recebimento.registrar | Cobrança, recebimentos, saldo | 4: corrida/limites; 5: jornada real |
| Devolução parcial/total | Sistema ou ação delegada | Reserva e estados de devolução | 4: duplicação/timeout; 5: provedor |
| Recuperação e notificações | Operação e suporte | Inbox, outbox, jobs e eventos | 3–4: falhas; 5: reboot/contingência |
| Mobile/PWA | Cliente e todos os perfis | Estado de conexão/cache | 2–4: jornadas; 5: aparelhos reais |
| Execução e retomada pelo Hermes | Coordenador e subagentes | Branch, checkpoint e evidências | 0: preflight e retomada; todas: incremento verificável |
| Validação completa | Todos os atores e níveis de acesso | Inventário de telas/ações e SHA do release | Todas: regressões; 5: matriz final completa e relatório |

## Documentos relacionados

- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Decisões e premissas](00_PROJECT_VISION.md)
- [Pendências externas e piloto](23_PILOT_IMPLEMENTATION.md)
- [Estratégia de testes](26_TEST_STRATEGY.md)

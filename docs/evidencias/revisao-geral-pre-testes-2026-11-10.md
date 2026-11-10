# Revisão geral e limpeza pré-testes — 2026-11-10

**Situação:** correções implementadas na branch `codex/revisao-geral-pre-testes`,
base `07ae83f`; [PR #11](https://github.com/victormontibeller/restaurant-manager/pull/11).
Após o encerramento, o proprietário autorizou incluir os documentos locais,
integrar a PR e sincronizar a `main` local. Essa autorização mantém a decisão
de encerrar a validação após backend e auditorias, deixando a nova
matriz integrada pendente. O candidato corrigido **não tem aprovação integral
de UI, homologação ou piloto**. Dados de teste fictícios; ambiente Mac.

## Correções e limpeza realizadas

- **Checkout e dinheiro:** tentativa substituída identificada separadamente,
  pagamento antigo reconciliado sem disputar o índice da tentativa corrente,
  bloqueios ordenados e envio revalidado em transação curta. Resposta incerta
  não provoca outro POST; pagamento tardio preserva a quitação e o tratamento
  de excesso. Chamadas externas continuam fora dos locks.
- **Inbox financeira:** eventos isolados em transações próprias, tentativas e
  próxima execução duráveis; evento inválido ou sem correspondência não
  interrompe o processamento de outros checkouts e devoluções.
- **Retenção OAuth:** a exclusão de sessão remove somente o estado transitório
  dependente, preservando conexão e auditoria. Migrações novas public V8 e
  tenant V28; migrations já publicadas não foram editadas.
- **Prazos de pedidos:** scheduler dedicado evita que HTTP financeiro síncrono
  atrase alertas e vencimentos.
- **Autorização na expedição:** menu reage à revogação e a tela elimina dados
  carregados quando perde acesso ou muda o contexto.
- **PWA e relatórios:** cinco rotas da Sprint 4 recebem o shell offline;
  resultados de vendas usam o período confirmado pela API e são limpos ao
  consultar novamente, falhar ou trocar usuário/unidade.
- **Integridade do build:** release, ensaio e matriz compartilham o inventário
  de fontes, configurações e assets, recusando ausências e links simbólicos.
- **Interface:** filtros passam a comportar os rótulos em telas estreitas;
  paginação assistida empilha botões no celular; contadores usam singular/plural
  e separadores de endereço/ocorrência aparecem apenas quando há valor.
- **Clareza do pagamento:** tentativa mais recente identificada e anteriores
  em histórico; somente a mais recente pode oferecer link de checkout. Os
  estados reais do servidor, inclusive reconciliação, são preservados.

Removidos a dependência direta `luxon`, sem consumidores, e o diagnóstico
isolado `scripts/test_invite_layout.cjs`. Seus casos úteis de e-mail longo em
360 px e revogação por teclado foram incorporados ao teste com Angular real,
com efeito HTTP e estado final verificados. As listas divergentes do build
foram substituídas pelo inventário compartilhado.

Os 84 arquivos TypeScript revisados têm caminho no grafo da aplicação;
templates, estilos, assets e demais dependências mantidos possuem consumidores.
O fallback `webkit-local.sh` continua necessário ao runner Linux. Não foram
removidas migrations, evidências históricas ou arquivos sem prova de desuso.
A cópia antiga da Sprint 4 já havia sido removida pela execução anterior.

## Candidato corrigido — `469f3a4`

Fonte: `469f3a4f14915ffdc907e151146335556d9b79fc`. Raiz privada:
`rm-cleanup02-20261110`. JAR local conferido e arquivado:
`681963ff3a43bde825cd31e66040661a7b8c630ccd690a1afce5b626ab6279e8`.
Build completo e auditorias concluídos; 524 entradas de fonte vinculadas ao
artefato. Atualizações posteriores de encerramento são somente documentais.

| Verificação | Resultado e escopo |
| --- | --- |
| Frontend local | Formatação, tipos, 21 grupos de lógica, 12 combinações de templates (quatro probes × três navegadores) e build aprovados |
| Backend local | 464 testes em 68 suítes, zero falhas, erros ou skips |
| CI #208 | 249 testes de scripts e 464 backend; zero falhas, erros ou skips; checks frontend e auditorias aprovados |
| Dependências locais e CI | npm sem vulnerabilidades reportadas; 112 componentes Java, sem achados na consulta OSV |
| Matriz integrada do candidato corrigido | **Não executada**, por orientação do proprietário: 84 cenários × cinco projetos, 420 pares pendentes |
| Capturas/contraste/recuperação financeira do candidato corrigido | **Não executados** nesta rodada; resultados do candidato anterior não são herdados |

A [CI #208](https://github.com/victormontibeller/restaurant-manager/actions/runs/42905565646)
corresponde ao mesmo commit da aplicação. A suíte local anterior de scripts
aprovou 239 casos portáveis no Mac; os dez casos dependentes de Linux foram
executados na CI integral de 249, não classificados como skips aprovados.
Não somar camadas ou rodadas como se fossem uma única suíte.

As regressões ampliadas S03-UI06 (rótulos completos dos filtros), S03-UI12
(palavras inteiras na paginação) e S04-UI08 (tentativa recente, histórico e
nenhum checkout adicional após quitação) ainda precisam ser executadas no
candidato corrigido. A compilação dessas regressões não comprova seu resultado.
S04-UI10 cobre revogação da expedição; S04-UI06, período/falha/recuperação do
relatório; S02-PWA01, as cinco rotas offline.

## Candidato anterior — reprovado e preservado

Fonte `66a982511e7bae31dbb43a32c306fe4249c03ea3`, JAR
`ba612c4b323c2afaf26191e6875c37d8b195d0892cca55a3e9104636b7dd46b7`,
raiz privada `rm-cleanup-20261110`.

- 464 testes backend locais sem falhas, erros ou skips; frontend e auditorias
  aprovados. CI #204 confirmou 249 testes de scripts e 464 backend.
- Recuperação financeira no mesmo JAR: duas perdas efetivas de resposta HTTP
  e dois reinícios próprios, uma cobrança/um recebimento/uma devolução,
  R$ 20,00 devolvidos e diagnósticos normalizados. Provedor fictício local;
  sem restore externo. Contraste aprovado em 38/38 casos.
- Matriz: **384/420 pares executados sem falhas**. Os 36 restantes não foram
  executados por indisponibilidade de quota; contadores não foram zerados.
- 56 capturas inspecionadas; **seis reprovadas**: T12 mobile cortava os valores
  dos filtros; T13 mobile quebrava a palavra `anteriores`; T08/T19 em
  desktop/mobile mostravam estados de tentativas diferentes sem identificar
  o histórico. Não houve inferência de erro financeiro a partir dessas imagens.
- Consolidação explicitamente reprovada. Os lotes ausentes não foram retomados
  porque esse candidato já exigia correção. As capturas e resultados foram
  preservados, sem reaproveitamento como aprovação da versão corrigida.

Recibos privados: `matrix/matrix.json`, `visual-review-rejected.json`,
`financial-recovery-01/recovery-result.json`, `contrast-result-01.json` e
`cleanup-runtime.json`. API 6953 e simulador 6605 foram encerrados por identidade;
demonstração 32641/8095 e PostgreSQL 59175/55432 permaneceram ativos.

## Falhas e reexecuções registradas

A primeira suíte backend completa encontrou duas expectativas frágeis de
retenção: uma chamada não alcançava registros de teste atrás de lotes antigos.
Os testes passaram a exigir progresso limitado pela contagem inicial,
preservando exclusão de registros antigos, manutenção dos recentes e recusa
às credenciais expiradas. A suíte completa posterior passou.

Uma rodada de templates expirou durante suspensão automática do Mac, confirmada
no registro de energia. O harness ganhou diagnóstico de erro e tempo de
bootstrap; a execução completa nos três navegadores passou. A rodada
interrompida permaneceu arquivada e não aprova candidato.

O primeiro check do candidato `ac4ef66` detectou formatação não idempotente no
template de endereço junto ao `<br>`; nenhum build chegou a iniciar. O uso de
bloco condicional estabilizou o formato em `469f3a4`. Log e recibo reprovados
ficam em `rm-cleanup02-20261110/format-attempt01`; os checks completos foram
reiniciados, sem reaproveitar aprovação dessa tentativa.

## Preservação e limites

Alterações documentais anteriores foram preservadas. O documento manual, antes
não versionado, foi incluído com nota histórica; sua cópia original privada
mantém o SHA-256 registrado no início. Credenciais,
logs e massa fictícia permanecem nas raízes privadas, fora do Git. Nenhum
serviço da demonstração, banco de outro projeto ou ambiente de produção foi
alvo de limpeza. O candidato corrigido não foi iniciado como serviço; não
houve preparação de massa ou matriz nova. O bloqueio temporário de suspensão
foi encerrado. Recibo final privado: `rm-cleanup02-20261110/completion.json`.

A próxima validação deve executar a matriz completa e revisar novas capturas
no artefato corrigido. Homologação Linux, Mercado Pago sandbox, e-mail e
infraestrutura externos, aparelhos reais, aceite assistivo e piloto continuam
pendentes, conforme o [checkpoint](../25_EXECUTION_STATUS.md). Não houve novo
ensaio de backup/restore ou carga nesta revisão; evidência histórica não foi
atribuída ao JAR corrigido.

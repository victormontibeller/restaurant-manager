# Sprint 01 — retomada ciclo 34

[Checkpoint](../25_EXECUTION_STATUS.md) · [Sprint 01](../15_SPRINT_01.md) · [Passagem Mac](../27_HANDOFF_CODEX_MAC.md)

## Escopo e retomada

Resultado final observado às08:34Z: matriz32 terminou com215pares únicos nas
dez parcelas, zero falha/skip/retry/flaky. Resultados, hashes e cobertura foram
reabertos. Unidade inactive/MainPID0; preflight posterior confirmou ausência
do candidato/cgroup e locks livres.56imagens vinculadas,26principais/
20complementos/10adicionais; contrato visual validado, com os limites das notas.
Isso não aprova páginas/controles não mostrados nem libera aceitação operacional.

Manutenção95 NÃO iniciou. O comando de preflight chamou indevidamente
`verify_policy` com dev; o helper corretamente admite apenas test/hml e
recusou antes do `systemd-run`. É erro de coordenação, não regressão do produto.
As políticas test/hml já haviam passado; verificações posteriores de conexões/
runtime e gravação do recibo não executaram. Conferir dev separadamente e
repetir apenas preflight corrigido/manutenção; não ampliar a guarda nem
reconstruir/repetir a matriz. Aviso de orçamento veio depois dessa recusa;
nenhuma nova verificação após o aviso. Handoff obrigatório preservado.

Publicado3a5d7a7/PR3 OPEN draft, ambos checksCI aprovados; log confirma175backend
e160Python. Este fechamento documental permanece local após o push.
Os parágrafos abaixo registram o snapshot intermediário, não o término.

Somente implementação/validação da Sprint 01 e passagem Codex/Mac. PR #3
permanece aberto, sem merge pelo agente e sem iniciar Sprints 02–05.
Na retomada, head `59bd4a45ec77e9569306b3abd4dcc85683cddca4` publicado e
ambos checks CI aprovados. Alteração documental herdada preservada.
Nenhuma rejeição de conclusão encontrada. Build e matriz existentes não
foram interrompidos ou duplicados.

O coletor somente leitura preparado no ciclo33 foi efetivamente executado
neste ciclo: conferiu os 16 links do relatório privado, o build, as parcelas
então concluídas, capturas, runtime e OIDs. O registro anterior que dizia
“coletor não executado” continua histórico; não é falha da aplicação.

## Candidato e resultados recolhidos

- JAR: `95d278eebb275521ead3299fbb12f067f6e2419c`.
- SHA-256: `bb07902c10444312a5bdd8c165efce8278d213de0d11f00d4242cddc8237706d`.
- Build já aprovado: 24 XML / 175 testes backend, zero falha/erro/skip,
  recontados sem reconstrução.
- Matriz32 às08:15Z: 155 pares únicos aprovados — UI18 × 5, identidade45,
  eventos55, verificação15, cadastro20 e recuperação15.
  Cada parcela só entra na consolidação após reabrir resultado, hash,
  estatísticas e cobertura; não somar retestes ou matrizes de outro JAR.
- Convites restantes e demais parcelas continuam em execução; ainda não há gate global.

Eventos incluem exportação, revogação por ação/vínculo com JWT válido,
fronteiras de unidade/tenant, cinco perfis operacionais e vínculo inativo.
A revisão visual de eventos/exportação mobile e desktop confirmou estado
conectado/foco e falha de exportação sem mensagem antiga de sucesso. São
componentes completos, não páginas inteiras; nomes longos no select aparecem
parcialmente, enquanto conteúdo e histórico permitem leitura.

Registro visual parcial materializado: 42 imagens, sendo 20 principais,
12 complementos e dez adicionais. Verificação, cadastro e recuperação foram
vistos em página inteira e recortes mobile nativos sobrepostos; resultados,
hashes e origem das imagens vinculados aos recibos das famílias aprovadas.
Captura não substitui as assertivas de foco/ARIA nem demonstra aparelho físico.
Revisão integral e autorização de aceitação permanecem falsas.

## Revisão independente e operação

Revisão independente somente leitura rastreou os sete critérios aos testes
existentes, sem identificar necessidade de ampliar o produto. Não aprova
as parcelas futuras. Os gates restantes são: matriz/visual95, manutenção95,
troca composta compatível, fundação20/smoke50 e aceitação do mesmo artefato.

Fonte operacional imutável `01e27240ed56f5a462fff1964aae8c094ea621bc` conferida
limpa e compatível com95. Dependências Playwright existentes foram ligadas
localmente após conferir igualdade do lock; CLI real respondeu1.64.1. Não
houve instalação global, mudança do lock ou reconstrução. Exclusão local
se limita ao link de dependências, sem ocultar mudanças de fonte.

A revalidação das contas existentes foi preparada para preservar a fixture
ampliada e a empresa adicional do ensaio assistido28. Ainda NÃO executada:
exige runtime95, hashes/OIDs e locks. Não cria contas nem repete provisionamento.
Operador/inventário adicionais precisam passar pelo smoke UI do novo artefato.

Segunda revisão independente não identificou bloqueador no script preparado.
Login/logout alteram sessões/auditoria; preservar dados de negócio não significa
banco byte a byte imutável. O script não foi executado nesta revisão.

Quanto ao achado UI18, a revisão considera suficiente o fechamento delimitado
do custo frio HQL demonstrado, SOMENTE após matriz32 completa e gates95
aprovados: teste de interpretação no startup, quatro partidas frias, matriz31
e igualdade do backend entre5cce633/95 sustentam a correção. Não é necessário
repetir o diagnóstico frio sem nova causa. Preservar as falhas27/29b e os
recibos históricos; não atribuir toda latência antiga ao parser nem declarar
garantia de desempenho sob qualquer carga. O fechamento final ainda depende
dos gates pendentes, não desta recomendação.

## Limites e próximo gate

Homologação continua97d75b0, UP/PID754824 conferidos às08:13:50Z; clone135836 ativo,
original16392 bloqueado/zero conexões e baseline449ce3c preservados. O ensaio
novo aguarda término da matriz, recolhimento do candidato e banco livre.
Nunca retornar ao banco anterior à identidade. Manutenção97 não aprova95.

Sprint01 NÃO concluída. Não houve deploy, promoção, merge ou STOP neste
registro parcial. Setup Mac não executado/verificado. A integração em main
permanece pendente do proprietário, não é inferida de CI ou de handoff.

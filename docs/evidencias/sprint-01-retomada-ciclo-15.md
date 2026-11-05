# Sprint 01 — retomada ciclo 15

Atualização final: build47ca909 aprovado00:53:04Z, hash
674b00421e6b7ee9d8fd54047401755acbf444921acc1d67547fb9ef22aa02be;
23XML/173backend sem falha/erro/skip conferidos. Worker posterior falhou antes
de iniciar E2E porque node_modules era link não ignorado na fonte privada.
Exclusão local exata corrigida, sem mudar fonte ou guarda; runner de retomada
preparado para o MESMO JAR, mas NÃO iniciado antes do aviso de orçamento.
Não há resultado E2E novo aprovado. Handoff detalhado no checkpoint; os
registros de build em andamento abaixo são históricos anteriores ao término.

Missão e Sprint 01 não concluídas. Sprints 02–05 não iniciadas. Sem merge ou
promoção de baseline; homologação continua no candidato de identidade anterior.
Este registro distingue código, testes locais, CI e resultados reais do runtime.

## Incrementos publicados

- `bd4e92a`: exportação JSON cadastral com nova leitura autorizada de unidade,
  projeção mínima e descarte de respostas após mudança de contexto. Reutiliza
  política/backend existentes, sem exportar cache em erro/revogação.
- `47ca909`: capturas E2E de matriz, formulário, cartão, proteção e paginação;
  corrige capturas anteriores que mostravam apenas cabeçalhos. UI32 captura o
  componente completo, não um bitmap excessivo da página administrativa inteira.
- `51e3456`: despacho assistido de uma solicitação hml por UUID, com intenção
  privada, gates, CLI real existente e read-back. Timer automático continua
  limitado a dev/test; não promove release nem retoma falha de negócio sozinho.

Duas revisões independentes: exportação sem bloqueador; despacho assistido com
achado de sincronização ausente nos ancestrais recém-criados. Vermelho reproduziu
que os pais não recebiam fsync; correção verifica persistência antes de Java.
O teste do main cobre retomada sem duplicar CLI, recusa de outro OID e resultado
reprovado quando o runtime muda. Não foi simulada queda de energia física.

## Checks proporcionais

Cinco testes JS de exportação e quatro regressões de eventos passaram. UI42
passou a exigir explicitamente a resposta GET disparada pelo download, para não
confundir atualização de polling com reconsulta. Logout/troca de unidade durante
exportação são cobertos na lógica, não em um E2E dedicado.

131 testes Python passaram, com typecheck Angular/E2E, scanner e diff. CI do
`51e34564e1ac8a6390379edeac409e785497fec9` passou nos dois checks. Um log conferido
registra 173 backend sem falhas/erros/skip,131Python e auditorias sem achados.
Isso não substitui o build/runtime local do candidato.

Negativo real do despachante: raiz privada encontrada em0775, conferida e
restringida a0700 somente para este projeto. Nova tentativa foi recusada por
lock ocupado durante validação/build e não criou intenção. Nenhuma ativação hml
foi executada por esse wrapper; a jornada integrada continua pendente.

## Execuções herdadas recolhidas

Todos os resultados desta seção pertencem ao JAR
`3cd4eeb407fc5376a2e2c3d8803d882c077c25e7`, SHA-256
`1697a473d968c0246a0b83b23bbd192b7e7fddbc282f061d66cf5f08a6c9d744`.
Não pertencem ao Angular novo de exportação.

Regressão13 terminou em2026-11-05T00:21:09Z, exit1:

| Família | Aprovados | Falhas |
| --- | ---: | ---: |
| Verificação | 15 | 0 |
| Cadastro | 20 | 0 |
| Recuperação | 15 | 0 |
| Convites | 20 | 0 |
| Identidade sem UI04/UI05 | 35 | 0 |
| Eventos | 43 | 2 |
| Plataforma | 15 | 0 |
| Estado comercial | 15 | 0 |
| Provisionamento | 15 | 0 |

Total conferido programaticamente:193aprovações/2falhas, zero skip/flaky. As
falhas UI32 Firefox/WebKit foram de captura acima do limite PNG, após assertivas
funcionais; permanecem falhas até reexecução corrigida. UI04/UI05 têm dez
combinações anteriores separadas no mesmo JAR, não repetidas nessa regressão.

Validação14 terminou em2026-11-05T00:31:34Z, exit0: fundação20 e smoke das dez
identidades50combinações aprovadas nos cinco projetos, com OIDs do clone/original
registrados e runtime estável. Não aprovam matriz mutante nem promovem baseline.

## Candidato novo em execução

Build único de `47ca909d4626c4f70fbae1b13f883588505e060f` iniciado somente após
workers13/14 encerrarem. Checkout imutável, unidade systemd, locks, SHA/log e
resultado durável. Não foi reiniciado para incorporar scripts/documentação
posteriores, que não modificam fontes compiláveis.

Na consulta de00:45:42Z o build ainda estava ativo, sem resultado/gate final;
uma espera da ferramenta expirou em420segundos, mas o serviço continuou ativo.
Isso não foi interrupção do build nem limite da conta. Worker finito aguarda
gate e executará exportação/UI32 primeiro, depois regressão do novo JAR. Não
atribuir aprovação antecipada a essas fases. Resultado atual fica no checkpoint.

## Revisão visual e limitações

Inspecionados cartões completos de provisionamento mobile/WebKit desktop e
recortes de SaaS/estado comercial nos mesmos layouts. Textos, alertas e controles
observados legíveis, sem sobreposição. Páginas completas longas foram carregadas,
mas sua redução não permitia ler os controles: zoom foi usado no topo e no fim
mobile, explicitamente sem aprovar cada item da lista intermediária.

Capturas úteis de matriz/unidades e revisão integral ainda pendentes no candidato
novo. Relatório navegável privado vincula fontes, artefatos, resultados e imagens;
não é aceitação automática. E-mail é captura local, não provedor homologado.
Nenhum aparelho físico, pagamento, envio externo ou produção foi usado.

Próximo: recolher/corrigir build/E2E sem repetir, completar a revisão visual,
executar provisionamento assistido hml quando o lock estiver livre e resolver
aceitação/instalação compatível mantendo original e baseline preservados.
[Checkpoint](../25_EXECUTION_STATUS.md) · [Cobertura](cobertura.md).

# Sprint 01 — retomada ciclo 25

## Estado e evidência herdada

Retomada em 2026-11-05 local: PR3 OPEN/draft, head5d9dbf8 e ambos checks CI
aprovados; homologação3cd4eeb UP, baseline449ce3c preservado. Bancos dev/test/hml
relidos com identidades distintas em loopback55432. Original hml bloqueado e
clone ativo mantêm os OIDs registrados, sem migração ou reinício neste incremento.

Build6cd8a86 já aprovado, não repetido. Worker24 continua sua matriz no checkout
imutável: os vinte focos e os45casos de identidade passaram, sem falha/skip/flaky/
retry. Relatórios/hashes/cobertura reabertos;65pares únicos, não matriz completa.
As14entradas visuais herdadas tiveram origem/hash conferidos, incluindo as oito
que aguardavam o resultado de identidade. Eventos e demais famílias ainda não
estavam consolidados nesta gravação.

## Defeito encontrado pela revisão visual

As capturas UI42 mobile e desktop mantêm “Arquivo cadastral solicitado ao
navegador.” depois que uma segunda exportação falha por perda de conexão.
A mensagem de erro aparece, mas o sucesso anterior continua no status.
Essas capturas foram reprovadas; resultado automatizado anterior não anula
esse achado nem libera a promoção do artefato6cd8a86.

Correção mínima em `EventosUnidadeComponent`: nova tentativa informa consulta
pendente; falha transitória informa exportação não concluída. Sucesso só reaparece
quando a nova consulta autorizada produz o download. Não altera API, cache,
revogação, limpeza de contexto, esquema de dados ou conteúdo mínimo do arquivo.

O teste de lógica reproduziu o vermelho pertinente (sucesso antigo em vez de
consulta pendente). Depois da correção, seis testes de exportação e quatro de
eventos passaram, assim como typecheck aplicação/E2E. Transporte desses testes
é fictício; não são E2E. Revisão independente não identificou bloqueador no diff;
ressaltou a janela de cinco segundos antes de o polling atualizar o status.
UI42 agora verifica sucesso, falha sem download, foco e recuperação com nova
resposta HTTP e conteúdo exato. Execução nova ainda pendente.

## Capturas proporcionais em vínculos

A captura UI35 mobile herdada tem252×32050px; foram inspecionados somente visão
geral e recortes originais do topo/fim, não todo o editor. A imagem desktop tem
820×15423px e a visão geral não comprova legibilidade de cada linha.

O teste passa a registrar o vínculo inativo e sua ajuda antes da remoção; ao fim,
recolhe o editor pela UI, confere estado ARIA/resumo e captura o cartão completo.
Todas as verificações de edição, persistência, recarga, perfil e revogação foram
preservadas. Não corta a lista silenciosamente nem remove o teste de overflow.
Essa alteração de captura é posterior à revisão independente do diff de exportação;
typecheck passou, mas a execução E2E continua pendente.

## Limites e próximo gate

Nenhum build/worker em andamento foi interrompido ou duplicado. A correção
Angular exige candidato novo depois de recolher a matriz herdada; não transferir
seus resultados ao novo artefato. Consolidar as demais inspeções antes de construir,
para evitar reconstruções por achados visuais separados.

Manutenção, troca de frontend, ensaio assistido hml, fundação20, smoke50 e aceitação
continuam pendentes para o candidato final. Não executar manutenção do6cd8a86
como preparação para aceitar um frontend já reprovado visualmente.
Sprint01 aberta;02–05 não iniciadas. Sem promoção, merge ou conclusão técnica.
Tentativa de atualizar AGENTS foi bloqueada pelo executor e não contornada.

[Estratégia](../26_TEST_STRATEGY.md) · [Critérios](../15_SPRINT_01.md) ·
[Checkpoint](../25_EXECUTION_STATUS.md)

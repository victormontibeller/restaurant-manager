# Sprint 01 — ciclo 6: unidades e validação incremental

[Índice](../README.md) · [Checkpoint](../25_EXECUTION_STATUS.md)

Commit publicado: `2b12729e8493a7245a024087cc758c6844752c10`. PR #3 OPEN/draft, base main. CI 41793885211 e 41793880065 SUCCESS, lidos de volta. Sprint não concluída e sem novo deploy.

## Implementação e testes

- Unidade administrativa com acesso exclusivo do Administrador, reautenticação, versão, validação de nome/fuso, inativação lógica e auditoria na mesma transação.
- Intenção de criação persistida por UUID/ator/payload, com replay após edição e conflito para divergência. Concorrência real em PostgreSQL: criação duplicada produz uma unidade/auditoria; duas edições da mesma versão têm um sucesso e um conflito.
- Quatro testes novos vermelhos por endpoint ausente. Revisão independente encontrou NULL incompatível com auditoria; corrigido antes da execução verde. AcessosTest com 12 aprovados.
- Build identificado completo terminou exit 0: 56 testes backend, zero falhas/erros/skip; 19 testes Python; frontend e auditorias aprovados. Contrato YAML de unidades e referências internas conferidos; não foi utilizado validador completo de OpenAPI.

## Navegadores e limitações

Candidato anterior b631403: execução inicial com oito falhas em 20 casos. Cinco por início antes da prontidão e três por orçamento total de 30 segundos. Acrescentados preflight e orçamento de 60 segundos por jornada composta, sem retries ou remoção de asserções. Reexecução completa: 20/20 aprovados nos cinco projetos. Revisão visual de matriz mobile/desktop sem sobreposição observada; aparelhos emulados, não físicos.

Candidato 2b12729: suíte com 25 casos começou após health UP. S01-UI05 Chromium desktop falhou ao aguardar mensagem de reautenticação; a operação ainda estava em curso. Falha preservada, correção da espera HTTP pendente. Execução interrompida após aviso efetivo de orçamento; contagem final não agregada e suíte NÃO aprovada. Fundação sobre esse artefato não executada.

## Revisão frontend e trabalho não integrado

Revisor identificou perda de intenção ao navegar durante POST, falta de reconciliação após resposta perdida e paginação inconsistente em falha. Correções locais foram escritas, mas NÃO compiladas/exercitadas: preservar payload/UUID, bloquear troca de seção durante pendência, reconciliar por GET do UUID e somente atualizar página após consulta bem-sucedida. Inclui correção análoga na equipe. Novo cenário S01-UI06 usa API real e aborta apenas a resposta; ainda não executado.

Esses arquivos locais são posteriores ao build e NÃO fazem parte do commit acima. Não usar o gate desse commit para aprová-los. Próxima execução deve verificar compilação e regressões antes de publicar novo artefato.

## Runtime

Homologação manteve SHA 449ce3c e serviço original, sem novas migrations. Candidato HTTPS rm_test e suíte mutante encerrados ao finalizar o ciclo. Último release saudável preservado. Nenhum critério pendente foi marcado completo.

# Sprint 01 — retomada ciclo 30

[Checkpoint](../25_EXECUTION_STATUS.md) · [Sprint](../15_SPRINT_01.md) · [Passagem Mac](../27_HANDOFF_CODEX_MAC.md)

## Diagnóstico e correção delimitada

A análise independente do JFR calibrado29b identificou carregamento/validação
MVC e compilação da consulta HQL no primeiro login, antes de BCrypt. As amostras
incluem inicialização de HqlLexer/HqlParser e tradução entre aproximadamente
2,18 e7,60 segundos após envio; a primeira amostra BCrypt aparece em8,24 segundos.
São amostras, não tempos exclusivos medidos; pilhas truncadas limitam atribuições.
O aborto do navegador em10 segundos e resposta200 do servidor em12,547 segundos
permanecem falha preservada, não aprovação por repetição.

Mudança mínima: a mesma consulta `from Usuario where email=:email` passa a
`@NamedQuery`, com validação no startup explicitamente habilitada. O repository
consome essa consulta tipada com o mesmo parâmetro. Hibernate interpreta a HQL
na criação da SessionFactory, sem executar login, escolher tenant de aquecimento
ou consultar usuários. Continua usando o EntityManager empresarial e o mesmo
isolamento. Os demais consumidores de `porEmail` também usam a consulta nomeada.

Não altera BCrypt12, timeouts, CSRF, transações, quotas, schemas ou migrações.
Não introduz infraestrutura de aquecimento nem declara que todo custo frio foi
eliminado: plano SQL, validação MVC e carregamento residual ainda devem ser
medidos no primeiro acesso de processo novo.

## Provas focadas executadas

- Teste novo consulta o cache HQL após startup, sem HTTP/login anterior. Um
  tradutor que falha caso seja chamado reproduziu o defeito: uma falha pertinente,
  zero erro/skip, antes da mudança.
- Após a correção, o mesmo teste passou: interpretação já disponível, consulta
  nomeada tipada criada sem executar essa consulta SQL e contexto continua ausente.
  Isso não significa bootstrap sem SQL: a preparação usa migrations/seed em rm_test.
- Regressão `IdentidadeTest` passou os dez casos. Total focado:11testes,
  zero falha/erro/skip, XMLs conferidos. PostgreSQL real exclusivo de testes.
- Scanner de317arquivos, links locais e diff passaram antes da atualização
  documental; conferir novamente antes de publicar.

Isso prova antecipação da interpretação HQL, não desempenho E2E nem fechamento
da instabilidade. O teste usa API interna Hibernate somente para observar o cache;
a aplicação usa a API padrão JPA.

Revisão independente somente leitura não identificou bloqueador na mudança;
conferiu consumidores, isolamento e logs vermelho/verde. Seu limite sobre SQL
de preparação foi explicitado acima. Não é aprovação do desempenho frio.

## Estado e próximos gates

Hml97d75b0 UP e baseline449ce3c preservados; banco hml ativo e original bloqueado
não foram substituídos. Nenhum worker herdado executando. Uma consulta de
inventário tentou usar a classe de manutenção com `rm_dev`, recusado pela
allowlist antes de qualquer operação. Conferência posterior específica de
rm_test/rm_hml passou; não houve alteração dessa guarda.

A mudança de produto exige artefato novo. Não reaproveitar a matriz285 ou ensaio
de manutenção do JAR anterior como aprovação automática deste incremento.
Próximo: revisão independente, build identificado único, ensaio frio finito de
UI18 sem login prévio e regressões afetadas. Resultados posteriores ficam no
checkpoint, sem sucesso futuro presumido. Sprint01 permanece aberta, PR3 draft;
sem promoção, merge, STOP ou avanço para02–05.

## Resultado ao encerrar a chamada

Incremento publicado em5cce633e515d76346da3b534e7f9ce3697a65eb3; remoto/PR3
OPEN/draft/base main e corpo relidos. Ambos checksCI passaram; log conferido
contém175backend sem falha/erro/skip e152Python. Scanner318/links/diff passaram.

Build nativo único terminou05:21:11.830724Z, exit0/release_gate=true, hash
2db5ed4a9c167a7f356da21b792a602e84d160435b18a7e44e4134ab9d0933d6.
Recibo recolhido, mas XMLs completos não recontados após o término; última
contagem parcial era144casos/19XML, todos sem falha/erro/skip. Não atribuir
automaticamente a contagem CI ao inventário local final.

Ensaio finito iniciou primeiro candidato após liberar o build; às05:21:20Z
aguardava prontidão e não tinha resultadoUI18. Quatro partidas previstas,
Firefox/WebKit/Firefox/WebKit, sem login de aquecimento ou retry até verde.
Reentrada recusada sem alterar progresso. Limites informados antes do início:
45min aguardando build,30min ensaio e unidade80min/control-group.

Aviso efetivo de orçamento encerrou novas verificações; trabalhadores preservados.
Não repetir build/matriz antiga. Recolher ensaio e analisar causa/latência;
depois regressões e gates do novo artefato. A atualização Java não satisfaz a
guarda de backend idêntico da troca de frontend: caminho seguro de atualização
no MESMO clone ainda pendente. Nenhum deploy improvisado ou restauração de
banco pré-identidade. Documentos finais posteriores ao push permanecem locais.

# Sprint 01 — retomada ciclo 17

[Checkpoint](../25_EXECUTION_STATUS.md) · [Cobertura](cobertura.md)

## Escopo e limites

Sprint 01 continua aberta. Esta rodada preservou o build `47ca909` e as execuções
finitas herdadas, sem reconstrução ou suíte pesada concorrente. Não houve merge,
promoção de baseline, produção ou comunicação externa. Sprints 02–05 não iniciadas.

## Despacho assistido protegido

Incremento `dcf1831`: preflight `--check` antes de criar solicitação HTTP e
transmissão explícita do mesmo `deploy.lock` para manter exclusão entre UI, CLI
privilegiado e leitura posterior. Nenhuma flag dispensa gates, OIDs, migrations,
fonte limpa, origem fictícia ou opt-in. O descritor deve apontar para o inode
esperado; fechamento do filho não libera o lock mantido pelo pai.

Duas revisões independentes somente leitura encontraram preflight tardio,
intervalos sem exclusão, retomada incompleta e uso incorreto do validador de
runtime para o próprio checkout. Correções foram aplicadas ao CLI e ao roteiro
privado. A recusa do checkout foi reproduzida e a conferência da fonte privada
corrigida passou; fontes/scripts dos workers ativos não foram alterados.

Verificações executadas:

- Vermelho inicial: preflight não reconhecido e helper de lock ausente.
- Nove testes focados passaram; regressão completa Python: 147 aprovados.
- Subprocesso real Python → Node → Bash → Python compartilhou o descritor;
  concorrente permaneceu bloqueado após o filho terminar.
- Preflight sem UUID consulta migrations; falha dessa guarda não cria intenção
  nem chama Java. Essa prova usa coordenação simulada, não ativação de empresa.
- Recusa real do lock de publicação ocupado; nenhuma mutação de homologação.
- Sintaxe do roteiro privado e scanner de 301 arquivos aprovados antes do commit.

O novo roteiro privado conserva UUID/payload em retomadas, registra tentativas
separadas e produz inventário adicional a partir da intenção confirmada. Ainda
NÃO foi executado como jornada de ativação hml; não é evidência de provisionamento
homologado. Depende dos gates e da liberação dos workers herdados.

## Contratos empresariais antes ausentes

Acrescentados [identidade](../api/identidade.yaml) e
[acessos/equipe](../api/acessos.yaml), com treze operações existentes. Os contratos
foram confrontados com controllers, DTOs, serviços, políticas de segurança e
projeções. Não adicionam endpoints nem implementam as ações futuras do catálogo.

Validação estrutural OpenAPI 3.1, schemas e referências locais passou. Um probe
HTTP no release hml `3cd4eeb` realizou dezoito verificações: CSRF, login, identidade,
refresh, confirmação de senha, matriz/equipe/acessos/unidades, negativos de sessão,
tenant e Cliente, preservação da matriz e encerramento das sessões próprias.
Os corpos reais satisfizeram os schemas. Não houve alteração de matriz, equipe ou
unidades; não é reexecução de PUTs, concorrência ou matriz E2E.

O resultado privado registra os hashes dos dois contratos e do JAR servido,
PID e horário de início/fim. Alteração documental não exigiu outro build.

## Evidências herdadas recolhidas

- Build `47ca909`: 23 XML e 173 testes backend, sem falha, erro ou ignorado;
  resultado e hash conferidos, sem repetir execução.
- CI `0155ae3`: falha no download do Maven, anterior aos testes; uma reexecução
  do job falho passou. A falha original permanece no histórico.
- CI `291af3d`: ambos checks aprovados. Estado de CI dos heads posteriores
  deve ser consultado no checkpoint, sem transferir aprovação entre SHAs.
- No JAR `47ca909`, exportação 15, eventos 40, verificação 15, cadastro 20,
  recuperação 15, convites 20 e plataforma 15 combinações passaram nos cinco
  projetos, sem retry/skip/flaky. Demais fases seguem no worker.
- Identidade herdada: 37 aprovações e oito falhas UI04/UI08; correções publicadas
  aguardam reexecução pelo worker16b. Não aprovar a família pela soma dos sucessos.

Revisão visual adicional: verificação, cadastro, recuperação e convites em mobile
360 px e desktop 1280 px. Imagens longas de convites tiveram zoom nos controles,
consulta, cartões e paginação; não foi feita leitura individual de cada registro
repetido. Não houve aparelho físico nem revisão visual integral. Capturas de uma
família falha não aprovam seu cenário; a aceitação precisa usar as origens corretas.

## Homologação e continuação

Último snapshot deste registro: hml `3cd4eeb` em HTTPS loopback, health UP;
original de banco preservado/bloqueado e clone ativo, baseline `449ce3c` intacto.
O worker16b só pode executar manutenção, substituição restrita de frontend e
smokes depois de seus pré-requisitos reais. Não inferir essas fases futuras a
partir do script preparado. Relatório privado navegável do ciclo17 agrega os
recibos observados e distingue resultados finais de execução em andamento.

Próximo: recolher as execuções sem duplicar, corrigir/reexecutar falhas,
completar capturas e gates, executar jornada assistida e somente então considerar
aceitação/merge. Nenhum critério técnico pendente foi convertido em aprovação.

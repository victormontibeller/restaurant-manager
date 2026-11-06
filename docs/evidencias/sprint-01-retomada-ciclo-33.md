# Sprint 01 — retomada ciclo 33

[Checkpoint](../25_EXECUTION_STATUS.md) · [Sprint 01](../15_SPRINT_01.md)

## Escopo e estado inicial

Somente Sprint01 e passagem Codex/Mac. PR #3 aberto/draft, head95d278e e
ambos checks CI aprovados conferidos. Cinco alterações documentais herdadas
preservadas. Build95 ativo em fonte imutável; não interrompido nem repetido.
Homologação97d75b0 saudável, clone135836 e baseline449ce3c preservados.
Não foi encontrada rejeição de conclusão. Nenhum merge ou início de Sprint02–05.

## Matriz do novo Angular

Worker preparado no ciclo32 foi revisado independentemente e iniciado no
ciclo33. Plano conferido contra as specs:215 pares únicos UI01–43 nos cinco
projetos. Aguarda somente o build95 existente e exige gate/hash/fonte, término
da unidade, backend idêntico ao5cce633 fora de static e banco exclusivo livre.
Limites informados antes do início:5h totais, espera de build45min, limpeza90s,
KillMode control-group. Uso único, locks e registros privados; não faz build,
deploy, promoção ou merge. Execução futura não é aprovação antecipada.

## Composição operacional restrita

O modo `login-startup` existente exige static idêntico; `frontend` exige backend
idêntico. Nenhum deles aceita diretamente o artefato final, que contém a
consulta antecipada e a correção Angular. Não instalar candidato intermediário
nem retornar o banco anterior à identidade para contornar essa recusa.

Acrescentado `login-startup-frontend` na operação existente. Só static pode
ter entradas adicionadas/removidas; fora dele exigem-se exatamente as três
mudanças revisadas do login e a adição YAML byte a byte. Duplicatas ZIP são
recusadas antes do filtro. Default e opt-in anterior preservam suas restrições.
Encadeamento mantém histórico e recupera somente o binário imediatamente
anterior no mesmo clone, sem migrar/restaurar banco ou promover baseline.

Dois vermelhos pertinentes reproduziram a recusa dos chunks e do modo composto.
Após a alteração,21 testes focados e160 testes Python passaram. Negativos
cobrem bibliotecas, migrations, classe alheia, configuração arbitrária,
subconjunto das mudanças, entrada removida, prefixo semelhante e ZIP duplicado.
Encadeamento/retorno usa disco real e serviços simulados, não operação nativa.

Revisão independente não identificou bloqueador no diff. Limites: sem prova
de semântica do bytecode; fixtures de ZIP não substituem comparação dos JARs
reais; testes CLI/YAML específicos não cobrem todas as variantes. O positivo
foi ampliado após revisão para também alterar conteúdo static em entrada
mantida, além de adicionar/remover chunks, sem mudar a implementação.

## Pendências

Recolher build e matriz95, revisar capturas do novo artefato, comparar JARs
reais, executar manutenção/troca compatível e smokes, consolidar aceitação e
sete critérios reais. Não repetir provisionamento assistido28 nem atribuir
matriz31 ao Angular95. Setup Mac não executado/verificado. Sprint01 aberta;
nenhum gate foi reduzido e nenhuma promoção foi declarada.

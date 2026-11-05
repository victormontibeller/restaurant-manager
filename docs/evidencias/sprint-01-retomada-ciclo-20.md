# Sprint 01 — retomada ciclo 20

## Estado conferido

Retomada em 2026-11-05: branch `hermes/sprint-01-identidade-acessos`, base de
trabalho `2daf5c9`, PR #3 aberto/draft e seus dois checks CI aprovados.
Homologação `3cd4eeb` saudável, sem restart na investigação. Bancos dev/test/hml
conferidos com identidades próprias em loopback. Nenhum worker antigo ativo.

Resultados privados recolhidos: nove famílias do worker15b aprovadas, 170
combinações; identidade reprovada. Sua reexecução16b terminou com 44 aprovações
mais uma falha UI01/tablet, zero skip/flaky. Workers16/17 recusaram avançar;
manutenção, substituição e ensaio assistido desses workers NÃO ocorreram.
O build47ca909 permanece disponível; nenhuma reconstrução necessária para
alteração de teste/documentação.

## Diagnóstico de logout

O trace da falha mostra CSRF respondido, seguido de intervalo no navegador antes
do POST de logout. A asserção de cinco segundos terminou antes do início desse
POST, que respondeu 204. Não demonstra falha de revogação no backend. A tela
estava montando a matriz/equipe extensa; renderização/instrumentação é hipótese
para o atraso, não causa de CPU isolada por esse trace.

Reexecução focada do teste original UI01 em Chromium tablet: passou uma vez,
17,2 segundos totais. Isso confirma intermitência, não corrige nem apaga a falha
anterior. Revisão independente somente leitura confirmou a ausência de barreira
HTTP e a lacuna de verificação do JWT anterior.

Correção do teste registra espera pelo POST antes do clique, exige 204 e término
da resposta, depois mantém asserções de tela/recarga. UI01 verifica ainda o MESMO
access token do refresh: `/auth/me` 200 antes de sair e 401 após logout. UI02
aguarda encerramento antes de desmontar o navegador. Nenhum timeout global,
asserção de UI, retry ou regra de segurança foi relaxado; API/PostgreSQL reais.
Typecheck aprovado. Reexecução focada UI01–03: quinze combinações exatas nos
cinco projetos aprovadas, zero falha/skip/flaky/retry, duração292400ms. Candidato
encerrado e homologação preservada com mesmo SHA/hash/PID. Segunda revisão
independente do diff e runner finito não encontrou bloqueador novo. Matriz
consolidada de45casos, manutenção/troca/smokes ainda pendentes neste registro.

## Limites

A atualização solicitada de `AGENTS.md` foi recusada pela proteção do executor
sem aprovação interativa. Nenhuma tentativa por caminho alternativo; arquivo
permaneceu intacto. O guia canônico registra a autorização vigente e a exclusão
segura de branches integradas. Essa limitação documental não aprova gates nem
interrompe trabalho independente.

Sprint01 aberta; Sprints02–05 não iniciadas. Sem merge, promoção de baseline ou
conclusão técnica presumida. Capturas e recibos privados permanecem preservados.

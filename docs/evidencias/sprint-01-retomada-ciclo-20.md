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

### Resultado posterior e correção de renderização

O incremento de logout foi publicado em600274f, PR3 aberto/draft, remoto/corpo
relidos e ambos checks CI aprovados. Worker finito da matriz45 iniciou no mesmo
JAR, em fonte imutável. UI04 falhou em Chromium desktop e Firefox; no primeiro,
o timeout120s ocorreu na captura após as operações de negócio. A rodada NÃO é
aprovada. Última consulta21:15Z: ainda ativa, sem resultado final. Tentativa de
parada do serviço próprio foi bloqueada pelo executor; não houve contorno.

A tela montava os controles de unidades de todos os funcionários simultaneamente.
Probe de template Angular real reproduziu506checkboxes para seis funcionários/
cem unidades. Correção local monta vínculos de um funcionário aberto por vez;
perfil, atividade e salvamento permanecem visíveis. Fechar/trocar cartão conserva
rascunho; falha de recarga conserva editor/dados; sucesso fecha junto da nova
lista. Não altera contratos, autorização ou persistência backend.

Probes com API fictícia passaram nos três motores, incluindo payload/leitura
posterior, teclado, larguras360/768/1280, seis checkboxes iniciais e cem unidades
no único editor aberto. Revisão visual encontrou botões encostados; espaçamento
corrigido e verificado geometricamente. Doze capturas finais geradas privadamente;
lista mobile/desktop e recortes de editor foram inspecionados, sem alegar E2E.

Typecheck final, lógica de vínculos, quatro testes de sessão, dois de eventos,
cinco de exportação, scanner305 e diff passaram. Comando combinado anterior
expirou depois dos probes; reexecução final dos checks retornou0. Terceira revisão
independente foi recusada pelo limite2/2 desta chamada. Este incremento permanece
SEM COMMIT/BUILD e sua revisão/E2E são pendências explícitas. UI35 foi adaptado
para abrir/fechar os vínculos por teclado, mas ainda não executado no novo produto.
Não transferir evidências do JAR47ca909 à fonte Angular alterada.

A atualização solicitada de `AGENTS.md` foi recusada pela proteção do executor
sem aprovação interativa. Nenhuma tentativa por caminho alternativo; arquivo
permaneceu intacto. O guia canônico registra a autorização vigente e a exclusão
segura de branches integradas. Essa limitação documental não aprova gates nem
interrompe trabalho independente.

Sprint01 aberta; Sprints02–05 não iniciadas. Sem merge, promoção de baseline ou
conclusão técnica presumida. Capturas e recibos privados permanecem preservados.

# Revisão final da Sprint 3 — 2026-11-07

## Estado final local

Revisão e correções concluídas localmente. Base
`d9fde9968ab2ce154abecffe66e171788aae1770`, reconferida em `origin/main`;
branch `codex/sprint-03-pedidos-mesas-cozinha`. Implementação publicada em
`a6902bd2b06a0fa336a911d076975ca5f41437b8`, com [PR #6 aberto](https://github.com/victormontibeller/restaurant-manager/pull/6). Linux/Hermes e homologação continuam pendentes;
merge e deploy não fazem parte desta entrega.

Resultado vigente no JAR15
`d41d3bd2fe429b696064832944626ce97af64151b3292462c85083d1a7df1e9d`:
**365 testes backend/54 XML e 360 pares únicos (65 + 295) aprovados**, sem
falhas, erros, skips, retries ou instabilidade nas seleções finais. Mesmo
artefato/PID em toda a matriz. **110 capturas finais e cinco complementares
Firefox inspecionadas**; os complementos não somam cenários à matriz.

Recuperação após parada anterior a ambos os prazos aprovada no mesmo SHA.
Auditoria Java: 94 dependências sem achados; npm sem vulnerabilidades nas
mesmas dependências. Scanner estável conferiu 649 valores elegíveis conhecidos
no checkout e 311 entradas da aplicação no JAR, sem correspondência privada.
Links/âncoras, OpenAPI e diff são checks documentais/estruturais, não homologação.

A API de testes foi encerrada e 8089 ficou sem listener. O PostgreSQL compartilhado
permaneceu ativo para a demonstração manual independente em `rm_dev`/8095.
Bancos, clones, artefatos e relatórios foram preservados. O documento alheio
da demonstração foi mantido fora do commit desta revisão.

O [checkpoint](../25_EXECUTION_STATUS.md) registra publicação e pendências.
As seções por candidato abaixo preservam a sequência histórica das tentativas;
seus estados intermediários e resultados parciais não substituem este resultado
final. A [implementação local anterior](sprint-03-local-2026-11-07.md) permanece
separada, sem transferir aprovações entre hashes.

## Achados e correções

| Caso | Problema observado na revisão | Correção |
| --- | --- | --- |
| R01 | JWT que vence entre o filtro e o segundo decode do controller SSE vira erro 500 | Traduzir somente falha JWT em 401 JSON antes de abrir o stream; falha interna genuína continua 500 |
| R02 | Reautorização após esperar comanda pode reutilizar sessão revogada do cache JPA | Serializar acesso à sessão com logout/reuso de refresh, preservando ordem de locks |
| R03 | Replay de envio pode combinar estado/versão antigos com produção ou saldo novos | Reler agregado protegido após conferir autoria/payload e reautorizar após a espera |
| R04 | Cancelamento integral direto ou serviço podem deixar solicitação PENDENTE sem decisão possível | Resolver solicitação no cancelamento integral autorizado; exigir decisão antes do serviço; parcial preserva pendência |
| R05 | Tela de mesas, solicitações e seleção de comanda assistida não alcançam registros após os primeiros 50 | Paginação explícita, preservando contexto, atualização automática e navegação |
| R06 | Nome duplicado rejeitado prende a criação da mesa em intenção não editável | Liberar correção após rejeição definitiva, preservando UUID/payload quando resultado anterior é incerto |
| R07 | Resposta atrasada de consulta da comanda A pode substituir seleção B | Vincular resposta à seleção atual, além da geração da unidade/sessão |
| R08 | Clique de paginação entregue durante atualização SSE é descartado antes de o DOM refletir disabled | Enfileirar navegação, preservar páginas/contexto e manter foco e posição dos controles durante consultas automáticas |
| R09 | Consulta concorrente bem-sucedida apaga a rejeição 409 de uma ação | Separar erros de consulta e ação em mesas/participantes, com reprodução determinística e mensagens de acesso preservadas |
| R10 | Job que chega após alerta e expiração omite o alerta devido | Recuperar o alerta único antes da expiração na mesma transação, incluindo aceite no limite; regressões dirigidas e completas aprovadas |

R01 foi reproduzido com quatro testes: duas falhas esperadas 401/recebido 500 nos
dois endpoints e dois controles de erro interno. Após a correção, os quatro
passaram. R02 foi reproduzido com dois testes PostgreSQL concorrentes: ambos falharam
antes do ajuste e passaram após bloquear/reler a sessão. Os testes confirmam
os dois sentidos: revogação confirmada antes do acesso impede o comando;
logout aguarda a operação que já obteve autorização. Uma terceira corrida
em REPEATABLE_READ reproduziu 40001 transformado em 500. A leitura de sessão
agora traduz somente esse conflito para exceção técnica de concorrência; o
service devolve 409 SESSAO_ALTERADA, sem dados privados ou retry automático.
Falha de conexão, violação de integridade e deadlock não recebem essa tradução.
O lote final dirigido de sessão/SSE tem oito testes aprovados. R03/R04 tiveram seis
testes executados antes do patch, com cinco falhas esperadas e um controle
aprovado. Após as correções, os seis passaram; foram acrescentadas duas provas de
rollback da decisão inválida e de revogação durante espera no replay de mesa.
A primeira tentativa dessas oito teve uma falha do harness ao consultar texto
de SQL de outra role; a barreira passou a usar a relação real de bloqueio entre
PIDs. A reexecução completa dos oito passou, com zero erros/skips.

R05–R07 foram reproduzidos nos probes dos componentes reais com transporte
controlado, incluindo a resposta A tardia apagando erro de B. As correções
passaram em 19 grupos de lógica, tipos e formatação; nove combinações de
templates passaram após corrigir a variável privada de localização dos browsers.
A primeira tentativa de templates, sem essa configuração, permanece registrada
como falha de ambiente. Build/PWA aprovado com 455,03 kB iniciais: aviso acima
do limiar de 450 kB, abaixo do limite de erro de 600 kB. Orçamentos preservados.
Os novos UI12/UI13 exercitarão paginação, recuperação e seleção de comanda com
API/PostgreSQL reais; ainda não são resultados E2E aprovados.

## Ambiente de validação

JDK 21 e PostgreSQL 18 reais. A regressão usa nova cópia física offline em
`data-review09` no registro privado `Sprint03-local`, porta 55432 e socket próprio;
original permaneceu parado e intacto durante a regressão. Foram conferidos 23.030 arquivos, ausência
de links externos, identidade física, banco `rm_test`, proprietário e roles de
migração/runtime distintas. O JAR08 foi arquivado antes de novas compilações.
Após a regressão, o clone foi encerrado e a integridade do original conferida
antes de religá-lo. Nenhum banco ou relatório anterior foi removido. Configuração, credenciais,
fixtures e resultados detalhados continuam no diretório privado fora do Git.

Revisão independente final: 22 migrations anteriores idênticas à base, somente
V17–V21 novas; 51 operações OpenAPI correspondem aos controllers, 23 conjuntos
de campos DTO/schema conferidos e 162 referências válidas. Não há imports de
repositories entre os cinco domínios novos; KDS usa serviços/projeções de
pedidos. Essa inspeção é estrutural, separada dos testes da aplicação.

## Regressão completa — primeira execução

A primeira execução completa encontrou duas falhas em `CatalogoTest`: escrita
aguardando catálogo e favorito aguardando o lock do titular retornaram 500.
O diagnóstico confirmou deadlock 40P01 no preparo dos testes: a conexão que
segurava o agregado tentava atualizar a sessão, enquanto a requisição já tinha
obtido o lock compartilhado da sessão e aguardava o agregado. Essa ordem é
inversa à autorização transacional atual. Logout real bloqueia somente a
sessão, sem segurar o agregado. Os testes foram ajustados para logout real em
outra requisição, com barreiras `pg_blocking_pids`, comprovando a espera e a
recusa de novas operações após o logout, sem efeitos adicionais. A prova de
revogação anterior à autorização foi preservada. Os 13 testes de catálogo
passaram na execução dirigida. A primeira execução completa teve 363 testes
em 54 XML, duas falhas, zero erros/skips; não constitui aprovação. A segunda
regressão completa passou: **363 testes/54 XML**, zero falhas, erros ou skips.
O JAR09 tem SHA-256
`30b0efb292b511ea397ad079397dff8fb43b655842532db62825070928085c5f`;
378 fontes/configurações foram registradas, e os bytes Angular/PWA empacotados
coincidem com o build validado. A auditoria npm reportou zero vulnerabilidades.

## Recuperação do artefato09

Ensaio `final09` aprovado no mesmo SHA do JAR validado. O PID97404 terminou
antes de `expirarEm`; o prazo venceu com a API desligada. Após reinício no
PID97485, houve um alerta, uma expiração, dois ajustes, saldo zerado e nenhum
job restante. Replay recuperou o mesmo pedido cancelado sem nova cobrança
ou evento duplicado. O primeiro preflight dessa instância revelou R08; a matriz integrada não
foi iniciada. A instância foi encerrada e o JAR arquivado para nova correção.
Auditoria Java: 94 dependências, zero achados. Scanner: 194 valores privados
conhecidos conferidos em 658 arquivos e 311 entradas da aplicação no JAR,
sem correspondências. Configuração e credenciais não foram publicadas.

## Preflight09 — falha de paginação

UI12 no Chromium desktop falhou ao tentar avançar de página durante o replay
inicial SSE. O trace registra somente consultas da página zero com HTTP 200;
o clique chegou enquanto `carregando` já era verdadeiro e foi descartado pelo
handler antes da atualização do atributo disabled. Diagnóstico independente
confirmou falha da aplicação, não do harness. Sem retry automático ou aumento
arbitrário de timeout. R08 foi reproduzido antes da correção nos dois handlers. Depois, o probe
passou com 13 casos, incluindo fila, evento relendo a página selecionada e
descarte após troca de unidade. Só `MesasComponent.ts` e seu probe mudaram
desde09; UI12/UI13 ficaram idênticos. Formatação, tipos, 19 grupos de lógica,
nove combinações de templates e build/PWA passaram no candidato10, com
454,99 kB iniciais (aviso mantido), `main-T7NRXVHQ.js` e PWA
`f08d200fe5fc14403e24`. Regressão completa10 em execução; UI12/UI13 e a
matriz completa serão executados nele. O resultado09 permanece
não aprovado como matriz, embora backend e recuperação tenham passado. A revisão
independente da fila encontrou outra borda: navegações enfileiradas nas duas
listas capturavam a página antiga da outra dimensão. Probe privado reproduziu
mesas 0/solicitações 1 em vez de 1/1; a proposta resolve a página omitida somente
após aguardar a consulta vigente. A primeira execução backend10 foi
interrompida controladamente, com 105 testes/14 XML parciais sem falhas; esses
resultados **não são aprovação**. Logs, fonte congelada e motivo foram
preservados antes de aplicar a correção e repetir o verify completo. O ajuste
final10b preserva ambas as páginas nas duas ordens, mantendo 15 casos no
probe. Revisão independente sem bloqueador; formatação, tipos, 19 grupos de
lógica, nove templates e build/PWA passaram novamente. Build final:
454,96 kB, `main-NJU2C3T6.js`, PWA `8cd97ddd0ce561c470dd`; aviso de tamanho
preservado. O segundo verify completo10 passou: **363 testes/54 XML**, zero falhas, erros
ou skips. JAR final10
`4b891519480be11e7efc27df4fa26def12e0b1f37fecec7f0389649c7f4391f4`,
378 fontes/configurações e bytes Angular/PWA empacotados conferidos. O delta
de produção frente ao09 contém somente `MesasComponent.ts`.

## Recuperação e segurança do candidato10

Ensaio `final10` aprovado no SHA final: API7496 encerrada antes do prazo,
reinício7573, um alerta, uma expiração, dois ajustes, saldo zerado, nenhum job
restante e replay sem duplicação. A instância7573 será mantida durante o
preflight e a matriz. PostgreSQL original no PID7379; clone10 encerrado e
preservado, original conferido intacto antes de religar. Auditoria Java:
94 dependências, zero achados. Scanner: 270 valores privados, 658 arquivos e
311 entradas da aplicação no JAR; nenhuma correspondência.

## Preflight10 — perda de foco

UI12 no Chromium avançou a paginação de mesas, mas falhou na prova de foco de
Próximas solicitações. O trace confirma que snapshots SSE alternavam o atributo
nativo disabled, removendo foco antes do Enter, com consultas HTTP 200. A fila
estava correta, mas a interação por teclado ainda não. Diagnóstico independente
concordante; nenhum retry ou enfraquecimento de UI12/UI13. O JAR10 foi arquivado
e a API7573 encerrada. O candidato11 corrigirá os controles de leitura com
progresso acessível, mantendo bloqueios de escrita, limites, contexto e fila.
O novo probe DOM usa componentes, signal inputs, templates, estilos e leitor
SSE reais, com transporte fictício. As três primeiras tentativas falharam na
montagem do harness; não são prova de foco. Duas seguintes reproduziram
disabled indevido, e a sexta comprovou diretamente foco perdido durante SSE.
Depois do patch, a prova Chromium passou para Atualizar, mesas, solicitações
e pedido assistido, com Enter, fila, limites e bloqueio de envio. O probe
lógico tem 17 casos aprovados. Revisão independente reforçou a prova:
assertar foco logo após renderizar aria-busy, antes de qualquer Tab/refocus.
A versão forte passou nos três motores. Resultado final: tipos, formatação,
19 grupos de lógica e 12 combinações de templates (nove inalteradas da rodada
completa e três reexecuções da versão forte, sem somar tentativas). Build/PWA11
aprovado: 455,42 kB, `main-5IWSA7KM.js`, PWA `8ba27aeb877117a28a77`,
aviso de tamanho preservado e limite de erro inalterado. A revisão independente
não encontrou bloqueadores no escopo. O clean verify11 passou com 363 testes/54 XML, zero falhas, erros ou skips.
JAR11 `19e066499faeee032d076e4696844ab721951b255ed0af8e38e0fe6efb589767`,
378 fontes/configurações e bytes Angular/PWA empacotados conferidos.
UI12/UI13 continuam literalmente iguais e aguardam nova prova integrada. Como controles
permanecem habilitados durante leitura, os helpers de busca de mesa/comanda
precisam aguardar um resultado útil (alvo presente ou próxima página
disponível), reavaliando o alvo antes de navegar. A sincronização deixa de
usar enabled como sinal de consulta concluída; não repete cliques, não amplia
timeout nem espera esvaziar SSE. Aplicação/build permanecem congelados durante
essa adequação do harness; casos e asserções UI12/UI13 são preservados.

## Recuperação e segurança do candidato11

Ensaio `final11` aprovado no SHA final. API16732 terminou antes do prazo;
reinício16786 recuperou a expiração. Resultado: um alerta, uma expiração,
dois ajustes, saldo zerado, nenhum job restante e replay sem duplicação.
A instância 16786 foi usada no preflight; PostgreSQL original no PID 16638,
clone11 encerrado e preservado após conferir o original intacto.
Auditoria Java: 94 dependências, zero achados. Scanner: 346 valores privados,
659 arquivos e 311 entradas da aplicação no JAR; nenhuma correspondência.

## Preflight11 — deslocamento durante o clique

Sete pares passaram: UI12/UI13 em Chromium desktop, mobile e tablet, mais UI12
em Firefox. UI13 em Firefox falhou ao preencher o cadastro: o details continuou
fechado após o clique no summary. Os dois pares WebKit não foram executados;
essa rodada não aprova a matriz. Trace, captura e diagnóstico preservados.

Revisão independente dos frames mostrou o status SSE alternando entre uma e
duas linhas e deslocando o summary em 25,6 px, sem remontagem do details. O
trace registra interceptação pelo section e um clique concluído durante a
variação; a perda por coordenada é a inferência causal, pois o alvo exato de
mousedown/up não está registrado. A correção será na estabilidade do layout,
com prova de geometria durante atualização. UI13 manterá o clique por ponteiro;
uma troca apenas para Enter não provaria a correção desse comportamento.

O JAR11 foi arquivado e a API encerrada. O candidato12 preserva os bancos e
relatórios anteriores. O probe reproduziu uma variação de 25,59 px antes do
patch; depois, passou nos três motores. A área de status reserva a altura
natural da maior mensagem atual, sem corte nem altura fixa, e exclui o texto
de reserva da árvore de acessibilidade. A prova cobre 360/768/1280 px,
fontes de 16/20 px, estados reais, quatro valores de horário e sete controles.
Um único clique mantém mouse pressionado durante a resposta e só o solta após
conferir o DOM atualizado e a geometria. Foco, fila, limites e bloqueio de
confirmação durante consulta continuam cobertos. O assistido também preserva
a posição quando alterna entre progresso e página vazia.

Formatação, tipos, 19 grupos de lógica (17 casos de mesas) e 12 combinações de
templates aprovados no candidato12. Após o reforço sugerido pela revisão
independente, foram selecionadas nove combinações inalteradas da rodada
completa e três reexecuções do probe final; tentativas não foram somadas.
Build/PWA aprovado: 457,36 kB iniciais, `main-J7UDG5KS.js`, versão
`43385f453997605d5c79`. Aviso de 450 kB preservado, abaixo do limite de erro
de 600 kB. Fontes/harness congelados. Clean verify completo12 aprovado: 363 testes/54 XML,
zero falhas, erros ou skips; 481 arquivos conferidos sem mudança durante a
regressão. O original ficou parado, com 23.562 arquivos conferidos antes da
cópia. JAR12 `8a80bcd59f314873f1e247c4d86dbb63c10d2918c34169f8f07a649db85d745d`;
manifesto de 378 fontes/configurações e bytes Angular/PWA empacotados conferidos.

## Recuperação e segurança do candidato12

Ensaio `final12` aprovado no mesmo JAR: API 25268 encerrou antes do prazo e
reiniciou como 25321. Um alerta, uma expiração, dois ajustes, saldo zerado,
nenhum job restante e replay sem duplicação. Essa instância foi usada no preflight; PostgreSQL original no PID 25174, clone12 preservado.
Auditoria Java: 94 dependências sem achados; npm: zero vulnerabilidades.

## Preflight12 — erro de ação apagado por consulta

Nove pares passaram, incluindo o clique original em UI13 Firefox, que havia
falhado no candidato11. UI13 WebKit validou POST 409 de nome duplicado, mas não
encontrou o alerta na interface. Não houve retry; a matriz de 360 pares não foi iniciada.

Trace e revisão independente confirmaram a concorrência: o POST 409 terminou
em aproximadamente 7277,589 ms, o GET de solicitações em 7280,572 ms e a
asserção do alerta começou em 7290 ms. A consulta bem-sucedida limpa o mesmo
sinal que recebe o erro da ação. O formulário permaneceu aberto com o nome
preenchido; não é uma falha de clique. O trace não capturou a mensagem antes
de ser apagada, e a conclusão combina HTTP, ordem observada e código.

R09 foi reproduzido nos componentes de mesas e participante antes do patch,
com duas falhas de asserção válidas. Ambos agora têm erros de consulta e ação
separados, compostos no mesmo alerta. GET bem-sucedido resolve somente seu
próprio erro; consulta automática/manual não apaga conflito ou incerteza da
ação. Falhas 401/403 continuam visíveis junto do erro da ação. Nova ação e
troca de contexto limpam os canais correspondentes, preservando UUID/payload.
Os probes dirigidos passaram; revisão independente aprovou código e provas.
O DOM usa o componente real: mantém GET em voo, rejeita o cadastro com 409 e
exige o alerta antes e depois do render da resposta da consulta. UI13/apoio
permanecem inalterados. A rodada completa13 passou: formatação, tipos, 19 grupos de lógica, 18 casos
no probe de mesas, seis de contexto e 12 combinações de templates (quatro
probes em cada um dos três motores, sem somar reexecuções). Build/PWA aprovado:
457,81 kB iniciais, `main-XPAP73HY.js`, PWA `a352c7808d76e4216140`. Aviso de
450 kB e limite de erro de 600 kB preservados. Fontes/harness congelados;
clean verify completo13 aprovado: 363 testes/54 XML, zero falhas, erros ou
skips, com 481 arquivos sem alteração durante a rodada. Os 23.740 arquivos
originais foram conferidos e o banco original ficou parado/preservado.
JAR13 `13a9cfe3c24abcf87e9e2dcbcd1e990ae2adba397fbc03c15598fdf29dee1496`;
378 fontes/configurações e bytes Angular/PWA no JAR conferidos.
JAR12 arquivado e API encerrada; candidato13 em preparação, preservando bancos,
relatórios e os nove pares aprovados como histórico, sem transferi-los ao novo
artefato. Scanner12 final: 422 valores privados, 659 arquivos e 311 entradas
JAR, zero correspondências. A varredura preliminar anterior às novas fixtures
foi preservada separadamente e não substitui esse resultado.

## Recuperação e segurança do candidato13

Ensaio `final13` aprovado no SHA13: API 33610 encerrou antes do prazo e
reiniciou como 33667. Um alerta, uma expiração, dois ajustes, saldo zerado,
nenhum job restante e replay sem duplicação. PostgreSQL original no PID 33530;
clone13 encerrado/preservado após verificar o original intacto. Auditoria
Java: 94 dependências sem achados; npm12 sem vulnerabilidades, com dependências
inalteradas no13. Scanner13: 498 valores privados, 659 arquivos e 311 entradas
JAR, zero correspondências. Preflight13 passou nos dez pares, incluindo o
clique original e o alerta 409 em Firefox/WebKit. A matriz de 360 pares foi iniciada com
fontes/harness congelados no mesmo JAR e PID 33667; não inclui os dez pares
de preflight na contagem. Revisão visual final em andamento.

## Interrupção e sincronização da matriz13

A rodada 13 parou com 35 pares Sprint 3 e 194 de regressão aprovados; resultados
parciais, sem aprovação da matriz. UI10 tablet falhou aguardando conexão SSE.
O lote de catálogo Firefox teve nove pares PASS e um timeout; nenhum dos dez
é contado como lote aprovado. Relatórios e traces permanecem preservados.

Os diagnósticos separaram duas causas. UI10 recebeu 64 páginas de eventos
HTTP 200, todas com 50 itens e `temMais=true`, até o cursor 3150. Ainda estava
drenando o histórico preservado; nenhuma conexão stream ou mutação de
permissões ocorreu antes da asserção de cinco segundos. A suspensão não foi
comprovada como causa desse caso. A sincronização do teste foi ajustada para
aguardar a precondição SSE dentro do orçamento global já existente de 180 s;
o limite de 15 s para a revogação não mudou. O teste agora também comprova que
o JWT ainda está válido imediatamente antes de revogar. Tipos/formatação
aprovados, sem mudança na aplicação ou nos orçamentos de timeout.

O registro de energia confirmou suspensão por fechamento da tampa de
20:18:03 UTC até 22:02:20 UTC (6.257 segundos). O cenário de catálogo atravessou
a lacuna durante o login: HTTP 200 às 20:18:33, token com expiração às 20:23:33 e auth/me com HTTP 401
às 22:02:19. Nenhuma edição de catálogo desse cenário havia começado. O primeiro
diagnóstico não localizou o corpo do token; a revisão encontrou o recurso
`_file` no trace e confirmou a expiração. Ambos os registros foram preservados,
com o segundo referenciando o hash do primeiro, sem publicar credenciais.

JAR, PID 33667 e 378 fontes/configurações da aplicação permanecem idênticos.
Os 363 testes backend e a recuperação13 continuam vinculados ao mesmo artefato;
não foram declarados como novas execuções. Como mudou a sincronização do teste,
a matriz 14 foi iniciada com novo plano congelado e fixtures próprias, sem
herdar os pares parciais 13. UI10 tablet está sendo executado primeiro e conta
uma única vez nos 65 pares da Sprint 3; a regressão de 295 pares roda em paralelo. Nenhum arquivo da rodada 13 foi removido, modificado ou
arquivado para ocultar falha. O helper de arquivamento chegou a ser rascunhado,
mas não foi executado. Linux/homologação seguem pendentes.

## Matriz14 — alerta vencido omitido

A execução de pedidos parou no par 44, UI05 Firefox, com 43 pares aprovados.
O pedido foi criado às 22:56:12,383272 UTC, com alerta após um segundo e
expiração após quatro. O histórico registra expiração às 22:56:16,655946 UTC,
272,674 ms depois do limite, saldo zerado e nenhum `ACEITE_ATRASADO`. As
consultas HTTP 200 demoraram entre 18 e 73 ms; não há evidência de falha de rede.
O job chegou após ambos os prazos e seguiu o ramo que expira antes de alertar.
Relatório e trace preservados; nenhuma reexecução automática. A revisão confirmou a recuperação de ambos os vencimentos: alerta devido único
antes da expiração na mesma transação, com horário real de processamento. Isso
não comprova entrega ou leitura antes da expiração. A correção e as regressões
determinísticas estão em preparação; UI05 e seus prazos permanecem inalterados. A regressão independente terminou com 295 pares aprovados. A revisão visual
inspecionou 42 capturas novas de fluxos Sprint 3, 15 de perfis e 25 da regressão.
Esses resultados não aprovam a matriz incompleta nem serão herdados pelo novo
artefato. API anterior encerrada às 23:05:48 UTC; JAR13 arquivado e preservado.
O candidato15 usa novo clone isolado, com original parado e preservado. A cópia
conferiu 24.623 arquivos. A reprodução dirigida tem sete testes: quatro falharam
pela ausência do alerta devido e três controles passaram, sem erros ou skips.
Logs/XML preservados. A correção acrescenta `alertar(pedido, agora)` antes do
cancelamento no fluxo comum; a reexecução dos sete passou, sem falhas, erros ou
skips. O clean verify completo15 passou: **365 testes/54 XML**, zero falhas, erros ou
skips; 481 fontes/insumos permaneceram idênticos durante a execução. As provas
verificam tipos, ordem e unicidade no histórico e nos fluxos persistidos de
cliente/operação, timestamps reais, saldo e deadlines preservados.

## Artefato15 — regressão completa aprovada

JAR15 `d41d3bd2fe429b696064832944626ce97af64151b3292462c85083d1a7df1e9d`.
Manifesto de 378 fontes/configurações; o único delta de produção frente ao13
é a chamada de recuperação do alerta no fluxo de expiração. Os nove arquivos
estáticos foram comparados integralmente entre JAR13 arquivado, dist e JAR15.
Formatação/tipos/lógica/templates/build anteriores permanecem evidência dos
mesmos bytes frontend; não são declarados como novas execuções. Auditoria Java:
94 dependências, zero achados. Original conferido intacto antes de retomar,
clone15 encerrado e preservado; PostgreSQL próprio no PID 59175.

Recuperação15 aprovada no mesmo SHA: API 59291 encerrou às 23:24:41,102056 UTC,
antes do alerta (23:24:59,611232) e da expiração (23:25:19,611232). Ambos venceram
offline. Após reinício no PID 59343, alerta e expiração foram registrados às
23:25:39,876625, nessa ordem, com um evento de cada tipo, dois ajustes, saldo
zerado e nenhum job restante. Replay sem duplicação; horários reais preservados.
A prova não transforma esse alerta recuperado em entrega anterior à expiração.

UI05 Firefox, com os mesmos prazos e asserções, passou como primeiro par15 e
foi contado uma única vez. A matriz15 completa passou: 65 pares Sprint 3 e
295 de regressão no PID 59343, com fontes/harness congelados, sem skips,
retries ou instabilidade. Consolidador e revisão independente reabriram os
relatórios originais, planos, fontes e hashes. Nenhuma aprovação14 foi herdada.

A revisão visual inspecionou 60 capturas de fluxos, 25 de perfis e 25 da
regressão. Cinco capturas de perfis Firefox mostravam pedidos antigos devido
ao enquadramento do painel longo. As asserções UI/API haviam passado. Um
complemento privado no mesmo JAR/PID capturou cinco cartões atuais completos,
com motivo/ações nos perfis autorizados e ausência nos demais; passou sem
skip/retry/flaky e não integra os 360 pares. As imagens originais e sua
limitação permanecem registradas. Recortes móveis fora da dobra não são
prova visual de controles invisíveis; a cobertura por interação é separada.

## Scanner e arquivos temporários de testes

A primeira varredura14 reuniu 614 valores e apontou o teste de identidade,
inalterado em relação à base. O inventário incluía JSONs temporários dos traces
Playwright, removidos após a compactação, tornando a coleta variável. A revisão
capturou a procedência por hash e reproduziu a correspondência: o campo de senha
do teste negativo continha um literal público já presente na linha 104 do fonte.
O resultado original, os diagnósticos e a procedência foram preservados, sem
publicar valores. A conferência final usou uma fotografia estável dos insumos e distinguiu esse
literal público dos segredos das fixtures. O snapshot15 passou com 649 valores
elegíveis conhecidos e nenhuma correspondência privada ou não classificada.

## Cobertura acrescentada

UI12 percorre mais de 50 mesas, solicitações e comandas assistidas. UI13 cobre
a correção de nome duplicado, a perda da resposta de uma criação confirmada
e a resposta atrasada da comanda A após selecionar B. Os dois cenários foram
acrescentados aos cinco projetos de navegador; a matriz prevista passa a
65 pares Sprint 3 e 295 pares de regressão. Probes e testes dirigidos não são
contabilizados como aprovação dessa matriz.

## Pendências externas

Publicação e estado do PR são rastreáveis no checkpoint. Linux/Hermes,
homologação, dispositivos físicos, tecnologia assistiva, restore operacional
e piloto continuam fora da aprovação local. Build aprovado com aviso de
457,81 kB iniciais, preservando os limiares de 450/600 kB. Sem merge ou deploy.

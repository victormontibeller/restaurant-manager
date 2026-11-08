# Sprint 3 — implementação e validação local

## Estado desta evidência

Implementação e validação local concluídas, com os resultados separados por
artefato abaixo. Este registro não declara homologação. O
[checkpoint](../25_EXECUTION_STATUS.md) mantém o estado atual e as pendências.

Base `main` limpa em `d9fde9968ab2ce154abecffe66e171788aae1770`; branch
`codex/sprint-03-pedidos-mesas-cozinha`. Na data desta etapa, trabalho local sem commit/push; a publicação e a revisão
posterior estão no checkpoint. Plano confirmado pelo proprietário, incluindo SSE/polling/jobs PostgreSQL e delivery
controlado; Linux/Hermes e homologação deliberadamente pendentes.

## Implementação integrada

- Pedidos próprios/assistidos, snapshots calculados no servidor, intenção UUID,
  aceite/recusa, histórico, autocancelamento e avaliação posterior.
- Mesas/atendimentos/comandas, QR público sem autorização, código temporário,
  sessão de participante com audiência própria, rotação e revogação.
- Produção por unidade comercial, combos completos, lotes atômicos, primeiro
  preparo imutável, serviço de mesa e fechamento condicionado a saldos/pedidos.
- Cobranças e ajustes alocados; rodadas somam a comanda sem duplicar dívida.
  Recebimentos/devoluções anteriores nos testes são fixtures identificadas.
- Prazos versionados e reautenticados, trabalhos duráveis e streams com cursor
  transacional, SSE Bearer e fallback por polling.
- Interface por domínio, ações efetivas, conexão/última atualização, intenção
  incerta e confirmação impedida offline. Pagamentos continuam na Sprint 4.

V17–V21 são migrations novas, sem alteração das anteriores. Organização
Controller → Service → Repository preservada; cozinha é fachada de pedidos,
financeiro recebe parcelas próprias e coordenação de casos de uso fica separada
dos serviços de agregado. Fontes canônicas e contratos foram atualizados.

## Ambiente e fronteiras

macOS, JDK 21 e PostgreSQL 18 real, novo cluster exclusivo em loopback:55432,
banco `rm_test` com roles distintas de migração e runtime. Banco de recusa
`rm_hml` permanece sem uso de negócio. Alvo, proprietário e diretório do cluster
são conferidos antes de preparar fixtures. Bancos anteriores preservados;
nenhum bootstrap dependente de Linux foi utilizado.

Credenciais aleatórias, capturas de e-mail, logs, relatórios e screenshots ficam
fora do checkout, em diretório privado da execução. Nenhum envio externo.
Delivery usa endereço fictício e taxa zero definida pelo servidor, habilitado
somente em desenvolvimento/testes. Não foram criados endpoints de pagamento.

## Comandos e localização das evidências

A configuração é carregada por `bash scripts/with-env.sh test`, com `RM_HOME`
apontando para o diretório do registro privado `Sprint03-local`. Esse diretório
tem acesso restrito e contém o cluster, credenciais, fixtures e relatórios; seus arquivos
não devem ser publicados. JDK 21 foi usado em todas as execuções Maven.

- Backend: `bash backend/mvnw -B -ntp -f backend/pom.xml verify`.
- Frontend, a partir de `frontend/`: `npm run format:check`, `npm run typecheck`,
  `npm run test:logic`, `npm run test:templates` e `npm run build`.
- Playwright: configuração `playwright.pedidos.config.ts` para S03-UI01–11 e
  configurações por domínio para a regressão, com fixtures privadas, um worker
  e `retries: 0`. Os runners privados preservam quotas e vinculam cada relatório
  ao JAR e processo observado.
- Fontes e documentação: `python3 scripts/check-repository.py`, `git diff --check`,
  validação das referências OpenAPI e scanner de valores privados contra o
  checkout/JAR. Não substituem testes da aplicação.

Os resultados finais são registrados ao fim desta evidência. As seções
intermediárias preservam a cronologia de falhas e candidatos substituídos.

## Verificações iniciais

| Execução | Resultado efetivamente observado |
| --- | --- |
| Compilação integrada inicial | Aprovada |
| Eventos, primeira tentativa | Bloqueada pelo sandbox de conexão; não aprovada |
| Eventos, execução com PostgreSQL | 5 testes aprovados |
| Mesas/sessão/eventos | 21 testes, uma falha: abertura concorrente retornava 500 em vez de 409 |
| Reexecução integrada após correção | 48 testes, zero falhas/erros/skips |
| Primeira regressão completa | 323 testes, zero falhas/erros/skips |
| Regressão completa após revisão backend | 323 testes/45 XML, zero falhas/erros/skips |
| Frontend final antes do E2E | Tipos, formatação, 18 probes de lógica e build/PWA aprovados; nove combinações de templates aprovadas |
| Guardas de evidência | 5 testes aprovados; primeira invocação corrigida para o diretório de scripts após erro de importação |
| OpenAPI e documentação parcial | 46 rotas e 162 referências internas válidas; links locais e 39 âncoras conferidos |

A abertura concorrente agora bloqueia a mesa antes de reler seu atendimento.
A revisão cruzada também corrigiu a projeção do envio assistido na mesma
transação, fronteiras de DTOs e expiração SSE após espera por lock. Ajustes de
respostas antigas e seleção do KDS motivaram nova validação do frontend.
Resultados anteriores não são transferidos automaticamente ao artefato novo.

A preparação de fixtures encontrou e-mail com maiúscula nos rótulos de dois
clientes. A constraint recusou a inserção; o preparador foi corrigido para
normalizar e agrupar o seed em transação. As duas massas parcialmente preparadas
foram completadas sem reprovisionar seus tenants nem redefinir quotas. Essa falha
é de preparação privada, sem mudança da aplicação.

Primeiro candidato local (substituído após a correção SSE): SHA-256
`a3b240417e2387b8d54051a9c48d04c188e775a1772141a1fcf494fb95acee77`.
PWA `41936c05c799593fdd9b`, bundle `main-PGID4CCL.js`; tamanho inicial
449,87 kB, QR carregado sob demanda. Dependência `qrcode-generator` 2.0.4 MIT;
auditoria npm registrou zero vulnerabilidades em 369 dependências. Manifesto
inicial contém 373 fontes/configurações da aplicação.

## Falhas observadas nas jornadas reais

O piloto S03-UI01 consultava o snapshot imediatamente após clicar em concluir,
antes de terminar a resposta do comando. A espera foi vinculada ao estado
confirmado pela UI; a reexecução passou no mesmo artefato. S03-UI02 executou
abertura, rodada, ajuda/conta, atendimento, reabertura, cancelamento e fechamento
com respostas 200; sua asserção de revogação terminou em cinco segundos, antes
do polling seguinte (5,065 s). A espera específica foi ampliada para cobrir o
ciclo de cinco segundos. Falhas originais permanecem nos relatórios privados.

A inspeção dos logs encontrou um defeito da aplicação: desconexão SSE gerava
`AsyncRequestNotUsableException`, recebida pelo handler genérico, que tentava
escrever `ApiError` com tipo `text/event-stream`. Isso produzia erros adicionais
de conversão. A API anterior foi encerrada para correção e nova validação; os
pares anteriores não aprovam o novo candidato. O handler específico agora
encerra sem escrever outro corpo. Três testes do handler e a regressão SSE
passaram (quatro testes, zero falhas/erros/skips); a primeira asserção do teste
foi ajustada ao comportamento do MockMvc, que remove o Content-Type no despacho
da exceção. Corpo/status já enviados são verificados, assim como a preservação
dos erros JSON de negócio e de falha interna.

## Segundo candidato e recuperação

SHA-256 `363e6c0043884d0bfcb308132ab559bdc17c49683b7420628a1d46e9e72881cb`.
Regressão completa após a correção: **326 testes em 46 XML**, zero falhas, erros
ou skips. Frontend permaneceu byte a byte no build registrado acima.

O ensaio com API/PostgreSQL reais criou pedido com prazos de 5/40 segundos,
aguardou um alerta, desligou a API antes do vencimento e manteve-a desligada até
expirar. Reiniciou o mesmo JAR em outro PID: pedido cancelado, um alerta, uma
expiração, dois ajustes alocados, saldo zero e nenhum trabalho restante. Repetir
a intenção recuperou o mesmo pedido; replay do cursor não retornou novos eventos.
A primeira execução do preparador esperava 200 na reautenticação, cujo contrato
retorna 204; corrigido apenas o script privado antes de criar o pedido.

## Revisão visual e próxima composição

Embora 25 pares novos tenham passado no candidato `363e6c0…`, a revisão das
capturas mobile de KDS, combos e comanda reprovou o excesso de margens/bordas
aninhadas e a apresentação de UUIDs de unidades em muitas linhas. A execução
parou entre casos, preservando quotas; esse candidato não encerra o aceite da UI.
Correção local de layout e identificação legível das unidades está em andamento.
Os IDs reais continuam no transporte dos comandos. Foram registrados hashes de
499 entradas não estáticas do JAR para conferir o backend na próxima composição.
A conferência de aderência ao plano tornou explícita a ordenação por UUID nas
atualizações de unidades de produção e cancelamento, além do lock prévio do
pedido; uma nova regressão completa valida esse ajuste.

## Terceiro candidato após revisão visual

Candidato `b2840ddd725c647008470beca3a84bba91789d1e7298eaaa03de8a5f4550adfc`.
A quarta regressão completa executou 326 testes/46 XML sem falhas/erros/skips.
O empacotamento do frontend preservou as 499 entradas não estáticas do backend
validado. Manifesto final de aplicação: 376 fontes/configurações.

Build Angular/PWA sem avisos: 448,14 kB iniciais, `main-OFXUVNEL.js`,
PWA `fdd5f6f7a0122260d911`. Estilos de unidades, código temporário e parâmetros
ficam próximos dos respectivos componentes; regras compartilhadas sem uso foram
removidas, sem alterar o CSS global ou templates antigos. Formatação cobre os
novos HTML/CSS sem reformatar o catálogo preexistente.

Repetido o ensaio completo de recuperação com fixture inédita e esse mesmo JAR:
um alerta, uma expiração, dois ajustes, saldo zero, nenhum trabalho pendente;
replay da intenção e cursor sem duplicação. Runtime foi reiniciado e permaneceu
nesse artefato para a matriz final. Resultados de navegador do candidato anterior
não são transferidos para essa composição.

## Correções finais e preservação dos diagnósticos

No terceiro candidato, 18 pares passaram antes de S03-UI08 mobile encontrar
uma corrida no próprio teste: o foco era solicitado enquanto a confirmação do
carrinho ainda estava sendo atualizada. O teste agora aguarda o resumo confirmado
e o botão habilitado antes de Tab/Enter ou toque, e confere o POST real e o pedido
persistido. Capturas mostraram também controles de seleção/motivo sem comandos
disponíveis para alguns perfis; a UI passou a usar as mesmas permissões e estados
dos comandos para exibir esses controles. S03-UI06 verifica a ausência deles.

O diagnóstico privado dessa falha exibiu acidentalmente credenciais fictícias
da fixture 19 em uma saída da ferramenta. As senhas de suas oito contas foram
rotacionadas e todas as sessões anteriores revogadas; nenhuma sessão antiga
permaneceu ativa. Não houve reset de quotas, alteração de contas reais nem
inclusão desses valores no Git. O scanner final inclui valores antigos e novos.

Um teste direcionado reproduziu falha na negociação de erros quando o cliente
solicitava `text/event-stream`: a resposta negada não preservava JSON. Os handlers
de `ApiError` agora definem `application/json`; a desconexão de stream já iniciado
continua sem escrita adicional. Duas regressões novas cobrem 403 e 400 com Accept
SSE; S03-UI10 repete os casos pela API real. A quinta regressão completa passou
**328 testes/46 XML**, sem falhas, erros ou skips. Os relatórios reprovados e os
logs dos candidatos anteriores permanecem privados e não contam como aprovação.

## Quarto candidato integrado

SHA-256 `98477464c3987f461f9eb89abb29d7cf646dc91626299995be5986be894ece43`.
Build inicial 449,70 kB, sem avisos; `main-HHJFAGIQ.js`,
PWA `42966be512890e233a70`. As 499 entradas não estáticas são idênticas às
validadas na quinta regressão backend. Manifesto: 376 fontes/configurações.

Acompanhamento próprio de várias unidades reconsulta o snapshot a cada cinco
segundos, sem consultas concorrentes acumuladas. Probe cobre atualização da
segunda unidade, evento durante carga manual, passagem para uma única unidade
com troca do SSE, troca de contexto e destruição. Formatação, tipos, 18 scripts
de lógica, nove combinações de templates e build Angular/PWA passaram. Templates
usam API simulada; sua aprovação não substitui as jornadas com PostgreSQL real.

O reinício passou novamente nesse JAR, com fixture inédita: um alerta, uma
expiração, dois ajustes, saldo zero, nenhum trabalho pendente e replay sem
duplicação. Nove pares de navegador passaram, incluindo os casos novos de erro
JSON com Accept SSE. A inspeção dos logs, porém, encontrou cinco ocorrências de
`HttpMessageNotWritableException` durante trocas de tela/perfil; a matriz foi
pausada entre casos para reproduzir a causa. Esse candidato não está aprovado.

A reprodução posterior identificou a causa: no Spring/Jackson usados, a
conexão encerrada durante a escrita JSON é encapsulada em
`HttpMessageNotWritableException`. O handler genérico interceptava esse
invólucro antes de alcançar a causa de desconexão. A reprodução também cobriu
SSE com envio inicial e envio posterior; erro de serialização com conexão aberta
foi mantido como controle negativo. A correção classifica a cadeia pelo helper
oficial do Spring, sem registrar mensagens ou tentar escrever outra resposta
após desconexão. Erros genuínos continuam retornando 500 JSON.

## Quinto candidato integrado

SHA-256 `df7aa3b2ab593cd4f051735fb8e609835c06a4dc153be1e94b5609e384224b5b`.
A sexta regressão completa passou **332 testes/48 XML**, sem falhas, erros ou
skips. Os dez testes direcionados de transporte/negociação passaram antes dela.
Frontend permanece `main-HHJFAGIQ.js` / PWA `42966be512890e233a70`, com seus
arquivos conferidos byte a byte no JAR. Manifesto de 376 fontes/configurações.

Os runners privados conferem JAR, PID, início do processo e posse da porta da
API antes/depois de cada lote. A consolidação final cruza as duas matrizes e
relê seus relatórios; resultados incompletos, skips, retry, flaky ou divergência
de artefato/processo são recusados. Reinício com fixture inédita aprovado no
mesmo JAR: um alerta, uma expiração, dois ajustes, saldo zerado, nenhum job
pendente e replay da intenção/cursor sem duplicação. Os gates têm 31 testes unitários sintéticos
aprovados, separados dos testes da aplicação. A massa da baseline foi conferida:
três tenants com 21 migrations, dez contas inéditas de verificação e shell PWA
idêntico ao pacote. As quotas reais não são redefinidas.

Os 22 pares desktop/mobile passaram. O erro anterior de escrita não reapareceu;
os logs revelaram outro problema, com `AuthorizationDeniedException` no despacho
assíncrono e tentativa de tratar a negação após a resposta já enviada. A matriz
foi pausada antes do tablet; nenhum lote da baseline havia começado. Esse
candidato permanece histórico, sem aprovação final.

A primeira hipótese de negação em `ASYNC` normal foi descartada: o teste com
as cadeias reais passou antes da alteração. O stack e a reprodução identificaram
`ERROR`/`INCLUDE` da página interna `/error`, com resposta SSE já enviada. Usar
um controlador de erro vazio escondia uma segunda falha: o `BasicErrorController`
real tentava escrever um Map no stream, gerando erro de conversão. Esse resultado
superficial foi recusado após leitura dos logs.

A correção final usa um filtro técnico restrito ao destino/origem dos dois
streams, `GET`, exceção interna, resposta já enviada e desconexão reconhecida.
Encerra esse fluxo sem outra escrita. O controlador de erro real continua
recebendo falhas genuínas; acessos diretos, rotas desconhecidas e `ASYNC` normal
mantêm as regras anteriores. **25 testes direcionados passaram**, incluindo
as duas audiências, `ERROR`/`INCLUDE`, negativos de origem/alvo/método/atributos
e erro 500 legítimo. A revisão independente de escopo não encontrou bloqueador.

## Sexto candidato — validação integrada em execução

SHA-256 `6a244a5d6bfebe3db41d87f2a6d7591aabf5dada7b0e0186c8a8a38714201bfd`.
Regressão completa: **347 testes/49 XML**, sem falhas, erros ou skips.
Frontend idêntico ao build congelado e manifesto de **378 fontes/configurações**.
O filtro/matcher de erro interno são infraestrutura compartilhada; organização
por domínio e contratos de negócio permanecem preservados.

Após 25 pares novos aprovados, a leitura privada da identidade do processo
recusou o runtime antes de iniciar a baseline: a consulta combinada do `ps`
truncava o executável no macOS, e o `lsof` incluía campos de descritor além do
PID. O runner passou a consultar os campos separadamente e validar os descritores
numéricos. Quatorze testes dessa guarda e uma leitura do processo real passaram;
com os testes de retomada/consolidação, são 41 verificações sintéticas dos gates
finais. Aplicação, JAR, PID e banco permaneceram inalterados. A retomada reconferiu
os 25 relatórios do mesmo candidato; a espera por quota foi preservada.

A primeira baseline desse artefato aprovou cinco lotes (28 pares); o lote de
catálogo teve nove resultados positivos e uma falha, portanto não foi aprovado.
S02-UI03 entrou na espera de paginação antes de terminar a carga dos componentes.
A captura da falha já mostrava o produto recém-criado em uma lista de página única,
sem botão de próxima página. O harness agora aguarda o produto ou uma próxima
página disponível, mantendo seleção, quantidade de opções e demais assertivas.
Tipos e formatação passaram; aplicativo, JAR e PID permaneceram inalterados.

A tentativa reprovada foi preservada integralmente. Todos os 295 pares da
baseline serão reexecutados em `integrado-06-baseline-02`; nenhum resultado da
primeira baseline será somado. Os 55 pares novos usam `integrado-06`, com fonte
de teste inalterada. O gate cruza os dois conjuntos pelo mesmo hash/PID e
registra separadamente o identificador da tentativa da baseline.

## Ajustes do harness no sexto candidato

A segunda tentativa da baseline aprovou os 59 pares desktop e quatro da
fundação mobile. No lote PWA mobile, as assertivas terminaram, mas a limpeza do
servidor controlado excedeu o prazo. A reprodução isolada demonstrou uma conexão
TCP aceita sem requisição HTTP mantendo `server.close()` aberto no Node 26.
O harness agora interrompe novas conexões, encerra os sockets desse servidor e
aguarda seu fechamento. As verificações de atualização/consentimento permanecem.
Tipos e formatação passaram; o código da aplicação não mudou.

A retomada `integrado-06-baseline-03` seleciona 61 pares íntegros da segunda
tentativa por recibos com hashes e executa os outros 234. Toda a família PWA,
inclusive seus dois pares desktop anteriormente positivos, será reexecutada.
Os relatórios originais permanecem intactos. Os gates revalidam fonte dos testes,
fixtures, relatórios, mesmo JAR/PID e ausência de duplicatas em cada retomada e na
consolidação. A transição do runner foi revisada; 54 testes sintéticos dos gates
passaram. Esses testes privados não são somados aos 347 testes da aplicação.

Os primeiros 46 pares novos passaram. A captura de comanda no Firefox foi
considerada insuficiente por enquadramento, apesar das assertivas funcionais
positivas. S03-UI02 foi reexecutado com captura dirigida ao resumo da comanda;
a nova imagem legível foi revisada, preservando a anterior como insuficiente.

S03-UI03 no WebKit não produziu a perda de resposta simulada: o pedido recebeu
200 e foi confirmado na tela. O diagnóstico seguro demonstrou que a requisição
sob Service Worker não passou por `page.route`. O cenário agora bloqueia o
worker somente nesse teste e exige uma única interceptação, POST real 200 e
abort concluído antes de verificar a intenção incerta. As provas PWA permanecem
com seu worker. Os cinco projetos desse cenário serão reexecutados com o harness
corrigido; a falha original não é aprovação nem retry automático.

A revisão independente dos quinze entregáveis/critérios encontrou uma lacuna
pontual de evidência: o cancelamento de pedido de outro participante da mesma
comanda não estava explicitamente exercitado. S03-UI02 foi ampliado para criar
uma segunda sessão de participante, conferir a mesma comanda e identidades
distintas, exigir 404 no cancelamento alheio e verificar que estado, versão e
marco de preparo do pedido permanecem intactos. O fluxo de cancelamento legítimo
continua depois dessa negativa. Somente o teste mudou; os cinco projetos serão
reexecutados antes da consolidação.

O guard de retomada dos 55 pares ganhou seis testes privados: seleciona a última
tentativa íntegra por par e recusa a última tentativa reprovada/incompleta até
reexecução manual. Tentativas antigas continuam registradas com seus hashes;
nenhum retry automático foi habilitado.

A terceira tentativa da baseline parou no catálogo Firefox após 205 pares
aprovados em outros lotes. S02-UI03 mediu um seletor de 48 px como
47,99993896484375 px: diferença geométrica de aproximadamente 0,000061 px, com
mínimo CSS de 48 px. A comparação exata foi substituída por conferência do
mínimo CSS e tolerância geométrica máxima de 0,001 px. Um alvo de 47,99 px
continua reprovado. O aplicativo e seu artefato não mudaram; todos os cinco
lotes de catálogo serão reexecutados, sem aproveitar seus resultados antigos.

S03-UI11 no WebKit identificou a mesma fronteira do Service Worker: a
interceptação estava configurada, porém nenhum abort foi executado, o SSE
recebeu 200 e a tela já indicava conexão em tempo real. A comparação que exigia
polling recusou esse resultado. O cenário passou a bloquear o worker somente
nessa prova, exigir abort efetivo e conexão indisponível antes do aceite, e
preservar a atualização por polling real e a reconexão posterior ao SSE.
Os cinco projetos desse cenário serão reexecutados; a prova PWA permanece
independente e usa o worker real.

A retomada `integrado-06-baseline-04` vincula diretamente os relatórios originais
válidos de `baseline-02` e `baseline-03`: 41 lotes/175 pares, sem duplicatas,
mais 24 lotes/120 pares a executar. Todos os 50 pares de catálogo estão entre
as reexecuções. A política antiga foi preservada; a nova verifica fontes,
recibos ancestrais explícitos, conteúdo dos relatórios, JAR e processo. A revisão
independente e 66 testes privados dos gates passaram. Não há aprovação implícita
de relatório reprovado, parcial ou pertencente a família cujo teste mudou.
As seis contas de verificação já consumidas foram preservadas; não houve reset
de dados ou quotas para tornar a suíte artificialmente verde.

## Encerramento do sexto candidato sem aprovação integral

Os 55 pares novos passaram, incluindo reexecuções completas de UI02, UI03 e
UI11 nos cinco projetos, e 30 capturas das novas telas foram inspecionadas.
A quarta baseline teve 225 pares aprovados em lotes íntegros e parou em
S01-UI26 Firefox. O segundo clique de consulta ocorreu durante deslocamento
da viewport após foco no alerta; nenhuma GET foi emitida. O timeout final foi
registrado no cleanup e não significava lentidão dessa GET no servidor.
Uma única reprodução diagnóstica passou com eventos DOM de click/submit válidos;
isso não converteu a falha original em aprovação. O harness agora valida o UUID
pela regra nativa, foca o botão, confirma o foco e pressiona Enter, mantendo
GET 200 e a mensagem de consulta. A instrumentação diagnóstica foi removida.

A revisão também identificou uma frase obsoleta na área SaaS dizendo que
pedidos não estavam implementados. A alteração textual explica que suspensão
bloqueia novas vendas e preserva consulta/resolução das operações existentes.
Por alterar a aplicação, será composto um sétimo candidato e as duas matrizes
serão reexecutadas integralmente, sem transferir aprovação do sexto. As 501
entradas não estáticas do backend foram arquivadas para comparação byte a byte.
A evidência dos 347 testes continua vinculada a esses bytes, sem declarar uma
nova execução Maven de testes para a mudança textual.

A primeira invocação do wrapper diagnóstico encontrou zero testes por filtro
de título incorreto. O filtro foi corrigido antes da única execução efetiva;
nenhum resultado vazio foi tratado como aprovado.

## Sétimo candidato — histórico da execução

SHA-256 `2c11a135df8276adc25308d05a594f77c2cb81f5493e7514e0bd85bd1dc6deea`.
As 501 entradas não estáticas do JAR são byte a byte idênticas ao backend dos
347 testes/49 XML. O único arquivo de aplicação alterado desde o candidato
anterior é `plataforma.component.ts`, na frase descrita acima. Manifesto de
378 fontes/configurações. Novo frontend `main-XU3R75C3.js`, PWA
`2f07496d5bb8bc7c1aea`, 449,70 kB iniciais, sem avisos. Formatação, tipos,
18 probes de lógica e nove combinações de templates passaram novamente.
O primeiro build foi abortado pelo processo no sandbox (exit 134), sem diagnóstico
de compilação; a execução local escalada passou. Ambos os logs foram preservados.

Dez contas inéditas foram criadas em transação para a nova matriz de
verificação de e-mail; contas, fixtures e quotas anteriores foram preservadas.
As matrizes `integrado-07` serão executadas integralmente: 55 pares de pedidos
e 295 de regressão, sem reaproveitar relatórios anteriores. A revisão confirmou
que podem rodar em paralelo, cada runner serial com um worker: tenants, quotas
e diretórios de relatório são separados; estado empresarial aponta à empresa
da baseline, e o cenário de provisionamento não executa worker de migração.
Ambos devem manter o mesmo JAR/PID; falhas ou timeouts não são dispensados pelo
paralelismo. Nenhum build, reinício ou alteração de fixture ocorre durante a matriz.

Durante a matriz07, o Hikari registrou um aviso de relógio regressivo
(`housekeeper delta=29s683ms`) e reciclagem de conexões. Não houve ERROR da API;
o aviso é preservado e não foi atribuído como causa das falhas abaixo.

S03-UI02 WebKit parou com a solicitação de ajuda ainda aberta. O trace mostrou
que o clique ocorreu enquanto a solicitação de conta chegava por SSE e era
inserida acima da ajuda, deslocando o botão; nenhum POST de atendimento foi
enviado. O harness passa a aguardar ambos os cartões antes do loop e vincular
cada clique ao POST 200, mantendo a verificação ATENDIDA. A aplicação não mudou.
Os cinco projetos dessa jornada serão reexecutados.

O catálogo WebKit reprovou três cenários na asserção adicional de `min-height`
computado: o controle nativo retornava 18 px, apesar da altura visual de 48 px.
O probe estático confirmou altura CSS e caixa real de 48 px, apesar do mínimo
nativo de 18 px; o controle negativo com caixa de 18 px continuou reprovado.
O harness aceita altura ou mínimo CSS de 48 px e conserva a medição real com
tolerância máxima de 0,001 px. Tipos e formatação passaram. Nenhum resultado
do lote reprovado foi aprovado. A retomada `integrado-07-baseline-02` vincula
diretamente 53 lotes/224 pares íntegros do07 e executa os 12 lotes/71 pares
restantes, incluindo todo o catálogo. Os relatórios reprovados permanecem
disponíveis, sem duplicação de cobertura nem alteração do JAR/PID.

A auditoria completa dos textos encontrou avisos legados sobre disponibilidade
de pedidos, inativação e envio do carrinho. Um patch somente de textos permanece
privado durante a matriz07. Depois da matriz completa, esses textos e o literal
de etapa em `/api/v1/status` serão atualizados em outro pacote, com regressão
backend em cópia isolada do banco e revalidação dirigida de 30 pares. A evidência
separará os 350 pares do07 dos 30 pares do pacote textual, sem somá-los como uma
matriz única nem transferir aprovação entre hashes.

## Matriz completa do sétimo candidato

A consolidação `consolidation-final-integrado-07.json` aprovou **350 pares
únicos**, sendo 55 novos e 295 de regressão, no SHA
`2c11a135df8276adc25308d05a594f77c2cb81f5493e7514e0bd85bd1dc6deea`
e PID 39517. Seleção final sem falhas, skips, retries ou flaky; falhas originais
e reexecuções permanecem registradas. A baseline final é
`integrado-07-baseline-02`, com 224 pares vinculados por recibos à primeira
execução e 71 executados novamente. Quotas foram aguardadas, nunca redefinidas.
Fontes, relatórios originais, recibos e identidade do runtime foram reconferidos.

A inspeção visual desse candidato terminou com **30 capturas novas e 25 da
regressão**, usando as últimas tentativas aprovadas e os relatórios originais
referenciados pelos recibos. Sem bloqueadores de layout/foco nas áreas vistas.
Horários e permissões exigem rolagem extensa no móvel, e algumas capturas
mostram apenas parte do formulário/pedido; aparelhos físicos, zoom nativo e
tecnologia assistiva não foram aprovados. A revisão não aprova antecipadamente
os textos do pacote seguinte. API encerrada após a consolidação; JAR e manifesto
históricos foram arquivados e permanecem imutáveis.

## Pacote textual final — validação local concluída

Aplicados sete ajustes literais de interface: disponibilidade de catálogo e
pedidos, parâmetros de aceite, consulta pública, efeito da inativação, envio
explícito do carrinho e dois avisos que afirmavam incorretamente ausência de
pedido durante conexão perdida. O literal de etapa de `/api/v1/status` passa a
identificar a Sprint 3; o DTO e as regras de negócio permanecem iguais.
As asserções dirigidas verificam os textos e os resultados reais, inclusive
perda de resposta seguida de modo offline sem negar o commit já ocorrido.

Formatação, tipos, 18 grupos de lógica, nove probes de templates e novo build
Angular/PWA passaram. Bundle `main-CJUWWDAQ.js`, PWA `d55493c92760c54f75a0`,
449,96 kB iniciais, sem avisos. A revalidação será separada: seis cenários nos
cinco projetos (30 pares), mais reinício/deadlines no mesmo pacote final.
Não somar esses 30 aos 350 nem declarar que a matriz inteira rodou no novo hash.

A regressão backend completa usou **cópia física offline** do PostgreSQL
exclusivo. O original foi parado de forma limpa e preservado; cópia em
outro diretório, mesma porta/DB/roles exigidas pelos testes, com hashes de todos
os arquivos antes/depois e socket próprio. O primeiro preflight bloqueou antes
de qualquer parada por rejeitar os 14 parâmetros padrão do initdb. Esses valores
foram revisados e admitidos exatamente, mantendo paths/includes/comandos
externos recusados; nove testes das guardas passaram. A cópia foi iniciada e
seu alvo conferido antes do Maven. O comando `clean verify` executou novamente
**347 testes/49 XML, zero falhas, erros ou skips**. A cópia foi encerrada e o
original foi religado após conferir sua integridade, antes dos navegadores.

O JAR final tem SHA-256
`e828ec28de90d6fdbc4a302fa4df53296d49df00cc12b09e5cba35d0c67344c7`.
Das 501 entradas não estáticas, somente a classe `StatusController` difere
do07, pelo literal de etapa. As outras 500 permanecem idênticas. O manifesto
final contém 378 fontes/configurações; no código da aplicação, a diferença
é limitada aos cinco arquivos TypeScript com sete textos e a esse controller.
O frontend empacotado corresponde byte a byte ao build descrito acima.
Manifesto e relatórios do07 foram preservados, sem sobrescrita.

O primeiro ensaio de recuperação08 foi invalidado: a API foi parada depois
do prazo, portanto o resultado não provava vencimento durante indisponibilidade.
O guard passou a exigir o timestamp de término do processo anterior ao prazo,
além da identidade do processo e do JAR. Na reexecução `final08b`, a sequência
preparar/parar/aguardar/reiniciar/verificar foi automatizada no mesmo comando.
O processo terminou antes do vencimento e o reinício usou o mesmo SHA final.
A recuperação passou com um alerta, uma expiração, dois ajustes, saldo zerado,
nenhum job restante e replay sem duplicação. A tentativa inválida permanece
arquivada e não integra a aprovação.

Os **30 pares dirigidos passaram no pacote final08**, em uma tentativa por par,
sem falhas, erros globais, skips, retries ou flaky. São S00-API01, S01-UI04,
S01-UI05, S02-UI02, S03-UI03 e S03-UI11 nos cinco projetos: Chromium desktop
(1280×900), mobile (360×800), tablet (768×1024), Firefox desktop e WebKit desktop.
API e PostgreSQL reais, um worker, mesmo JAR/PID 68905 durante toda a execução;
fontes, harness, configuração, fixtures e identidade conferidos antes/depois.
Quotas não foram redefinidas. O runner reconferiu também os 350 relatórios
históricos do07 como pré-condição, sem incorporar seus resultados na aprovação08.
O log da API dessa execução terminou sem WARN/ERROR; o aviso Hikari histórico
do07 continua registrado acima.

O consolidado final é `revalidation-integrado-08/consolidation.json`; os testes
S03 também preservam os relatórios em `e2e55-results/integrado-08`. A evidência
de 350 pares pertence ao07 e a de 30 pares ao08. Não constituem 380 cenários
distintos nem uma execução completa de 350 pares no hash final. A revalidação
dirigida é proporcional ao delta literal, com nova regressão backend completa
e novo ensaio de reinício no mesmo JAR final.

## Encerramento local

As 30 capturas focais do08 foram abertas e inspecionadas, com seis por projeto
nos 20 casos visuais. Textos legíveis, sem cortes ou sobreposição nas áreas
vistas; a frase “Resumo confirmado” foi conferida pela asserção E2E e pela fonte
congelada, sem captura focal própria. Imagens, registros, resultados, plano e
consolidação possuem hashes verificados. Essa inspeção complementa as 55
capturas do07; não aprova dispositivos físicos ou tecnologia assistiva.

O ensaio de recuperação e os 30 pares dirigidos usam o mesmo SHA final.
API PID 68905 e PostgreSQL próprio foram encerrados após os testes; portas
8089/55432 sem listener. Banco original, cópia isolada e evidências privadas
foram preservados. `local-cleanup08.json` registra o encerramento. A branch
permanece local, sem commit/push. Falhas originais e reexecuções foram mantidas,
sem somar tentativas nem tratar skips/instabilidade como aprovação.

Conferências finais: 651 arquivos, links locais e 20 âncoras válidos; três
contratos OpenAPI com 46 rotas e 162 referências resolvidas, incluindo três
entre arquivos. `git diff --check` aprovado. O scanner de 118 valores privados
conhecidos não encontrou correspondências nos 651 arquivos nem nas 311 entradas
da aplicação no JAR. A auditoria independente reconferiu os 30 relatórios finais,
378 fontes e 65 insumos congelados, preservando separado o gate dos 350 pares.

## Pendências externas

Linux/Hermes, homologação do release, S01-UI29/UI31 com worker/gates reais,
50 smokes, restore, dispositivos físicos/PWA, tecnologia assistiva e piloto
continuam pendentes. Não houve deploy, merge nem alteração de produção.

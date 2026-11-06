# Revisão de qualidade antes da Sprint 2 — 2026-11-06

[Índice](../README.md) · [Sprint 1](../15_SPRINT_01.md) · [Checkpoint](../25_EXECUTION_STATUS.md)

**Situação:** revisão local concluída e publicada no [PR #4](https://github.com/victormontibeller/restaurant-manager/pull/4); Linux e homologação permanecem pendentes.

## Escopo e base

Atualizar o checkout Mac e revisar as implementações das Sprints 0 e 1 quanto a
correção, segurança, reutilização e simplicidade. Não iniciar catálogo/PWA nem
alterar o ambiente do Hermes.

- Remoto consultado: `origin/main`, `b50b9d15eeb1683cf73e7ba9fcf3c1ebed3de3ea`.
- [PR #3](https://github.com/victormontibeller/restaurant-manager/pull/3) confirmado
  como integrado pelo proprietário em 2026-11-06 às 11:17 (Brasília).
- `main` local sincronizada por fast-forward; trabalho em `codex/revisao-pre-sprint-02`.
  A antiga branch de documentação foi preservada.
- Correções locais ainda não constituem um release publicado/homologado. As
  evidências históricas do candidato `95d278e` não foram atribuídas a este código.

## Achados corrigidos

| Prioridade | Problema reproduzido ou demonstrado | Correção e regressão |
| --- | --- | --- |
| P2 | Provisionamento aceitava senha formada apenas por espaços; o Administrador criado não conseguia entrar porque o login rejeita senha em branco. | `PoliticaSenha` compartilhada por provisionamento, cadastro, convite e recuperação. Testes de espaços Unicode, limites UTF-8, senha válida com espaços e API sem persistência parcial. |
| P2 | CLI permitia registrar o domínio reservado SaaS como empresa; o filtro da plataforma passaria a negar todas as suas rotas. | `DominioPlataforma` aplicado no HTTP, reserva, retomada e worker; `RM_PLATFORM_HOST` preservado nas allowlists. Despacho hml recusa configuração divergente. Testes de ausência de reserva/schema e bloqueio antes de ativar. |
| P2 | Login/refresh empresarial interpretavam erro HTML como JSON e podiam mostrar erro técnico ou mensagem interna 5xx. | Reutilização do tratamento seguro de erros já existente no serviço; probe reproduziu a falha e passou após a correção. |
| P2 | Intenção de convite sobrevivia ao logout, mas o aviso de saída era destruído com o componente; fechar a página perdia o UUID sem aviso. | Guarda movida para o serviço que mantém as intenções. Probes de contas distintas, reconciliação e destruição real do componente. O aviso continua sujeito ao comportamento do navegador; não é persistência após fechamento. |
| P2 | Senha de reautenticação de unidades não estava associada à mensagem de credencial inválida. | `aria-invalid`/`aria-describedby` seguem o código e status do erro, como nos outros formulários; verificação dos templates reais nos três motores. |

## Qualidade e simplicidade

A revisão manteve Controller → Service → Repository e a autorização efetiva no
backend. Foram examinados tenancy/conexões, separação owner/runtime, sessões,
replay/revogação, último Administrador, versões, idempotência, eventos e
recuperação de operações incertas. Não surgiu motivo para reestruturar o
monólito nem introduzir uma camada CRUD genérica antes da Sprint 2.

As novas abstrações são pequenas regras que já tinham mais de um consumidor.
Não foram alteradas migrations, contratos públicos, versões de dependências,
política de transações ou funcionalidades das sprints seguintes.

Os oito probes de lógica frontend passaram a ter uma lista única, usada pelo
CI e pelo build de release. Isso inclui a verificação de configuração de eventos,
antes ausente do CI. O workflow também aceita branches `codex/**`. O runner de
templates só configura bibliotecas Linux quando executado no Linux.

Atributos Git agora preservam os bytes CRLF do wrapper Windows oficial que já
estavam no repositório. Seu conteúdo permaneceu idêntico; foi removida a situação
em que um checkout recém-atualizado aparecia modificado e impedia o gate de build.
Documentos de estado foram conciliados com o merge efetivamente observado.

## Verificações desta revisão

Ambiente adicional: macOS, Java 21.0.9, Node 26.0.0, Python 3.14.7 e PostgreSQL
18.4 instalado previamente. Cluster novo e exclusivo em `127.0.0.1:55432`,
`rm_test`, roles `rm_test_owner`/`rm_test_app` distintas. Nenhum banco de outro
projeto foi utilizado. PostgreSQL 16 continua a referência homologada no Linux.

| Verificação | Resultado |
| --- | --- |
| TypeScript da aplicação e E2E | Aprovado |
| Build Angular | Aprovado; bundle inicial 225,56 kB, estimativa transferida 55,39 kB |
| Backend `mvnw verify` | 186 testes em 27 suítes; zero falha, erro ou skip |
| Probes de lógica frontend | Oito scripts aprovados; transporte/DOM fictícios explicitados |
| Templates Angular reais | Seletores, campos, foco, erros e intenção pendente aprovados em Chromium, Firefox e WebKit; API fictícia, não E2E |
| Auditoria npm | Nenhuma vulnerabilidade reportada |
| Auditoria OSV do JAR | 94 bibliotecas consultadas; nenhum achado |
| Scripts operacionais Python | 161 testes executados; suíte não aprovada no Mac, com 15 erros relacionados a `/proc` Linux (inclui subcasos) |
| Três regressões Python de configuração de domínio | Aprovadas |
| Links locais, padrões de segredo e diff | Aprovados, incluindo as 12 referências com âncora nos documentos alterados; scanner não substitui auditoria completa de segurança |
| Matriz E2E local | 225 pares únicos cenário/projeto aprovados no mesmo JAR, após correções/reexecuções descritas abaixo; não inclui gates Linux/homologação |

A consolidação seleciona a última execução explícita de cada par cenário/projeto,
sem somar duplicatas. Cada resultado selecionado contém uma execução aprovada,
zero retry, skip ou flaky. As tentativas anteriores falhas permanecem registradas;
nenhuma rodada inicialmente falha foi reclassificada como aprovada.

| Família | Pares aprovados | Execução privada |
| --- | ---: | --- |
| Fundação | 20 | `results-r2-foundation` |
| Identidade e acessos | 45 | `results-r4-identidade` |
| Recuperação | 15 | `results-r4-recuperacao` |
| Verificação | 15 | `results-r4-verificacao` |
| Cadastro | 20 | `results-r4-cadastro` |
| Convites | 20 | `results-r6-convites` |
| Eventos, perfis e vínculos | 55 | `results-r3-eventos`, `results-r5-eventos`, `results-r7-ui35-eventos`; por par único |
| Plataforma SaaS | 15 | `results-r4-plataforma` |
| Estado empresarial | 15 | `results-r4-estado-empresa` |
| Provisionamento local UI30 | 5 | `results-r4-provisionamento` |
| **Total local** | **225** | `e2e/consolidated-local-review.json` |

O JAR executado via HTTPS local tem SHA-256
`cbc4014086fb0c7a58ed244a34afe0dae9d9c865ffd761cecd1a951ff6c385bb`.
O manifesto privado final registra a base Git e os hashes de 243 fontes/configurações;
o empacotamento local não é um gate de release homologado.

As evidências brutas permanecem fora do Git em
`/private/tmp/restaurant-manager-review-db/`: log do backend, auditoria Java,
relatórios Playwright em `e2e/`, capturas e manifestos. Esse diretório também
contém fixtures privadas; não deve ser publicado ou copiado integralmente.

A primeira tentativa de instalação/build/testes teve restrições de sandbox;
as verificações pertinentes foram repetidas com acesso necessário. O primeiro
runner de lógica centralizado encontrou um caminho relativo em um probe; fixar
o diretório de execução na raiz resolveu a falha, sem alterar suas asserções.

A primeira matriz de fundação resultou em 19 aprovações e uma falha de foco no
WebKit/macOS. A diferença foi reproduzida em HTML mínimo e na aplicação: o
atalho nativo que inclui links é Option-Tab nessa configuração. O teste foi
ajustado somente nessa tecla/plataforma, preservando a expectativa de foco,
Enter, Tab seguinte e recuperação offline. Esse comportamento é documentado
pela [Apple](https://support.apple.com/en-euro/guide/safari/cpsh003/27.0/mac/27).
A execução original falha foi preservada; a reexecução completa da fundação passou nos 20 cenários, sem skip, retry ou flaky.

A primeira matriz de identidade resultou em 44 aprovações e uma falha no
UI06. O trace mostrou que o seletor de reautenticação preencheu o campo
`confirmar-senha` da tela anterior de acessos, antes de aparecer a tela de
unidades. Acrescentada espera pelo título da tela de destino antes do
preenchimento; sem alterar a aplicação, timeouts ou asserções de resultado.
A reexecução de identidade corrigiu o UI06, mas atingiu a quota real após repetir
a suíte sobre a mesma massa: 37 aprovações e oito respostas 429. Consulta ao
schema fictício confirmou 108 tentativas e a janela de 15 minutos vigente.
O limitador não foi limpo nem ampliado; famílias isoladas de eventos/SaaS
foram executadas enquanto a janela expirava naturalmente. Esses resultados
não contam como uma matriz de identidade aprovada. A terceira execução completa,
após a expiração natural, aprovou os 45 cenários sem retry, skip ou flaky.

A família de eventos executou 50 combinações com sucesso e recebeu 429 nas
cinco finais, também por ultrapassar a quota de origem do seu schema dentro da
mesma janela. Após a expiração natural, quatro passaram e o UI35 revelou uma
diferença nativa de foco no WebKit/macOS. Reprodução mínima sem Angular confirmou
que o clique de `uncheck()` remove o foco; Espaço alterna o checkbox mantendo-o.
O teste de teclado agora usa Espaço e verifica estado/foco nas duas direções;
todas as verificações de API e os demais cliques foram preservados. O UI35 passou
nos cinco projetos. A composição final contém 55 pares únicos de eventos,
substituindo os resultados anteriores do UI35 pela execução corrigida.

Contas distintas por navegador não isolam uma quota por origem: isso é uma
limitação da organização da massa, não autorização para relaxar o serviço.
Para convites, foi provisionada uma empresa fictícia separada no mesmo banco
temporário, com o mesmo JAR. O alias `c4.localhost` da massa anterior e a referência
da sua reserva foram arquivados transacionalmente em outro domínio local, pois
o contrato da suíte exige esse alias. Contas, unidades, schemas e quotas originais
foram preservados e comparados por digest; constraints não foram alteradas.
Essa preparação privada não é uma funcionalidade de mudança de domínio.
Os 20 pares de convites passaram na primeira execução dessa massa isolada.

A inspeção visual amostral abrangeu 16 capturas de 360/768/1280 pixels, incluindo
shell/login, acessos e unidades. Não foram observados cortes, sobreposições ou
botões fora da área capturada. Recortes parciais e imagens estáticas não são
uma auditoria integral de acessibilidade; caminhos/hash/notas permanecem privados.

## Limites e passagem para a próxima sprint

- O usuário confirmou encerrar esta revisão no Mac e registrar os testes Linux pendentes.
- Os scripts de operação/deploy continuam destinados ao Linux/systemd. Não
  transformar erros de plataforma em skips aprovados nem ampliar guardas para
  criar um gate artificial no Mac.
- UI29 e UI31 dependem do worker de provisionamento Linux e de gates reais de
  build. Fixtures locais não substituem esses requisitos. São dez combinações
  de navegador pendentes nesta execução, não aprovações herdadas.
- Os 50 smokes do release integrado de homologação não foram executados nesta
  revisão e não foram somados às 225 combinações locais.
- Homologação integrada no Hermes não foi alterada nem revalidada nesta revisão.
  Correções precisam dos gates Linux e da matriz sobre o novo release antes de
  serem declaradas homologadas. Não houve envio externo, produção ou piloto.
- Sprint 2 permanece não iniciada. Suas premissas P05/P06/P12/P13 e critérios de
  catálogo, preços, combos, mídia e PWA continuam no plano próprio; esta revisão
  não os transforma em entregas.

## Encerramento e retomada

Revisão independente do diff de backend e scripts não encontrou novos bloqueadores
concretos. A base local está revisada dentro do escopo executado. Aplicação HTTPS
e cluster PostgreSQL temporários foram encerrados; evidências e banco fictício
foram preservados fora do checkout. Naquele encerramento, as alterações eram
locais na branch de revisão, sem commit, push, merge ou deploy pelo agente.

Próximo incremento: revisar/publicar estas correções pelo fluxo do projeto,
executar os gates Linux e a matriz integrada do novo release em homologação,
registrando falhas e reexecuções. Só então atribuir aceite de homologação às
correções. Para iniciar a Sprint 2, conferir também suas premissas e dependências
na [especificação](../16_SPRINT_02.md), sem presumir funcionalidades entregues.

## Legibilidade Angular e testes — incremento posterior

Em 2026-11-06, o usuário solicitou melhorar a leitura do frontend e dos testes,
preservando comportamento e a divisão por domínio. O snapshot anterior a este
incremento inclui todas as correções locais da revisão; não foi usado `HEAD`
como substituto desse estado ainda sem commit.

Foram expandidos imports, interfaces, declarações e métodos, com separação entre
responsabilidades. Os 12 templates e 11 estilos inline passaram a usar blocos
legíveis; atributos extensos ganharam linhas sem inserir espaços entre texto e
elementos. As pastas `identidade`, `acessos`, `unidades` e `plataforma` foram
preservadas. As jornadas mais longas de convites e vínculos receberam separação
entre preparação, execução, revogação e recuperação; asserções, tempos e ordem
não foram alterados.

O Prettier 3.9.10 foi fixado como dependência de desenvolvimento. O lockfile
adicionou somente esse pacote, sem atualizar/remover dependências existentes.
`format` e `format:check` usam a configuração da raiz; CI e build de release
verificam o mesmo padrão. As [convenções Angular](../10_CODING_STANDARDS.md#legibilidade-e-organização-angular)
registram a organização e o cuidado com strings/templates embutidos.

Dois probes dependiam da grafia compacta do fonte: um recortava a guarda da
fixture entre `const profiles=` e `const origin=`; outro extraía CSS por
`styles:` seguido imediatamente do delimitador. Ambos falharam após formatar
os fontes. As extrações passaram a aceitar whitespace, exigir ocorrência única
e, no primeiro caso, limites ordenados. Todos os negativos e as asserções
funcionais foram preservados, e os dois probes passaram após a correção.

| Verificação deste incremento | Resultado |
| --- | --- |
| `format:check` | Aprovado para o conjunto TypeScript/CJS configurado |
| Typecheck aplicação/E2E | Aprovado |
| Build Angular de produção | Aprovado; os quatro arquivos de saída são idênticos byte a byte ao snapshot anterior |
| Lógica frontend | Oito scripts aprovados |
| Templates reais Angular | Dois probes em cada um dos três motores: Chromium, Firefox e WebKit; seis combinações aprovadas com transporte fictício |
| Layout isolado de convites | Chromium aprovado em 360 px, sem transbordamento |
| Equivalência TypeScript/CJS | 58 arquivos equivalentes por AST; preservados operadores, imports de tipo, literais, ordem e demais campos semânticos inventariados. Os dois extratores intencionalmente alterados foram verificados separadamente |
| Equivalência de recursos inline | 12 ASTs Angular equivalentes, incluindo valores de texto/interpolação; 11 CSSs minificados idênticos |
| Controles da própria comparação | 12 mutações negativas TS e cinco Angular detectadas; não é prova geral de equivalência de programas |
| Lockfile/auditoria npm | Somente Prettier adicionado; nenhuma vulnerabilidade reportada na instalação |
| Documentação e shell | Links/âncoras locais, scanner de padrões de segredo, `git diff --check` e sintaxe do script de build aprovados |

A primeira tentativa de build no ambiente restrito encerrou com código 134,
sem diagnóstico detalhado. A execução nativa autorizada concluiu com sucesso;
não foi necessário alterar o código nem os limites do build. O artefato Java
não foi reconstruído, e backend/migrations não foram alterados neste incremento.
A suíte E2E integrada não foi reexecutada nesta etapa: além dos testes locais,
a igualdade byte a byte do frontend produzido e a comparação estrutural dos
cenários sustentam a preservação do comportamento. Os 186/225 resultados da
revisão anterior continuam identificados como execução anterior.

Evidências desta etapa em
`/private/tmp/restaurant-manager-legibilidade-jhzg9pwb/`: snapshot anterior,
`ast-comparison.json`, `inline-equivalence.json`, `build-equivalence.json`, provas
dos testes embutidos e capturas dos probes. JavaScript final:
`main-7EHWONZT.js`, SHA-256
`6c4dabe8904d7eb54028206e9c3f42ff79dddf647f5155ce73cea6285e0932a1`.

No encerramento desse incremento, as alterações ainda estavam sem commit/push. Não foram iniciados
runtime Java ou PostgreSQL nesta etapa. Linux/homologação permanecem pendentes
conforme a decisão do usuário. Sprint 2 permanece não iniciada.

## Publicação para revisão — 2026-11-06

Após autorização do usuário, as alterações foram commitadas em `367a5ef` e
enviadas para `origin/codex/revisao-pre-sprint-02`. O [PR #4](https://github.com/victormontibeller/restaurant-manager/pull/4)
foi aberto para revisão, com base em `main`, reunindo as correções funcionais e
a melhoria de legibilidade. Metadados e head foram conferidos no GitHub.
O [checkpoint](../25_EXECUTION_STATUS.md) registra a publicação e a retomada.

Scanner de links/segredos, diff preparado e `format:check` passaram antes do
commit. A CI deve ser conferida para o head exato do PR. Linux, UI29/UI31,
smokes e matriz integrada de homologação continuam pendentes; abrir o PR não
aprova esses critérios nem inicia a Sprint 2. Nenhum merge ou deploy realizado.

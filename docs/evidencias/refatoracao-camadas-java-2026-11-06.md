# Refatoração Java — camadas por domínio

**Estado:** refatoração e validação integrada local concluídas. A CI é vinculada
ao SHA publicado nos checks do PR; homologação permanece pendente.

## Escopo e identificação

Refatoração solicitada para todo o backend, na branch
`codex/sprint-02-catalogo-pwa`, para revisão no
[PR #5](https://github.com/victormontibeller/restaurant-manager/pull/5).
Base anterior `b8deed087671123316ad86fcb92d056cf97b24b3`; implementação
registrada em `062b344c7c6653d9783de288abd6bf7f7277e47b`.
Nenhum merge, deploy ou acesso Linux realizado.

Cada domínio possui as camadas necessárias em pacotes minúsculos. Controllers,
services, models, repositories e DTOs permanecem no domínio correspondente;
configurações, filtros, jobs, comandos, conversores, exceções e infraestrutura
têm destinos próprios. Carrinho continua sem persistência/repository.

DTOs públicos compartilhados foram extraídos para arquivos próprios. Entidades
usam campos privados, construtores JPA protegidos, leitores e operações explícitas.
Imports explícitos substituem nomes totalmente qualificados desnecessários.
JSON, validações, mensagens, SQL, transações, locks e proteção dos `toString()`
foram preservados; revisões independentes não encontraram regressão concreta.

Não há alteração de frontend, contratos HTTP, recursos ou migrations nesta
refatoração. O identificador de autenticação no JAR reconhece os caminhos
antigo e novo de `JwtConfiguration`, mantendo HTTPS obrigatório. A exceção
histórica de correção de login continua recusando a reorganização ampla.

## Artefato e ambiente

Candidato SHA-256:
`f4c942c7e79b01537d068acb0ec195e4d4b70e7f8cdbce5253fe8ce5b770fecb`.
macOS, Java 21.0.9, PostgreSQL 18.4 exclusivo `rm_test` em loopback:55432,
roles `rm_test_owner`/`rm_test_app` verificadas por SQL, Node 26.0.0 e navegadores
exclusivos do projeto. HTTPS local verificado com o certificado público do
PKCS12, sem desativar a verificação TLS do preflight.

Os 253 arquivos da aplicação estão registrados em manifesto. O JAR não contém
classes antigas dos 184 nomes mapeados, contém todos os destinos esperados e
preserva os bytes das 22 entradas de migrations. Shell Angular/PWA idêntico ao
build, cuja versão continua `40f5f3add2f77edd724f`.

Somente contas/mídias fictícias; e-mails capturados por tenant, sem envio externo.
Dez contas COZINHA novas foram criadas para repetir a verificação de e-mail
consumível. Contas existentes e quotas não foram redefinidas.

## Verificações locais

- Compilação integrada de aplicação e testes aprovada.
- Backend: `clean verify`, **262 testes/35 XML**, zero falha, erro ou skip.
- Frontend: formatação, typecheck, build/PWA, 13 probes e nove combinações de
  templates com transporte simulado aprovados novamente. Bundle inicial 358,29 kB.
- Guardas: cinco testes direcionados aprovados, incluindo JAR antigo/novo com
  HTTPS obrigatório e recusa da reorganização na exceção histórica de login.
- Python completo no Mac: 163 testes executados, zero falhas e **15 erros por
  ausência de `/proc`**. Não são testes aprovados nem ignorados; precisam da
  execução completa no Ubuntu da CI.
- Matriz de navegador: **295 pares únicos aprovados**, 59 cenários em cinco
  projetos, em 65 lotes. Zero falha, skip, retry ou flaky; relatórios e hashes
  reabertos na consolidação. Resultados anteriores não foram herdados.

| Família | Pares aprovados |
| --- | ---: |
| Fundação | 20 |
| PWA | 10 |
| Funcionamento | 10 |
| Catálogo/carrinho/mídia/perfis | 50 |
| Identidade | 45 |
| Eventos | 55 |
| Recuperação | 15 |
| Plataforma | 15 |
| Cadastro | 20 |
| Estado da empresa | 15 |
| Verificação de e-mail | 15 |
| Convites | 20 |
| Provisionamento UI30 | 5 |
| **Total** | **295** |

Chromium desktop/360/768, Firefox desktop e WebKit desktop têm 59 pares cada.
Inicialização Spring/JPA, autenticação/rotação JWT, permissões, isolamento,
concorrência, mídia e cálculo do carrinho foram revalidados pela suíte aplicável.

O runner usa um worker e zero retries, preserva os timeouts e interrompe diante
de falha/skip/flaky ou ausência de par. As quotas são consultadas por SELECT;
outros lotes elegíveis avançam enquanto uma janela está ocupada, ou a execução
aguarda a expiração real. Cinco pares PWA usam o shell real em servidor de
atualização controlado; 75 pares isolam injeção de falha de transporte conforme
a [estratégia de testes](../26_TEST_STRATEGY.md).

Os 253 fontes, o JAR e o PID permaneceram iguais durante toda a matriz. A
conferência final repetiu hash, identidade do processo, saúde HTTPS e captura
por tenant. Runtime e PostgreSQL temporários foram encerrados; portas 8089 e
55432 sem listener, com banco e evidências privadas preservados.

Foram abertas **80 capturas**, 16 por projeto: dez de catálogo/configurador/
carrinho, quatro de funcionamento e duas de PWA. Nenhuma regressão visual
identificada nas regiões capturadas. Permanece a limitação já registrada dos
selects nativos WebKit de aproximadamente 23 px; não comprova alvo de 48 px.
No mobile, seletores abreviam nomes longos, disponíveis na composição. Capturas
altas reduzidas e controles fora do viewport não equivalem a inspeção integral
em escala real; ações correspondentes foram exercitadas no E2E.

Diff, links e padrões de segredos foram conferidos. A busca por 41 valores
privados conhecidos em 505 arquivos do checkout e 217 entradas da aplicação no
JAR não encontrou correspondência. A CI de push e PR deve corresponder ao SHA
final publicado; links e resultado ficam na descrição e nos
[checks do PR #5](https://github.com/victormontibeller/restaurant-manager/pull/5/checks),
sem herdar aprovação do head anterior.

## Preparação, evidências e limites

A primeira rodada de 25 testes dos guardas usou temporário com ancestral não
confiável e encontrou quatro erros de caminho e uma restrição de socket do
sandbox. A reexecução direcionada no temporário privado correto passou; a
rodada completa nativa preserva os 15 erros de `/proc` acima. Asserções e
proteções de caminho não foram enfraquecidas.

Helpers de integração/preflight foram ajustados para caminhos absolutos,
certificado público local e subdiretório de captura por tenant antes da
confirmação do runtime. Os relatórios de preparação não representam aprovação
da aplicação. Logs originais, XML, mapas de nomes, manifesto, capturas e JSON
ficam no diretório privado rotulado `restaurant-manager-refactor`.

Linux/Hermes, UI29/UI31 com worker/gates reais, 50 smokes, restore e matriz do
novo release em homologação permanecem pendentes por orientação do proprietário.
Dispositivos físicos/PWA, tecnologia assistiva e piloto também não estão aprovados.
Resultados de CI no runner Ubuntu não substituem essas condições operacionais.

# Redesenho do frontend — 2026-11-08

## Entrega

Implementado e validado localmente na branch `codex/redesenho-frontend`, sobre
`14ca980` (PR #6 integrado). Demonstração atualizada em
[demo.localhost:8095](https://demo.localhost:8095), com dados fictícios, acessos e
certificado preservados. Não representa homologação Linux ou aprovação do piloto.

- Fonte da aplicação: `c991bd89eef693901a265f0940ea9830a1472430`.
- Correção final exclusiva do teste de upload: `a408cae`.
- JAR: `3df1f92ce34dd9cc1868a1fdc76252b980e5a4294ebf9c6ed3f909eb26fa9411`.
- Consolidação dos 360 pares: `7d1fd87308224eabe802bb92bc9d2cf340ff5e0f41df1e37981121e4ffe0e978`.
- Escopo efetivo: `mac-local`; Java 21.0.9, Node 26.0.0, Playwright 1.64.1 e
  PostgreSQL 18.4/Homebrew. Banco `rm_test` exclusivo; demonstração em `rm_dev`.

## Resultado implementado

Cliente, gestão e cozinha possuem rotas, layouts e navegação próprios. A raiz
abre o cardápio; gestão inicia em pedidos em andamento; cozinha oferece abas
Todas/Fila/Preparo/Prontos. Plataforma permanece separada. Links antigos de mesa
continuam funcionando.

Tema de bistrô contemporâneo, tokens centrais, fotografias ilustrativas, botões
e abas Spartan Brain 1.9.0, CDK/Router/Forms 22.2.4 e Tailwind 4.3.5. Controles
nativos usam a mesma fundação visual. Origem, licença e atualização estão no
[ADR 0003](../adr/0003-spartan-navegacao-por-area.md). Fontes do sistema e ícones
locais; nenhum CDN. Catálogo interno em `/design-system`.

Sessão, contexto, carrinho, rascunhos e intenções incertas permanecem em memória.
Formulários e operações pendentes protegem a saída; logout continua disponível.
Trocas de área/unidade/sessão encerram acompanhamento e descartam respostas
antigas. Cadastro, recuperação, verificação, convites, favoritos, combos,
atendimento assistido, cancelamentos e comandas preservados.

`GET /api/v1/restaurante` expõe somente o nome pelo domínio registrado. Filtros
operacionais e de cozinha são aplicados antes da paginação, preservando os
padrões de clientes antigos e os estados autorizados da cozinha. Contagens da
página não são apresentadas como totais globais. Fallback SPA é explícito, sem
capturar APIs ou arquivos inexistentes. Nenhuma migration ou contrato de escrita
foi alterado; pagamentos reais e novos indicadores financeiros ficaram fora.

## Validação final

| Verificação | Resultado |
| --- | --- |
| Backend completo com PostgreSQL real | 407 testes; zero falhas, erros e skips |
| Formatação e tipos | Aprovados, incluindo o ajuste final do teste |
| Lógica | 20 grupos; transporte fictício onde indicado pelos probes |
| Templates | 12 grupos em Chromium/Firefox/WebKit; JIT e API fictícia |
| Build Angular/PWA | 286,19 kB iniciais; limites 450/600 kB mantidos |
| npm audit | Zero achados |
| Matriz integrada de UI/API | 360 pares únicos; zero skips, retries e instabilidade na seleção final |
| Catálogo de componentes | 3 motores × 360/768/1280: teclado, painéis, toque 48 px e overflow |
| Demonstração publicada | 42 conferências de rotas/navegação/perfis e 30 verificações de smoke |
| Acessos existentes | 7 perfis autenticados, sem mudar credenciais |
| Revisão visual | 20 capturas efetivamente inspecionadas e aprovadas; uma prematura rejeitada e substituída |

Os bytes não estáticos do JAR imutável foram comparados com a compilação que
executou os 407 testes. As rodadas anteriores de 402 testes completos e 38 de
rotas são históricas e não são somadas à contagem final. Os 411 arquivos de
fonte/configuração da aplicação foram identificados por hash.

| Projeto de navegador | Pedidos/mesas/cozinha | Regressão | Total |
| --- | ---: | ---: | ---: |
| Chromium desktop, 1280 px | 13 | 59 | 72 |
| Chromium mobile, 360 px | 13 | 59 | 72 |
| Chromium tablet, 768 px | 13 | 59 | 72 |
| Firefox desktop | 13 | 59 | 72 |
| WebKit desktop | 13 | 59 | 72 |
| **Total** | **65** | **295** | **360** |

A matriz usou o mesmo JAR e PID 32335, um worker total, com esperas naturais de
quota e sem redefinir limites. Cobriu positivos e negativos por perfil/unidade,
isolamento, revogação, SSE/polling, envio incerto sem duplicação, cancelamentos,
combos, preparo parcial, mesas/comandas, paginação e fluxos de identidade.

Na demonstração, acesso direto e recarga de rotas, voltar/avançar preservando
unidade em memória, QR antigo, negativa de gestão ao cliente/cozinha e erros de
API/arquivos foram conferidos. Capturas finais das três áreas nas três larguras
aguardaram layout e consulta estáveis. A captura inicial vazia de gestão foi
rejeitada por ter ocorrido antes da renderização, preservada e substituída.

Chrome nativo com `main-Q6GR7OUG.js`: atualização consentida, zoom indicado de
200%, viewport/scrollWidth 896 px e diálogo clientWidth/scrollWidth 638 px. Escape
retornou foco ao acionador. Zoom restaurado a 100%, viewport/scrollWidth 1792 px.
O proprietário desbloqueou o Mac; não houve contorno do bloqueio.

Seis pares principais de texto/foco do tema tiveram contraste calculado entre
5,53:1 e 14,23:1, acima de 4,5:1. Isso não é auditoria universal WCAG ou prova de
leitor de tela. Os seletores nativos compactos mostram as opções completas ao abrir.

PWA enumera 33 arquivos públicos; APIs, mídia do catálogo, credenciais e escritas
ficam fora do cache. Offline não confirma operações. A atualização controlada
foi exercitada nos cinco projetos; a versão publicada foi atualizada também no
Chrome nativo por consentimento. CSP e erros de recursos permaneceram preservados.

Comandos-base executados: `backend/mvnw -B -ntp -f backend/pom.xml verify`,
`npm run format:check`, `npm run typecheck`, `npm run test:logic`,
`npm run test:templates`, `npm run build`, `npm audit --audit-level=moderate` e
Playwright por projeto/família com `--workers=1 --retries=0 --max-failures=1`.
O scanner de repositório e a verificação de diff/links completam a entrega documental.

## Falhas e reexecuções preservadas

| Achado | Correção e comprovação |
| --- | --- |
| Gestão vazia por snapshot filho ainda não ativado | Leitura da árvore de snapshots; regressão de ativação e matriz final |
| Skiplink recarregando a aplicação | Foco no conteúdo da rota atual, sem recarga; verificação por teclado |
| Saída da cozinha com contraste inadequado | Ícone/ação ajustados; capturas finais e jornadas por perfil |
| Aviso offline sobrepondo controles móveis | Aviso no fluxo e área segura; PWA móvel e matriz final |
| Diálogo retornando foco ao body | Acionador capturado antes de desabilitar/carregar; probes nos três motores e Chrome nativo |
| Carrinho ainda não renderizado no harness | Espera de diálogo fechado e botão anexado, incluindo ocultos por CSS; `e1c0a32` e 65 pares finais |
| Etapas de cozinha ainda apenas em seletor | Abas Brain/CDK completadas em `c991bd8`; catálogo interno e S03-UI01 nos cinco projetos |
| Harness de upload buscando menu durante logout | Espera de URL e remoção do layout; respeito ao retorno protegido do editor em `a408cae` |

O primeiro probe de upload corrigiu a espera, mas tentou sair para Minha conta
quando a aplicação já havia retomado corretamente o editor com upload incerto.
A proteção impediu essa saída. O teste passou a aguardar e verificar o editor
preservado; S02-UI05 aprovou os cinco projetos. Falhas, traces e probes
intermediários continuam arquivados; não foram convertidos em aprovação.

O JAR e seu processo não mudaram nessa correção exclusiva do teste. Toda a família
de catálogo foi invalidada e repetida na baseline `redesenho-06-baseline-02`.
Outros 77 pares, em 17 lotes íntegros do mesmo JAR/PID, foram vinculados por
recibos que reabrem os resultados originais. Os 21 pedidos já concluídos
continuaram com os mesmos specs/helpers e plano. Nenhuma aprovação de outro
candidato foi usada.

A primeira retomada foi recusada antes de executar testes. A transição posterior
aceita somente a origem explícita `redesenho-06`, com snapshots e comparação de
seis arquivos de harness. Alterações adicionais simuladas em helper e PID foram
recusadas. Revisão auditada:
`6c43c9fc70f2c4e66aace4ce620878b6d3adf0f2e6e02e84f40a82106e292f13`.
A consolidação final releu todos os relatórios e recibos e confirmou 360 pares
únicos aprovados. Resultado parcial, bloqueado ou não executado não foi contado.

## Demonstração e reversão

O processo PostgreSQL compartilhado foi preservado. Cada atualização teve dump
consistente de `rm_dev` e cópia do JAR/metadados/configuração anteriores. Há nova
cópia antes de acrescentar os exemplos finais. Não houve migração de dados;
a reversão do aplicativo usa esses arquivos, preservando acessos e certificado.
Não foi declarado um ensaio de restauração completo nesta entrega.

O smoke novo deixou duas retiradas fictícias PRONTAS e verificou negativas 403,
consulta de expedição e ausência de dados financeiros na cozinha, sem pagamentos.
Foram acrescentados quatro exemplos, dois por unidade: fila e preparo parcial
com uma unidade pronta, uma em preparo e uma na fila. Dados anteriores mantidos.
Duas fotografias ilustrativas foram associadas aos produtos fictícios pela API.

Evidências privadas permanentes, incluindo JAR, relatórios originais, falhas,
recibos, capturas e `entrega.json`:
`/Users/mac/.local/share/restaurant-manager-manual/evidencias/redesenho-20261108-3df1f92ce34d`.
Credenciais permanecem somente no arquivo privado `ACESSOS.txt` do ambiente.
API de testes 32335 encerrada após a consolidação; 8089 liberada. Demonstração
8095 saudável após a parada; PostgreSQL preservado.

## Etapas externas pendentes

- Homologação Linux/Hermes, inclusive S01-UI29 e S01-UI31: não executada nesta rodada;
  não integra os 360 pares locais aprovados.
- Aparelhos físicos, instalação/comportamento PWA nesses aparelhos e leitores de tela:
  não executados; emulação e teclado nativo não os substituem.
- Provedores reais, pagamentos, produção e piloto: permanecem fora deste incremento.

Implementação local aprovada não equivale à prontidão completa de produção.

# Revisão final do PR #5

**Estado:** revisão, correções e validação integrada local concluídas. Publicação,
CI do head e integração são rastreáveis no PR #5. Linux/homologação permanecem
pendentes; merge autorizado pelo proprietário, sem deploy.

## Escopo

Revisão do [PR #5](https://github.com/victormontibeller/restaurant-manager/pull/5),
da base `19dff9d625d03cdba9d23bf023e88846743dec03` ao head inicial
`64ae6f088a143898fd176725151de9dad94579b6`. Foram conferidos o comportamento
da Sprint 2 e a refatoração Java, com revisão independente de catálogo/carrinho,
mídia/unidades, frontend/PWA e integração de identidade/plataforma/tenancy.
CI anterior e ausência de comentários pendentes foram verificadas; a aprovação
anterior não é transferida ao artefato corrigido.

Correções registradas em `219c2e38c266e401a10492d0218b3c3725da12f4`.

## Achados e correções

| Achado | Correção e prova |
| --- | --- |
| Recuperar uma gravação incerta de combo após novo login reabria o editor sem os componentes referenciados | Referências carregam antes de publicar o editor e limpar a pendência. Cinco casos de lógica cobrem salvo, criação não encontrada, falha/reconsulta, componente inativo e destruição. Regressão falhou antes e passou depois. |
| Normalização removia EXIF sem aplicar a orientação, girando fotos de celular | Oito orientações, incluindo espelhos, aplicadas diretamente ao bitmap final; sem bitmap intermediário de 12 milhões de pixels. Probe original `60×80` virava `80×60`; corrigido permanece `60×80` nos três motores. |
| Consulta de revisão do catálogo lia diretamente tabelas de unidades; jobs de identidade acessavam repository de tenancy | Versões de unidade passam por `FuncionamentoUnidadeService`; jobs usam `TenantService`. Formato da revisão, transações, paginação e contexto preservados. Dois testes verificam reconfirmação por alteração da unidade, outra filial e outro tenant. |
| Select nativo WebKit ignorava a altura mínima pretendida pelo CSS | Altura explícita de `3rem`, mantendo seta/aparência nativa. Probe passou de 23 para 48 px; três motores em 360/768/1280 px verificados. A jornada S02-UI03 mede os alvos reais. |

Revisão cruzada identificou que o primeiro parser PNG ainda poderia considerar
`eXIf` anexado após `IEND` ou com CRC inválido. Esses casos foram corrigidos;
as duas novas regressões falharam antes e passaram depois. Leitura TIFF limitada
ao IFD0, segmentos e offsets verificados, sem seguir conteúdo externo. A saída
continua sem metadados. Os 13 testes focados de normalização passaram.

Domínios e camadas permanecem separados, imports explícitos e DTOs próprios.
Não houve mudança de URL, JSON, mensagens, schema, migrations ou dependências.
As leituras preexistentes para autorização e bootstrap foram distinguidas das
consultas de negócio ad hoc; não foi ampliado o escopo desses fluxos.

## Validação e artefato

Build Angular/PWA, formatação, typecheck, 14 scripts de lógica e nove combinações
de templates aprovados. Cinco testes direcionados dos guardas de release
aprovados: caminhos antigo/novo de autenticação exigem HTTPS e a exceção
histórica de login continua rejeitando a reorganização ampla.
Além das fixtures dos testes, sete verificações negativas nos JARs reais
anterior/corrigido confirmaram HTTPS obrigatório, recusa como fundação e recusa
da substituição ampla pelas três variantes de guarda de frontend/login.

Backend: `clean verify` com PostgreSQL real, **271 testes/35 XML**, zero falha,
erro ou skip. Os 262 testes anteriores foram preservados; dois testes de
revisão da unidade e sete de normalização foram adicionados.

Candidato SHA-256:
`ca6b02130fb910e931b4efc110b7567e3f384299dde6b1d3d86f0cb87a1a476b`.
260 arquivos da aplicação/configuração conferidos sem alteração após o build;
22 entradas de migrations idênticas ao JAR anterior. Bundle inicial 358,75 kB;
PWA versão `b61cd676920d1026e893`.

**295 pares únicos aprovados**, 59 cenários em cada um dos cinco projetos,
em 65 lotes. Zero falha, skip, retry ou flaky; relatórios e hashes reabertos na
consolidação. Chromium desktop/360/768, Firefox e WebKit desktop têm 59 pares
cada. Cinco pares PWA usam atualização controlada com o shell real; 75 isolam
falha de transporte, conforme a [estratégia](../26_TEST_STRATEGY.md). APIs de
negócio, autorização e PostgreSQL são reais. Resultados anteriores não foram
herdados nem somados.

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

Os fontes, o JAR e o PID permaneceram iguais durante a matriz; conferência final
repetiu saúde HTTPS com certificado confiado, hash e identidade do processo.
Runtime e PostgreSQL temporários encerrados; portas 8089/55432 sem listener,
com banco, fixtures e relatórios privados preservados.

Foram abertas **50 capturas de catálogo**, dez por projeto, com manifesto de
caminhos/hashes. Selects altos e setas nativas confirmados no WebKit; sem nova
regressão visual nas regiões capturadas. Nomes longos abreviados nos selects
mobile continuam completos na composição. Elementos fora do viewport não são
aprovados pela captura; ações da jornada são cobertas pelo E2E. As imagens não
comprovam a recuperação de estado, verificada pelos cinco casos de lógica.

Diff, links/âncoras e padrões de segredos conferidos. Scanner de 51 valores
privados conhecidos em 509 arquivos do checkout e 219 entradas da aplicação no
JAR sem correspondências. A suíte Python completa não foi repetida no Mac nesta
revisão: os 15 erros de `/proc` da execução anterior permanecem documentados na
[evidência da refatoração](refatoracao-camadas-java-2026-11-06.md). Os resultados
Ubuntu e os links da CI de push/PR são associados ao SHA final na descrição e nos
[checks do PR #5](https://github.com/victormontibeller/restaurant-manager/pull/5/checks).

## Limites

Validação local no macOS, PostgreSQL exclusivo `rm_test` em loopback:55432,
roles de migração/runtime separadas e verificadas. Somente dados fictícios e
captura local de e-mail por tenant. Nenhuma cota foi redefinida para fazer a
matriz avançar; janelas reais foram respeitadas. Dez contas novas foram criadas
somente para repetir a verificação de e-mail consumível.

Linux/Hermes, matriz integrada de homologação, UI29/UI31 com worker/gates reais,
50 smokes, restore, aparelhos físicos/PWA, tecnologia assistiva e piloto
permanecem pendentes. CI Ubuntu não substitui essas condições operacionais.

As evidências originais, incluindo falhas e reexecuções, permanecem em diretórios
privados identificados como `restaurant-manager-final-review`,
`restaurant-manager-final-review-media` e `restaurant-manager-final-frontend-review`.

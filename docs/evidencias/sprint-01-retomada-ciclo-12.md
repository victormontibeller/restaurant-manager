# Sprint 01 — retomada ciclo 12

Missão não concluída; Sprint 01 aberta, Sprints 02–05 não iniciadas.

## Resultados observados

Build herdado `3cd4eeb` recolhido sem repetição: 173 testes backend, zero
falhas/erros/ignorados, gate aprovado. UI04/UI05 passaram nas dez combinações
(Chromium desktop/mobile/tablet, Firefox e WebKit), sem retry/skip/flaky.
Fonte dos testes `80c446a`, artefato `3cd4eeb`; não é matriz integrada completa.

O worker terminou com falha na etapa seguinte: inventário de rm_test esgotou
locks antes do clone. Homologação permaneceu na fundação `449ce3c`, saudável;
nenhum novo seed hml ou promoção ocorreu nessa execução.

## Correções e incremento

Inventário de manutenção passa a liberar locks de leitura por tabela mediante
savepoint/rollback, preservando a transação repeatable-read. Opt-in somente no
ensaio com escritores próprios parados e lock de publicação; backup concorrente
continua inalterado. Não aumenta configuração global, não reinicia PostgreSQL,
não elimina tabelas nem reduz os metadados comparados. Exige ausência de DDL
externo durante a manutenção; não protege contra outro administrador ignorando
esse protocolo.

Probe PostgreSQL real leu 2061 tabelas e 19140 linhas em aproximadamente 7,45s,
com snapshot idêntico antes/depois, sem mutações. Isso comprova a leitura corrigida,
não a repetição integral de clone/migration/retorno, que continua necessária.

Novo `scripts/hml_accounts.py` prepara cinco perfis operacionais e dois clientes
por convites/cadastro reais e captura local, exclusivamente no candidato hml
identificado. Confere artefato, ambiente do processo, OIDs e preservação do banco
original. Persiste intenções privadas antes das mutações; recusa saída existente
ou temporário residual, sem repetir resultado incerto. Faz read-back, negativos
administrativos/tenant/filial e logout. Não cria operador SaaS, não promove release
nem substitui E2E. A execução real depende da instalação/seed inicial ainda pendentes.

Duas revisões independentes somente leitura. Achados de persistência sem fsync,
temporário seguindo symlink e vínculo runtime/banco/hash foram corrigidos; os
primeiros dois tiveram vermelhos comportamentais. Seis testes do seed passaram;
regressão completa Python passou após correção do inventário. Renovação preventiva
usa refresh, sem consumir um login por convite. Nenhuma credencial foi publicada.

## Próximo passo

Reexecutar manutenção integral com o mesmo JAR aprovado e fonte de scripts
corrigida; recolher resultado antes de instalar candidato hml. Somente após os
gates, concluir seed inicial, executar o novo seed dos perfis e validar UI/API,
operador SaaS, matriz integrada e promoção. PR #3 permanece draft, sem merge.

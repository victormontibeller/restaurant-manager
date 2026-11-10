# Demonstração local atualizada — 2026-11-10

Atualização solicitada pelo proprietário após o merge da
[PR #11](https://github.com/victormontibeller/restaurant-manager/pull/11),
para iniciar testes manuais no Mac. A matriz completa permanece pendente,
conforme a decisão de encerramento da revisão.

## Versão, dados e recuperação

- Código integrado: `0040e01c88e1ac04c497345bb079fe22fca15a24`.
- Fonte do build reutilizado: `469f3a4f14915ffdc907e151146335556d9b79fc`.
  Os 524 arquivos do inventário de build coincidem com a aplicação integrada;
  as diferenças posteriores são documentais. Não houve recompilação nem
  transferência de aprovação de um artefato diferente.
- JAR publicado: SHA-256
  `681963ff3a43bde825cd31e66040661a7b8c630ccd690a1afce5b626ab6279e8`.
- Origem preservada: `https://demo.localhost:8095`, somente loopback.
  Banco `rm_dev` em `127.0.0.1:55432`; runtime `rm_dev_app`, sem credenciais
  de migração. O PostgreSQL compartilhado permaneceu em execução.
- A API e seus jobs foram encerrados antes do backup. Conferida a ausência de
  outros clientes de `rm_dev`, foram produzidos dump completo em formato custom
  e arquivo privado com o JAR anterior, configurações, certificados e capturas.
  O índice do dump foi lido com `pg_restore --list`; **restore não foi ensaiado**.
- Migrações aplicadas com owner dedicado: public V6 → V8; template e empresa
  da demonstração V21 → V28. Todas concluídas com sucesso.
- Comparação das colunas preexistentes de 106 tabelas, com a aplicação parada:
  104 idênticas e duas tabelas de permissões com as quatro inclusões previstas
  em cada tenant. Usuários, senhas e dados anteriores foram preservados.
- API anterior: PID 32641. Nova API: PID 37152, saudável em
  10/11/2026 às 19:37:45 BRT, com HTTPS validado pela CA privada existente.
  Identificadores de processo descrevem esta sessão, não configuração fixa.

O backup e os recibos ficam fora do checkout em
`~/.local/share/restaurant-manager-manual/backups/upgrade-20261110T223718Z/`.
`metadata.json` distingue o commit integrado do commit original do build;
`upgrade-latest.json` aponta para o recibo desta atualização. As contas e suas
senhas continuam no arquivo privado `ACESSOS.txt`, sem alteração ou publicação.

## Verificações dirigidas

O smoke de API e arquivos publicados aprovou **39 verificações**, sem criar
ou modificar pedidos, recebimentos, catálogo ou configurações de negócio:

- Login dos sete perfis e conferência de empresa/perfil.
- Duas unidades disponíveis, abertas, com nove produtos em cada catálogo.
- Consultas de Atendimento, Caixa, Cozinha, Expedição e Gerente nas duas
  unidades; histórico do Cliente e financeiro de pedidos existentes.
- Negativas de acesso: anônimo 401; Cliente sem configuração administrativa
  e Cozinha sem gestão de catálogo, ambos 403.
- Mercado Pago sem conexão configurada, com resposta 204 prevista no contrato.
- HTML, CSS, JavaScript, `manifest.webmanifest` e `sw.js` servidos com os mesmos
  bytes do JAR publicado, usando HTTPS validado.

Os recibos privados preservam duas correções do smoke, sem atribuí-las a falhas
da aplicação: a primeira asserção exigia objeto onde a integração desconectada
retorna 204; a segunda procurava `ngsw.json`, que não existe neste projeto.
As verificações correspondentes foram corrigidas/reexecutadas, mantendo os
resultados anteriores e os arquivos de cada tentativa.

A conferência dirigida usou Chromium 156.0.8078.4. Os sete perfis autenticaram
pela UI e chegaram às rotas esperadas. A primeira passagem permaneceu reprovada:
o interceptor do smoke bloqueou também a restauração técnica de sessão de mesa,
e o seletor da unidade impediu verificações adicionais de gestão. O registro
original foi preservado; os checks restantes desses perfis não foram aprovados.

Um complemento separado corrigiu somente o roteiro, permitindo a restauração
de sessão e usando o seletor real da unidade. Aprovou catálogo em 1280×900 e
360×800, um login adicional de Administrador, fila inicial, gestão do catálogo
e logout. As cinco capturas complementares foram inspecionadas, sem falhas
observadas nesse escopo. Não houve erros JavaScript, HTTP 5xx ou escritas
bloqueadas no complemento. Total: oito logins UI, sete perfis distintos.

O HTTPS do navegador foi conferido com CA/hostname e SPKI do certificado local,
sem desabilitar globalmente a validação TLS. O contexto automatizado bloqueou
service workers; portanto, a instalação e atualização efetivas da PWA não foram
validadas. A comparação de `sw.js` acima comprova somente os bytes publicados.
Resultados, roteiro e imagens ficam no subdiretório privado `ui-smoke/` do
backup. Esta verificação dirigida não é aprovação visual integral do release.

A conferência final do runtime aprovou 13 verificações: saúde HTTPS, JAR,
identidade/loopback dos processos, ausência de novos logs ERROR e preservação
de credenciais/certificados. Em `runtime.json`, somente `RM_RELEASE_SHA` mudou.
API PID 37152 e PostgreSQL PID 59175 foram deixados em execução.

## Uso e limites

A demonstração mantém dados fictícios, contas existentes e captura local de
e-mail. Pagamentos online dependem de configurar a integração; Mercado Pago
sandbox, e-mail externo, Linux e produção não foram ativados nesta atualização.

Para trocar uma aba antiga para a versão nova, usar a opção **Atualizar
aplicativo** quando aparecer **Nova versão disponível**, após salvar o trabalho
da aba. O aplicativo avisa que a atualização descarta formulários e carrinho
ainda não salvos. Nenhum dado do navegador do proprietário foi apagado.

O controle local continua em `~/.local/share/restaurant-manager-manual/control.py`
com `start`, `stop` e `status`. Não há inicialização automática após reiniciar o
Mac. O PostgreSQL compartilhado precisa permanecer ativo enquanto a demonstração
for utilizada.

Este smoke comprova disponibilidade e os casos executados. Não substitui a
matriz de 420 pares, as 56 capturas exigidas para aprovação integral, recuperação
financeira integrada, homologação Linux, dispositivos reais, aceite assistivo,
backup externo ou piloto. Consulte o [checkpoint](../25_EXECUTION_STATUS.md).

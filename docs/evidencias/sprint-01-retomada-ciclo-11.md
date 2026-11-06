# Sprint 01 — retomada ciclo 11

[Índice](../README.md) · [Checkpoint](../25_EXECUTION_STATUS.md) · [Cobertura](cobertura.md)

## Escopo e estado

Missão não concluída. Uma branch e PR #3 continuam em andamento/draft; nenhum
merge novo. A fundação permanece como último release validado. Sprint 01 não
foi encerrada e as Sprints 02–05 ainda não começaram.

## Manutenção de homologação executada de verdade

Fonte `50c3ce155813233bd2ba424587823a625b7a7571`, artefato
`e847fee91fa683fcb09315ea2b0bd8fc66e0be92`, hash
`7bd1db646ab2ddabe4a92facb133fb41cc2af85e85429b813223e3df3caa19dd`.

O procedimento parou o serviço próprio, confirmou ausência de conexões, preservou
o banco original bloqueado por OID, criou clone e comparou seu inventário.
Executou migrations Java reais, instalou e iniciou identidade por HTTPS loopback.
SHA/hash/PID, CA/IP, shell e health foram verificados. O deploy comum foi recusado
durante a manutenção pendente, sem mudar o candidato. `healthy.json` não foi
promovido por health.

O retorno inicial falhou antes de alterar o banco: o PostgreSQL serializou OIDs
como strings decimais, mas o novo carregador exigia inteiros. Teste reproduziu a
recusa; correção preserva a representação exata, sem editar o ledger ou adotar
OID pelo nome. O comando de retorno corrigido, fonte `3cd4eeb`, foi executado:
original OID 16392 restaurado, candidato OID 125325 preservado sem conexões,
inventário original/retornado integralmente igual. Foram cinco tabelas e três
linhas: a fundação hml ainda não possuía empresas/contas. Isso NÃO prova recuperação
de dados de identidade em hml; o ensaio anterior em rm_test cobre outro conjunto.

O baseline `449ce3ccf941c73b34ac15a4754183c147f91aaa` voltou a servir com o hash
original. Não houve DROP, down migration nem modificação dos OIDs registrados.
A tentativa inicial permanece reprovada no relatório; o retorno corrigido é uma
execução posterior, não um resultado artificialmente reescrito.

## Revisão, testes e CI

Duas revisões independentes somente leitura. Primeira apontou contorno pelo deploy
comum, processo não verificado após falha de retorno e exigência indevida de JAR
candidato íntegro para abandonar esse candidato. Casos reproduzidos e corrigidos;
segunda revisão não encontrou bloqueador concreto adicional antes do ensaio nativo.

Os testes iniciais do novo módulo falharam por import ausente. Os regressivos de
OID textual, processo não recolhido e modo do journal tiveram falhas comportamentais
reproduzidas; não confundir esses tipos de vermelho.

A CI de `3cd4eeb` falhou: journal criado com umask permissiva não passava pela guarda
0600 da retomada. Vermelho local com umask 022 confirmou 0644; gravação passou a
fixar 0600 no descritor antes de escrever, sem seguir symlink. Não foi afrouxada a
regra de privacidade. 99 testes Python passaram sob umask 022. CI de
`80c446ad25b4f7905066f7b0987653ca19431268` passou nos dois runs consultados.

O provisionador Java acrescenta opt-in hml explícito do operador privilegiado;
preserva guardas de destino, conexão efetiva e advisory lock. Três testes unitários
passaram após vermelho da admissão hml. Flag não é exportada ao HTTP e não aprova
manutenção por si. Build integrado local desse código ainda em execução neste
registro, sem resultado consolidado. O provisionamento hml real ainda não ocorreu.

## E2E herdado e correções

Worker herdado finalizou: S01-UI35 passou nos cinco projetos; identidade S01-UI01–09
teve 42 aprovações e três falhas, sem retry, skip ou flaky. Recontagem não soma
rodadas diferentes como aprovação integrada.

UI04 falhou em WebKit antes de concluir cargas após login. UI05 falhou em mobile
e Firefox porque a recarga ordenada retirou a unidade recém-criada da primeira
página; o snapshot confirmou página preenchida, não erro de persistência.
Testes agora aguardam respostas/corpos e percorrem paginação real para localizar
a unidade, sem excluir registros ou relaxar assertivas. Typecheck E2E passou.
A captura mobile de falha mostra formulário sem overflow visível nesse recorte;
não representa aprovação visual de tela completa ou de todos os navegadores.
Reexecução corrigida permanece pendente neste registro.

## Continuidade e limites

Atualização final observada às21:53:33Z: build3cd4eeb terminou21:53:28Z,
exit0/release_gate=true, hash
`1697a473d968c0246a0b83b23bbd192b7e7fddbc282f061d66cf5f08a6c9d744`.
Log confirmou BUILD SUCCESS, Maven16:42 e auditoria de94pacotes sem achados.
XML completo não recontado depois do aviso de orçamento; a contagem173 acima
refere-se à CI. Worker11 não foi interrompido; avanço/E2E/manutenção/seed depois
do build ainda não conferidos. Relatório privado é snapshot anterior,21:47Z.

Build durável de `3cd4eeb` iniciado após recolher o worker anterior e restaurar hml.
Clone imutável, PID/unidade/log/gate próprios; não será repetido para incorporar a
correção posterior somente de scripts. Worker finito com fonte `80c446a` aguarda
esse build e CI, executa UI04/UI05 nos cinco projetos, ensaia manutenção rm_test,
e somente depois tenta instalação hml e seed inicial de dois administradores
fictícios por CLI/API reais. Falha após instalar exige retorno ao original.
Nenhuma fase futura está aprovada por ter sido programada.

Esse worker não é outro coordenador, não faz merge/rebuild nem promove baseline.
Mesmo que conclua, faltam matriz integrada hml, demais perfis/clientes/SaaS,
revisão visual integral e promotor de identidade. X15 continua parcial: sem mídia,
backup externo ou reconciliação financeira. Cenários futuros T01–T28/X01–X15 não
foram reduzidos. Relatórios, credenciais e capturas ficam privados.

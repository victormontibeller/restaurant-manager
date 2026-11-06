# Sprint 01 — fechamento operacional, ciclo 35

[Checkpoint](../25_EXECUTION_STATUS.md) · [Sprint 01](../15_SPRINT_01.md) · [Handoff Mac](../27_HANDOFF_CODEX_MAC.md)

## Escopo e retomada

Em 2026-11-06, a missão vigente continua restrita à implementação/validação da
Sprint 01 e passagem para Codex/Mac. PR #3 aberto na branch
`hermes/sprint-01-identidade-acessos`; integração em `main` pelo proprietário.
Não iniciar Sprints 02–05 nem confundir esse encerramento com produto completo.

Git, CI do head `3a5d7a7`, serviço, bancos e locks foram reconciliados. Os cinco
documentos locais herdados foram preservados. A verificação dev foi executada
separadamente por conexão real, como `rm_dev_app`, em `rm_dev`, loopback55432,
com `search_path=pg_catalog`. O helper de manutenção continua restrito a test/hml;
nenhuma guarda precisou mudar para corrigir o preflight do ciclo34.

## Evidência preservada, sem repetição

- Artefato: `95d278eebb275521ead3299fbb12f067f6e2419c`.
- SHA-256: `bb07902c10444312a5bdd8c165efce8278d213de0d11f00d4242cddc8237706d`.
- Build nativo: 24 XML, 175 testes backend, zero falha/erro/skip.
- Matriz32 terminou às08:33:21Z: dez parcelas e215 pares únicos UI01–43 nos
  cinco projetos. JSONs/hashes/estatísticas/cobertura reabertos; nenhum
  retry/skip/flaky/falha. Candidato anterior recolhido, sem conexões de teste.
- Revisão visual anterior:26 capturas principais,20 complementos e10 adicionais,
  todos vinculados ao95. Limites de componente/viewport preservados; não é
  inspeção integral de toda página nem teste em aparelhos físicos.

Nenhum build, seed ou matriz mutante foi repetido nesta retomada. Revisão
independente somente leitura conferiu os resultados e a rastreabilidade dos
sete critérios em [Sprint01](../15_SPRINT_01.md#rastreabilidade-para-o-fechamento).
Não identificou novo bloqueador de produto nas provas examinadas; isso não
aprova etapas operacionais ainda não executadas.

## Fechamento delimitado da causa de UI18

O incremento `5cce633` antecipa a interpretação da consulta HQL de login para o
startup, sem aquecer uma conta/tenant e sem alterar BCrypt ou timeouts. O teste
`ConsultaLoginStartupTest.interpretaConsultaDeLoginAntesDoPrimeiroUsuarioSemExecutarSqlEmpresarial`
está aprovado no XML do95, além das regressões de identidade.

As quatro partidas frias do ciclo30 usaram processos novos, readiness somente
por health e Firefox/WebKit alternados; todas passaram sem retry. Os primeiros
logins observados foram3414,3433,5681 e4006ms. JFR calibrado observou o parser HQL
no startup; ausência de amostras nas autenticações não prova custo zero.
As entradas do JAR95 fora de `static/` são idênticas às desse ensaio frio, e a
matriz32 acrescenta regressão integrada do95, incluindo UI18 nos cinco projetos.

Isso encerra tecnicamente a causa demonstrada de interpretação HQL fria. Não
atribui a ela toda lentidão de navegação/reautenticação histórica nem garante
performance sob qualquer carga. Falhas27/29b, análise JFR invalidada e recibos
antigos com `stability_resolved=false` permanecem históricos e inalterados.
A [evidência31](sprint-01-retomada-ciclo-31.md) conserva o diagnóstico e seus limites.

## Operação concluída no candidato95

Todos os horários abaixo são UTC de2026-11-06:

| Etapa | Resultado efetivamente observado |
| --- | --- |
| Preflight08:41:18Z | Fonte limpa, políticas test/hml, locks, zero conexões rm_test/OID16389 e hml97 saudável; dev conferido separadamente |
| Manutenção08:41:21–08:51:56Z |4797 tabelas/40457 linhas iguais no original/clone/retorno; migrador Java0, três partidas nativas, três contas/negativos por fase, DDL confirmado e falha SQL injetada; original16389 ativo e candidato223048 bloqueado, nenhum banco apagado |
| Troca08:53:28Z | Modo delimitado `login-startup-frontend`, novo95/UP/PID896547, mesmo clonehml135836, original16392 bloqueado; sem migration/seed |
| Contas08:54:01Z | Nove contas empresariais existentes: login/me/logout, mesmo JWT negado após logout; empresa adicional preservada na fixture |
| Fundação08:55:15Z |20 combinações nos cinco projetos, JSON/hash/cobertura relidos |
| Smoke09:03:18Z |50 combinações de dez identidades nos cinco projetos, JSON/hash/cobertura/OIDs relidos; inventário SaaS exatamente igual à expectativa independente, incluindo a empresa adicional |
| Consolidação09:10Z |285 pares únicos do MESMO JAR, sem falha/skip/retry/flaky;24XML/175backend e revisão visual vinculados |
| Aceitação09:10:43Z | Baseline95 publicado; leitura posterior confirmou `identidade-aceita` no estado/candidato/ledger, hash do bundle, serviço UP e OIDs preservados |

As unidades de manutenção/fundação/smoke terminaram e seus cgroups foram
recolhidos. O baseline anterior449ce3c e o original pré-identidade permanecem
preservados; não constituem retorno automático permitido. Aceitação não fez
restart/migration nem alterou os dados existentes.

O primeiro comando de consolidação recusou usar seu próprio checkout como
fonte privada externa de evidência, antes de criar intenção/aceitação. Foi
executado novamente por um checkout imutável separado de3a5d7a7, mantendo os
recibos e fontes originais; nenhuma guarda/código foi relaxada. A fonte ops01e2724
continua sendo a da troca/smokes, e95 é a fonte da aplicação. No clone novo,
o atributo Git local do wrapperWindows preserva seus bytes CRLF, iguais ao blob;
nenhum arquivo de produto mudou e nenhum build foi repetido.

Dez viewports mobile do smoke foram inspecionados diretamente, como complemento
às56 imagens anteriores. Administradores mostram navegação e início da matriz;
perfis operacionais mostram seletor focado; clientes mostram avisos de ambiente
restrito; SaaS mostra campo/ação de consulta. Não inferir matriz, eventos ou
resultados abaixo do viewport. Texto longo dentro do input não prova overflow da
página. A tentativa de gerar mosaico não executou por Pillow ausente; as imagens
originais foram abertas individualmente, sem instalar dependência.

## Prova assistida preservada e limites finais

O ensaio assistido28 concluiu uma empresa fictícia no97, com UI/API/CLI,
read-back, replay/conflito e reconciliação sem reexecutar Java. É prova histórica,
não uma execução95 inventada. A comparação real97→95 confirmou somente as três
entradas backend do login diferentes e21 entradas de migrations idênticas;
provisionamento permanece igual. UI29–31 do95 passaram em rm_test e o novo smoke
revalidou o inventário real do clonehml. Não repetir cadastro/seed por documentação.

Duas revisões independentes somente leitura confirmaram rastreabilidade dos
sete critérios e comandos do handoff; a segunda identificou instrução histórica
ambígua de retorno no runbook, corrigida sem alterar guardas. Após aceite,
rollback pré-identidade e `hml_frontend.py recover` não são caminhos permitidos;
nova recuperação exige procedimento compatível revisado.

Implementação e validação técnica do escopo Sprint01 encerradas. PR #3 fica
aberto para revisão/integração em main pelo proprietário. A entrega integrada
continua pendente; os recibos conservam `sprint_complete=false`. Não houve
merge nem início das Sprints02–05. Setup macOS, aparelhos físicos, comunicação
externa, produção/piloto e jornadas futuras NÃO foram aprovados. Relatório
navegável, recibos, capturas e acessos permanecem privados no servidor. O relatório
foi gerado às09:16:10Z com285cenários extraídos dos resultados reais;70links locais
foram reabertos/verificados por parser. ACESSO.md existente foi preservado0600.

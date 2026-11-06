# Sprint 01 — retomada ciclo31

[Checkpoint](../25_EXECUTION_STATUS.md) · [Sprint](../15_SPRINT_01.md) · [Passagem Mac](../27_HANDOFF_CODEX_MAC.md)

## Build e ensaio frio recolhidos

Artefato5cce633e515d76346da3b534e7f9ce3697a65eb3, SHA-256
`2db5ed4a9c167a7f356da21b792a602e84d160435b18a7e44e4134ab9d0933d6`.
Build único do ciclo30, sem reconstrução:24XML/175testes backend, zero
falha/erro/skip. Gate, hash e fonte imutável conferidos. CI desse commit
aprovada nos dois checks; não é aprovação de alterações posteriores de scripts.

O worker frio terminou em2026-11-06T05:36:19Z. Quatro partidas de processo novo,
Firefox/WebKit/Firefox/WebKit, passaram UI18 sem retry/skip/flaky. Nenhum login
ou seed de aquecimento; readiness somente por health. JSONs, cobertura, hashes
e JFR reabertos. São quatro execuções diagnósticas de dois pares distintos,
não quatro cenários novos a somar à matriz. Unidade encerrada/MainPID0,
candidatos recolhidos, homologação antes/depois idêntica.

| Partida | Browser | Primeiro login no navegador (ms, arredondado) | Primeiro login no servidor (ms) | Startup até health (ms) |
| --- | --- | --- | --- | --- |
| 1 | Firefox | 3414 | 3410 | 154449 |
| 2 | WebKit | 3433 | 2945 | 149591 |
| 3 | Firefox | 5681 | 5674 | 158062 |
| 4 | WebKit | 4006 | 3272 | 154428 |

JFR com relógio calibrado registrou amostras HQL na thread main antes do
primeiro login, sem amostras desse parser nas autenticações observadas. Isso
corrobora o teste de cache e o deslocamento da interpretação para o startup.
Ausência de amostras não prova ausência de custo; pilhas limitadas a cinco
frames e timestamp HTTP com resolução de um segundo. Contagens não equivalem
a duração exclusiva ou porcentagem de CPU.

A reprodução29b tinha primeiro login abortado em10009ms e resposta do servidor
em12547ms, com inicialização HQL antes de BCrypt. Existe agora correção e prova
delimitada desse custo frio. Não atribuir automaticamente toda lentidão histórica
no ciclo27 à mesma causa, nem garantir desempenho sob qualquer carga. A matriz
integrada e os gates do novo artefato continuam necessários; timeout e BCrypt
não foram relaxados.

## Atualização binária delimitada, ainda não executada nativamente

A comparação real dos JARs97d75b0 e5cce633 encontrou somente três entradas
diferentes: `Usuario.class`, `IdentidadeRepository.class` e `application.yml`.
Migrations, frontend, dependências e demais metadados permaneceram iguais.

O procedimento existente `hml_frontend.py` ganhou opt-in `login-startup` para
exatamente esse conjunto de entradas e a adição YAML revisada. O padrão continua
exigindo backend byte a byte idêntico. Não há deploy Java genérico, migration,
restore de banco ou promoção implícita. Encadeamento sobre troca concluída
preserva o journal anterior e permite retorno somente ao binário imediatamente
anterior no mesmo clone. Modo desconhecido falha fechado; journals legados
continuam válidos como frontend. Detalhes no [runbook](../22_PRODUCTION_RUNBOOK.md).

Provas executadas:

- Vermelho inicial recusou a mudança delimitada pela guarda anterior; verde
  confirmou opt-in, mantendo a recusa no padrão e negativos de alterações
  externas ao incremento, inclusive recursos de migrations não SQL/ZIP duplicado.
- Revisão independente encontrou janela entre arquivamento e publicação do
  journal. Dois negativos reproduziram aceitação indevida da ausência do registro.
  Correção recusa nova troca/consumidores quando há histórico ou preparação
  órfãos; teste injeta a interrupção entre renames e comprova serviço intacto.
  Essa janela exige reconciliação explícita; `recover` não a resolve sozinho.
- Recuperação de disco simulada preservou histórico/baseline e voltou ao
  predecessor imediato mesmo com novo JAR corrompido. Não é ensaio systemd real.
-19testes focados e158regressões Python passaram. Comparação dos JARs reais
  aprovou o opt-in sem tocar em serviço/banco.

## Matriz do novo artefato

Worker finito31 iniciou05:39:49Z em fonte imutável do job5cce633, após término
comprovado do ensaio frio. Plano215pares UI01–43 nos cinco projetos conferido
programaticamente contra specs/configs, sem lacunas ou duplicatas. UI18 é foco
inicial; sua falha impede seguir a matriz. Não reconstrói, não publica hml e não
promove baseline. Limite informado de quatro horas, unidade própria com
`KillMode=control-group` conferido pelo próprio worker e externamente, para
recolher descendentes quando encerrar. Pode atravessar ciclos sem relançamento.

Na consulta inicial deste registro, executa convites-foco; nenhum resultado
consolidado observado. Recolher JSONs/capturas antes de afirmar aprovação.
Manutenção, atualização/retorno binário nativos, smokes e aceitação do novo JAR
continuam pendentes. Não repetir provisionamento assistido28 nem restaurar o
banco anterior à identidade.

## Estado preservado e limites

Hml97d75b0 UP/PID754824, cloneOID135836 ativo; originalOID16392 bloqueado,
zero conexões. rm_testOID16389 conferido. Baseline449ce3c não promovido.
Trabalho documental herdado preservado. PR3 aberto/draft; sem merge, produção,
STOP ou conclusão global. Escopo somente Sprint01 e handoffMac;02–05 não
iniciadas. Setup Mac não executado/verificado.

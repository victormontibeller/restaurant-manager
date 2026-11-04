# Checkpoint de execução

[Índice](README.md) · [Ciclo 7](evidencias/sprint-01-ciclo-7.md) · [Cobertura](evidencias/cobertura.md)

## Ciclo 7 em execução — incremento de recuperação

Git/remoto/PR #3 conferidos em `2b12729`; runtime saudável ainda em `449ce3c`. Correções herdadas compiladas e ampliadas após revisão independente. Cinco vermelhos funcionais reproduzidos contra o JAR anterior: logout incerto, criação com resposta perdida, perda de intenção após novo login, navegação durante gravação e paginação sob falha. Uma invocação anterior falhou antes da prontidão e não conta como vermelho funcional. Typecheck aplicação/E2E e build Angular aprovados; novo gate integrado e verdes ainda pendentes. Detalhes no ciclo 7. Nenhum deploy/migration hml. Alteração de AGENTS.md foi recusada pelo executor por ser arquivo protegido; não houve contorno. As autorizações vigentes já constam das fontes canônicas.

Próximo passo: commit de progresso revisado no PR draft, build identificado e verdes/regressões em candidato rm_test; depois avançar nos demais critérios da Sprint01. A seção abaixo conserva o handoff anterior como histórico, não estado final do ciclo 7.

## Encerramento do ciclo 6 — 2026-11-04

Encerrado por aviso efetivo de orçamento do executor. Missão NÃO concluída. Coordenador único. Branch `hermes/sprint-01-identidade-acessos`; commit publicado `2b12729e8493a7245a024087cc758c6844752c10`, confirmado por ls-remote e leitura do PR #3 OPEN/draft, base main. CI desse commit aprovado: runs 41793885211 e 41793880065. Sprint01 parcial; 02–05 não iniciadas.

PR #2 MERGED e main remota `fa9e595bd3bb3f1d768a279ac25ee03243c12fb9` conferidos no início. Nenhum merge adicional, commit direto em main, force push ou produção.

## Incremento publicado e gates reais

Gestão administrativa de unidades: criação idempotente por UUID/ator/payload original, consulta paginada/detalhe, edição versionada, fuso validado, inativação lógica e auditoria transacional. Lock da política serializa com equipe e revalida Administrador/sessão/reautenticação. Migration V5 aplicada somente em rm_test. OpenAPI parcial versionado.

Quatro testes API novos tiveram vermelho por rotas ausentes. Revisão backend read-only encontrou auditoria de criação com SQL NULL incompatível com constraint NOT NULL; corrigida para `INEXISTENTE`. AcessosTest: 12 aprovados, zero falhas/erros/skip. Typecheck/build Angular aprovados antes do commit.

Build identificado `scripts/build-release.sh` do 2b12729 terminou exit 0: 56 testes backend, zero falhas/erros/skip, 19 testes Python, frontend e auditorias. SHA/hash constam no build-gate privado e manifesto do candidato. Esse gate NÃO cobre alterações locais posteriores.

## Navegadores — distinção obrigatória entre execuções

- Candidato anterior b631403: primeira execução 12/20 aprovados, oito falhas. Cinco começaram antes da prontidão; três atingiram limite total de 30 segundos. Traces inspecionados; steps progrediam. Adicionados preflight de health e limite total de 60 segundos, mantendo asserções e zero retries. Reexecução integral: 20/20 aprovados nos cinco projetos. Imagens de matriz mobile/Firefox desktop inspecionadas, incluindo recortes legíveis, sem sobreposição observada; isso não equivale a auditoria WCAG completa.
- S01-UI05 teve vermelho por tela ausente no artefato anterior.
- Candidato 2b12729 iniciado com SHA/hash/identidade SQL verificados; prontidão HTTPS aguardada. Suíte de 25 casos iniciada. Falha observada em S01-UI05 Chromium desktop: confirmação de senha ainda em curso quando expirou a asserção DOM de cinco segundos. Contexto preservado. Demais resultados finais NÃO agregados.
- Suíte de 25 casos foi interrompida pelo coordenador após aviso de orçamento; NÃO aprovada. Servidor candidato foi encerrado em seguida. Regressão de fundação sobre 2b12729 NÃO executada. Não transformar os 20 casos do artefato anterior em aprovação do novo.

## Trabalho local posterior ao build — preservar

Revisão frontend read-only apontou três falhas: troca de seção durante POST perde intenção; resposta perdida seguida de edição deixa criação presa em conflito; falha de paginação muda o número sem mudar registros.

Correções escritas, AINDA NÃO compiladas/testadas: `ApiFailure` com status; preservação do payload/UUID pendente; bloqueio da navegação até confirmação; consulta de reconciliação por UUID; rejeições definitivas liberam correção do formulário; paginação atualiza página/lista apenas após sucesso. Ajuste de paginação também aplicado à equipe. Arquivos: `sessao.service.ts`, `identidade.component.ts`, `unidades.component.ts`, `acessos.component.ts`.

Novo `recuperacao-unidade.spec.ts` (S01-UI06) executa POST real e descarta somente a resposta para provar reconciliação; escrito, NÃO executado. Não há vermelho/verde dessa regressão ainda. Confirmar também comportamento de paginação sob falha com massa suficiente. Alterações documentais no roadmap corrigem referências antigas de autorização. Tudo isso permanece local, sem commit, e NÃO integra o artefato 2b12729.

## Homologação preservada

Última verificação neste ciclo: SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, JAR SHA256 `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`, health UP, PID 41392. PostgreSQL loopback :55432, hml :8088. Não houve deploy/migration nova/reinício de hml. ACESSO.md anterior preservado; login/matriz/unidades administrativas não estão disponíveis nesse release. Não revalidado após o aviso final de orçamento.

## Próximo passo executável

1. Conferir Git, gate, processos e registros privados; preservar os arquivos locais acima. Suíte mutante e candidato deste ciclo foram encerrados, mas conferir ausência de processos remanescentes antes de outra suíte.
2. Ajustar S01-UI05 para aguardar/conferir a resposta HTTP real de reautenticação antes de verificar o DOM; inspecionar trace se necessário. Não ampliar timeout indiscriminadamente nem aprovar execução interrompida.
3. Compilar/testar as correções locais de recuperação e paginação. Executar S01-UI06 vermelho contra artefato anterior identificado, depois verde no novo candidato; arquivo de teste não depende de API mockada.
4. Rever diff/segredos, publicar novo commit no PR #3 draft, reconstruir gate identificado e executar os seis cenários nos cinco projetos, fundação e revisão visual. Gate antigo não pode promover novo artefato.
5. Sprint01 ainda exige SaaS separado, cadastro/verificação/recuperação/convites, suspensão preservando operação, eventos/projeções, expansão por ação/perfil, OpenAPI restante, expurgo/rotação. Ensaio manutenção/backup/restore precede migrations em hml; não contornar fingerprint.
6. Antes de pedidos, proteger operações existentes na inativação de unidade. Sprints02–05/T01–T28/X01–X15 e E01–E12 pendentes. Nenhum CONCLUSAO.json. completion-rejected.json não existia no início. execute_code bloqueado pelo executor; nenhum contorno.

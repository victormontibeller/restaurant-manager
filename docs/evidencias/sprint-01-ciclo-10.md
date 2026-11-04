# Sprint 01 — ciclo 10, 2026-11-04

[Índice](../README.md) · [Checkpoint](../25_EXECUTION_STATUS.md) · [Cobertura](cobertura.md)

## Retomada e validação herdada

Missão integral relida; completion-rejected.json ausente. Git/PR/serviços/bancos conferidos. O encerramento documental herdado foi preservado e publicado no commit `76eeffa5f9768bc667eeaec976c83bb00a78708d`; PR #3 permanece aberto/draft. Nenhum merge novo. Identidades SQL de dev/test/hml conferidas em loopback; dev ainda sem tabela empresarial, hml sem empresas provisionadas. Nenhuma migração de dev/hml neste ciclo.

Build local identificado do 76eeffa aprovado: 93 testes backend, zero falhas/erros/ignorados, 19 verificações Python, typecheck/build Angular e auditorias. Artefato SHA-256 `d6efed247099ca8770958c3f27ec93f9a070087e1ad1d0884800486ee224282c` copiado para candidato imutável privado e executado via HTTPS no banco exclusivo rm_test. Startup observado em aproximadamente 155 segundos; não é uma medição de capacidade.

Recuperação S01-UI10–12: quinze combinações aprovadas nos cinco projetos (Chromium desktop/mobile/tablet, Firefox e WebKit desktop). Fundação: vinte combinações aprovadas nos mesmos projetos. Agregação verificou conjuntos exatos, unicidade, ausência de skip/flaky/retry/erros e SHA/hash/PID/listener antes/depois. Esses resultados são do candidato herdado, não do incremento novo. Revisada visualmente a captura de recuperação Chromium 360 px: formulário vertical, campos/botões legíveis e aviso de falha sem corte horizontal observado; emulação, não aparelho físico.

Candidato herdado encerrado antes da migration V9. Homologação saudável preservada, SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, hash `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`, health UP; sem deploy/reinício/migração de hml.

## Incremento em validação

Cadastro de cliente com verificação antes da criação/senha; Controller → Service → Repository, PostgreSQL, CSRF, limites persistidos e outbox privada cifrada reutilizada. Conta existente não é modificada; perfil sempre CLIENTE, sem sessão/vínculos automáticos. Código de finalidade própria/uso único, consumo e auditoria atômicos, retenção limitada. UI Angular, OpenAPI e quatro cenários de navegador acrescentados.

TDD e revisão realizados até este registro:

- Probe HTTP real com CSRF no candidato herdado: 403 observado contra 202 esperado, vermelho pertinente à rota ausente.
- E2E S01-UI13 no Chromium herdado: falha pertinente no botão de cadastro inexistente; captura/trace preservados.
- Primeira compilação do teste Java falhou por IOException não declarada no helper de captura; corrigida. Não conta como teste de comportamento aprovado.
- Revisão independente somente leitura do desenho e do incremento. Achados: limitador depois do lock empresarial e HTTP 5xx/HTML após confirmação sem mensagem de resultado incerto; lacuna de limites por origem.
- Teste PostgreSQL reproduziu origem bloqueada aguardando a política (TimeoutException), antes da correção. O código em execução nessa rodada já estava compilado antes da edição corretiva.
- Correção comum de cadastro/recuperação: quota em transação curta confirmada antes da política; mutação em transação posterior, sem locks/conexões aninhados. UI trata 5xx como incerto e sanitiza corpo não JSON.
- Rodada corrigida aprovada: 14 testes de cadastro, 12 de recuperação e 4 de proteção/captura; trinta testes, zero falhas/erros/ignorados. XML copiado para registro privado próprio, sem somar relatórios residuais. Inclui criação, isolamento, finalidade, concorrência de códigos, rollback por falha de auditoria, expiração após lock, quotas persistidas, origem bloqueada sem esperar política (cadastro e recuperação) e retenção. Typecheck aplicação/E2E, diff e scanner de 183 arquivos aprovados. Build integrado e E2E permanecem gates separados.

## Pendências

Não declarar Sprint 01 concluída. Cadastro ainda depende de build identificado e E2E do novo SHA. Convites/verificação de funcionários preexistentes, SaaS/suspensão/eventos/projeções, matriz completa por ação e OpenAPI restante continuam pendentes. Manutenção/backup/restore precedem promoção das migrations em hml. Sprints 02–05 não iniciadas. Nenhum envio externo, produção ou CONCLUSAO.json.

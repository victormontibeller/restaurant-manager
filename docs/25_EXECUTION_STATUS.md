# Checkpoint de execução

[Índice](README.md) · [Ciclo 5](evidencias/sprint-01-ciclo-5.md) · [Cobertura](evidencias/cobertura.md)

## Ciclo 6 — incremento em validação, 2026-11-04

Coordenador único. Branch `hermes/sprint-01-identidade-acessos`, base de implementação conhecida `b63140322a71bf4d38fe10288632541205c93766`. PR #3 OPEN/draft, base main, CI dessa base aprovado. Sprint 01 parcial, 02–05 não iniciadas. PR #2 MERGED, main remota `fa9e595bd3bb3f1d768a279ac25ee03243c12fb9`, conferida no início deste ciclo. Nenhum merge adicional enquanto gates da Sprint estiverem pendentes.

Preservados os documentos pós-build do ciclo 5. Novo incremento ainda sem SHA identificado neste registro; conferir HEAD e gate após o build. Não atribuir a ele o runtime de homologação.

## Resultados executados

- Candidato b631403 iniciado em HTTPS loopback/banco rm_test, com SHA/hash/identidade SQL verificados pelo script privado. Startup levou aproximadamente 105 segundos; primeira suíte começou indevidamente antes da prontidão: 12/20 passaram, oito falharam. Cinco falhas de conexão; outras três por limite total da jornada de 30 segundos. Execução NÃO aprovada.
- Traces mostraram passos progredindo, sem asserções funcionais falhas nos três timeouts. Adicionados preflight de health e limite total de 60 segundos à suíte de identidade, mantendo asserções e zero retries. Reexecução completa: 20/20 aprovados, nos cinco projetos. Revisão visual e regressão de fundação ainda pendentes.
- Quatro novos testes API de unidades tiveram vermelho pertinente por rotas ausentes (403). Seleção executou também um teste preexistente: cinco no total, quatro falhas.
- Unidade administrativa implementada: criação idempotente por UUID/ator/payload original, consulta paginada/detalhe, edição versionada, fuso validado, inativação lógica e auditoria transacional. Lock da política serializa com equipe e revalida Administrador/sessão/reautenticação. Migration V5 aditiva, aplicada somente em rm_test nesta fase.
- Revisão independente read-only encontrou SQL NULL incompatível com auditoria NOT NULL na criação; corrigido para `INEXISTENTE`. Suíte AcessosTest posterior: 12 testes, zero falhas/erros/skip. Typecheck e build Angular terminaram exit 0.
- S01-UI05 teve vermelho real por navegação/tela ausente no artefato antigo. UI nova e teste de conflito real implementados, ainda sem execução verde. OpenAPI parcial de unidades adicionado; demais contratos continuam pendentes.

## Homologação preservada

SHA `449ce3ccf941c73b34ac15a4754183c147f91aaa`, JAR SHA256 `d9b95b1e46b0a5f0baf8fc13a640a51b751fd1e04b3654e77295ad29f5980e77`, health UP/PID 41392 confirmados pelo verificador neste ciclo. PostgreSQL loopback :55432, hml :8088. Nenhuma migration nova em hml. ACESSO.md anterior preservado; não anunciar login/matriz/unidades administrativas como disponíveis nesse release.

Candidato de teste b631403 encerrado antes de migrar rm_test para V5; serviço hml não foi interrompido.

## Próximos passos concretos

1. Publicar incremento revisado no PR #3 draft; executar build identificado com regressão completa e auditorias. Revalidar SHA/hash antes de iniciar novo candidato rm_test HTTPS; aguardar prontidão real antes do navegador.
2. Executar cinco cenários de identidade/acessos/unidades nos cinco projetos, fundação e revisão visual. Corrigir falhas sem relaxar efeitos esperados; registrar SHA realmente testado e relatório privado.
3. Sprint01 ainda exige SaaS separado, cadastro/verificação/recuperação/convites, suspensão preservando operação, eventos/projeções, expansão da matriz por ação/perfil, OpenAPI restante e expurgo/rotação.
4. Ensaio de manutenção/backup/restore é pré-requisito do deploy com migrations em hml. Não contornar fingerprint. Antes de pedidos, proteger operações existentes na inativação de unidades.
5. Sprints02–05/T01–T28/X01–X15 e E01–E12 continuam pendentes. Nenhum CONCLUSAO.json. completion-rejected.json inexistente no início. Restrições do executor preservadas; execute_code foi bloqueado e não utilizado como contorno.

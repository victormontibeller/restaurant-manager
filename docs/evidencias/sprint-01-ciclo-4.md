# Sprint 01 — ciclo 4: identidade empresarial

[Índice](../README.md) · [Sprint](../15_SPRINT_01.md) · [Segurança](../04_SECURITY.md)

## Resultado e limites

Incremento publicado no commit `d7cd97a21d09505f99be0043f4efde39bcbdb595`, branch `hermes/sprint-01-identidade-acessos`, PR #3 OPEN/draft. Head remoto e PR foram lidos de volta após push. Sprint não concluída. Este incremento NÃO foi implantado em homologação.

Build identificado `scripts/build-release.sh` terminou com exit 0 em 2026-11-04 06:20 UTC: 44 testes backend com PostgreSQL real, zero falhas/erros/skip; 19 testes Python; Angular typecheck/build; npm audit sem vulnerabilidades; auditoria Java/OSV aprovada. Gate privado vincula SHA e hash do JAR. O build não é validação de navegador nem aprovação de release hml.

## Comportamentos demonstrados

`IdentidadeTest` tem dez testes: login/cookie/no-store; domínio/tenant/plataforma; refresh/rotação/reuso; logout/CSRF; limite por conta e isolamento entre empresas; inativação imediata; entrada desconhecida/domínio desconhecido; CSRF real inclusive com Bearer; refresh simultâneo com um vencedor e revogação da família; claims/assinatura/expiração; limite de origem sem consumir orçamento de outra conta. Alguns itens são cobertos no mesmo método, sem inflar a contagem.

JWT e sessão são reais, com persistência JPA/PostgreSQL. Refresh tem hash/histórico/lock e revogação confirmada mesmo ao retornar 401. Não foram implementados neste incremento plataforma SaaS, convites, cadastro/recuperação/verificação, reautenticação sensível, equipe/matriz/unidades ou último Administrador concorrente.

## Testes vermelhos, correções e revisão

- Seis testes API iniciais falharam porque login ainda não existia.
- Primeiro incremento passou os comportamentos, mas acesso empresarial à plataforma tentou abrir transação sem tenant; corrigido para rejeitar antes do serviço transacional.
- Teste CSRF real passava isolado e falhava junto do helper `with(csrf())`, que alterava o repositório compartilhado do filtro. Removido o helper: todos os testes agora obtêm token/cookie/header reais. Proteção não foi relaxada.
- Revisão independente encontrou origem bloqueada incrementando limite de e-mail; teste vermelho constatou uma linha indevida, correção rejeita origem antes de tocar na conta. Reexecução integral aprovada.
- Tenant adicional da massa E2E expôs expectativa fixa de quatro schemas em teste anterior. Comparação passou a exigir inventário completo do registro PostgreSQL, incluindo A/B, e igualdade na reaplicação. Reexecução específica 5/5 e integral 44/44.
- Revisão frontend apontou retry de logout ausente, asserção insuficiente após reload e refresh concorrente entre abas. Implementados retry explícito, espera por botão habilitado/ausência do perfil e coordenação Web Locks/BroadcastChannel. Typecheck/build aprovados; testes novos de comportamento ainda não executados.

## Interface e navegadores: não aprovar antecipadamente

Angular contém login, restauração, perfil mínimo e logout; tokens somente em memória, renovação antes da expiração, erro focável, retry de encerramento incerto. E2E de identidade possui três cenários previstos nos cinco projetos: S01-UI01 login/reload/logout, S01-UI02 erro/CSRF, S01-UI03 abas simultâneas/rede/logout. Os quinze casos do código final NÃO foram executados neste ciclo.

Foi executado somente o vermelho S01-UI01/Chromium contra JAR anterior sem formulário, após resolver caminho dos browsers e aguardar startup. Tentativas anteriores ficaram bloqueadas por browser ausente no caminho padrão e conexão recusada antes de a API estar pronta. Não são resultados verdes nem instabilidade encoberta.

Servidor de ensaio HTTPS loopback :8089, certificado privado e massa em rm_test foram usados para o vermelho; processo encerrado antes de reconstruir o artefato. Homologação :8088 preserva a fundação `449ce3c`, sem migrations novas. Próximo ciclo deve iniciar o candidato identificado, verificar identidade SQL/runtime e executar os quinze casos e regressões da fundação, revisar screenshots e corrigir falhas.

## CI e retomada

Run antigo 41779407969 não executou jobs: anotação GitHub identificou `runner.temp` inválido em env do job. Workflow corrigido para propagar RUNNER_TEMP via GITHUB_ENV em step. CI de d7cd97a ainda não consultado; não marcar aprovado por inferência do build local.

Evidências privadas do operador: logs `cycle4-auth-*`, `cycle4-rate-red.log`, `cycle4-migration-fixed.log`, `cycle4-build-release.log`; relatórios `auth-ui-red*`; massa/certificado em `auth-cycle4`. Nenhuma senha, cookie, trace ou screenshot autenticado foi publicado. Retenção/expurgo de sessões/limitadores, rotação planejada de chave e contrato OpenAPI ainda pendentes.

# Sprint 01 — ciclo 8: rotação JWT e retenção técnica

[Checkpoint](../25_EXECUTION_STATUS.md) · [Segurança](../04_SECURITY.md)

## Escopo e revisão

Base `740d1edf5c63e2f59479a9821cd4f9436e900087`, mesma branch e PR #3 draft. Revisões independentes somente leitura realizadas para JWT e retenção; nenhum segundo coordenador. Alterações locais herdadas foram preservadas. Homologação continua na fundação, sem deploy ou migration neste ciclo.

Rotação seleciona uma chave HS256 local pelo `kid`, permite sobreposição com uma chave anterior e nunca tenta fallback nem busca externa. Configurações ambíguas falham sem revelar segredos. Compatibilidade com identificador automático anterior é explícita. Revisão identificou lacuna preexistente: conversor sintetizava `iat` ausente. Teste reproduziu aceitação indevida; agora a emissão precisa existir no payload assinado original.

Retenção expurga famílias de sessões apenas um dia após expiração absoluta e limitadores antigos, sem apagar usuários/auditoria. Transações em lotes, `SKIP LOCKED`, índices e permissões mínimas na V6. Worker percorre cadastro interno ativo/suspenso, limpa contexto em erro e recupera o acúmulo em até dez lotes por tenant/ciclo. Avisos identificam tenant técnico e backlog sem conteúdo da exceção. Refresh/logout tratam sessão removida após consulta do hash como credencial inválida.

## TDD e verificações executadas antes do commit

- JWT: dez testes, um vermelho pertinente para `iat` ausente; depois dez verdes. Inclui ambas as chaves e ausência de fallback com ambas configuradas.
- Suíte backend anterior à retenção: 66 testes, zero falhas/erros/ignorados, exit 0. Uma tentativa anterior com timeout de 240 segundos foi interrompida e não é aprovação; a execução completa foi refeita.
- Retenção: cinco testes iniciais contra operação sem efeito produziram quatro falhas pertinentes e um aprovado. Implementação substituiu integralmente esse passo transitório.
- Primeira regressão focada: 27 testes de JWT/retenção/autenticação aprovados, zero falhas/erros/ignorados.
- Revisão do worker: dois vermelhos reproduziram ausência de continuação de lote e diagnóstico sem tenant; ambos corrigidos.
- Rodada focada final: 21 testes aprovados, zero falhas/erros/ignorados. São dez JWT, seis integração PostgreSQL de retenção, quatro coordenação do worker e um tratamento unitário de sessão removida.
- PostgreSQL real: isolamento de tenant, preservação da detecção de refresh reutilizado, lote e retomada, trabalhadores simultâneos, linha bloqueada e renovação concorrente de limitador. O caso do desaparecimento entre consulta/lock também tem teste unitário com repository controlado; não alegar que esse interleaving exato foi reproduzido pela API.
- 19 testes Python e typecheck aplicação/E2E passaram nesta chamada antes do novo build identificado.

## Estado do candidato

Commit `589ea43551727a95626cfe35bd8686da92a6ffcb` publicado; SHA remoto e head/base/state do PR #3 foram lidos de volta. PR continua OPEN/draft, base main. CI dos dois runs 41806918815 e 41806926438 aprovado. Corpo do PR atualizado e relido.

`scripts/build-release.sh` terminou exit 0 no processo próprio, após build Angular, testes e auditorias previstos no script. Esse término foi confirmado pela ferramenta de processos. Imediatamente depois, o executor emitiu aviso de orçamento efetivo quase esgotado e determinou interromper novas verificações: contagem final de XML e hash/gate não foram relidos nem consolidados. Não atribuir ao build a contagem de uma execução anterior.

Suítes completas de 45 casos de identidade e 20 de fundação NÃO iniciadas neste ciclo. Runners privados preparados não são evidência de execução. Candidato HTTPS não iniciado; nenhum JAR foi copiado/promovido como release desse ciclo. Não há homologação da rotação operacional, teste de carga da retenção, teste físico mobile ou aprovação da Sprint 01. A revisão sugeriu ampliar paginação real com mais de 50 empresas e negativos de claims na chave anterior; cobertura atual não equivale a essas ampliações.

## Pendências do produto

Administração SaaS, cadastro/verificação/recuperação/convites, suspensão operacional, eventos/projeções, expansão por ação/perfil e contratos OpenAPI restantes continuam pendentes. Manutenção/backup/restore das migrations antes de promover identidade a hml. Sprints 02–05 não iniciadas; T01–T28/X01–X15 não encerrados. Nenhum arquivo de conclusão técnica foi criado.

# ADR 0001 — Fundação nativa e isolamento

Status: aceito tecnicamente em 2026-11-04 no escopo da Sprint 00; critérios pendentes continuam no checkpoint.

## Contexto

Monólito Java/Spring + Angular, 8 GiB compartilhados, sem sudo no host e sem mudança em serviços alheios. P01/P02 resolvidas para o incremento. P03 completa (atores) depende da Sprint 01.

## Decisão

- Java Temurin 21.0.13+9, Maven 3.9.16 (wrapper 3.3.4), Spring Boot 3.5.16: linha disponível no Maven Central, escolhida para reduzir alterações de APIs durante a fundação, não por ser a versão principal mais nova.
- Angular 22.2.4, CLI/build 22.2.5, TypeScript 6.0.2, Node 26.7.0 existente, Playwright 1.64.1; lock npm versionado. Compatibilidade consultada no registro oficial e na tabela Angular.
- PostgreSQL 16.15 dos pacotes Ubuntu assinados, extraídos em prefixo privado; cluster nativo, somente loopback, porta 55432. Bancos dev/test/hml e roles owner/app distintos. Runtime não recebe DDL. Dados e segredos fora do Git.
- JPA/Hibernate valida entidades contra schema estrutural `t_template`. Requisições empresariais usam somente schema resolvido pelo cadastro; ausência de contexto é erro, nunca fallback para template/public. Pool retorna a `pg_catalog`; falha de reset aborta a conexão.
- Flyway separado para public/tenant. Empresa só pode ser ativada por provisionamento completo (Sprint 01). As duas empresas ATIVO no banco de testes são fixtures internas exclusivas, não provisionamento de homologação.
- Homologação inicial entrega Angular pelo próprio Spring em uma origem loopback :8088. Elimina proxy desnecessário nesta etapa; Caddy/TLS público permanece dependência de implantação, não foi homologado. Serviço nativo systemd do usuário, release fora do checkout e manifesto/hash identificáveis pelo PID real.
- Jobs futuros: intenção/outbox na transação do domínio, claim `FOR UPDATE SKIP LOCKED`, lease, retry limitado e reconciliação. Não criar tabelas genéricas sem caso de uso. Idempotência inclui tenant/ator/ação/hash de payload; mesma chave divergente conflita. Infraestrutura de jobs/inbox/outbox ainda não implementada.

## Integrações investigadas

SDK Java oficial Mercado Pago oferece `MPRequestOptions` por chamada (token, timeouts e chave de idempotência em headers); não usar configuração global mutável. OAuth e checkout hospedado continuam propostas para Sprint 04, dependentes de conta habilitada/callback. Nenhuma cobrança ou validação sandbox foi executada. E-mail terá captura local antes de transporte externo; provedor ausente não é homologação.

## Consequências e limites

Serviço inicial ainda carrega credenciais de migração para o bootstrap Flyway; separar processo migrador de runtime antes de fechar a fundação. Não há contas, pedidos, pagamentos, recuperação de backup nem PWA nesta etapa. Validação do pool é evidência técnica limitada, não conclusão da Sprint 01. Compatibilidade/rollback de migrations e segurança de dependências Java permanecem gates a ampliar.

Fontes consultadas: Maven Central (metadados/artifacts Spring/Maven), API oficial Adoptium (SHA-256 validado), índices apt assinados Ubuntu, npm e angular.dev/reference/versions, Javadocs Hibernate 6.6, código oficial mercadopago/sdk-java em `MPRequestOptions.java`. JDK/Maven foram verificados por checksum antes de extrair; não houve instalação global.

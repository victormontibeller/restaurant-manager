# ADR 0001 — Fundação nativa e isolamento

Status: aceito tecnicamente em 2026-11-04 no escopo da Sprint 00; critérios pendentes continuam no checkpoint.

## Contexto

Monólito Java/Spring + Angular, 8 GiB compartilhados, sem sudo no host e sem mudança em serviços alheios. P01/P02 resolvidas para o incremento. P03 completa (atores) depende da Sprint 01.

## Decisão

- Java Temurin 21.0.13+9, Maven 3.9.16 (wrapper 3.3.4), Spring Boot 4.0.9. A tentativa inicial com 3.5.16 foi bloqueada pelo gate OSV: Spring MVC 6.2.19 sem correção pública nessa linha para os avisos encontrados. O BOM 4.0.9 publicado no Maven Central fornece Spring 7.0.10, Tomcat 11.0.27 e PostgreSQL JDBC 42.7.14; não foram usados snapshots nem supressões. Imports de autoconfiguração e Jackson migrados; regressão PostgreSQL e auditoria do artefato aprovadas no ciclo 2.
- Angular 22.2.4, CLI/build 22.2.5, TypeScript 6.0.2, Node 26.7.0 existente, Playwright 1.64.1; lock npm versionado. Compatibilidade consultada no registro oficial e na tabela Angular.
- PostgreSQL 16.15 dos pacotes Ubuntu assinados, extraídos em prefixo privado; cluster nativo, somente loopback, porta 55432. Bancos dev/test/hml e roles owner/app distintos. Runtime não recebe DDL. Dados e segredos fora do Git.
- JPA/Hibernate valida entidades contra schema estrutural `t_template`. Requisições empresariais usam somente schema resolvido pelo cadastro; ausência de contexto é erro, nunca fallback para template/public. Pool retorna a `pg_catalog`; falha de reset aborta a conexão.
- Flyway separado para public/tenant. Empresa só pode ser ativada por provisionamento completo (Sprint 01). As duas empresas ATIVO no banco de testes são fixtures internas exclusivas, não provisionamento de homologação.
- Homologação inicial entrega Angular pelo próprio Spring em uma origem loopback :8088. Elimina proxy desnecessário nesta etapa; Caddy/TLS público permanece dependência de implantação, não foi homologado. Serviço nativo systemd do usuário, release fora do checkout e manifesto/hash identificáveis pelo PID real.
- Jobs futuros: intenção/outbox na transação do domínio, claim `FOR UPDATE SKIP LOCKED`, lease, retry limitado e reconciliação. Não criar tabelas genéricas sem caso de uso. Idempotência inclui tenant/ator/ação/hash de payload; mesma chave divergente conflita. Infraestrutura de jobs/inbox/outbox ainda não implementada.

## Integrações investigadas

SDK Java oficial Mercado Pago oferece `MPRequestOptions` por chamada (token, timeouts e chave de idempotência em headers); não usar configuração global mutável. OAuth e checkout hospedado continuam propostas para Sprint 04, dependentes de conta habilitada/callback. Nenhuma cobrança ou validação sandbox foi executada. E-mail terá captura local antes de transporte externo; provedor ausente não é homologação.

Revalidação em 2026-11-04: Maven Central publicou `com.mercadopago:sdk-java:3.7.0`; POM declara alvo Java 8, compatível em nível de bytecode com Java 21. O sources JAR dessa versão contém `com.mercadopago.core.MPRequestOptions`, com token, timeouts, headers e `maxRetries` por chamada, e `PreferenceClient.create(PreferenceRequest, MPRequestOptions)`. Não confundir o pacote `core` com caminhos históricos em `client`. Essa inspeção demonstra viabilidade da API, não compilação do adaptador nem validação OAuth. Antes da adoção na Sprint 04, auditar transitivas e testar token/refresh/retry concorrentes; definir explicitamente retry financeiro, sem aceitar os três retries padrão cegamente. Não foi adicionada dependência sem uso à fundação.

## Consequências e limites

Migrador executável separado (`java -jar app.jar --migrate-only`), com allowlist de ambiente, identidade SQL efetiva e advisory lock. Runtime não recebe credenciais de migração; valida histórico/checksums e ausência de migrations pendentes antes do JPA. Deploy só aplica migrations iguais às do serviço anterior; diferenças exigem futuro procedimento de manutenção/backup, não uma variável que afirme compatibilidade. Retorno automático exige release previamente validado e fingerprint SQL idêntico. Não há contas, pedidos, pagamentos, recuperação de backup nem PWA nesta etapa. Validação do pool é evidência técnica limitada, não conclusão da Sprint 01.

Fontes consultadas: Maven Central (metadados/artifacts Spring/Maven), API oficial Adoptium (SHA-256 validado), índices apt assinados Ubuntu, npm e angular.dev/reference/versions, Javadocs Hibernate 6.6, código oficial mercadopago/sdk-java em `MPRequestOptions.java`. JDK/Maven foram verificados por checksum antes de extrair; não houve instalação global.

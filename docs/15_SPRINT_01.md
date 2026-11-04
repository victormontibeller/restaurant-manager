# Sprint 01 — Tenant, autenticação e acessos

> **Escopo:** plano de execução; não altera as fontes normativas dos assuntos.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

**Status:** em andamento desde 2026-11-04, ciclo 3. Provisionamento local implementado/testado em banco exclusivo; autenticação, APIs/telas SaaS, equipe e matriz ainda pendentes. Não concluída.

Itens compostos permanecem abertos. O primeiro incremento implementa reserva durável, domínio único, migração de schema reservado, administrador/unidade e ativação atômica, com retomada por novo processo. Não é provisionamento pela UI nem homologação de login. [Evidências](evidencias/sprint-01-ciclo-3.md).

## Entregáveis

- [ ] Registro de domínio/empresa, provisionamento retomável e migrações por schema.
- [ ] Identidade empresarial/plataforma separada, JWT, refresh/revogação, convite e recuperação conforme P04.
- [ ] Unidades, funcionários, perfis fixos, matriz com versão/auditoria e ações exclusivas do Administrador.
- [ ] Política central de autorização e projeções de dados por função; escopo de unidade em consultas, mutações e eventos.
- [ ] Estado operacional da empresa e regras de suspensão conforme P11, preservando reconciliação.

## Dependências

Sprint 0; validar P04/P11 e durações de sessão. Captura local atende testes de e-mail; uso real exige provedor e domínio do [registro do piloto](23_PILOT_IMPLEMENTATION.md#registro-externo).

## Critérios de aceite

- [ ] Pelo menos duas empresas com IDs/e-mails semelhantes, uma delas com duas unidades, demonstram isolamento em listagem, detalhe, alteração, exportação e evento. Funcionário autorizado em uma filial é impedido de consultar, alterar e receber eventos da outra filial da mesma empresa; trocar domínio/ID/claim não concede acesso.
- [ ] Reutilizar conexão/thread após erro, cancelamento ou job não mantém schema anterior. Host desconhecido, tenant incompatível e sessão revogada falham fechado.
- [ ] Permissão removida e unidade retirada passam a valer mesmo com access JWT não expirado; conexão de eventos perde acesso correspondente.
- [ ] Refresh repetido, login concorrente, recuperação inválida/expirada e logout têm comportamento previsto; cookies/CSRF e limites de tentativa são verificados.
- [ ] Edições simultâneas da matriz dão conflito explícito; impedir remoção do último Administrador inclusive sob concorrência.
- [ ] Provisionamento interrompido retoma sem duplicação nem empresa parcialmente ativa; migração registra resultado por schema.
- [ ] Login, recuperação e matriz são utilizáveis no celular, com erro por campo, foco e sem exigir tabela horizontal inacessível para ações essenciais.

## Documentos relacionados

- [Roadmap e ordem das sprints](13_ROADMAP.md)
- [Critérios comuns de entrega](12_DEFINITION_OF_DONE.md)
- [Tenancy](06_MULTI_TENANT.md)
- [Segurança](04_SECURITY.md)
- [Acessos](11_ACCESS_CONTROL.md)

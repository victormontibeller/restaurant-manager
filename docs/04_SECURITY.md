# Segurança e autenticação

> **Escopo:** JWT, sessões, dados pessoais, validação de entradas e proteções da aplicação.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Segurança e dados pessoais

Validação estrutural na entrada, regras nos services, constraints no banco e autorização contextual em todas as ações. Permitir somente campos conhecidos nos DTOs sensíveis; evitar atribuição massiva de papel, preço, tenant, saldo ou estado. Escapar saída, usar consultas parametrizadas e limitar upload por tipo real, tamanho e resolução. URLs de mídia externa, se aceitas, exigem política contra requisições a destinos internos; a proposta inicial é upload controlado.

Aplicar HTTPS no ambiente público, CORS restrito, headers compatíveis com a aplicação, política de conteúdo e proteção contra abuso em login, código de mesa, checkout e endpoints públicos. Redigir logs estruturados com correlação, tenant/unidade técnica e resultado, sem tokens, senhas, dados brutos de pagamento ou endereços completos. Restringir health/management: endpoint público só informa o mínimo; diagnóstico detalhado exige acesso protegido.

Reautenticar configuração de integração e alterações sensíveis de acesso. Validar dependências e segredos no pipeline; corrigir achados conforme impacto comprovado. Política de privacidade, termos, retenção, exclusão e responsáveis por dados permanecem dependências de operação; a documentação técnica não declara conformidade jurídica automaticamente.

<a id="jwt-e-sessoes"></a>
## JWT e sessões

Proposta: access JWT de curta duração com `sub` imutável, tenant, audiência, emissor, expiração e identificador da sessão; algoritmo permitido fixado, rotação de chave planejada e relógio validado. Não colocar endereço, senha ou permissões completas como única fonte de autorização. Spring Security valida tokens; serviços consultam sessão e política atuais. Referências: [JWT no Spring Security](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html) e [autorização de métodos](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html).

Access token em memória no Angular; refresh em cookie HttpOnly/Secure com escopo apropriado, rotação, detecção de reutilização e revogação. Definir SameSite e proteção CSRF conforme a topologia final, especialmente refresh/logout. Login tem limite de tentativas e resposta que não enumera contas; recuperação usa token de uso único e expiração. Logout/inativação revoga sessão no servidor. Parâmetros de duração serão fixados na Sprint 1.

JWT de mesa só tem a capacidade do atendimento/participante ativo. Código temporário é aleatório, revogável, protegido contra tentativas e distinto de número de mesa; não aparece em logs. Limitar escopo a cardápio, suas rodadas, resumo autorizado e solicitações. Ações de cozinha, caixa e configuração são sempre proibidas.

## Diretrizes de implementação

### Incremento empresarial da Sprint 01

Implementado no ciclo 4, ainda não implantado em homologação: access JWT HS256 de 5 minutos, emissor `restaurant-manager`, audiência exclusiva `restaurant-manager-empresa`, IDs imutáveis de usuário/empresa/sessão. A chave privada `RM_JWT_SECRET` exige pelo menos 64 bytes, gerados aleatoriamente fora do Git. Testes usam chave efêmera própria; runtime falha sem chave. Trocar a chave invalida os access tokens; rotação com múltiplas chaves/kid permanece pendente.

Sessão tem prazo absoluto de 12 horas. Refresh aleatório de 256 bits fica em cookie HttpOnly/Secure/SameSite Strict, host-only, path `/api/v1/auth`; banco guarda apenas SHA-256, histórico de consumo e vínculo à sessão. Refresh é serializado por lock da sessão e relê consumo após adquirir o lock. Reutilização revoga a família em transação confirmada, inclusive se o access JWT ainda for válido. Logout e inativação são conferidos no servidor em cada autenticação.

Login/refresh/logout têm chain separada com CSRF obrigatório mesmo quando recebem Bearer. `GET /api/v1/auth/csrf` fornece token mascarado, associado ao cookie host-only `__Host-RM_CSRF` Secure/HttpOnly/Strict. A aplicação exige HTTPS para esta jornada, inclusive no ensaio local com certificado privado. Não reduzir Secure para contornar navegador. Respostas não permitem cache; Angular guarda access apenas em memória, coordena refresh entre abas via Web Locks e comunica logout sem transmitir tokens por BroadcastChannel.

Tentativas persistem no PostgreSQL: por empresa, 5 por e-mail e 100 por endereço de origem em janela de 15 minutos. Origem bloqueada é rejeitada antes de consumir limite de qualquer conta. Endereço vem da conexão, sem confiar em Forwarded; proxy futuro precisa de política explícita antes de ativar confiança. BCrypt custo 12, resposta inválida genérica, limite de 72 bytes. Retenção/expurgo dos registros de sessão e limitadores ainda pendente.

Contratos disponíveis: `POST /api/v1/auth/login` (`email`, `senha`); `POST /api/v1/auth/refresh`; `POST /api/v1/auth/logout`; `GET /api/v1/auth/me`. Campos desconhecidos são recusados. Todas as rotas empresariais resolvem domínio antes do contexto de segurança. JWT empresarial não autentica plataforma. Reautenticação sensível, equipe existente/matriz e unidades foram acrescentadas nos ciclos 5–6 conforme [Acessos](11_ACCESS_CONTROL.md); identidade SaaS, cadastro/verificação/recuperação/convites e eventos continuam pendentes.

- JWT deve ser validado quanto a assinatura, algoritmo permitido, emissor, audiência, expiração e sessão ativa. Permissões atuais são verificadas no servidor; não dependem de um JWT antigo expirar.
- Para a proposta web, mantenha access token em memória e refresh token em cookie HttpOnly/Secure, com rotação, revogação e proteção CSRF nos endpoints que usam cookies. Não grave tokens em localStorage/sessionStorage.
- Código de mesa e QR estático não substituem a autorização de um atendimento. Encerramento revoga a sessão temporária e impede acesso ao próximo grupo.
- Nunca registre senhas, tokens, dados de cartão, códigos temporários ou payloads completos com dados pessoais em logs. Restrinja e audite acesso a dados sensíveis.
- Segredos reais ficam fora do Git; exemplos contêm placeholders. Não copie `.env`, dumps ou credenciais dos projetos de referência. Dependências e uploads precisam de limites e validação.

## Documentos relacionados

- [Autorização por perfil e unidade](11_ACCESS_CONTROL.md)
- [Isolamento e contexto](06_MULTI_TENANT.md)
- [Logs e auditoria](07_OBSERVABILITY.md)
- [Webhooks e credenciais de provedores](21_INTEGRATIONS.md)

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

Implementado no ciclo 4, ainda não implantado em homologação: access JWT HS256 de 5 minutos, emissor `restaurant-manager`, audiência exclusiva `restaurant-manager-empresa`, IDs imutáveis de usuário/empresa/sessão. A chave privada `RM_JWT_SECRET` exige pelo menos 64 bytes, gerados aleatoriamente fora do Git. Testes usam chave efêmera própria; runtime falha sem chave. A rotação iniciada no ciclo 7 e revisada no ciclo 8 está descrita abaixo; publicação e resultados estão no checkpoint, não no release servido.

Sessão tem prazo absoluto de 12 horas. Refresh aleatório de 256 bits fica em cookie HttpOnly/Secure/SameSite Strict, host-only, path `/api/v1/auth`; banco guarda apenas SHA-256, histórico de consumo e vínculo à sessão. Refresh é serializado por lock da sessão e relê consumo após adquirir o lock. Reutilização revoga a família em transação confirmada, inclusive se o access JWT ainda for válido. Logout e inativação são conferidos no servidor em cada autenticação.

Login/refresh/logout têm chain separada com CSRF obrigatório mesmo quando recebem Bearer. `GET /api/v1/auth/csrf` fornece token mascarado, associado ao cookie host-only `__Host-RM_CSRF` Secure/HttpOnly/Strict. A aplicação exige HTTPS para esta jornada, inclusive no ensaio local com certificado privado. Não reduzir Secure para contornar navegador. Respostas não permitem cache; Angular guarda access apenas em memória, coordena refresh entre abas via Web Locks e comunica logout sem transmitir tokens por BroadcastChannel.

Tentativas persistem no PostgreSQL: por empresa, 5 por e-mail e 100 por endereço de origem em janela de 15 minutos. Origem bloqueada é rejeitada antes de consumir limite de qualquer conta. Endereço vem da conexão, sem confiar em Forwarded; proxy futuro precisa de política explícita antes de ativar confiança. BCrypt custo 12, resposta inválida genérica, limite de 72 bytes. A retenção técnica de sessões/limitadores do ciclo 8 está descrita abaixo; não é uma política jurídica de retenção de dados.

Contratos disponíveis: `POST /api/v1/auth/login` (`email`, `senha`); `POST /api/v1/auth/refresh`; `POST /api/v1/auth/logout`; `GET /api/v1/auth/me`. Campos desconhecidos são recusados. Todas as rotas empresariais resolvem domínio antes do contexto de segurança. JWT empresarial não autentica plataforma. Reautenticação sensível, equipe existente/matriz e unidades foram acrescentadas nos ciclos 5–6 conforme [Acessos](11_ACCESS_CONTROL.md); identidade SaaS, cadastro/verificação/recuperação/convites e eventos continuam pendentes.

- JWT deve ser validado quanto a assinatura, algoritmo permitido, emissor, audiência, expiração e sessão ativa. Permissões atuais são verificadas no servidor; não dependem de um JWT antigo expirar.
- Para a proposta web, mantenha access token em memória e refresh token em cookie HttpOnly/Secure, com rotação, revogação e proteção CSRF nos endpoints que usam cookies. Não grave tokens em localStorage/sessionStorage.
- Código de mesa e QR estático não substituem a autorização de um atendimento. Encerramento revoga a sessão temporária e impede acesso ao próximo grupo.
- Nunca registre senhas, tokens, dados de cartão, códigos temporários ou payloads completos com dados pessoais em logs. Restrinja e audite acesso a dados sensíveis.
- Segredos reais ficam fora do Git; exemplos contêm placeholders. Não copie `.env`, dumps ou credenciais dos projetos de referência. Dependências e uploads precisam de limites e validação.

## Rotação de assinatura — incremento dos ciclos 7–8

`RM_JWT_KEY_ID` identifica a chave ativa (padrão `v1`); o emissor acrescenta esse `kid` ao JWT. `RM_JWT_PREVIOUS_KEY_ID` e `RM_JWT_PREVIOUS_SECRET` opcionais permitem uma única chave anterior durante a sobreposição. Identificadores usam 1–64 caracteres ASCII alfanuméricos, `_` ou `-` (incluindo os 43 caracteres do identificador automático anterior); ids repetidos, segredos iguais, chave curta e par incompleto impedem startup com erro sanitizado. A chave anterior só verifica: nunca assina token novo.

O decodificador seleciona estritamente uma chave local pelo `kid`, exige HS256 e mantém validações de emissor/audiência/expiração/emissão. Não busca URLs/arquivos indicados pelo token nem tenta outras chaves após falha de assinatura. `kid` desconhecido/ausente e token excessivo falham fechado; sessão/tenant continuam sendo validados posteriormente no PostgreSQL.

A claim `iat` precisa existir no payload assinado original, antes da conversão de claims. O conversor padrão da dependência pode sintetizar a emissão a partir de `exp`; um teste negativo reproduziu essa lacuna preexistente no ciclo 8. A proteção se aplica às chaves ativa e anterior, sem substituir a validação de assinatura.

Procedimento proposto para rotação normal: preparar segredo novo fora do Git, preservar segredo/id anteriores como par de verificação, mudar ativa/id e reiniciar somente o serviço autorizado. Após a última emissão pela chave anterior, aguardar pelo menos cinco minutos de validade mais a tolerância de relógio do validador (60 segundos), conferir os emissores e retirar o par anterior em outra publicação. Não manter chave comprometida por conveniência: removê-la imediatamente invalida seus access tokens; revogação de sessões é operação distinta. Não reutilizar IDs para chaves diferentes.

Compatibilidade: tokens dos builds anteriores usam o identificador automático Nimbus, não `v1`. Este candidato os rejeita por padrão e exige renovação; ainda não existe autenticação implantada em homologação. Para uma transição futura sem invalidação, cadastrar explicitamente o identificador real antigo no par anterior. Não alegar rotação operacional ensaiada apenas por testes com contextos locais. Parâmetros e segredos reais não foram alterados neste ciclo.

## Retenção técnica de identidade — ciclo 8

O candidato expurga sessões somente quando a expiração absoluta já passou há mais de 24 horas; revogação antecipada não encurta esse intervalo. Todos os hashes de refresh da família, inclusive consumidos, permanecem até esse ponto para preservar detecção de reutilização. Limitadores só são removidos quando sua janela começou há mais de 24 horas, sem zerar bloqueios correntes de quinze minutos. Não remover usuários, auditoria ou registros de negócio nesse job.

O worker consulta somente schemas registrados `ATIVO`/`SUSPENSO`, em páginas de 50; abre e limpa contexto por empresa. Cada transação, com timeout de dez segundos, bloqueia até 100 sessões elegíveis com `SKIP LOCKED`, apaga seus hashes e sessões atomicamente e expurga até 100 limitadores antigos. Disputa com login/refresh não autoriza remover uma janela renovada nem perder a revogação de uma família válida. Sessão removida entre consulta do hash e aquisição do lock resulta em credencial inválida, não erro interno.

Agendamento interno: primeira execução após um minuto, depois dez minutos após o término. Até dez lotes por empresa/ciclo permitem recuperar acúmulo sem monopolizar indefinidamente o worker; lote final cheio gera aviso de backlog. Isso não promete prazo máximo de exclusão nem capacidade operacional sem medição. Falhas isoladas preservam a transação e são retomadas pelo predicado persistido no ciclo seguinte, com diagnóstico por tenant técnico e tipo, sem conteúdo da exceção. Não há chamada externa ou fila em memória necessária à recuperação.

`rm.auth.retencao-agendada=false` desliga apenas o agendamento, utilizado pela suíte que chama o serviço diretamente. A migration V6 concede DELETE somente nas três tabelas técnicas e adiciona índices de seleção; runtime continua sem DDL. Implantação em homologação depende do gate de manutenção/backup das migrations, ainda pendente. Testes de concorrência reais e testes unitários de coordenação estão separados nas [evidências do ciclo 8](evidencias/sprint-01-ciclo-8.md).

## Recuperação de senha — candidato do ciclo 9

Incremento em validação, não implantado em homologação. A solicitação persiste uma mensagem cifrada e responde `202` com texto neutro, sem consultar a existência da conta no caminho síncrono. O worker consulta a conta dentro do tenant; desconhecida/inativa é ignorada sem envio. Limites persistidos: três solicitações por e-mail e trinta por origem em quinze minutos, aplicáveis também a contas inexistentes. A confirmação tem limite próprio de trinta por origem. Ambas as rotas exigem o CSRF real, inclusive quando recebem Bearer.

Código aleatório de 256 bits, representado por 43 caracteres base64url, expira quinze minutos após a solicitação. A tabela de verificação contém somente SHA-256. Consumo serializado com a política empresarial altera BCrypt, invalida os demais códigos do usuário, revoga todas as sessões e registra auditoria/aviso na mesma transação. Não altera perfil/unidades, não verifica e-mail implicitamente nem autentica automaticamente. O horário de validade deve ser conferido depois dos locks; concorrência e regressões ficam nas evidências, não são presumidas por este contrato.

A nova senha exige pelo menos doze caracteres e no máximo 72 bytes UTF-8. Código não aparece em URL, query string, logs ou armazenamento do navegador. A UI limpa campos de senha e informa resultado incerto quando perde a resposta; orienta conferir login com a senha nova. Reutilização de código consumido é rejeitada, não produz outro reset.

Conteúdo recuperável da outbox usa AES-256-GCM, nonce aleatório de 96 bits e autenticação adicional pelo tenant/id da mensagem. `RM_EMAIL_SECRET` é uma chave independente da assinatura JWT, com 32 bytes aleatórios codificados em base64; deve ficar fora do Git/banco. Sem chave ou captura configurada, a API retorna indisponibilidade, não sucesso fictício. Substituir a chave com mensagens pendentes as torna ilegíveis: esvaziar a fila sob controle antes de trocar ou permitir nova solicitação; não há rotação transparente dessa chave nesta entrega.

Somente transporte de captura local fictícia, descrito em [Integrações](21_INTEGRATIONS.md). Contrato [OpenAPI de recuperação](api/recuperacao.yaml). Cadastro, verificação de e-mail, convites e identidade SaaS continuam pendentes. A existência de recuperação não encerra a família T06 nem E05.

## Documentos relacionados

- [Autorização por perfil e unidade](11_ACCESS_CONTROL.md)
- [Isolamento e contexto](06_MULTI_TENANT.md)
- [Logs e auditoria](07_OBSERVABILITY.md)
- [Webhooks e credenciais de provedores](21_INTEGRATIONS.md)

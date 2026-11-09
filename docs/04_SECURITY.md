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

Contrato implementado: access JWT HS256 de 5 minutos, emissor `restaurant-manager`, audiência exclusiva `restaurant-manager-empresa`, IDs imutáveis de usuário/empresa/sessão. A chave privada `RM_JWT_SECRET` exige pelo menos 64 bytes, gerados aleatoriamente fora do Git. Testes usam chave efêmera própria; runtime falha sem chave. A rotação iniciada no ciclo 7 e revisada no ciclo 8 está descrita abaixo. O [checkpoint](25_EXECUTION_STATUS.md) distingue fonte, artefato testado, candidato servido e baseline aceito; os títulos por ciclo registram a origem dos incrementos, não seu estado atual de implantação.

Sessão tem prazo absoluto de 12 horas. Refresh aleatório de 256 bits fica em cookie HttpOnly/Secure/SameSite Strict, host-only, path `/api/v1/auth`; banco guarda apenas SHA-256, histórico de consumo e vínculo à sessão. Refresh é serializado por lock da sessão e relê consumo após adquirir o lock. Reutilização revoga a família em transação confirmada, inclusive se o access JWT ainda for válido. Logout e inativação são conferidos no servidor em cada autenticação.

Login/refresh/logout têm chain separada com CSRF obrigatório mesmo quando recebem Bearer. `GET /api/v1/auth/csrf` fornece token mascarado, associado ao cookie host-only `__Host-RM_CSRF` Secure/HttpOnly/Strict. A aplicação exige HTTPS para esta jornada, inclusive no ensaio local com certificado privado. Não reduzir Secure para contornar navegador. Respostas não permitem cache; Angular guarda access apenas em memória, coordena refresh entre abas via Web Locks e comunica logout sem transmitir tokens por BroadcastChannel.

Tentativas persistem no PostgreSQL: por empresa, 5 por e-mail e 100 por endereço de origem em janela de 15 minutos. Origem bloqueada é rejeitada antes de consumir limite de qualquer conta. Endereço vem da conexão, sem confiar em Forwarded; proxy futuro precisa de política explícita antes de ativar confiança. BCrypt custo 12, resposta inválida genérica, limite de 72 bytes. A retenção técnica de sessões/limitadores do ciclo 8 está descrita abaixo; não é uma política jurídica de retenção de dados.

A consulta de usuário por e-mail é nomeada e validada na criação da
SessionFactory, antes de atender o primeiro login. Essa preparação interpreta
HQL, não autentica conta nem escolhe tenant para executar SQL de aquecimento.
O parâmetro, EntityManager empresarial e regras de autenticação são os mesmos.
Não garante eliminar custos residuais de validação/plano SQL; o ensaio frio e
seus limites ficam na [evidência30](evidencias/sprint-01-retomada-ciclo-30.md).

Contratos disponíveis: `POST /api/v1/auth/login` (`email`, `senha`); `POST /api/v1/auth/refresh`; `POST /api/v1/auth/logout`; `GET /api/v1/auth/me`. Campos desconhecidos são recusados. Todas as rotas empresariais resolvem domínio antes do contexto de segurança. JWT empresarial não autentica plataforma. Reautenticação sensível, equipe/matriz, unidades e eventos cadastrais estão em [Acessos](11_ACCESS_CONTROL.md); recuperação, cadastro, convites, verificação e identidade SaaS estão descritos abaixo. Contrato implementado não equivale à aprovação integrada da Sprint.

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

Compatibilidade histórica: tokens dos builds anteriores à rotação usam o identificador automático Nimbus, não `v1`. O contrato novo os rejeita por padrão e exige renovação. Para uma transição sem invalidação, cadastrar explicitamente o identificador real antigo no par anterior. Não alegar rotação operacional ensaiada apenas por testes com contextos locais. O registro desse incremento não representa alteração de segredos do ambiente.

## Retenção técnica de identidade — ciclo 8

O candidato expurga sessões somente quando a expiração absoluta já passou há mais de 24 horas; revogação antecipada não encurta esse intervalo. Todos os hashes de refresh da família, inclusive consumidos, permanecem até esse ponto para preservar detecção de reutilização. Limitadores só são removidos quando sua janela começou há mais de 24 horas, sem zerar bloqueios correntes de quinze minutos. Não remover usuários, auditoria ou registros de negócio nesse job.

O worker consulta somente schemas registrados `ATIVO`/`SUSPENSO`, em páginas de 50; abre e limpa contexto por empresa. Cada transação, com timeout de dez segundos, bloqueia até 100 sessões elegíveis com `SKIP LOCKED`, apaga seus hashes e sessões atomicamente e expurga até 100 limitadores antigos. Disputa com login/refresh não autoriza remover uma janela renovada nem perder a revogação de uma família válida. Sessão removida entre consulta do hash e aquisição do lock resulta em credencial inválida, não erro interno.

Agendamento interno: primeira execução após um minuto, depois dez minutos após o término. Até dez lotes por empresa/ciclo permitem recuperar acúmulo sem monopolizar indefinidamente o worker; lote final cheio gera aviso de backlog. Isso não promete prazo máximo de exclusão nem capacidade operacional sem medição. Falhas isoladas preservam a transação e são retomadas pelo predicado persistido no ciclo seguinte, com diagnóstico por tenant técnico e tipo, sem conteúdo da exceção. Não há chamada externa ou fila em memória necessária à recuperação.

`rm.auth.retencao-agendada=false` desliga apenas o agendamento, utilizado pela suíte que chama o serviço diretamente. A migration V6 concede DELETE somente nas três tabelas técnicas e adiciona índices de seleção; runtime continua sem DDL. Implantação exige os gates de manutenção/backup aplicáveis ao artefato, registrados no checkpoint. Testes de concorrência reais e testes unitários de coordenação estão separados nas [evidências do ciclo 8](evidencias/sprint-01-ciclo-8.md).

## Recuperação de senha — candidato do ciclo 9

A solicitação persiste uma mensagem cifrada e responde `202` com texto neutro, sem consultar a existência da conta no caminho síncrono. O worker consulta a conta dentro do tenant; desconhecida/inativa é ignorada sem envio. Limites persistidos: três solicitações por e-mail e trinta por origem em quinze minutos, aplicáveis também a contas inexistentes. A confirmação tem limite próprio de trinta por origem. Ambas as rotas exigem o CSRF real, inclusive quando recebem Bearer.

Código aleatório de 256 bits, representado por 43 caracteres base64url, expira quinze minutos após a solicitação. A tabela de verificação contém somente SHA-256. Consumo serializado com a política empresarial altera BCrypt, invalida os demais códigos do usuário, revoga todas as sessões e registra auditoria/aviso na mesma transação. Não altera perfil/unidades, não verifica e-mail implicitamente nem autentica automaticamente. O horário de validade deve ser conferido depois dos locks; concorrência e regressões ficam nas evidências, não são presumidas por este contrato.

A nova senha exige pelo menos doze caracteres e no máximo 72 bytes UTF-8. Código não aparece em URL, query string, logs ou armazenamento do navegador. A UI limpa campos de senha e informa resultado incerto quando perde a resposta; orienta conferir login com a senha nova. Reutilização de código consumido é rejeitada, não produz outro reset.

Recuperação, cadastro e aceite de convite também rejeitam senha composta somente
de espaços em branco. A UI usa a mesma classificação de `String.isBlank` do
Java21, informa o erro associado ao campo e mantém foco no alerta. A senha
válida é enviada exatamente como digitada, inclusive espaços nas extremidades;
não há normalização ou `trim`. O backend continua sendo a autoridade da validação.

Conteúdo recuperável da outbox usa AES-256-GCM, nonce aleatório de 96 bits e autenticação adicional pelo tenant/id da mensagem. `RM_EMAIL_SECRET` é uma chave independente da assinatura JWT, com 32 bytes aleatórios codificados em base64; deve ficar fora do Git/banco. Sem chave ou captura configurada, a API retorna indisponibilidade, não sucesso fictício. Substituir a chave com mensagens pendentes as torna ilegíveis: esvaziar a fila sob controle antes de trocar ou permitir nova solicitação; não há rotação transparente dessa chave nesta entrega.

Somente transporte de captura local fictícia, descrito em [Integrações](21_INTEGRATIONS.md). Contrato [OpenAPI de recuperação](api/recuperacao.yaml). A existência de recuperação não encerra a família T06 nem E05.

## Cadastro verificado de cliente — candidato do ciclo 10

O cadastro começa somente com o e-mail; não recebe senha, perfil, unidades ou indicador de verificação. Normaliza letras para minúsculas e rejeita espaços/caracteres de controle. A resposta `202` é neutra e a existência da conta só é consultada no worker. Limites próprios: três solicitações por endereço e trinta por origem em quinze minutos. O worker ignora qualquer conta já existente, inclusive funcionário/inativo, sem mudar seu cadastro.

Somente após apresentar o código aleatório de 256 bits, válido por quinze minutos desde a solicitação, o destinatário define a senha. A confirmação cria `CLIENTE` ativo com e-mail verificado, sem sessão automática nem vínculos de unidade, consome todos os códigos daquele endereço e audita na mesma transação. E-mail único e política empresarial serializam a criação; códigos de recuperação e de outro tenant não servem para cadastro. Não há conta nem senha pré-cadastrada que um terceiro possa reservar antes da prova de posse. Credenciais seguem BCrypt custo 12 e limite de 12 caracteres/72 bytes UTF-8.

Cadastro e recuperação confirmam o limitador por origem em transação curta separada, antes de adquirir a política empresarial. Mesmo uma confirmação rejeitada consome a quota; origem bloqueada não espera o lock empresarial. Só depois, em outra transação limitada a dez segundos, política/código/estado são revalidados. Não manter uma conexão de transação externa enquanto essas fases executam. Erro na mutação reverte usuário, código e auditoria, não a quota já contabilizada.

O navegador não armazena código/senha nem coloca código na URL. Perda de resposta, timeout ou HTTP 5xx após confirmação são resultado incerto: conferir login antes de nova solicitação. Corpo HTML de intermediário não expõe erro de parsing. Código consumido não concede segunda criação; confirmação não reativa nem converte conta existente. Verificação de contas preexistentes e convites têm contratos próprios abaixo.

V9 acrescenta a tabela de códigos de cadastro com hash, e-mail, expiração e consumo, mais tipos próprios da outbox. Expurgo remove até cem códigos por ciclo/tenant cuja expiração passou há mais de 24 horas; o transporte conserva os limites de captura existentes. [OpenAPI de cadastro](api/cadastro.yaml). Evidências, implantação e limitações ficam no checkpoint.

## Convites de funcionários — candidato do ciclo 11

Administrador com sessão e reautenticação atuais cria uma intenção UUID com e-mail, perfil fixo e unidades. O backend normaliza o e-mail e ordena os vínculos; replay com mesmo autor/payload retorna o estado atual, sem renovar prazo ou reenviar mensagem. Intenção divergente e conta já existente conflitam. Administrador não recebe vínculos individuais; conjunto vazio nos outros perfis não concede acesso operacional. Limite de trinta intenções novas por autor em quinze minutos.

Código aleatório de 256 bits, hash SHA-256 exclusivo e validade de quinze minutos desde a criação; mensagem cifrada na mesma transação, somente captura fictícia. Aceite público exige CSRF e quota própria por origem antes da política empresarial, como cadastro/recuperação. Após os locks, revalida prazo, consumo, revogação, autor original ainda Administrador ativo, unidades ativas e ausência de conta. Cria o funcionário verificado com senha definida pelo destinatário, vínculos exatos e auditoria; revoga outros convites para o endereço. Não converte clientes, reativa usuários nem cria sessão automática. Logout do autor não revoga seu convite; rebaixamento/inativação impedem o aceite enquanto vigentes.

Revogação administrativa é idempotente e não recolhe capturas já preparadas. Convite aceito exige gerenciar o funcionário. Expurgo limpa até cem hashes expirados há mais de 24 horas, preservando a intenção/payload para retries. UI conserva intenção incerta em memória por origem/conta, inclusive ao sair/entrar na mesma página; não grava códigos, senhas ou tokens em storage/URL. Recarregar/fechar perde o rascunho e emite aviso: consulta exata por UUID permite reconciliar manualmente. [Contrato](api/convites.yaml). Testes efetivamente executados e implantação ficam no checkpoint; verificação de contas preexistentes é um fluxo separado, descrito abaixo.

## Verificação de contas existentes — retomada de 2026-11-04

Solicitação
pública recebe somente e-mail e responde `202` neutro. Conta inexistente, inativa
ou já verificada é ignorada pelo worker, não consultada no caminho síncrono.
Limites próprios de três solicitações por endereço e trinta por origem a cada
quinze minutos; ambas as rotas exigem CSRF mesmo com Bearer.

Código de 256 bits com validade de quinze minutos desde a solicitação, hash na
tabela própria V11 e mensagem cifrada no transporte de captura existente. Vincula
usuário e endereço original no tenant. Confirmação contabiliza quota separada de
trinta por origem antes da política empresarial; após locks revalida prazo,
consumo, conta ativa, e-mail inalterado e verificação ainda pendente. Consome todos
os códigos do usuário, marca verificação e audita na mesma transação. Não altera
senha, perfil ou unidades, não cria conta/sessão nem verifica por recuperação de
senha. Sessões existentes leem o indicador atual na próxima consulta.

UI pública informa captura fictícia, código único, erro/foco e resultado incerto;
após perda da resposta orienta conferir o indicador ao entrar, sem afirmar sucesso.
Não armazena código no navegador nem o coloca na URL. Expurgo limitado remove
códigos cuja expiração passou há mais de 24 horas. [OpenAPI](api/verificacao.yaml).
Esse fluxo não concede identidade SaaS nem representa homologação externa de e-mail.

## Identidade SaaS — incremento da retomada, ciclo 2

Operador usa cadastro e sessões
exclusivos em `public`, fora do EntityManager empresarial. O serviço usa transação
JDBC explícita e recusa contexto empresarial/transação ambiente. Não existe
impersonação nem concessão implícita de Administrador de restaurante.

Origem SaaS configurada por `rm.platform.host`, padrão local `plataforma.localhost`.
Usar `RM_PLATFORM_HOST` com o mesmo valor no HTTP e nos comandos privilegiados;
a reserva de domínio e as retomadas aplicam a mesma política descrita em
[Tenancy](06_MULTI_TENANT.md).
Host diferente ou também registrado para uma empresa falha fechado com 404;
Forwarded não escolhe origem nem schema. A UI fica em `/?area=plataforma`, mas
essa seleção visual não concede autenticação. API [documentada](api/plataforma.yaml).

JWT tem audiência única `restaurant-manager-plataforma`, sem tenant, validade de
cinco minutos; identidade empresarial não é aceita nessa cadeia e vice-versa.
Usa as mesmas chaves locais ativa/anterior e validações estritas do emissor,
com decodificador de audiência separado. Sessões, usuários e cookies são distintos;
a separação não depende de esconder botões. Nenhum segredo de assinatura novo
é introduzido por esse incremento.

Refresh de 256 bits, somente hash no banco, prazo absoluto de doze horas,
rotação serializada e replay com revogação confirmada. Cookies exclusivos
`RM_PLATFORM_REFRESH` e `__Host-RM_PLATFORM_CSRF`, host-only/Secure/HttpOnly/Strict;
refresh com path `/api/v1/plataforma/auth`. CSRF obrigatório nas mutações por
cookie mesmo com Bearer. Login limita cinco tentativas por e-mail e cem por origem
em quinze minutos, sem enumeração; BCrypt custo 12. Auditoria mínima registra
login, logout e replay, sem tokens ou endereço de origem bruto.

Cadastro/administração inicial do operador permanece assistido pelo owner fora
do runtime HTTP; não há endpoint público de cadastro SaaS. Inativação e mudança
de hash no registro público revogam sessões na mesma transação via trigger;
reativação não restaura tokens antigos. `FOR SHARE` no login protege contra
inativação simultânea; privilégio UPDATE restrito à coluna id atende o requisito
SQL do lock, sem conceder escrita de credenciais/estado ao runtime.

Retenção técnica remove até cem sessões expiradas há mais de 24 horas e cem
limitadores antigos a cada ciclo de dez minutos; conserva hashes consumidos até
o término dessa janela. Auditoria não é expurgada. Interface mantém access só
em memória, coordena refresh entre abas e limpa metadados ao encerrar sessão;
falha de logout bloqueia novo login até reconciliação. Consulta SaaS retorna até
cinquenta empresas por página, somente id/nome/estado/versão/domínios. Não retorna
schema, credenciais, clientes ou consumo. O ciclo 3 acrescenta consulta exata e
suspensão/reativação comercial conforme [Tenancy](06_MULTI_TENANT.md). Escritas
usam Bearer SaaS, não autenticação por cookie; confirmação de senha vale cinco
minutos e limita cinco tentativas por operador em quinze minutos. Senha inválida
retorna 422 sem invalidar login; quota persistida retorna 429. Provisionamento
pela UI tem contrato próprio em [Tenancy](06_MULTI_TENANT.md#solicitação-saas-de-provisionamento--retomada-ciclo-4); a cobertura integrada de T28 permanece no checkpoint.

## Fronteiras financeiras da Sprint 4 local

Rotas financeiras, de expedição e de relatório possuem allowlist explícita e
autorização por ação, unidade e recurso no caso de uso. Replay financeiro adquire
o lock da intenção, revalida autorização e só então confronta o payload anterior.
A projeção da cozinha permanece sem endereço/contato/financeiro; expedição recebe
somente os dados necessários à entrega, após autorização específica.

Webhook é público e assinado, processado em contexto neutro. OAuth inicia por
Administrador reautenticado; callback valida state e sessão administrativa original,
sem aceitar tenant ou redirect arbitrário do chamador. Credenciais não aparecem em
DTOs, eventos ou logs; criptografia, transporte e renovação estão na fonte de
[Integrações](21_INTEGRATIONS.md#mercado-pago-por-restaurante). O adaptador de teste só aceita
loopback numérico em `stage=test`; isso não habilita produção.

## Referências relacionadas

- [Contrato da identidade empresarial](api/identidade.yaml)

- [Autorização por perfil e unidade](11_ACCESS_CONTROL.md)
- [Isolamento e contexto](06_MULTI_TENANT.md)
- [Logs e auditoria](07_OBSERVABILITY.md)
- [Webhooks e credenciais de provedores](21_INTEGRATIONS.md)

## Sessão empresarial durante comandos operacionais

A autorização transacional bloqueia a sessão para leitura compartilhada e relê
seu estado persistido antes dos agregados. Logout e detecção de reuso de refresh
aguardam operações já autorizadas; quando a revogação confirma primeiro, a nova
operação não pode usar uma sessão antiga do cache JPA. A ordem permanece
política → acesso/sessão → unidade → comanda → pedido → unidades comerciais.
As consultas SSE repetem a autorização em transações curtas e não mantêm locks
enquanto enviam eventos pela rede. JWT expirado na revalidação do controller
retorna 401 JSON; se expirar durante a consulta inicial, o emitter encerra sem
enviar dados, embora o HTTP já possa ter sido iniciado. Erros internos alheios
à validação JWT continuam 500. Em
REPEATABLE_READ, uma mudança concorrente da sessão que invalide o snapshot
retorna 409 `SESSAO_ALTERADA`, sem conteúdo privado e sem retry automático;
essa tradução é restrita à leitura da sessão e ao conflito de serialização.

## Sessões de mesa — Sprint 3 local

O participante usa audiência `restaurant-manager-mesa`, identidade e sessão
próprias; não se torna cliente nem funcionário. O QR contém somente o identificador
da mesa. A autorização exige código do atendimento ativo, protegido por hash,
validade e quota persistida por origem/mesa. Código é mostrado somente na criação
ou rotação; perda da resposta exige consultar o atendimento e gerar outro código,
sem expor o anterior por GET.

Access token fica em memória por até cinco minutos. Refresh aleatório de 256 bits
usa cookie HttpOnly/Secure/SameSite Strict, path `/api/v1/mesa/auth`, e limite
absoluto de doze horas. Rotação serializada registra consumo; reutilização revoga
a sessão. Endpoints de cookie possuem CSRF próprio, inclusive com Bearer recebido.
Ações do participante revalidam atendimento, comanda, sessão e autoria no backend.
`EM_FECHAMENTO` bloqueia rodadas; `FECHADA` revoga acessos e não admite consumo.

SSE usa Bearer no header via fetch, nunca em query string. Projeções e contexto
são revalidados em cada lote, com alternativa de polling e expiração da conexão.
Código, tokens, endereço e payload financeiro não pertencem aos eventos da cozinha.
O tratamento interno de erro dos streams reconhece apenas `GET`, despacho
`ERROR`/`INCLUDE`, origem em uma das duas rotas SSE e destino `/error`, com
exceção registrada pelo contêiner. Se a resposta já foi enviada e a causa
identifica desconexão, o filtro encerra sem escrever novamente. Erros genuínos
seguem ao controlador de erro; requisições diretas e autorização inicial mantêm
suas regras. O despacho `ASYNC` normal não recebe liberação adicional.
Contratos em [Mesas](api/mesas.yaml) e [Eventos](api/eventos-operacionais.yaml).
Implementação local em validação; não implica homologação.

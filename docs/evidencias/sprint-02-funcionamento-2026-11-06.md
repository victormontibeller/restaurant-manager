# Sprint 2 — horários e canais de unidades

**Situação:** S02-01 implementado e validado localmente no Mac em 2026-11-06.
Sprint 2 permanece aberta; homologação não executada neste incremento.

[Plano](../16_SPRINT_02.md) · [Checkpoint](../25_EXECUTION_STATUS.md) ·
[Contrato](../api/funcionamento-unidades.yaml)

## Base e autorização

PR #4 integrado pelo proprietário em `19dff9d625d03cdba9d23bf023e88846743dec03`.
CI do head `c5a183a0161c65da25a33199749efdf82d859b9b` aprovada nos runs
[42266479753](https://github.com/victormontibeller/restaurant-manager/actions/runs/42266479753) e
[42266489123](https://github.com/victormontibeller/restaurant-manager/actions/runs/42266489123).
Logs do segundo: 161 Python e 186 backend, zero falha/erro/skip. Esses resultados
são da base, não CI do código novo.

P05/P06/P12/P13 confirmadas pelo proprietário. Após recusa de autenticação no
acesso SSH configurado, o proprietário orientou deixar Linux para depois e
avançar na aplicação local. Sem novo acesso, deploy ou supervisor no Hermes.

Branch `codex/sprint-02-catalogo-pwa`, base acima; alterações ainda na árvore de
trabalho, sem commit/push deste incremento. Candidato local identificado pelo
SHA-256 `f46863929bc69fe5f7da32876798e1024c7812f7efcb99d110aefbbc2d5ebb67`.
Não é release promovível: metadado de execução `desenvolvimento`; manifestos de
fontes, JAR, logs, fixtures e relatórios ficam no registro privado `sprint02-local`.

## Entrega

- Domínio backend `unidades`, Controller → Service → Repository e DTOs próprios.
  Migration tenant V13 cria configuração e janelas semanais; nenhum canal é
  habilitado automaticamente. Scripts/projetos de referência não foram alterados.
- Escrita administrativa reautenticada com lock, versões de funcionamento e
  cadastro, auditoria atômica e reconciliação após conflito/resposta incerta.
- Agenda no fuso da unidade, madrugada, virada semanal, dia completo, limites
  e rejeição de sobreposição. Consulta pública usa um único snapshot SQL;
  unidade alheia/inativa não fica disponível.
- Editor Angular próximo ao domínio existente e consulta pública com escolha
  explícita de unidade. Respostas antigas são descartadas; offline ou expiração
  remove a disponibilidade exibida. Nenhum token/cache privado foi acrescentado.
- Probes novos integrados aos agregadores existentes. Testes da fundação agora
  localizam o status dentro da região de conexão, preservando todas as asserções
  após a inclusão de um segundo status público no shell.

## Ambiente e verificações

Java 21.0.9, Node 26.0.0, PostgreSQL 18.4 local exclusivo, loopback:55432,
`rm_test` e roles owner/runtime distintas. Identidade SQL conferida antes da
migration. Runtime HTTPS temporário, empresa fictícia nova e captura local;
sem dados reais, envio externo ou banco de outro projeto.

| Verificação | Resultado observado |
| --- | --- |
| Maven `verify` completo | 208 testes em 29 XML, zero falha/erro/skip; inclui 9 unitários e 13 integrações novas |
| PostgreSQL | Isolamento com mesmo UUID em dois tenants, perfis/reautenticação/sessão, CAS concorrente, revogação durante lock, rollback da auditoria, constraints e leitura consistente |
| Angular | `format:check`, typecheck aplicação/E2E e build aprovados |
| Probes de lógica | 10 scripts aprovados, incluindo 5 casos públicos e 9 administrativos novos |
| Templates reais | 3 probes × Chromium/Firefox/WebKit = 9 combinações aprovadas; transporte fictício, não E2E |
| S02-UI01/02 | 10 pares únicos cenário/projeto aprovados no candidato local, sem skip/falha/flaky/retry |
| Regressão S00-UI01–03/API01 | 20 pares únicos nos mesmos cinco projetos e JAR, sem skip/falha/flaky/retry |
| Documentação/contrato | Scanner de links/segredos, âncoras, YAML e 17 referências OpenAPI, diff e sintaxe do agregador aprovados |

Os cinco projetos são Chromium desktop/360/768, Firefox desktop e WebKit
desktop. S02-UI01 usa edição real pela UI, persistência, sobreposição negada,
conflito de agenda e mudança concorrente de fuso; consulta posterior demonstra
o estado persistido. S02-UI02 usa API real para preparar agenda e demonstra
consulta pública, offline, reconexão e ausência de storage privado. As 30
combinações usam o mesmo JAR, sem somar evidências de releases anteriores.

Após o `verify`, o Angular foi compilado e o JAR reempacotado com `package
-DskipTests`, sem contar essa etapa como nova execução de testes. Hash preservado
e health UP conferidos antes/depois das jornadas. Inspeção visual de quatro
capturas: administração/público em 360, administração em 768 e público WebKit
desktop; sem corte/sobreposição observado. Isso não é auditoria integral de
acessibilidade nem validação de aparelho físico.

## Falhas e correções preservadas

1. Primeiro Maven parou na compilação por anotação de tipo sobre nome qualificado
   do DTO; import explícito corrigiu a compilação.
2. Segunda rodada teve 134 erros de contexto em 207 testes porque uma opção
   Jackson 2 estava na seção errada para Jackson 3. Verificação das classes
   instaladas levou à configuração `datatype.enum`; rodada completa final com
   208 testes aprovada. Logs anteriores preservados, sem tratá-los como sucesso.
3. Primeiro probe do template mostrou segunda-feira embora o estado fosse
   domingo. Seleção explícita nas opções dinâmicas corrigiu o binding; os três
   motores foram reexecutados depois da correção e da evolução do contrato.
4. Revisão independente identificou fuso cadastral obsoleto e teclado numérico
   sem `:`. A API agora valida também `versaoUnidade`, a UI usa o fuso da consulta
   e os campos permitem digitar `HH:mm`. Testes API/UI cobrem o conflito de fuso.

## Limites e próximo incremento

Não foi executada a matriz completa histórica de identidade/acessos nem a
matriz integrada de homologação; a regressão local acima é delimitada. A CI
Ubuntu da base não substitui UI29/UI31 com worker/gates reais, os 50 smokes nem
a releitura do release no Hermes. V13 foi aplicada somente em `rm_test`; não
iniciar um JAR anterior contra esse banco sem conferir compatibilidade.

Catálogo/produtos, mídia, adicionais/combos, favoritos, carrinho e PWA continuam
pendentes. Próximo incremento local: S02-02, preservando ações empresariais e
por unidade existentes. Antes de promover um release, retomar os gates Linux,
recovery/migrations e matriz de homologação. A autorização local não aprova
produção/piloto nem muda as condições de aceite.

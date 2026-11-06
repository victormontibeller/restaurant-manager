# Sprint 01 — ciclo 32: erro associado ao campo

[Checkpoint](../25_EXECUTION_STATUS.md) · [Critérios da Sprint](../15_SPRINT_01.md)

## Achado e correção

A revisão independente dos sete critérios identificou uma lacuna do critério
mobile/acessibilidade: o alerta recebia foco, mas erros de código recusado e de
reautenticação não descreviam seus respectivos campos. O problema foi
reproduzido em componentes Angular reais, com transporte fictício explicitamente
separado de E2E. Não houve alteração de backend, criptografia ou timeout.

A correção usa o `codigo` já existente no contrato `ApiError`, combinado com
HTTP 422; não infere o campo pela mensagem ou pelo status isolado. `ApiFailure`
conserva esse código opcional nos serviços empresarial e SaaS, sem compartilhar
credenciais ou instanciar uma sessão a partir da outra.

- Recuperação, cadastro, aceite de convite e verificação associam o código
  recusado ao alerta por `aria-describedby` e `aria-invalid`.
- Matriz, convites administrativos, estado comercial e provisionamento fazem
  a mesma associação para a senha de confirmação.
- Erros de rede, limite de tentativas, códigos desconhecidos e respostas 5xx
  não marcam esses campos. Nova operação limpa a associação anterior.
- O alerta continua recebendo foco; senhas são limpas. Login negado continua
  neutro, sem atribuir falha especificamente ao e-mail ou à senha.

## Verificações executadas

1. Vermelho pertinente: quatro jornadas públicas sem associação do código;
   outro vermelho na confirmação de senha da matriz. O caso de provisionamento
   também reproduziu ausência de `aria-invalid` antes de sua correção.
2. Probes existentes ampliados, com Angular real e transporte fictício:
   Chromium e Firefox aprovaram formulários e administração; WebKit aprovou
   administração. O comando agregado expirou em 300 segundos durante o último
   probe de formulários WebKit. Essa execução interrompida não foi aprovada.
3. Somente o probe interrompido foi reexecutado, com término normal e aprovação.
   Assim, os dois probes têm execução aprovada nos três motores, sem ocultar a
   interrupção anterior. Não são provas HTTP/PostgreSQL nem dispositivos físicos.
4. Typecheck da aplicação e E2E aprovado. Regressões de sessão SaaS, eventos,
   exportação, configuração, vínculo inativo e fixture passaram; scanner e diff
   também passaram.
5. Revisão independente do diff não encontrou bloqueador estático. Registrou
   limites de cobertura dos probes: nem todas as transições entre falha conhecida
   e sucesso estão diretamente exercitadas; os E2E ampliados verificam essa
   transição nas reautenticações. Isso não substitui sua execução.

UI04/UI11/UI14/UI19/UI21/UI26/UI29 receberam assertivas adicionais de
associação acessível, foco ou limpeza após nova operação. Nenhuma assertiva
existente foi removida, nem prazo ampliado. Os E2E ampliados ainda não foram
executados contra um novo artefato neste registro.

## Candidato e trabalho preservado

A matriz31 permanece no JAR `5cce633e515d76346da3b534e7f9ce3697a65eb3`,
SHA-256 `2db5ed4a9c167a7f356da21b792a602e84d160435b18a7e44e4134ab9d0933d6`.
Ela foi preservada, sem reconstrução ou interrupção. Às 06:40Z, sete parcelas
estavam aprovadas e a família plataforma estava ativa; o resultado global ainda
não estava disponível. Contagens consolidadas posteriores ficam no checkpoint.

A correção deste ciclo altera Angular e exige novo artefato: não atribuir a
matriz31 a ele. Não executar manutenção/troca do candidato intermediário apenas
para depois substituí-lo novamente. Recolher primeiro a execução em andamento;
build novo somente depois de liberar candidato/locks. O backend de consulta no
startup permanece, sem reconstruir o build antigo.

Hml `97d75b0` foi conferida UP, com o mesmo PID, hash e banco clonado. Baseline
`449ce3c` preservado. Não houve deploy, promoção, merge ou provisionamento hml.
Não retornar ao banco anterior à identidade nem repetir a empresa assistida28.

Sprint01 continua aberta. Manutenção do candidato final, atualização/retorno
binários compatíveis, smokes, revisão visual final e aceitação ainda são gates.
PR #3 permanece aberto; Sprints02–05 fora do escopo. Setup Mac não verificado.

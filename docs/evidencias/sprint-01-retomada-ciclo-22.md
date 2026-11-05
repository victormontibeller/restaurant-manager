# Sprint01 — retomada ciclo22

Missão não concluída. Fonte herdada96769ac e worker finito21 preservados;
nenhuma suíte interrompida, novo build, deploy ou promoção nesta gravação.
PR3 permanece aberto/draft. Sprints02–05 não iniciadas.

## Acessibilidade dos formulários

Revisão independente encontrou dois defeitos concretos: entrada por teclado
na recuperação perdia foco em BODY e divergência/limite UTF-8 de senha tinham
somente alerta geral, sem associação ao campo. Mesma classe de problema existia
no cadastro e aceite de convite; a troca para verificação também perdia foco.

Probe novo com componentes Angular reais e serviço fictício reproduziu dez
asserções reprovadas antes da correção: quatro títulos e dois erros locais em
três formulários. A primeira tentativa do probe esbarrou na limitação de output()
no bundle JIT e não foi tratada como vermelho de produto. O probe corrigido
explicita essa limitação e chama o handler de retorno; a emissão pelo template
compilado permanece responsabilidade dos E2E.

Correção encaminha foco ao título da superfície aberta, preserva o retorno ao
login e associa o erro local ao campo via aria-invalid/aria-describedby, sem
perder a explicação de tamanho. Senhas continuam sendo limpas, comandos inválidos
não são enviados e falha de rede/5xx continua resultado incerto, sem culpar o
campo. Os botões públicos também ganharam separação explícita e quebra de linha.
Não mudou API, validação de negócio, credenciais ou persistência. Erros estruturais
genéricos recebidos da API não ganharam detalhes por campo neste incremento.

Vermelho/verde nos probes; Chromium, Firefox e WebKit passaram. Revisão adicional
identificou referência ARIA que poderia ser inexistente no teste: corrigida para
conferir o elemento e sua descrição acessível. Nova rodada dos três motores passou.
Teste ampliado não é E2E e não aprova o JAR antigo para o Angular novo.

Os E2E existentes de recuperação/cadastro/convites/verificação foram ampliados
com abertura por teclado, foco e descrição acessível dos erros; ainda não
executados contra artefato novo nesta gravação. O comando de templates existente
passa a incluir o probe, sem criar outra camada de orquestração Python.

## Lacunas de isolamento convertidas em testes

A revisão apontou ausência de prova de cancelamento SQL com reuso de conexão/thread
e de alteração cadastral em tenants com IDs coincidentes. Acrescentados:

- Cancelamento JDBC real de pg_sleep, SQLState57014, rollback e contexto neutro;
  mesmo PID PostgreSQL e mesma thread antes de consultar exclusivamente B1.
  Rede/canal de cancelamento limitados, liberação em finally independente.
  Não equivale a cancelamento de requisição HTTP ou job Spring.
- Alteração de unidades com mesmo UUID, usuário/e-mail coincidentes em A/B,
  JWT cruzado negado nas duas direções, contraparte/versionamento preservados,
  leitura posterior e eventos explicitamente conferidos por nome/versão/tipo.

A segunda revisão detectou que buscar o nome no JSON inteiro poderia validar
apenas a projeção atual e não eventos; assertivas foram fortalecidas em eventos[].
Testes Java compilaram, mas sua execução PostgreSQL local aguarda o worker21:
não disputar rm_test com a suíte em andamento nem chamar compilação de teste aprovado.

## Verificações e limites

Typecheck aplicação/E2E e compilação Java de testes passaram. Os probes existentes
de perfis passaram nos três motores, além do novo probe. Uma chamada combinada
expirou após templates durante typecheck; typecheck e compilação foram executados
novamente com sucesso e resultado separado. Diff/scanner passaram antes da
publicação; revisão de âncoras é distinta do scanner de links locais.

Às22:35Z, o worker21 havia consolidado UI04(5), UI35(5), identidade restante(40),
eventos(50) e verificação(15), zero falha/skip/flaky/retry; cadastro ainda estava
em execução. Esses resultados pertencem somente ao SHA96769ac/hash50a2a604,
não ao incremento local de acessibilidade. Nenhuma matriz global nova aprovada.

Hml3cd4eeb saudável na retomada, baseline449ce3c preservado; bancos dev/test/hml
relidos por suas rolesapp distintas em loopback55432. Alteração solicitada de
AGENTS.md foi recusada pela proteção do executor, sem contorno. Autorização
vigente já está no guia canônico. Próximo: publicar incremento revisado, conferir
CI/novos testes; recolher worker21 antes de build único novo e E2E atualizado.
Manutenção/troca/ensaio assistido/smokes/visual/aceitação continuam pendentes.

# Sprint 01 — retomada ciclo 13

Manutenção corrigida executada integralmente em PostgreSQL real: clone, migrador
Java, três startups nativos, contas/negativos antes/depois, DDL confirmado seguido
de falha SQL injetada e retorno do original por OID. Resultado aprovado em
2026-11-04T22:42:59Z: 2061 tabelas e 19146 linhas iguais, original preservado,
clone abandonado bloqueado. Hml permaneceu na fundação durante esse ensaio.

Fonte do runner `1c8402b`, JAR `3cd4eeb`, SHA-256
`1697a473d968c0246a0b83b23bbd192b7e7fddbc282f061d66cf5f08a6c9d744`.
Não houve rebuild nem repetição de UI04/UI05. Os dois checks CI de `1c8402b`
passaram; 106 testes Python locais e revisão independente sem novo bloqueador.

Transição hml executada após o ensaio: banco original preservado/bloqueado,
clone migrado, candidato HTTPS servido e verificado no SHA/hash acima. Baseline
`healthy.json` permanece na fundação `449ce3c`; candidato não foi promovido.
Bootstrap CLI/API criou dois administradores em empresas diferentes e A1/A2.
Novo seed API/captura criou cinco perfis e dois clientes; leitura posterior,
negativos de tenant/unidade/administração e revogação por logout aprovados.
Operador SaaS fictício criado pelo owner, sem credencial compartilhada com as
contas empresariais; login/consulta/isolamento/logout reais aprovados.

Novo smoke de homologação cobre dez identidades nos cinco projetos de navegador,
com UI/API, sessão/cookies/refresh/logout, fronteiras empresariais e filiais,
administração negada, teclado e largura. Somente consultas de negócio e mutações
de sessão: não substitui a matriz integral da Sprint. Execução E2E ainda pendente
neste registro. Runner não promove baseline e exige cobertura exata sem retries,
skips ou flaky, fonte limpa, SHA/hash/runtime estáveis e relatório privado.

Revisão independente encontrou PID duplicado na construção do registro e fixture
permitindo repetição de cliente. Vermelho Python reproduziu o TypeError; correção
separa PID servido e PID do runner. Guarda de identidades passou a exigir dez
pares host/usuário e host/e-mail distintos, perfis/origens e empresas corretas.
Regressões adicionais validam os achados, sem chamar mock de teste integrado.

Sprint 01 aberta; matriz integrada/promotor e demais critérios pendentes.
Sprints 02–05 não iniciadas. Sem merge nem conclusão técnica artificial.

## Resultado observado às 23:07Z

Smoke hml encerrado com exit0: cinquenta combinações exatas de S01-HML01–10 nos
cinco projetos, sem falha, skip, retry ou flaky. Duração535545ms. Fonte dos testes
`dc3240c`, mesmo JAR3cd4eeb e hash acima; runtime/PID/fixture/baseline estáveis.
O relatório não promove healthy.json. Ambos checks CI de dc3240c passaram.
Suíte Python final:111 testes aprovados; guardas reais de fixture JS, typecheck,
sintaxe Bash, scanner e diff aprovados. Guarda JS acrescentada a CI/build futuro,
sem provocar rebuild local do JAR imutável.

Inspeção visual direta de oito capturas: Administrador mobile/WebKit desktop,
SaaS mobile, Cozinha/Cliente/Atendimento/Expedição mobile e Gerente tablet.
Texto/controles visíveis legíveis e sem overflow observado; foco do seletor
visível. São recortes de viewport: conteúdo inferior e todas as telas não foram
visualmente aprovados. Emulação, não aparelhos físicos.

Primeiro lançamento do smoke foi recusado antes dos navegadores por normalização
do wrapper Windows no clone novo. Configuração local do clone corrigida, bytes
comparados com o blob e checkout limpo conferido antes do segundo lançamento.
Log da recusa preservado; não foi uma falha funcional convertida em retry verde.

Regressão finita começou após término do smoke, com fonte/JAR fixos, locks,
manifesto/logs/resultados duráveis e candidato próprio rm_test. Não é outro
coordenador. Executa as demais famílias sem repetir UI04/UI05 já aprovados no
mesmo artefato. Resultado ainda não consolidado neste registro; preservá-la se
atravessar ciclos. Continuidade da suíte não significa aprovação antecipada.

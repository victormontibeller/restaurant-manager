# Gestão compacta — evidência local de 2026-11-12

Implementação local sobre `1f3feb69d1b9`, em Angular com Spartan/Tailwind. A
[diretriz visual](../09_UI_GUIDELINES.md#densidade-da-gestão) registra os padrões.
Rotas e contratos da API preservados. A implementação é de frontend, sem
migração de dados da aplicação.

## Comparação de Pedidos

Capturas do Angular compilado no commit-base e no candidato, com os mesmos
oito pedidos fictícios, unidade, perfil, filtros, posição de rolagem e relógio.
O navegador recebeu respostas simuladas para repetir a mesma fila. Não houve
uso da massa da demonstração. O build visual registrou PWA `3c8af36b931bbe52a34a`.

| Área visível | Pedidos completos antes | Pedidos completos depois |
| --- | ---: | ---: |
| 1280 × 900 | 0 | 8 |
| 768 × 1024 | 0 | 7 |
| 360 × 800 | 0 | 2 |

As três larguras passaram sem rolagem horizontal. O roteiro visual verificou
expansão com Enter, rascunho após atualização da fila, altura dos filtros e
alternância de tema com teclado e persistência após recarga.

## Regressão local

- `format:check`, `typecheck`, `test:logic`, `test:templates` em Chromium,
  Firefox e WebKit e `build` passaram. Os probes de template usam transporte
  fictício. O build incluiu o inventário da PWA.
- A API HTTPS usou PostgreSQL `rm_test` isolado em loopback. Pagamentos online
  usaram o simulador HTTP local. Convites usaram captura de e-mail fictícia.
- Na primeira rodada Chromium desktop, Cardápio passou 10/10, Identidade 9/9
  e Funcionamento 2/2. Convites passou 3/4. A suíte de Convites foi reexecutada
  integralmente e passou 4/4 após abrir explicitamente o editor no cenário de
  seleção de perfil. Em Chromium móvel, as três jornadas de catálogo passaram.
- Pedidos passou 11/13 na primeira rodada. `S03-UI01` passou na reexecução com
  o seletor da seleção do painel atual e verificação de texto sem corte.
  `S03-UI12` passou na reexecução com o tamanho de paginação por tipo de ponteiro.
  `S03-UI04` e `S03-UI06` passaram também no Chromium móvel.
- Financeiro/entregas passou 9/10 na primeira rodada. `S04-UI03` passou na
  reexecução após aguardar a conclusão da consulta de comanda antes de trocar
  de rota. A guarda de navegação foi preservada.
- No build das capturas, passaram as três jornadas dirigidas de Pedidos e
  Mesas no WebKit, as três de Cardápio no Firefox e as três de Equipe e
  Unidades no Chromium tablet. A edição de vínculos e revogação de acesso
  (`S01-UI35`) passou no Chromium desktop após reexecutar o cenário com a
  sequência explícita de abrir e fechar a lista de unidades atribuídas.

As rodadas e reexecuções locais abrangeram candidatos sucessivos. A matriz
completa deve ser executada no release integrado de homologação. Relatórios
autenticados, fixtures e logs da execução ficam em armazenamento privado.

## Publicação na demonstração local

Em 13/11, a sessão Java ativa do VS Code em `8095` passou a servir o frontend
validado a partir de `backend/target/classes/static`. O índice, o service worker
e os arquivos compilados publicados foram comparados com o build por HTTPS com
a CA local. A saúde permaneceu `UP`. A atualização reutilizou o processo Java
e o PostgreSQL `rm_dev` ativos. A cópia anterior dos arquivos estáticos ficou
em armazenamento privado temporário para reversão.

No Chromium, o Administrador abriu a fila compacta, os detalhes de um pedido
pelo teclado e os editores de Cardápio, Mesas, Unidades, Equipe e Convites.
A preferência de tema escuro persistiu após recarregar. A verificação abriu
13 pedidos na página consultada e encerrou a sessão de teste, sem gravações de
negócio. O roteiro permitiu somente consultas e chamadas de sessão. Uma
primeira checagem bloqueou a renovação de sessão de mesa no próprio roteiro e
foi reexecutada com essa chamada permitida, sem erros JavaScript ou HTTP 5xx.
O mesmo roteiro passou pela porta 4200 do Angular, com a API da demonstração
via proxy e recarregamento ao salvar enquanto a sessão do VS Code estiver ativa.

# Interface, acessibilidade e PWA

> **Escopo:** experiência responsiva, estados de conexão, acessibilidade e comportamento da PWA.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Usabilidade e PWA

- Interface responsiva de verdade: cliente com uma mão no celular, atendimento em tablet, caixa/cozinha em telas maiores. Validar larguras representativas de 360, 768 e 1280 pixels e ao menos aparelhos reais definidos para o piloto.
- Teclado, foco visível, rótulos, ordem de navegação, leitores de tela e contraste. Meta proposta: WCAG 2.2 nível AA nas jornadas do piloto, com verificação manual além de ferramenta automática.
- Cards visuais com preço e ação legíveis; imagens responsivas, carregamento gradual e sem vídeos com autoplay sonoro. Vídeo é melhoria posterior caso prejudique desempenho do piloto.
- Carrinho sempre mostra unidade, canal, itens, adicionais, taxa e total. Explicar diferença entre aguardar pagamento, aceite e preparo.
- Painéis mostram relógio/atraso, conexão, última atualização e pendências. Alerta não depende apenas de cor ou som; som pode exigir gesto/permissão do navegador.
- Se a rede cair, mostrar estado desatualizado e impedir falsa confirmação. Reconciliar envio incerto com a mesma chave de idempotência; não gerar nova cobrança por um retry de interface.
- PWA é instalação opcional conforme suporte do navegador. Não prometer instalação/push/background idênticos em todas as plataformas.
- Cache apenas do shell e conteúdo público explicitamente permitido, segregado por empresa. Não armazenar respostas autenticadas, tokens, endereço, pagamento ou eventos de escrita no service worker.
- Rascunho local de carrinho, se adotado, deve ser limitado a dados não sensíveis, identificado por tenant/unidade e revalidado no servidor; nunca equivale a pedido aceito.
- Atualização da aplicação não deve interromper silenciosamente checkout ou atendimento. Informar nova versão e preservar/reconciliar operação em andamento.

## Diretrizes de implementação

- Na configuração de combo, mostrar grupos, limites, opções incluídas e acréscimos antes de confirmar. Diferenciar configurações de duas unidades e exigir nova escolha se uma opção ficar indisponível, conforme [Regras de negócio](20_BUSINESS_RULES.md#combos-personalizaveis).
- No KDS, exibir componentes/adicionais de cada combo e contagens por unidade comercial. Iniciar/concluir uma quantidade identifica as unidades afetadas; não ocultar preparo parcial da linha. Cancelamento por componente não aparece como ação de consumo.

- Angular responsivo/PWA, HTML semântico, teclado, foco visível, rótulos e erros compreensíveis. Valide computador, tablet e celular; não dependa de hover nem somente de cor/som.
- Dê retorno para carregamento, vazio, indisponibilidade, envio pendente e falha de conexão. Preserve contexto para reconciliar uma operação cujo resultado não chegou.
- Não confirme pedido ou pagamento offline. Service worker não deve armazenar tokens, respostas privadas ou operações de escrita para envio automático.
- Guardas de rota e visibilidade refletem permissões; a API continua responsável por garanti-las. Evite retornar dados que o perfil não precisa.

## Política implementada na Sprint 2

A PWA guarda somente os arquivos estáticos públicos enumerados pelo build:
HTML, JavaScript/CSS com hash, manifesto e ícones. Cada origem tem seu cache;
nenhuma API, imagem de catálogo, consulta de saúde, resposta autenticada ou
escrita entra nele. Navegação offline usa apenas o shell, sem persistir a
query string. Carrinho, credencial e intenções pendentes ficam em memória;
recarregar a página descarta esses rascunhos.

Uma nova versão espera consentimento ou fechamento das abas anteriores. O
botão de atualização informa que recarregará a aba e pede confirmação para
descartar formulários/carrinho não salvos. Outra aba não é recarregada
automaticamente. Duas versões anteriores dos assets permitem manter abas
já abertas durante a transição. Instalação depende do suporte do navegador;
emulação local não comprova instalação em aparelho físico.

A cor de abertura da PWA e os ícones instaláveis usam terracota `#a53e2b`.
O rodapé do cliente exibe a instalação como ação discreta quando o navegador
oferece o recurso. Avisos aparecem quando a conexão cai ou quando uma atualização
está disponível. A consulta de diagnóstico do servidor fica na área interna.
Links públicos inexistentes abertos diretamente no navegador recebem uma página
HTML com status 404, acesso ao cardápio e entrada manual de mesa. O frontend
usa a mesma mensagem nas navegações internas. A abertura offline de pedidos e
mesas exige que o identificador na rota tenha formato de UUID.

A vitrine permite consulta de unidade fechada, mas a composição confirmável
depende de funcionamento atual e recálculo pelo servidor. Resumo expira após
60 segundos ou mudança de rede/itens. Troca de unidade/canal informa o impacto
e exige consentimento para esvaziar o carrinho antes de consultar o novo
contexto. A confirmação do resumo não é aceite de pedido.

## Interfaces da Sprint 4 local

Conta/checkout reutilizam endereços pessoais; delivery exige cotação confirmada
antes do envio. Configuração de regiões e integração ficam na gestão administrativa;
expedição, financeiro, pendências e relatórios seguem ações/unidade. Componentes
e serviços permanecem nos domínios correspondentes, com carregamento lazy das rotas.
O painel financeiro só consulta ao ser aberto no pedido, evitando consultas em lote
invisíveis para todos os cartões da fila.
A escolha de abatimento mostra nome preservado no pedido, posição do item,
unidade comercial e pedido de origem; a taxa aparece separadamente. O item
selecionado também é descrito fora do select para leitura em tela estreita.
Recebimentos têm numeração correspondente na lista e na escolha de devolução.

Recebimento, abatimento, reserva e confirmação são formulários distintos. Resultado
incerto conserva intenção/payload e bloqueia nova escrita até recuperar a mesma
operação. Atualização do pedido/comanda reconsulta o painel financeiro aberto
sem apagar o rascunho do mesmo recurso; troca de identidade/recurso limpa o
formulário. Resultado incerto é resolvido antes dessa atualização.
Navegação/fechamento da página avisam sobre intenção pendente; logout
mantém sua regra de segurança. Troca de identidade/unidade descarta respostas antigas.
Checkout abre no provedor e retorna ao acompanhamento; query de retorno não muda
estado. Valores recebidos, devolvidos e pendências são mostrados separadamente.
Expedição não oferece entrega bem-sucedida enquanto houver ocorrência pendente.
Critérios e evidências ficam na [estratégia](26_TEST_STRATEGY.md) e no checkpoint.

## Documentos relacionados

- [Jornadas do produto](01_PRD.md)
- [Permissões e visibilidade](11_ACCESS_CONTROL.md)
- [API e portabilidade](08_API_STANDARDS.md)

## Operação da Sprint 3 local

Pedidos, mesas/comandas e KDS mantêm áreas por domínio e ações determinadas pela
política efetiva. Cada unidade comercial pode ser selecionada para um lote; o
combo é apresentado completo, sem cancelamento ou estado isolado de componente.
No celular, painéis internos evitam margens e bordas acumuladas. A seleção
mostra unidades numeradas e estados legíveis; comandos continuam transportando
os UUIDs completos, sem depender do texto apresentado.
Envio e comandos conservam a intenção enquanto o resultado estiver incerto e
consultam/repetem a mesma operação, sem criar pedido substituto silenciosamente.

Acompanhamento usa SSE autenticado com fallback por polling de cinco segundos.
Páginas de pedidos próprios com mais de uma unidade também reconsultam o
snapshot autorizado a cada cinco segundos; as consultas são serializadas e
interrompidas quando muda o contexto ou o componente é destruído.
Conexão perdida deixa o estado explicitamente desatualizado; retorno reconsulta a
API. Nenhuma escrita é enviada pelo service worker. Tokens, códigos, dados de
pedido e intenções permanecem em memória; recarregar não promete recuperar um
rascunho que não foi persistido no servidor. O QR é gerado localmente e inclui
somente a URL pública da mesa; há link textual acessível equivalente.

Mesas, solicitações e seleção de comanda assistida oferecem paginação explícita.
As páginas de mesas e solicitações são independentes: uma navegação recebida
durante atualização aguarda a consulta em curso e preserva a outra página.
Consultas em andamento indicam progresso sem desabilitar controles de leitura
ou retirar seu foco. Seleção e paginação assistidas também serializam consultas;
a confirmação de novo pedido permanece bloqueada durante a leitura ou incerteza,
preservando a recuperação da intenção já enviada.
Trocar unidade ou sessão descarta navegações e respostas do contexto anterior.
Uma consulta tardia de comanda não substitui a seleção atual nem apaga seu erro.
Rejeição definitiva do primeiro cadastro permite corrigir o nome; resultado
incerto conserva intenção e payload até reconciliação.

Delivery desta etapa é controlado e fictício. A interface não oferece recebimento
ou devolução real; conclusão financeira e expedição ficam para a Sprint 4.

Mensagens de atualização automática devem preservar a posição dos controles.
Reserve espaço que acompanhe a quebra natural do texto, inclusive para estado
de conexão e horário ainda desconhecido; não corte avisos nem use uma altura
fixa que impeça ampliação de fonte. Valide teclado e um clique por ponteiro
durante a atualização, além do resultado após a consulta.

Erros de consulta e de ação têm ciclos distintos. Uma atualização automática
ou consulta manual concorrente não apaga rejeição de comando nem seu resultado
incerto. O sucesso da consulta resolve somente seu erro de leitura; uma nova
ação ou troca de contexto trata o erro da ação anterior. Falhas de autorização
e conexão continuam visíveis sem substituir silenciosamente o motivo do comando.

## Redesenho por área — 2026-11-08

Implementação validada localmente, conforme [ADR 0003](adr/0003-spartan-navegacao-por-area.md). Cliente inicia no cardápio; gestão possui entrada própria e abre pedidos em andamento; cozinha é uma tela dedicada. O tema de bistrô usa a mesma fundação Spartan/Tailwind nas três áreas. Acessos e unidades refletem ações efetivas e continuam garantidos pela API.

A navegação mantém sessão, carrinho e pendências em memória. Rascunhos de formulários pedem confirmação ao sair; comandos em andamento impedem saída até reconciliação, e logout permanece possível. Upload confirmado ainda exige salvar a associação ao produto. Recarregar continua descartando o rascunho. Links antigos de mesa e plataforma redirecionam para as novas rotas.

Páginas usam carregamento sob demanda. O service worker enumera chunks completos do build e um banner público ilustrativo, além do shell já permitido; imagens de catálogo, APIs e operações privadas não entram no cache. O catálogo interno de componentes está em `/design-system`. Evidências de validação são registradas no checkpoint; esta descrição não aprova homologação Linux, aparelhos físicos ou piloto.

O painel da cozinha apresenta Na fila, Em preparo e Prontos simultaneamente em
monitor; abaixo de 1024 pixels usa abas Spartan Brain, com setas/Home/End para
foco e Enter/espaço para ativação. Cabeçalho e conexão são compactos. Cada pedido
ocupa somente a coluna de seu estado confirmado, mesmo no preparo parcial.
Totais globais e paginação independente vêm da API; nunca inferir total pela
página carregada. Prontos anteriores ao dia local da unidade ficam recolhidos,
sem concluir ou apagar pedidos. Conclusão ausente permanece visível nesse grupo.

O cartão próprio da cozinha mostra mesa/canal, referência curta, itens,
componentes/adicionais, observação e quantidades por estado. Histórico e
orientações secundárias ficam recolhidos. Iniciar pedido atua somente nas
unidades na fila; Concluir em preparo atua somente nas iniciadas. A seleção
parcial continua disponível, sem dividir o combo em produtos independentes.
Comandos usam versão, IDs e intenção durável existentes; resultado incerto tem
recuperação também fora do cartão. Conflito limpa a seleção e exige revisão.

Atualizações preservam seleção válida e posição de leitura. Avisos de novas
entradas usam eventos confirmados, inclusive fora da página atual, sem tocar
no replay inicial. Som começa desligado e depende de clique; preferência dura
somente na aba. Falha de áudio mantém o aviso visual. Tempos distinguem idade
do pedido, início do preparo e conclusão, sem metas arbitrárias de atraso.
Tela cheia depende de ação do operador. Os controles têm alvo mínimo de 48 pixels.

A implementação e a validação desse incremento ficam no
[registro do painel](evidencias/painel-cozinha-2026-11-10.md); pendências globais
continuam no checkpoint.

## Cardápio do cliente

A vitrine pública usa superfícies claras, títulos serifados e terracota nas
ações e na categoria selecionada. No desktop, o banner parte de 248 px e
dedica pouco mais da metade da largura à fotografia. No celular, parte de
96 px e cresce conforme o texto. A busca e o botão **Filtros** ficam na mesma
linha, seguidos pela unidade e pelo canal ativos e pela faixa rolável de
categorias. Clientes autenticados também podem alternar para **Meus favoritos**.

O painel de filtros abre pela base no celular e fica centralizado nas telas
maiores. **Aplicar filtros** seleciona unidade e canal juntos. **Cancelar** e
**Escape** descartam a edição e devolvem o foco. Se houver itens no carrinho,
a troca de contexto exige confirmação. Após a troca, a busca mantém o texto
e volta à primeira página em **Todos**.

Nos cartões, a foto do prato, quando disponível, acompanha nome e preço. Em
telas estreitas, a descrição da lista tem até duas linhas e **Ver opções**
abre o texto completo. Os controles principais preservam alvos de 48 px.
Mensagens de indisponibilidade e perda de conexão continuam visíveis durante
a consulta do cardápio.

No desktop, a prévia do carrinho acompanha a rolagem da vitrine e mostra a
contagem, a unidade e o canal. Com itens, lista até três configurações, com
nome e quantidade, e indica quantas ficaram de fora. **Ver carrinho** abre
a página completa na aplicação. Os valores calculados pelo servidor, a edição
e o envio ficam nessa página. Celular e tablet usam o atalho móvel.

### Carrinho e finalização

O mesmo frontend Angular atende celular, tablet e desktop. Em **Meu carrinho**,
cada configuração tem nome, descrição, quantidade e ações de edição e remoção.
Quando o produto tem foto, a miniatura acompanha o nome. A composição por
unidade mostra os nomes e as quantidades das escolhas e dos adicionais.
O desktop mostra os itens e a revisão lado a lado. No celular, a página empilha os
painéis e mantém a ação de revisão ou confirmação acessível acima da
navegação inferior. O resumo apresenta os subtotais e o total calculados
pelo servidor e permite expandir a composição e os preços de cada linha.

Ao confirmar os valores, o foco segue para **Enviar pedido**. O formulário
apresenta os campos do canal e o botão principal ocupa a largura disponível
no celular. Se uma cotação deixar de valer, o envio permanece desabilitado
até nova confirmação. Um envio pendente mantém a consulta e a recuperação
da mesma intenção. O visitante pode entrar na conta e voltar ao carrinho
pela navegação da aplicação.

### Meus pedidos e acompanhamento

Cada pedido mostra perto do topo o canal, o estado atual e uma orientação
para o cliente. As etapas seguem o canal e a modalidade de pagamento.
Em telas estreitas, sequências com cinco ou mais etapas ficam na vertical
para manter os rótulos legíveis. Quando um pedido é cancelado, o estado e
os detalhes do pedido ficam disponíveis com o histórico e os valores.

O link **Acompanhar pedido** abre a página individual. O estado muda conforme
as atualizações recebidas do servidor. Quando a conexão cai, a interface
identifica que está mostrando a informação da última consulta.

### Minha mesa, conta e acesso

O QR abre o formulário com a mesa identificada pelo link. Na rota **Minha mesa**,
a entrada manual também está disponível. Após a autorização, a comanda mostra
mesa, estado, total e saldos do atendimento junto das ações de ajuda e conta.
Comanda e rodadas ficam lado a lado no desktop e empilhadas no celular. O
andamento das rodadas usa o contexto da mesa. Avisos de fechamento, perda
de conexão e recuperação aparecem próximos das ações correspondentes.

**Minha conta** mostra a situação da verificação do e-mail, atalhos e os
endereços salvos. A edição usa o formulário de endereço na própria página.
Os formulários de entrada, cadastro, recuperação e verificação exibem rótulos
e feedback junto aos campos. A navegação preserva o destino original da jornada.

Em **Aceitar convite**, a confirmação usa terracota e **Voltar ao login**
usa contorno. As ações ficam lado a lado em telas largas e empilhadas no
celular. Se a aplicação falhar ao iniciar, o painel de recuperação recebe
foco no título e oferece a ação **Recarregar página**.

### Configuração, pagamento e horários

**Ver opções** e **Editar composição** compartilham um diálogo com os dados
do produto e a foto cadastrada, quando disponível. O diálogo abre pela base
no celular e fica centralizado em telas maiores. Cálculo e confirmação ficam
junto à área de composição. Ao fechar, o foco retorna ao acionador.

No acompanhamento, o painel de pagamento prioriza prazo, tentativa atual e
ações disponíveis. O histórico de tentativas fica recolhido. **Horários e
atendimento** organiza a consulta por unidade e canal e mostra a situação e
o horário da última consulta confirmada. Páginas informativas e controles de
conexão, instalação e atualização da PWA seguem o visual das rotas do cliente.

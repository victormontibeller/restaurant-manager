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

A vitrine permite consulta de unidade fechada, mas a composição confirmável
depende de funcionamento atual e recálculo pelo servidor. Resumo expira após
60 segundos ou mudança de rede/itens. Troca de unidade/canal informa o impacto
e exige consentimento para esvaziar o carrinho antes de consultar o novo
contexto. A confirmação do resumo não é aceite de pedido.

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

A cozinha oferece abas Todas, Na fila, Em preparo e Prontos com comportamento Spartan Brain. Setas e Home/End movimentam o foco; Enter ou espaço ativa a aba. O filtro usa o estado do pedido no servidor, preservando a exibição e seleção de unidades em estados distintos dentro do mesmo pedido. Os controles têm alvo mínimo de 48 pixels e não apresentam contagens globais inferidas da página atual.

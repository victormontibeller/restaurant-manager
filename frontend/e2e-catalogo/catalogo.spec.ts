import { expect, test, APIRequestContext, Locator, Page } from '@playwright/test';
import { ContaCatalogo, fixture, loginUi } from './apoio';
import { abrirConta, navegarUi } from '../e2e-identidade/apoio';

interface ProdutoCriado {
  id: string;
  versao: number;
  nome: string;
  adicionais: { id: string }[];
  grupos: { id: string; opcoes: { id: string }[] }[];
}

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNQaHD4DwADhAHgG0PjMwAAAABJRU5ErkJggg==',
  'base64',
);

function resposta(page: Page, pathname: string, method: string) {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === pathname && response.request().method() === method,
  );
}

async function capturar(page: Page, alvo: Locator, nome: string): Promise<void> {
  await alvo.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.screenshot({ path: test.info().outputPath(nome + '.png'), fullPage: false });
}

async function verificarAlvoDeToque(alvo: Locator): Promise<void> {
  const alturaCss = await alvo.evaluate((elemento) => {
    const estilo = getComputedStyle(elemento);
    return Math.max(
      Number.parseFloat(estilo.minHeight) || 0,
      Number.parseFloat(estilo.height) || 0,
    );
  });
  // O select nativo do WebKit expõe min-height de 18px, mas respeita height de 48px.
  expect(alturaCss).toBeGreaterThanOrEqual(48);
  // O Firefox pode reportar 47.99993896484375 para um alvo CSS de 48px.
  // A tolerância cobre apenas precisão geométrica, preservando o mínimo CSS.
  expect((await alvo.boundingBox())!.height).toBeGreaterThanOrEqual(48 - 0.001);
}

async function entrarSemRecarregar(page: Page, conta: ContaCatalogo): Promise<string> {
  // Os dois chamadores acabaram de sair da conta. Espere o Router encerrar o
  // layout anterior antes de procurar links ou controles da próxima sessão.
  await expect(page).toHaveURL((url) => url.pathname === '/entrar');
  await expect(page.locator('app-equipe-layout')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
  await page.getByLabel('E-mail', { exact: true }).fill(conta.email);
  await page.getByLabel('Senha', { exact: true }).fill(conta.senha);
  const login = resposta(page, '/api/v1/auth/login', 'POST');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const autenticada = await login;
  expect(autenticada.status()).toBe(200);
  const clientes = fixture().contas;
  if ([clientes.clienteA.email, clientes.clienteB.email].includes(conta.email)) {
    await abrirConta(page);
  } else {
    // O retorno desta equipe possui upload incerto e abre o editor preservado.
    // Sua proteção de saída deve continuar ativa até a consulta do resultado.
    await expect(page).toHaveURL((url) => url.pathname === '/gestao/catalogo');
    await expect(
      page.getByRole('region', { name: 'Gestão do catálogo', exact: true }),
    ).toHaveAttribute('aria-busy', 'false');
  }
  await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeVisible();
  return (await autenticada.json()).accessToken;
}

async function produtoNaLista(gestao: Locator, nome: string): Promise<Locator> {
  await expect(gestao).toHaveAttribute('aria-busy', 'false');
  const navegacao = gestao.getByRole('navigation', { name: 'Páginas dos produtos', exact: true });
  const anterior = navegacao.getByRole('button', {
    name: 'Página anterior de produtos',
    exact: true,
  });
  const proxima = navegacao.getByRole('button', {
    name: 'Próxima página de produtos',
    exact: true,
  });
  const paginaAtual = Number(
    (await navegacao.getByText(/^Página \d+$/).innerText()).replace('Página ', ''),
  );

  const navegar = async (botao: Locator, pagina: number) => {
    const consulta = gestao.page().waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === 'GET' &&
        url.pathname === '/api/v1/gestao/catalogo/produtos' &&
        url.searchParams.get('pagina') === String(pagina)
      );
    });
    await botao.click();
    const resultado = await consulta;
    expect(resultado.status()).toBe(200);
    await resultado.finished();
    await expect(gestao).toHaveAttribute('aria-busy', 'false');
    await expect(navegacao.getByText('Página ' + (pagina + 1), { exact: true })).toBeVisible();
  };

  // A criação preserva a página atual. Um combo novo pode ordenar antes do
  // componente já ofertado; a busca percorre a lista inteira a partir do início.
  for (let pagina = paginaAtual - 1; pagina > 0; pagina--) {
    await navegar(anterior, pagina - 1);
  }
  for (let pagina = 0; pagina <= 10000; pagina++) {
    const oferta = gestao.getByRole('button', { name: 'Oferta de ' + nome, exact: true });
    if (await oferta.count()) return oferta;
    if (await proxima.isDisabled()) break;
    await navegar(proxima, pagina + 1);
  }
  throw new Error('Produto criado não encontrado na paginação da gestão.');
}

async function criarCategoria(page: Page, gestao: Locator, nome: string): Promise<string> {
  await gestao.getByRole('button', { name: 'Categorias', exact: true }).click();
  await gestao.getByRole('button', { name: 'Nova categoria', exact: true }).click();
  await gestao.getByLabel('Nome da categoria', { exact: true }).fill(nome);
  const pending = resposta(page, '/api/v1/gestao/catalogo/categorias', 'POST');
  await gestao.getByRole('button', { name: 'Criar categoria', exact: true }).click();
  const criada = await pending;
  expect(criada.status()).toBe(200);
  await expect(gestao.getByText('Categoria salva no servidor.', { exact: true })).toBeVisible();
  return (await criada.json()).id;
}

async function abrirProduto(gestao: Locator, nome: string, categoriaId: string): Promise<Locator> {
  await gestao.getByRole('button', { name: 'Produtos e combos', exact: true }).click();
  await gestao.getByRole('button', { name: 'Novo produto', exact: true }).click();
  const editor = gestao.getByRole('form', { name: 'Editor de produto', exact: true });
  await editor.getByLabel('Nome do produto', { exact: true }).fill(nome);
  await editor
    .getByLabel('Descrição', { exact: true })
    .fill('Produto fictício para validar a Sprint 2.');
  await editor.getByLabel('Categoria do produto', { exact: true }).selectOption(categoriaId);
  for (const rotulo of ['Categoria do produto', 'Tipo de produto']) {
    const seletor = editor.getByLabel(rotulo, { exact: true });
    await verificarAlvoDeToque(seletor);
  }
  return editor;
}

async function salvarProduto(page: Page, editor: Locator): Promise<ProdutoCriado> {
  const pending = resposta(page, '/api/v1/gestao/catalogo/produtos', 'POST');
  const atualizacao = resposta(page, '/api/v1/gestao/catalogo/produtos', 'GET');
  await editor.getByRole('button', { name: 'Criar produto', exact: true }).click();
  const criada = await pending;
  expect(criada.status()).toBe(200);
  await expect(editor).toHaveCount(0);
  expect((await atualizacao).status()).toBe(200);
  const gestao = page.getByRole('region', { name: 'Gestão do catálogo', exact: true });
  await expect(gestao).toHaveAttribute('aria-busy', 'false');
  await expect(
    gestao.getByText('Produto salvo no servidor. Configure sua oferta nas unidades.', {
      exact: true,
    }),
  ).toBeVisible();
  return criada.json();
}

async function ofertar(
  page: Page,
  gestao: Locator,
  produto: ProdutoCriado,
  preco: string,
  capturaOferta?: string,
): Promise<void> {
  await (await produtoNaLista(gestao, produto.nome)).click();
  const oferta = gestao.getByRole('region', {
    name: 'Preço e disponibilidade de ' + produto.nome,
    exact: true,
  });
  await oferta.getByLabel('Unidade da oferta', { exact: true }).selectOption(fixture().unidadeA);
  await expect(oferta).toHaveAttribute('aria-busy', 'false');
  await oferta.getByLabel('Preço base nesta unidade (R$)', { exact: true }).fill(preco);
  await oferta.getByLabel('Disponível nesta unidade', { exact: true }).check();
  await oferta.getByLabel('Delivery', { exact: true }).check();
  const pending = resposta(
    page,
    '/api/v1/gestao/catalogo/produtos/' + produto.id + '/unidades/' + fixture().unidadeA,
    'PUT',
  );
  await oferta.getByRole('button', { name: 'Salvar oferta da unidade', exact: true }).click();
  expect((await pending).status()).toBe(200);
  await expect(
    oferta.getByText('Oferta da unidade salva no servidor.', { exact: true }),
  ).toBeVisible();
  if (capturaOferta) await capturar(page, oferta, capturaOferta);
  await gestao.getByRole('button', { name: 'Fechar oferta', exact: true }).click();
}

async function configurarCombo(
  page: Page,
  combo: ProdutoCriado,
  quantidade: string,
  escolhas: string,
  adicional: boolean,
): Promise<void> {
  await navegarUi(page, '/cardapio');
  const vitrine = page.getByRole('region', { name: 'Nosso cardápio', exact: true });
  const detalhe = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/v1/catalogo/' + combo.id &&
      url.searchParams.get('unidadeId') === fixture().unidadeA &&
      url.searchParams.get('canal') === 'DELIVERY'
    );
  });
  await vitrine.getByRole('button', { name: 'Ver opções de ' + combo.nome, exact: true }).click();
  const produtoDisponivel = await detalhe;
  expect(produtoDisponivel.status()).toBe(200);
  expect((await produtoDisponivel.json()).disponivel).toBe(true);
  const configurador = page
    .getByRole('dialog', { name: 'Configurar produto', exact: true })
    .getByRole('region', {
      name: 'Configurar ' + combo.nome,
      exact: true,
    });
  await expect(configurador.getByLabel('Quantidade do produto', { exact: true })).toBeEnabled();
  await configurador.getByLabel('Quantidade do produto', { exact: true }).fill(quantidade);
  await configurador
    .getByRole('button', { name: 'Adicionar escolha de Escolha principal', exact: true })
    .click();
  await configurador
    .getByLabel('Opção da escolha', { exact: true })
    .selectOption(combo.grupos[0].opcoes[0].id);
  await verificarAlvoDeToque(configurador.getByLabel('Opção da escolha', { exact: true }));
  await configurador.getByLabel('Quantidade desta escolha', { exact: true }).fill(escolhas);
  if (adicional) await configurador.getByLabel(/Queijo extra ·/).fill('1');
  if (adicional) {
    await capturar(
      page,
      configurador.getByText('Selecione entre 1 e 2 escolhas por combo. Selecionadas: 2.', {
        exact: true,
      }),
      'configurador-limites',
    );
    await capturar(page, configurador.getByLabel(/Queijo extra ·/), 'configurador-adicional');
  }
  const previa = resposta(page, '/api/v1/carrinho/calcular', 'POST');
  const calcular = configurador.getByRole('button', {
    name: 'Calcular total desta configuração',
    exact: true,
  });
  await calcular.focus();
  await expect(calcular).toBeFocused();
  await verificarAlvoDeToque(calcular);
  await calcular.press('Enter');
  const calculada = await previa;
  expect(calculada.status()).toBe(200);
  expect((await calculada.json()).linhas[0].precoUnitario).toBe(adicional ? '46.00' : '35.00');
  await expect(
    configurador.getByText('Prévia por unidade: R$ ' + (adicional ? '46,00' : '35,00'), {
      exact: true,
    }),
  ).toBeVisible();
  if (adicional) {
    await capturar(
      page,
      configurador.getByText('Prévia por unidade: R$ 46,00', { exact: true }),
      'configurador-previa-46',
    );
    await configurador.getByLabel('Quantidade do produto', { exact: true }).fill('1');
    await expect(
      configurador.getByText('Prévia por unidade: R$ 46,00', { exact: true }),
    ).toHaveCount(0);
    await configurador.getByLabel('Quantidade do produto', { exact: true }).fill(quantidade);
  }
  await configurador.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  await expect(configurador).toHaveCount(0);
  await expect(
    vitrine.getByRole('button', { name: 'Ver opções de ' + combo.nome, exact: true }),
  ).toBeFocused();
}

async function atualizarOferta(
  request: APIRequestContext,
  token: string,
  produtoId: string,
  campos: object,
): Promise<void> {
  const path = '/api/v1/gestao/catalogo/produtos/' + produtoId + '/unidades/' + fixture().unidadeA;
  const headers = { Authorization: 'Bearer ' + token };
  const atual = await request.get(path, { headers });
  expect(atual.status()).toBe(200);
  const oferta = await atual.json();
  expect(
    (
      await request.put(path, {
        headers,
        data: {
          versao: oferta.versao,
          preco: oferta.preco,
          disponivel: oferta.disponivel,
          canais: oferta.canais,
          ...campos,
        },
      })
    ).status(),
  ).toBe(200);
}

test('S02-UI03: gestão real, mídia, combo, valores reconfirmados e rede nos cinco navegadores', async ({
  page,
  request,
  context,
}) => {
  const chamadasPedido: string[] = [];
  page.on('request', (req) => {
    if (/\/api\/v1\/(pedidos|pagamentos)/.test(new URL(req.url()).pathname))
      chamadasPedido.push(req.method());
  });
  const token = await loginUi(page);
  await navegarUi(page, '/gestao/catalogo');
  const gestao = page.getByRole('region', { name: 'Gestão do catálogo', exact: true });
  await expect(gestao).toHaveAttribute('aria-busy', 'false');
  const sufixo = crypto.randomUUID().slice(0, 8);
  const categoriaId = await criarCategoria(page, gestao, 'S02 categoria ' + sufixo);
  const simplesEditor = await abrirProduto(gestao, 'S02 componente ' + sufixo, categoriaId);
  await simplesEditor.getByRole('button', { name: 'Adicionar adicional', exact: true }).click();
  const adicional = simplesEditor.getByRole('group', { name: 'Adicional 1', exact: true });
  await adicional.getByLabel('Nome do adicional', { exact: true }).fill('Queijo extra');
  await adicional.getByLabel('Preço do adicional (R$)', { exact: true }).fill('3.00');
  await adicional.getByLabel('Máximo por produto', { exact: true }).fill('2');
  await capturar(
    page,
    simplesEditor.getByLabel('Nome do produto', { exact: true }),
    'gestao-produto-informacoes',
  );
  await capturar(
    page,
    adicional.getByLabel('Preço do adicional (R$)', { exact: true }),
    'gestao-produto-adicional',
  );
  await simplesEditor
    .getByLabel('Arquivo da imagem', { exact: true })
    .setInputFiles({ name: 'amostra.png', mimeType: 'image/png', buffer: png });
  const upload = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.startsWith('/api/v1/gestao/midias/') &&
      response.request().method() === 'POST',
  );
  await simplesEditor.getByRole('button', { name: 'Enviar imagem', exact: true }).click();
  expect((await upload).status()).toBe(201);
  await expect(
    simplesEditor.getByText('Imagem validada. Salve o produto para associá-la ao catálogo.', {
      exact: true,
    }),
  ).toBeVisible();
  const simples = await salvarProduto(page, simplesEditor);
  await ofertar(page, gestao, simples, '10.00', 't21-oferta-unidade');

  const comboEditor = await abrirProduto(gestao, 'S02 combo ' + sufixo, categoriaId);
  await comboEditor.getByLabel('Tipo de produto', { exact: true }).selectOption('COMBO');
  await comboEditor.getByLabel('Mostrar nas sugestões da casa', { exact: true }).check();
  await comboEditor.getByRole('button', { name: 'Adicionar grupo', exact: true }).click();
  const grupo = comboEditor.getByRole('group', { name: 'Grupo 1', exact: true });
  await grupo.getByLabel('Nome do grupo', { exact: true }).fill('Escolha principal');
  await grupo.getByLabel('Quantidade mínima', { exact: true }).fill('1');
  await grupo.getByLabel('Quantidade máxima', { exact: true }).fill('2');
  await grupo.getByRole('button', { name: 'Adicionar opção ao grupo 1', exact: true }).click();
  const opcao = grupo.getByRole('group', { name: 'Opção 1 de Escolha principal', exact: true });
  const produtoOpcao = opcao
    .getByLabel('Produto da opção', { exact: true })
    .locator('option[value="' + simples.id + '"]');
  const mais = comboEditor.getByRole('button', {
    name: 'Carregar mais componentes',
    exact: true,
  });
  while (true) {
    await expect
      .poll(
        async () =>
          (await produtoOpcao.count()) > 0 ||
          ((await gestao.getAttribute('aria-busy')) === 'false' &&
            (await mais.isVisible()) &&
            (await mais.isEnabled())),
        { message: 'Aguardar o componente salvo ou uma próxima página disponível.' },
      )
      .toBe(true);
    if (await produtoOpcao.count()) break;
    await mais.click();
    await expect(gestao).toHaveAttribute('aria-busy', 'false');
  }
  await expect(produtoOpcao).toHaveCount(1);
  await opcao.getByLabel('Produto da opção', { exact: true }).selectOption(simples.id);
  await verificarAlvoDeToque(opcao.getByLabel('Produto da opção', { exact: true }));
  await opcao.getByLabel('Acréscimo por escolha (R$)', { exact: true }).fill('5.00');
  await opcao.getByLabel('Limite desta opção no grupo', { exact: true }).fill('2');
  await opcao.getByLabel('Queijo extra', { exact: true }).check();
  await capturar(
    page,
    comboEditor.getByLabel('Nome do produto', { exact: true }),
    'gestao-combo-informacoes',
  );
  await capturar(
    page,
    grupo.getByLabel('Quantidade mínima', { exact: true }),
    'gestao-combo-grupo',
  );
  await capturar(page, opcao.getByLabel('Queijo extra', { exact: true }), 'gestao-combo-opcao');
  const combo = await salvarProduto(page, comboEditor);
  await ofertar(page, gestao, combo, '30.00');

  await navegarUi(page, '/cardapio');
  const vitrine = page.getByRole('region', { name: 'Nosso cardápio', exact: true });
  await vitrine.getByLabel('Unidade do cardápio', { exact: true }).selectOption(fixture().unidadeA);
  await expect(vitrine).toHaveAttribute('aria-busy', 'false');
  await expect(vitrine.getByLabel('Unidade do cardápio', { exact: true })).toHaveValue(
    fixture().unidadeA,
  );
  const canal = vitrine.getByLabel('Canal do cardápio', { exact: true });
  if ((await canal.inputValue()) !== 'DELIVERY') {
    const trocaCanal = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === 'GET' &&
        url.pathname === '/api/v1/catalogo' &&
        url.searchParams.get('unidadeId') === fixture().unidadeA &&
        url.searchParams.get('canal') === 'DELIVERY'
      );
    });
    await canal.selectOption('DELIVERY');
    expect((await trocaCanal).status()).toBe(200);
  }
  await expect(vitrine).toHaveAttribute('aria-busy', 'false');
  await expect(canal).toHaveValue('DELIVERY');
  await vitrine.getByLabel('Buscar produtos', { exact: true }).fill(combo.nome);
  await vitrine.getByLabel('Categoria do cardápio', { exact: true }).selectOption(categoriaId);
  const busca = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/v1/catalogo' &&
      url.searchParams.get('canal') === 'DELIVERY' &&
      url.searchParams.get('busca') === combo.nome &&
      url.searchParams.get('categoriaId') === categoriaId &&
      url.searchParams.get('unidadeId') === fixture().unidadeA
    );
  });
  await vitrine.getByRole('button', { name: 'Buscar no cardápio', exact: true }).click();
  const resultadoBusca = await busca;
  expect(resultadoBusca.status()).toBe(200);
  const catalogo = await resultadoBusca.json();
  expect(catalogo.aberto).toBe(true);
  expect(catalogo.itens.map((item: { id: string }) => item.id)).toEqual([combo.id]);
  expect(catalogo.temMais).toBe(false);
  await expect(vitrine).toHaveAttribute('aria-busy', 'false');
  await expect(vitrine.getByRole('article')).toHaveCount(1);
  const comboEncontrado = vitrine.getByRole('article', { name: combo.nome, exact: true });
  await expect(comboEncontrado).toBeVisible();
  await expect(comboEncontrado.getByText('Sugestão da casa', { exact: true })).toBeVisible();
  await configurarCombo(page, combo, '2', '2', true);
  await configurarCombo(page, combo, '1', '1', false);
  await navegarUi(page, '/carrinho');
  const carrinho = page.getByRole('region', { name: 'Meu carrinho', exact: true });
  let calculo = resposta(page, '/api/v1/carrinho/calcular', 'POST');
  await carrinho.getByRole('button', { name: 'Revisar meu pedido', exact: true }).click();
  const cotacao = await calculo;
  expect(cotacao.status()).toBe(200);
  const resumo = await cotacao.json();
  expect(resumo.linhas).toHaveLength(2);
  expect(resumo.linhas[0].precoUnitario).toBe('46.00');
  expect(resumo.total).toBe('127.00');
  await expect(carrinho.getByText('Total dos itens: R$ 127,00', { exact: true })).toBeVisible();

  await atualizarOferta(request, token, combo.id, { preco: '42.00' });
  calculo = resposta(page, '/api/v1/carrinho/calcular', 'POST');
  await carrinho
    .getByRole('button', { name: 'Confirmar composição e valores', exact: true })
    .click();
  const revisao = await (await calculo).json();
  expect(revisao.requerConfirmacao).toBe(true);
  expect(revisao.total).toBe('163.00');
  await expect(
    carrinho.getByText('O catálogo mudou. Revise os valores atualizados e confirme novamente.', {
      exact: true,
    }),
  ).toBeVisible();
  calculo = resposta(page, '/api/v1/carrinho/calcular', 'POST');
  await carrinho
    .getByRole('button', { name: 'Confirmar composição e valores', exact: true })
    .click();
  expect((await (await calculo).json()).requerConfirmacao).toBe(false);
  await expect(
    carrinho.getByText('Resumo confirmado. O envio do pedido exige confirmação separada.', {
      exact: true,
    }),
  ).toBeVisible();
  const resumoAtual = carrinho.getByRole('region', { name: 'Resumo dos itens', exact: true });
  await capturar(
    page,
    resumoAtual.getByRole('heading', { level: 4 }).first(),
    'carrinho-composicao-163',
  );
  await capturar(
    page,
    resumoAtual.getByText('Total dos itens: R$ 163,00', { exact: true }),
    'carrinho-resumo-163',
  );

  await atualizarOferta(request, token, simples.id, { disponivel: false });
  calculo = resposta(page, '/api/v1/carrinho/calcular', 'POST');
  await carrinho.getByRole('button', { name: 'Revisar meu pedido', exact: true }).click();
  expect((await calculo).status()).toBe(422);
  await expect(carrinho.getByRole('article')).toHaveCount(2);
  await expect(
    carrinho.getByText(
      'Os itens foram preservados. Edite as escolhas indisponíveis; nenhuma substituição foi feita.',
      { exact: true },
    ),
  ).toBeVisible();
  await atualizarOferta(request, token, simples.id, { disponivel: true });

  await context.setOffline(true);
  await expect(
    carrinho.getByRole('button', { name: 'Revisar meu pedido', exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
  await expect(
    carrinho.getByRole('button', { name: 'Revisar meu pedido', exact: true }),
  ).toBeEnabled();
  await navegarUi(page, '/cardapio');
  await vitrine.getByLabel('Unidade do cardápio', { exact: true }).selectOption(fixture().unidadeB);
  await expect(
    vitrine.getByRole('button', { name: 'Trocar e esvaziar carrinho', exact: true }),
  ).toBeVisible();
  await vitrine
    .getByRole('button', { name: 'Manter unidade, canal e carrinho', exact: true })
    .click();
  await navegarUi(page, '/carrinho');
  await expect(carrinho.getByRole('article')).toHaveCount(2);
  await navegarUi(page, '/cardapio');
  await vitrine.getByLabel('Unidade do cardápio', { exact: true }).selectOption(fixture().unidadeB);
  await vitrine.getByRole('button', { name: 'Trocar e esvaziar carrinho', exact: true }).click();
  await navegarUi(page, '/carrinho');
  await expect(carrinho.getByText('Seu carrinho está vazio.', { exact: true })).toBeVisible();
  expect(chamadasPedido).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
});

test('S02-UI04: conflito de edição recupera versão atual e mídia inválida não é publicada', async ({
  page,
  request,
}) => {
  const token = await loginUi(page);
  await navegarUi(page, '/gestao/catalogo');
  const gestao = page.getByRole('region', { name: 'Gestão do catálogo', exact: true });
  await expect(gestao).toHaveAttribute('aria-busy', 'false');
  const categoriaId = await criarCategoria(
    page,
    gestao,
    'S02 conflito ' + crypto.randomUUID().slice(0, 8),
  );
  const editor = await abrirProduto(
    gestao,
    'S02 versão ' + crypto.randomUUID().slice(0, 8),
    categoriaId,
  );
  await editor.getByLabel('Arquivo da imagem', { exact: true }).setInputFiles({
    name: 'invalida.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<svg onload="alert(1)"></svg>'),
  });
  const upload = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.startsWith('/api/v1/gestao/midias/') &&
      response.request().method() === 'POST',
  );
  await editor.getByRole('button', { name: 'Enviar imagem', exact: true }).click();
  expect((await upload).status()).toBe(422);
  await expect(editor.getByRole('alert')).toBeVisible();
  const produto = await salvarProduto(page, editor);
  await produtoNaLista(gestao, produto.nome);
  await gestao.getByRole('button', { name: 'Editar produto ' + produto.nome, exact: true }).click();
  const atual = gestao.getByRole('form', { name: 'Editor de produto', exact: true });
  await atual.getByLabel('Descrição', { exact: true }).fill('Rascunho com versão anterior.');
  const path = '/api/v1/gestao/catalogo/produtos/' + produto.id;
  const headers = { Authorization: 'Bearer ' + token };
  const leitura = await request.get(path, { headers });
  expect(leitura.status()).toBe(200);
  const servidor = await leitura.json();
  expect(
    (
      await request.put(path, {
        headers,
        data: { ...servidor, descricao: 'Alteração concorrente confirmada.' },
      })
    ).status(),
  ).toBe(200);
  const conflito = resposta(page, path, 'PUT');
  await atual.getByRole('button', { name: 'Salvar produto', exact: true }).click();
  expect((await conflito).status()).toBe(409);
  await expect(atual.getByRole('button', { name: 'Salvar produto', exact: true })).toBeDisabled();
  await gestao.getByRole('button', { name: 'Consultar alteração pendente', exact: true }).click();
  await expect(atual.getByLabel('Descrição', { exact: true })).toHaveValue(
    'Alteração concorrente confirmada.',
  );
  await expect(atual.getByRole('button', { name: 'Salvar produto', exact: true })).toBeEnabled();
  await atual.getByLabel('Descrição', { exact: true }).fill('Versão atual revisada e salva.');
  const salva = resposta(page, path, 'PUT');
  await atual.getByRole('button', { name: 'Salvar produto', exact: true }).click();
  expect((await salva).status()).toBe(200);
  expect((await (await request.get(path, { headers })).json()).descricao).toBe(
    'Versão atual revisada e salva.',
  );
});

test.describe('Fronteira de resposta perdida do upload', () => {
  // Somente a perda de resposta exige interceptação sem worker; as jornadas
  // normais de catálogo e os testes PWA preservam o service worker ativo.
  test.use({ serviceWorkers: 'block' });

  test('S02-UI05: upload concluído com resposta perdida é recuperado pelo mesmo identificador', async ({
    page,
    request,
    browserName,
  }) => {
    await loginUi(page);
    await navegarUi(page, '/gestao/catalogo');
    const gestao = page.getByRole('region', { name: 'Gestão do catálogo', exact: true });
    await expect(gestao).toHaveAttribute('aria-busy', 'false');
    const categoriaId = await criarCategoria(
      page,
      gestao,
      'S02 retomada ' + crypto.randomUUID().slice(0, 8),
    );
    const editor = await abrirProduto(
      gestao,
      'S02 imagem ' + crypto.randomUUID().slice(0, 8),
      categoriaId,
    );
    await editor
      .getByLabel('Arquivo da imagem', { exact: true })
      .setInputFiles({ name: 'retomada.png', mimeType: 'image/png', buffer: png });
    const arquivoSelecionado = await editor
      .getByLabel('Arquivo da imagem', { exact: true })
      .evaluate(async (element) => {
        const arquivo = (element as HTMLInputElement).files![0];
        return {
          nome: arquivo.name,
          tipo: arquivo.type,
          bytes: Array.from(new Uint8Array(await arquivo.arrayBuffer())),
        };
      });
    const bytesSelecionados = Buffer.from(arquivoSelecionado.bytes);
    expect(bytesSelecionados.equals(png)).toBe(true);
    let midiaId = '';
    let envios = 0;
    await page.route('**/api/v1/gestao/midias/*', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      envios++;
      // O upload direto do WebKit é coberto em UI03. Nesta fronteira route.fetch
      // retornou 422; o SDK transmite aqui o mesmo File da UI à mesma
      // URL/UUID, sem encaminhar a requisição original nem fabricar resposta.
      const gravacao =
        browserName === 'webkit'
          ? await request.post(route.request().url(), {
              headers: { Authorization: (await route.request().headerValue('authorization'))! },
              multipart: {
                arquivo: {
                  name: arquivoSelecionado.nome,
                  mimeType: arquivoSelecionado.tipo,
                  buffer: bytesSelecionados,
                },
              },
            })
          : await route.fetch();
      expect(gravacao.status()).toBe(201);
      midiaId = (await gravacao.json()).id;
      // A API real já confirmou a transação. Apenas sua resposta ao navegador é perdida.
      await route.abort('failed');
    });
    await editor.getByRole('button', { name: 'Enviar imagem', exact: true }).click();
    await expect(
      editor.getByText(
        'O envio pode ter sido concluído. Consulte seu resultado antes de enviar outra imagem.',
        { exact: true },
      ),
    ).toBeVisible();
    expect(midiaId).not.toBe('');
    await expect(editor.getByRole('button', { name: 'Enviar imagem', exact: true })).toBeDisabled();
    await expect(editor.getByRole('button', { name: 'Criar produto', exact: true })).toBeDisabled();
    const nomeProduto = await editor.getByLabel('Nome do produto', { exact: true }).inputValue();

    // Logout destrói o editor. Outra conta não recebe a intenção nem o arquivo da primeira.
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await entrarSemRecarregar(page, fixture().contas.clienteA);
    await expect(page.getByRole('form', { name: 'Editor de produto', exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Consultar envio da imagem', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    const token = await entrarSemRecarregar(page, fixture());
    await navegarUi(page, '/gestao/catalogo');
    await expect(gestao).toHaveAttribute('aria-busy', 'false');
    await expect(editor.getByLabel('Nome do produto', { exact: true })).toHaveValue(nomeProduto);
    await expect(editor.getByRole('button', { name: 'Enviar imagem', exact: true })).toBeDisabled();
    await expect(
      editor.getByText(
        'O envio anterior desta conta foi preservado. Consulte seu resultado antes de continuar.',
        { exact: true },
      ),
    ).toBeVisible();
    const consulta = resposta(page, '/api/v1/gestao/midias/' + midiaId, 'GET');
    await editor.getByRole('button', { name: 'Consultar envio da imagem', exact: true }).click();
    expect((await consulta).status()).toBe(200);
    await expect(
      editor.getByRole('img', { name: 'Imagem atual do produto', exact: true }),
    ).toHaveAttribute('src', '/api/v1/midias/' + midiaId);
    await page.unroute('**/api/v1/gestao/midias/*');
    const produto = await salvarProduto(page, editor);
    const leitura = await request.get('/api/v1/gestao/catalogo/produtos/' + produto.id, {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(leitura.status()).toBe(200);
    expect((await leitura.json()).midiaId).toBe(midiaId);
    expect(envios).toBe(1);
  });
});

import { expect, test, Page, APIRequestContext, Locator } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  api,
  contexto,
  ok,
  fixture,
  loginApi,
  loginUi,
  navegarUi,
  prepararCatalogo,
  montarCarrinho,
  type CatalogoTeste,
} from '../e2e-pedidos/apoio';
import type { Pedido } from '../src/app/pedidos/modelos';

let catalogo: CatalogoTeste;
test.beforeEach(async ({ request }, info) => {
  const cenario = info.title.match(/S04-UI[0-9]{2}/)?.[0];
  if (!cenario) throw new Error('Cenário Sprint 4 sem identificador.');
  if (['S04-UI01', 'S04-UI02', 'S04-UI07'].includes(cenario)) return;
  catalogo = await prepararCatalogo(request);
  if (!['S04-UI05', 'S04-UI08', 'S04-UI09', 'S04-UI10'].includes(cenario)) return;
  const token = await loginApi(request);
  await ok(
    await api(request, token, '/api/v1/auth/reautenticar', 'POST', { senha: fixture().senha }),
  );
  const rota = '/api/v1/configuracoes/unidades/' + fixture().unidadeA + '/delivery';
  const config = await ok<{ versao: number }>(await api(request, token, rota));
  await ok(
    await api(request, token, rota, 'PUT', {
      versao: config.versao,
      checkoutSegundos: 900,
      regioes: [
        {
          id: randomUUID(),
          nome: 'Centro',
          cepInicial: '01000000',
          cepFinal: '01999999',
          taxa: '5.00',
          minimo: '10.00',
          ativa: true,
        },
      ],
    }),
  );
  if (['S04-UI05', 'S04-UI10'].includes(cenario)) return;
  const autorizacao = await ok<{ url: string }>(
    await api(request, token, '/api/v1/integracoes/mercadopago/autorizar', 'POST'),
  );
  const html = await (await request.get(autorizacao.url)).text();
  const callback = html.match(/href="([^"]+)"/);
  expect(callback).not.toBeNull();
  expect((await request.get(callback![1].replaceAll('&amp;', '&'))).status()).toBe(200);
});

async function area(page: Page, rota: string) {
  await navegarUi(page, rota);
  const unidade = page.getByRole('combobox', { name: 'Unidade da operação', exact: true });
  if (await unidade.count()) await unidade.selectOption(fixture().unidadeA);
  return page.getByRole('main');
}
async function capturar(page: Page, nome: string) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: test.info().outputPath(nome + '.png'), fullPage: true });
}
async function pedidoApi(
  request: APIRequestContext,
  canal = 'RETIRADA',
  quantidade = 2,
  online = false,
): Promise<Pedido> {
  const token = await loginApi(request, fixture().contas.clienteA);
  const linhas = [
    { id: randomUUID(), produtoId: catalogo.simples.id, quantidade, adicionais: [], escolhas: [] },
  ];
  const calculo = await ok<{ revisao: string }>(
    await request.post('/api/v1/carrinho/calcular', {
      data: { unidadeId: fixture().unidadeA, canal, linhas },
    }),
  );
  let revisaoDelivery: string | null = null;
  const endereco = {
    logradouro: 'Rua fictícia Sprint 4',
    numero: '42',
    complemento: '',
    bairro: 'Centro',
    cidade: 'Cidade fictícia',
    uf: 'SP',
    cep: '01000000',
    destinatario: 'Cliente fictício',
    contato: '11999999999',
  };
  if (canal === 'DELIVERY')
    revisaoDelivery = (
      await ok<{ revisao: string }>(
        await request.post('/api/v1/delivery/orcamento', {
          data: {
            unidadeId: fixture().unidadeA,
            cep: endereco.cep,
            subtotal: (quantidade * 10).toFixed(2),
          },
        }),
      )
    ).revisao;
  return ok<Pedido>(
    await api(request, token, '/api/v1/pedidos', 'POST', {
      intencaoId: randomUUID(),
      unidadeId: fixture().unidadeA,
      canal,
      comandaId: null,
      revisao: calculo.revisao,
      linhas,
      observacao: '',
      endereco: canal === 'DELIVERY' ? endereco : null,
      revisaoDelivery,
      pagamento: online ? 'ONLINE' : 'PRESENCIAL',
    }),
  );
}
async function pronto(
  request: APIRequestContext,
  pedido: Pedido,
  fornecido?: string,
): Promise<Pedido> {
  const token = fornecido ?? (await loginApi(request));
  for (const acao of ['aceitar', 'iniciar', 'concluir'])
    pedido = await ok<Pedido>(
      await api(
        request,
        token,
        '/api/v1/' +
          (acao === 'aceitar' ? 'operacao' : 'cozinha') +
          '/pedidos/' +
          pedido.id +
          '/' +
          acao,
        'POST',
        {
          intencaoId: randomUUID(),
          versao: pedido.versao,
          motivo: 'Preparação fictícia',
          unidades: acao === 'aceitar' ? [] : pedido.unidades.map((u) => u.id),
        },
      ),
    );
  return pedido;
}
async function financeiro(page: Page, pedido: Pedido): Promise<Locator> {
  await area(page, '/gestao/pedidos');
  await page.getByLabel('Ordenar pedidos', { exact: true }).selectOption('RECENTES');
  const card = page.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true });
  await expect(card).toBeVisible();
  await card.getByText('Recebimentos, ajustes e devoluções deste pedido', { exact: true }).click();
  const painel = card.getByRole('region', { name: 'Recebimentos e devoluções', exact: true });
  await expect(
    painel.getByRole('button', { name: 'Confirmar recebimento presencial', exact: true }),
  ).toBeVisible();
  return painel;
}
async function selecionarFinanceiro(painel: Locator, rotulo: string, texto: string) {
  const seletor = painel.getByRole('combobox', { name: rotulo, exact: true });
  const opcao = seletor.getByRole('option').filter({ hasText: texto });
  await expect(opcao).toHaveCount(1);
  const valor = await opcao.getAttribute('value');
  expect(valor).not.toBeNull();
  await seletor.selectOption(valor!);
}
async function endereco(page: Page, descricao: string) {
  for (const [rotulo, valor] of Object.entries({
    'Nome deste endereço': descricao,
    'Nome de quem recebe': 'Cliente fictício',
    'Telefone para contato': '11999999999',
    'Rua ou avenida': 'Rua fictícia',
    Número: '42',
    Bairro: 'Centro',
    Cidade: 'Cidade fictícia',
    UF: 'SP',
    CEP: '01000000',
  }))
    await page.getByLabel(rotulo, { exact: true }).fill(valor);
}

test('S04-UI01: cliente mantém endereço próprio com versão e remoção', async ({
  page,
  request,
}) => {
  const tokenCliente = await loginUi(page, fixture().contas.clienteA);
  const descricao = 'Casa Sprint 4 ' + randomUUID().slice(0, 8);
  await navegarUi(page, '/conta');
  const painel = page.getByRole('region', { name: 'Endereço de entrega' });
  await endereco(page, descricao);
  await page.getByLabel('UF', { exact: true }).focus();
  await page.keyboard.press('Tab');
  const salvar = painel.getByRole('button', {
    name: 'Salvar endereço na minha conta',
    exact: true,
  });
  await expect(salvar).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(painel.getByRole('button', { name: 'Usar endereço ' + descricao })).toBeVisible();
  const token = await loginApi(request, fixture().contas.clienteB);
  const lista = await ok<unknown[]>(await api(request, token, '/api/v1/clientes/me/enderecos'));
  expect(lista).toEqual([]);
  await capturar(page, 'endereco');
  page.once('dialog', (dialogo) => void dialogo.accept());
  await painel.getByRole('button', { name: 'Remover ' + descricao, exact: true }).click();
  await expect(painel.getByRole('button', { name: 'Usar endereço ' + descricao })).toBeHidden();
  const salvos = await ok<{ descricao: string }[]>(
    await api(request, tokenCliente, '/api/v1/clientes/me/enderecos'),
  );
  expect(salvos.some((e) => e.descricao === descricao)).toBe(false);
});

test('S04-UI02: administrador configura regiões e vê sobreposição rejeitada', async ({ page }) => {
  await loginUi(page, fixture());
  await area(page, '/gestao/configuracoes/delivery');
  await expect(
    page.getByText('Configuração consultada no servidor.', { exact: true }),
  ).toBeVisible();
  const remover = page.getByRole('button', { name: /^Remover região/ });
  while (await remover.count()) {
    const quantidade = await remover.count();
    await remover.first().click();
    await expect(remover).toHaveCount(quantidade - 1);
  }
  await page.getByRole('button', { name: 'Adicionar região', exact: true }).click();
  await page.getByLabel('Nome da região', { exact: true }).fill('Centro');
  await page.getByLabel('CEP inicial', { exact: true }).fill('01000000');
  await page.getByLabel('CEP final', { exact: true }).fill('01999999');
  await page.getByLabel('Taxa fixa em reais', { exact: true }).fill('5.00');
  await page.getByLabel('Pedido mínimo de itens em reais', { exact: true }).fill('10.00');
  await page.getByLabel('Confirme sua senha', { exact: true }).fill(fixture().senha);
  await page.getByRole('button', { name: 'Salvar regiões e prazo', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('salv');
  await capturar(page, 'regioes');
  await page.getByRole('button', { name: 'Adicionar região', exact: true }).click();
  await expect(page.getByLabel('Nome da região', { exact: true })).toHaveCount(2);
  await page.getByLabel('Nome da região', { exact: true }).last().fill('Sobreposta');
  await page.getByLabel('CEP inicial', { exact: true }).last().fill('01999999');
  await page.getByLabel('CEP final', { exact: true }).last().fill('02000000');
  await page.getByLabel('Taxa fixa em reais', { exact: true }).last().fill('1.00');
  await page.getByLabel('Pedido mínimo de itens em reais', { exact: true }).last().fill('0.00');
  await page.getByLabel('Confirme sua senha', { exact: true }).fill(fixture().senha);
  await page.getByRole('button', { name: 'Salvar regiões e prazo', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /faixas ativas de CEP/ })).toContainText(
    /sobrep/i,
  );
});

test('S04-UI03: administrador registra dinheiro, ajusta e confirma devolução', async ({
  page,
  request,
}) => {
  const pedido = await pedidoApi(request);
  const administrador = await loginUi(page, fixture());
  await area(page, '/gestao/mesas');
  await page.getByText('Cadastrar mesa e confirmar acesso administrativo', { exact: true }).click();
  await page
    .getByLabel('Confirme sua senha para configurar mesas', { exact: true })
    .fill(fixture().senha);
  const reautenticacao = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/v1/auth/reautenticar',
  );
  await page.getByRole('button', { name: 'Confirmar senha para mesas', exact: true }).click();
  await ok(await reautenticacao);
  const nomeMesa = 'Sem consumo ' + randomUUID().slice(0, 8);
  await page.getByLabel('Nome da mesa', { exact: true }).fill(nomeMesa);
  const criacao = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/api/v1/operacao/mesas' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Cadastrar mesa', exact: true }).click();
  const mesa = await ok<{ id: string }>(await criacao);
  const abertura = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/v1/operacao/mesas/' + mesa.id + '/abrir',
  );
  await page.getByRole('button', { name: 'Abrir atendimento em ' + nomeMesa, exact: true }).click();
  await ok(await abertura);
  await page.getByRole('button', { name: 'Consultar comanda de ' + nomeMesa, exact: true }).click();
  await expect(
    page.getByText('Nenhum consumo foi registrado nesta comanda.', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Recebimentos e devoluções', exact: true })
      .getByRole('button', { name: 'Confirmar recebimento presencial', exact: true }),
  ).toBeDisabled();
  const painel = await financeiro(page, pedido);
  await painel.getByRole('combobox', { name: 'Meio', exact: true }).selectOption('DINHEIRO');
  await painel.getByLabel('Valor aplicado (ex.: 20.00)', { exact: true }).fill('20.00');
  await painel.getByLabel('Dinheiro entregue', { exact: true }).fill('50.00');
  await painel
    .getByRole('button', { name: 'Confirmar recebimento presencial', exact: true })
    .click();
  await expect(painel.getByText(/troco.*30,00/)).toBeVisible();
  await painel.getByText('Ajustar cobrança por valor', { exact: true }).click();
  await selecionarFinanceiro(
    painel,
    'Unidade comercial ou taxa',
    catalogo.simples.nome + ' · item 1 · unidade 1',
  );
  await painel.getByLabel('Valor do abatimento', { exact: true }).fill('5.00');
  await painel.getByLabel('Motivo', { exact: true }).first().fill('Abatimento autorizado');
  await painel.getByRole('button', { name: 'Confirmar ajuste de cobrança', exact: true }).click();
  await selecionarFinanceiro(painel, 'Recebimento', 'Recebimento 1');
  await painel.getByLabel('Valor a devolver', { exact: true }).fill('5.00');
  await painel.getByLabel('Motivo', { exact: true }).last().fill('Abatimento autorizado');
  await painel.getByRole('button', { name: 'Reservar devolução', exact: true }).click();
  await expect(
    painel.getByRole('button', { name: 'Confirmar devolução realizada externamente' }),
  ).toBeVisible();
  await painel.getByRole('button', { name: 'Confirmar devolução realizada externamente' }).click();
  await expect(painel.getByText(/CONFIRMADA/)).toBeVisible();
  const campoValor = painel.getByLabel('Valor aplicado (ex.: 20.00)', { exact: true });
  await campoValor.fill('1.00');
  const detalhe = await ok<{ parcelas: { id: string; descricao: string }[] }>(
    await api(request, administrador, '/api/v1/financeiro/pedidos/' + pedido.id),
  );
  const alvo = detalhe.parcelas.find(
    (p) => p.descricao === catalogo.simples.nome + ' · item 1 · unidade 1',
  );
  expect(alvo).toBeDefined();
  const alteradoExternamente = await ok<{ saldo: { totalDevido: string } }>(
    await api(
      request,
      administrador,
      '/api/v1/financeiro/pedidos/' + pedido.id + '/ajustes',
      'POST',
      {
        intencaoId: randomUUID(),
        motivo: 'Ajuste externo ao painel enquanto o formulário permanece aberto',
        alocacoes: [{ parcelaId: alvo!.id, valor: '1.00' }],
      },
    ),
  );
  expect(alteradoExternamente.saldo.totalDevido).toBe('14.00');
  await expect(
    painel
      .locator('dt')
      .filter({ hasText: /^Total devido$/ })
      .locator('xpath=following-sibling::dd[1]'),
  ).toContainText('14,00', { timeout: 15000 });
  await expect(campoValor).toHaveValue('1.00');
  await capturar(page, 'financeiro');
});

test('S04-UI04: resposta perdida recupera o mesmo recebimento persistido', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({
    baseURL: process.env['RM_BASE_URL'],
    ignoreHTTPSErrors: true,
    serviceWorkers: 'block',
    viewport: test.info().project.use.viewport,
    isMobile: test.info().project.use.isMobile,
    hasTouch: test.info().project.use.hasTouch,
  });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(20000);
  const page = await context.newPage();
  try {
    const pedido = await pedidoApi(request);
    const token = await loginUi(page, fixture().contas.caixa);
    const painel = await financeiro(page, pedido);
    let injetado = false;
    await page.route(
      '**/api/v1/financeiro/pedidos/' + pedido.id + '/recebimentos',
      async (route) => {
        const real = await route.fetch();
        expect(real.status()).toBe(200);
        injetado = true;
        await route.abort('failed');
      },
    );
    await painel.getByLabel('Valor aplicado (ex.: 20.00)', { exact: true }).fill('20.00');
    await painel
      .getByRole('button', { name: 'Confirmar recebimento presencial', exact: true })
      .click();
    await expect(
      painel.getByRole('button', { name: 'Recuperar mesma operação financeira' }),
    ).toBeVisible();
    await expect.poll(() => injetado).toBe(true);
    await expect(
      painel.getByRole('button', { name: 'Recuperar mesma operação financeira' }),
    ).toBeEnabled();
    await page.unrouteAll({ behavior: 'wait' });
    await painel.getByRole('button', { name: 'Recuperar mesma operação financeira' }).click();
    await expect(
      painel.getByRole('button', { name: 'Recuperar mesma operação financeira' }),
    ).toBeHidden();
    const estado = await ok<{ recebimentos: unknown[] }>(
      await api(request, token, '/api/v1/financeiro/pedidos/' + pedido.id),
    );
    expect(estado.recebimentos).toHaveLength(1);
  } finally {
    await context.close();
  }
});

test('S04-UI05: expedição despacha, registra ocorrência e nega conclusão sem pagamento', async ({
  page,
  request,
  browser,
}) => {
  const atendimento = await contexto(browser);
  atendimento.context.setDefaultTimeout(15000);
  atendimento.context.setDefaultNavigationTimeout(20000);
  let assistido: Pedido;
  try {
    await loginUi(atendimento.page, fixture().contas.atendimento);
    await montarCarrinho(atendimento.page, catalogo.simples, 'DELIVERY', 2);
    await expect(
      atendimento.page.getByRole('button', { name: 'Salvar endereço na minha conta', exact: true }),
    ).toBeHidden();
    for (const [rotulo, valor] of Object.entries({
      'Nome de quem recebe': 'Cliente fictício',
      'Telefone para contato': '11999999999',
      'Rua ou avenida': 'Rua fictícia Sprint 4',
      Número: '42',
      Bairro: 'Centro',
      Cidade: 'Cidade fictícia',
      UF: 'SP',
      CEP: '01000000',
    }))
      await atendimento.page.getByLabel(rotulo, { exact: true }).fill(valor);
    await atendimento.page
      .getByRole('button', { name: 'Calcular e confirmar entrega', exact: true })
      .click();
    const resposta = atendimento.page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/api/v1/operacao/pedidos' && r.request().method() === 'POST',
    );
    await atendimento.page
      .getByRole('button', { name: 'Enviar pedido assistido', exact: true })
      .click();
    assistido = await ok<Pedido>(await resposta);
  } finally {
    await atendimento.context.close();
  }
  const pedido = await pronto(request, assistido!);
  await loginUi(page, fixture().contas.expedicao);
  await area(page, '/gestao/expedicao');
  const artigo = page
    .locator('app-expedicao > section > article')
    .filter({ has: page.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true }) });
  await expect(artigo.getByText('Rua fictícia Sprint 4', { exact: false })).toBeVisible();
  await artigo.getByRole('button', { name: 'Registrar saída para entrega', exact: true }).click();
  await artigo.getByRole('button', { name: 'Confirmar entrega realizada', exact: true }).click();
  await expect(page.locator('app-expedicao').getByRole('alert')).toContainText(/pagamento|saldo/i);
  await artigo.getByLabel('Motivo da ocorrência ou decisão').fill('Cliente ausente');
  await artigo.getByRole('button', { name: 'Registrar problema na entrega' }).click();
  await expect(artigo.getByText(/Ocorrência:.*PENDENTE/)).toBeVisible();
  await expect(
    artigo.getByRole('button', { name: 'Autorizar nova tentativa de entrega' }),
  ).toBeHidden();
  await capturar(page, 'expedicao');
  const gerente = await contexto(browser);
  gerente.context.setDefaultTimeout(15000);
  gerente.context.setDefaultNavigationTimeout(20000);
  try {
    const tokenGerente = await loginUi(gerente.page, fixture().contas.gerente);
    await area(gerente.page, '/gestao/expedicao');
    const decisao = gerente.page.locator('app-expedicao > section > article').filter({
      has: gerente.page.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true }),
    });
    await decisao.getByLabel('Motivo da ocorrência ou decisão').fill('Nova tentativa autorizada');
    await decisao
      .getByRole('button', { name: 'Autorizar nova tentativa de entrega', exact: true })
      .click();
    await expect(decisao.getByText(/Ocorrência:.*NOVA_TENTATIVA/)).toBeVisible();
    const caixa = await loginApi(request, fixture().contas.caixa);
    await ok(
      await api(
        request,
        caixa,
        '/api/v1/financeiro/pedidos/' + pedido.id + '/recebimentos',
        'POST',
        { intencaoId: randomUUID(), metodo: 'PIX', valor: '25.00', entregue: null },
      ),
    );
    await page.getByRole('button', { name: 'Atualizar expedição', exact: true }).click();
    await artigo.getByRole('button', { name: 'Confirmar entrega realizada', exact: true }).click();
    await expect(artigo).toBeHidden();
    const cliente = await loginApi(request, fixture().contas.clienteA);
    for (const devolverTaxa of [false, true]) {
      const excecao = await pronto(request, await pedidoApi(request, 'DELIVERY'), tokenGerente);
      await page.getByRole('button', { name: 'Atualizar expedição', exact: true }).click();
      const entrega = page
        .locator('app-expedicao > section > article')
        .filter({ has: page.getByRole('article', { name: 'Pedido ' + excecao.id, exact: true }) });
      await entrega
        .getByRole('button', { name: 'Registrar saída para entrega', exact: true })
        .click();
      await entrega
        .getByLabel('Motivo da ocorrência ou decisão')
        .fill('Retorno fictício da entrega');
      await entrega
        .getByRole('button', { name: 'Registrar problema na entrega', exact: true })
        .click();
      await expect(entrega.getByText(/Ocorrência:.*PENDENTE/)).toBeVisible();
      await gerente.page.getByRole('button', { name: 'Atualizar expedição', exact: true }).click();
      const decisao = gerente.page.locator('app-expedicao > section > article').filter({
        has: gerente.page.getByRole('article', { name: 'Pedido ' + excecao.id, exact: true }),
      });
      await decisao
        .getByLabel('Motivo da ocorrência ou decisão')
        .fill('Cancelamento gerencial fictício');
      await decisao
        .getByLabel('Incluir devolução da taxa no cancelamento', { exact: true })
        .setChecked(devolverTaxa);
      await decisao
        .getByRole('button', { name: 'Cancelar entrega conforme decisão financeira', exact: true })
        .click();
      await expect(decisao).toBeHidden();
      const cancelado = await ok<Pedido>(
        await api(request, cliente, '/api/v1/me/pedidos/' + excecao.id),
      );
      expect(cancelado.estado).toBe('CANCELADO');
      expect(cancelado.saldo!.totalDevido).toBe(devolverTaxa ? '0.00' : '5.00');
    }
    const retirada = await pronto(request, await pedidoApi(request), tokenGerente);
    await page.getByRole('button', { name: 'Atualizar expedição', exact: true }).click();
    const pronta = page
      .locator('app-expedicao > section > article')
      .filter({ has: page.getByRole('article', { name: 'Pedido ' + retirada.id, exact: true }) });
    await pronta.getByRole('button', { name: 'Confirmar retirada entregue', exact: true }).click();
    await expect(page.locator('app-expedicao').getByRole('alert')).toContainText(
      /pagamento|saldo/i,
    );
    await ok(
      await api(
        request,
        caixa,
        '/api/v1/financeiro/pedidos/' + retirada.id + '/recebimentos',
        'POST',
        { intencaoId: randomUUID(), metodo: 'PIX', valor: '20.00', entregue: null },
      ),
    );
    await pronta.getByRole('button', { name: 'Confirmar retirada entregue', exact: true }).click();
    await expect(pronta).toBeHidden();
  } finally {
    await gerente.context.close();
  }
});

test('S04-UI10: revogação da expedição remove endereços da tela já aberta', async ({
  page,
  request,
}) => {
  const pedido = await pronto(request, await pedidoApi(request, 'DELIVERY'));
  const token = await loginUi(page, fixture().contas.expedicao);
  await area(page, '/gestao/expedicao');
  const artigo = page
    .locator('app-expedicao > section > article')
    .filter({ has: page.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true }) });
  await expect(artigo.locator('address')).toContainText('Rua fictícia Sprint 4');
  const admin = await loginApi(request);
  await ok(
    await api(request, admin, '/api/v1/auth/reautenticar', 'POST', { senha: fixture().senha }),
  );
  const matriz = await ok<{ versao: number; perfis: Record<string, string[]> }>(
    await api(request, admin, '/api/v1/configuracoes/acessos'),
  );
  const originais = matriz.perfis['EXPEDICAO'];
  const retirar = [
    'pedido.retirar',
    'pedido.despachar',
    'pedido.entregar',
    'entrega.registrar_ocorrencia',
    'entrega.decidir_ocorrencia',
  ];
  expect(originais).toContain('pedido.consultar');
  try {
    await ok(
      await api(request, admin, '/api/v1/configuracoes/acessos', 'PUT', {
        versao: matriz.versao,
        perfil: 'EXPEDICAO',
        acoes: originais.filter((acao) => !retirar.includes(acao)),
      }),
    );
    await expect(
      page.getByRole('heading', { name: 'Seu acesso foi atualizado', exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('app-expedicao')).toHaveCount(0);
    await expect(page.locator('address')).toHaveCount(0);
    expect(
      (await api(request, token, '/api/v1/expedicao?unidadeId=' + fixture().unidadeA)).status(),
    ).toBe(403);
    const unidades = await ok<{ id: string }[]>(
      await api(request, token, '/api/v1/operacao/unidades-existentes'),
    );
    expect(unidades.some((u) => u.id === fixture().unidadeA)).toBe(true);
    const validade = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as {
      exp: number;
    };
    expect(validade.exp).toBeGreaterThan(Date.now() / 1000);
    await capturar(page, 'expedicao-acesso-revogado');
  } finally {
    const atual = await ok<{ versao: number }>(
      await api(request, admin, '/api/v1/configuracoes/acessos'),
    );
    await ok(
      await api(request, admin, '/api/v1/configuracoes/acessos', 'PUT', {
        versao: atual.versao,
        perfil: 'EXPEDICAO',
        acoes: originais,
      }),
    );
  }
});

test('S04-UI06: relatório mostra datas, fuso e indicadores separados', async ({
  page,
  request,
}) => {
  await pedidoApi(request);
  await loginUi(page, fixture().contas.gerente);
  await area(page, '/gestao/relatorios');
  await expect(
    page.getByRole('button', { name: 'Consultar relatório', exact: true }),
  ).toBeEnabled();
  await page.getByLabel('Data inicial', { exact: true }).fill('2026-11-01');
  await page.getByLabel('Data final', { exact: true }).fill('2026-11-09');
  await page.getByRole('button', { name: 'Consultar relatório', exact: true }).click();
  await expect(page.getByText('Período consultado: 01/11/2026 a 09/11/2026.')).toBeVisible();
  await expect(page.getByText(/Fuso da unidade:/)).toBeVisible();
  await expect(
    page.getByText('Recebimentos confirmados no período', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Reservas atuais de devolução', { exact: true })).toBeVisible();
  await capturar(page, 'relatorio');
  await page.getByLabel('Data inicial', { exact: true }).fill('2026-11-09');
  await page.getByLabel('Data final', { exact: true }).fill('2026-11-01');
  await expect(page.getByText('Período consultado: 01/11/2026 a 09/11/2026.')).toBeVisible();
  const invalida = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/v1/relatorios/vendas',
  );
  await page.getByRole('button', { name: 'Consultar relatório', exact: true }).click();
  expect((await invalida).status()).toBe(422);
  await expect(page.locator('app-vendas').getByRole('alert')).toContainText('período válido');
  await expect(page.getByText(/Período consultado:/)).toHaveCount(0);
  await expect(page.getByText('Pedidos criados no período', { exact: true })).toHaveCount(0);
  await page.getByLabel('Data inicial', { exact: true }).fill('2026-11-01');
  await page.getByLabel('Data final', { exact: true }).fill('2026-11-09');
  await page.getByRole('button', { name: 'Consultar relatório', exact: true }).click();
  await expect(page.getByText('Período consultado: 01/11/2026 a 09/11/2026.')).toBeVisible();
  await expect(page.locator('app-vendas').getByRole('alert')).toHaveCount(0);
  const token = await loginApi(request, fixture().contas.cozinha);
  expect(
    (
      await api(
        request,
        token,
        '/api/v1/relatorios/vendas?unidadeId=' +
          fixture().unidadeA +
          '&inicio=2026-11-01&fim=2026-11-09',
      )
    ).status(),
  ).toBe(403);
});

test('S04-UI07: conexão OAuth usa conta fictícia e retorna sem expor segredos', async ({
  page,
}) => {
  await loginUi(page, fixture());
  await area(page, '/gestao/integracoes');
  await page.getByLabel('Confirme sua senha', { exact: true }).fill(fixture().senha);
  await page.getByRole('button', { name: 'Conectar ou autorizar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Autorização fictícia local' })).toBeVisible();
  await page.getByRole('link', { name: 'Autorizar conta fictícia' }).click();
  await expect(page).toHaveURL(/\/gestao\/integracoes\?conexao=concluida/);
  await expect(page.getByText(/Conta vendedora:.*Conectada/)).toBeVisible();
  await expect(page.getByText(/access_token|refresh_token/)).toHaveCount(0);
  await capturar(page, 'integracao');
});

test('S04-UI08: checkout externo volta pendente e só consulta confiável inicia aceite', async ({
  page,
  browser,
}) => {
  await loginUi(page, fixture().contas.clienteA);
  await montarCarrinho(page, catalogo.simples, 'RETIRADA', 1);
  await page.getByLabel('Como deseja pagar?', { exact: true }).selectOption('ONLINE');
  const envio = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/v1/pedidos' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Enviar pedido para aceite', exact: true }).click();
  const pedido = await ok<Pedido>(await envio);
  expect(pedido.estado).toBe('AGUARDANDO_PAGAMENTO');
  let novasTentativas = 0;
  page.on('request', (requisicao) => {
    if (
      requisicao.method() === 'POST' &&
      new URL(requisicao.url()).pathname.startsWith(
        '/api/v1/me/pedidos/' + pedido.id + '/pagamento/tentativas/',
      )
    )
      novasTentativas++;
  });
  await navegarUi(page, '/pedidos');
  const card = page.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true });
  await expect(card.getByRole('link', { name: 'Abrir checkout do Mercado Pago' })).toBeVisible({
    timeout: 30000,
  });
  await card.getByRole('link', { name: 'Abrir checkout do Mercado Pago' }).click();
  await page.getByRole('link', { name: 'Voltar sem pagar' }).click();
  await expect(
    page
      .getByRole('article', { name: 'Pedido ' + pedido.id, exact: true })
      .getByText('Aguardando pagamento', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('article', { name: 'Pedido ' + pedido.id, exact: true })
    .getByRole('link', { name: 'Abrir checkout do Mercado Pago' })
    .click();
  await page.getByRole('button', { name: 'Simular recusa de pagamento' }).click();
  const recusado = page.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true });
  await expect(recusado.getByText('Tentativa recusada ou encerrada', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await recusado.getByRole('button', { name: 'Tentar pagamento novamente', exact: true }).click();
  await expect(recusado.getByRole('link', { name: 'Abrir checkout do Mercado Pago' })).toBeVisible({
    timeout: 30000,
  });
  await recusado.getByRole('link', { name: 'Abrir checkout do Mercado Pago' }).click();
  await page.getByRole('button', { name: 'Confirmar pagamento fictício' }).click();
  await expect(
    page
      .getByRole('article', { name: 'Pedido ' + pedido.id, exact: true })
      .getByText('Aguardando aceite', { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  const pagamento = page
    .getByRole('article', { name: 'Pedido ' + pedido.id, exact: true })
    .getByRole('region', { name: 'Pagamento online', exact: true });
  const tentativaMaisRecente = pagamento.getByRole('region', {
    name: 'Tentativa mais recente',
    exact: true,
  });
  await expect(tentativaMaisRecente.getByText('Pagamento confirmado', { exact: true })).toBeVisible(
    {
      timeout: 30000,
    },
  );
  await expect(
    tentativaMaisRecente.getByText('Tentativa recusada ou encerrada', { exact: true }),
  ).toHaveCount(0);
  const historico = pagamento.locator('details');
  await expect(
    historico.getByText('Tentativa recusada ou encerrada', { exact: true }),
  ).toBeHidden();
  await historico.getByText('Histórico de tentativas anteriores', { exact: true }).click();
  await expect(
    historico.getByText('Tentativa recusada ou encerrada', { exact: true }),
  ).toBeVisible();
  await expect(historico.getByText('Pagamento confirmado', { exact: true })).toHaveCount(0);
  await expect(historico.getByRole('link')).toHaveCount(0);
  await expect(pagamento.getByRole('link', { name: 'Abrir checkout do Mercado Pago' })).toHaveCount(
    0,
  );
  await expect(
    pagamento.getByRole('button', { name: 'Tentar pagamento novamente', exact: true }),
  ).toHaveCount(0);
  const consultaPagamento = page.waitForResponse(
    (resposta) =>
      resposta.request().method() === 'GET' &&
      new URL(resposta.url()).pathname === '/api/v1/me/pedidos/' + pedido.id + '/pagamento',
  );
  await pagamento.getByRole('button', { name: 'Conferir pagamento', exact: true }).click();
  const tentativasPagas = await ok<{ id: string; estado: string }[]>(await consultaPagamento);
  expect(tentativasPagas.map((tentativa) => tentativa.estado)).toEqual(['CONFIRMADO', 'RECUSADO']);
  expect(new Set(tentativasPagas.map((tentativa) => tentativa.id)).size).toBe(2);
  expect(
    novasTentativas,
    'Somente a repetição explícita após a recusa pode solicitar outro checkout',
  ).toBe(1);
  await expect(
    tentativaMaisRecente.getByText('Pagamento confirmado', { exact: true }),
  ).toBeVisible();
  await capturar(page, 'checkout-retorno');
  const financeiroGerente = await contexto(browser);
  financeiroGerente.context.setDefaultTimeout(15000);
  try {
    await loginUi(financeiroGerente.page, fixture().contas.gerente);
    const painel = await financeiro(financeiroGerente.page, pedido);
    await painel.getByText('Ajustar cobrança por valor', { exact: true }).click();
    await selecionarFinanceiro(
      painel,
      'Unidade comercial ou taxa',
      catalogo.simples.nome + ' · item 1 · unidade 1',
    );
    await painel.getByLabel('Valor do abatimento', { exact: true }).fill('5.00');
    await painel.getByLabel('Motivo', { exact: true }).first().fill('Abatimento fictício online');
    await painel.getByRole('button', { name: 'Confirmar ajuste de cobrança', exact: true }).click();
    await selecionarFinanceiro(painel, 'Recebimento', 'Recebimento 1');
    await painel.getByLabel('Valor a devolver', { exact: true }).fill('5.00');
    await painel.getByLabel('Motivo', { exact: true }).last().fill('Abatimento autorizado');
    await painel.getByRole('button', { name: 'Reservar devolução', exact: true }).click();
    await expect(
      painel.getByRole('button', { name: 'Confirmar devolução realizada externamente' }),
    ).toBeHidden();
    const cliente = page.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true });
    await expect(
      cliente
        .locator('dt')
        .filter({ hasText: /^Devolução confirmada$/ })
        .locator('xpath=following-sibling::dd[1]'),
    ).toContainText('5,00', { timeout: 30000 });
    await painel.getByRole('button', { name: 'Atualizar financeiro', exact: true }).click();
    await expect(painel.getByText(/CONFIRMADA/)).toBeVisible();
  } finally {
    await financeiroGerente.context.close();
  }
  const confirmado = page.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true });
  await confirmado
    .getByLabel('Motivo de recusa, cancelamento ou avaliação', { exact: true })
    .fill('Desistência fictícia antes do preparo');
  await confirmado
    .getByRole('button', { name: 'Cancelar meu pedido integralmente', exact: true })
    .click();
  await expect(confirmado.getByText('Cancelado', { exact: true })).toBeVisible();
  await expect(
    confirmado
      .locator('dt')
      .filter({ hasText: /^Devolução confirmada$/ })
      .locator('xpath=following-sibling::dd[1]'),
  ).toContainText('10,00', { timeout: 30000 });
  await expect(confirmado.getByText(/Há pagamento ou devolução aguardando confirmação/)).toBeHidden(
    { timeout: 30000 },
  );
  await capturar(page, 'devolucao-online');
});

test('S04-UI09: gerente consulta pendências e notificações sem acesso à integração', async ({
  page,
  request,
}) => {
  await pedidoApi(request, 'RETIRADA', 1, true);
  await loginUi(page, fixture().contas.gerente);
  await area(page, '/gestao/pendencias');
  await expect(
    page.getByRole('heading', { name: 'Pendências financeiras e notificações' }),
  ).toBeVisible();
  await expect(page.getByText(/Capturado significa salvo localmente/)).toBeVisible();
  const reconciliar = page.getByRole('button', { name: 'Reconciliar a mesma operação' }).first();
  await expect(reconciliar).toBeVisible();
  await reconciliar.click();
  await expect(page.getByRole('status')).toContainText(/reconcilia|solicit/i);
  await capturar(page, 'pendencias');
  await page.goto('/gestao/integracoes');
  await expect(page).toHaveURL((url) => url.pathname === '/sem-acesso');
  await expect(page.getByRole('heading', { name: 'Mercado Pago do restaurante' })).toBeHidden();
});

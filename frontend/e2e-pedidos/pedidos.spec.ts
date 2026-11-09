import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import {
  api,
  capturar,
  comando,
  contexto,
  enviarApi,
  enviarUi,
  fixture,
  loginApi,
  loginUi,
  localizarMesa,
  montarCarrinho,
  navegarUi,
  ok,
  operacao,
  prepararCatalogo,
  selecionarComanda,
  CatalogoTeste,
} from './apoio';
import type { Pedido } from '../src/app/pedidos/modelos';
import type {
  AberturaAtendimento,
  Comanda,
  Mesa,
  ParticipanteAtual,
  SolicitacaoMesa,
} from '../src/app/mesas/modelos';

let catalogo: CatalogoTeste;
test.beforeAll(async ({ request }) => {
  catalogo = await prepararCatalogo(request);
});

test('S03-UI01 cliente, aceite e cozinha preservam três unidades em estados distintos', async ({
  page,
  browser,
  request,
}) => {
  const cliente = await loginUi(page, fixture().contas.clienteA);
  await montarCarrinho(page, catalogo.simples, 'RETIRADA', 3);
  const enviado = await enviarUi(page);
  expect(enviado.estado).toBe('AGUARDANDO_ACEITE');
  expect(enviado.unidades).toHaveLength(3);
  const atendimento = await contexto(browser);
  const cozinha = await contexto(browser);
  try {
    await loginUi(atendimento.page, fixture().contas.atendimento);
    const fila = await operacao(atendimento.page);
    const card = fila.getByRole('article', { name: 'Pedido ' + enviado.id, exact: true });
    await card.getByRole('button', { name: 'Aceitar pedido', exact: true }).click();
    await expect(card.getByText('Na fila', { exact: true }).first()).toBeVisible();
    const tokenCozinha = await loginUi(cozinha.page, fixture().contas.cozinha);
    const kds = await operacao(cozinha.page, 'Painel da cozinha');
    const preparo = kds.getByRole('article', { name: 'Pedido ' + enviado.id, exact: true });
    const etapas = kds.getByRole('tablist', { name: 'Etapas da cozinha', exact: true });
    const filaTab = etapas.getByRole('tab', { name: 'Na fila', exact: true });
    const preparoTab = etapas.getByRole('tab', { name: 'Em preparo', exact: true });
    const prontoTab = etapas.getByRole('tab', { name: 'Prontos', exact: true });
    const todasTab = etapas.getByRole('tab', { name: 'Todas', exact: true });
    const filtrarEtapa = async (estado: string, acionar: () => Promise<void>) => {
      const consulta = cozinha.page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          url.pathname === '/api/v1/cozinha' && (url.searchParams.get('estados') ?? '') === estado
        );
      });
      await acionar();
      const pagina = await ok<{ itens: Pedido[] }>(await consulta);
      if (estado) expect(pagina.itens.every((pedido) => pedido.estado === estado)).toBe(true);
      await expect(kds.locator('app-cozinha > section')).toHaveAttribute('aria-busy', 'false');
    };
    await filtrarEtapa('NA_FILA', () => filaTab.click());
    await expect(filaTab).toHaveAttribute('aria-selected', 'true');
    await expect(preparo).toBeVisible();
    expect((await filaTab.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await filaTab.press('ArrowRight');
    await expect(preparoTab).toBeFocused();
    await filtrarEtapa('EM_PREPARO', () => preparoTab.press('Enter'));
    await expect(preparoTab).toHaveAttribute('aria-selected', 'true');
    await expect(preparo).toHaveCount(0);
    await preparoTab.press('ArrowRight');
    await expect(prontoTab).toBeFocused();
    await filtrarEtapa('PRONTO', () => prontoTab.press('Enter'));
    await expect(prontoTab).toHaveAttribute('aria-selected', 'true');
    await expect(preparo).toHaveCount(0);
    await prontoTab.press('Home');
    await expect(todasTab).toBeFocused();
    await filtrarEtapa('', () => todasTab.press('Enter'));
    await expect(todasTab).toHaveAttribute('aria-selected', 'true');
    await expect(preparo).toBeVisible();
    await preparo.getByRole('checkbox').nth(0).check();
    await preparo
      .getByRole('button', { name: 'Iniciar unidades selecionadas', exact: true })
      .click();
    await expect(preparo.getByText('Em preparo', { exact: true }).first()).toBeVisible();
    const iniciado = await ok<Pedido>(
      await api(request, cliente, '/api/v1/me/pedidos/' + enviado.id),
    );
    expect(iniciado.unidades.filter((item) => item.estado === 'NA_FILA')).toHaveLength(2);
    expect(iniciado.primeiroPreparoEm).not.toBeNull();
    const cancelamento = await api(
      request,
      cliente,
      '/api/v1/me/pedidos/' + enviado.id + '/cancelar',
      'POST',
      {
        intencaoId: randomUUID(),
        versao: iniciado.versao,
        motivo: 'Teste após preparo',
        unidades: [],
      },
    );
    expect(cancelamento.status()).toBe(409);
    await preparo.getByRole('checkbox').nth(0).check();
    await preparo
      .getByRole('button', { name: 'Concluir unidades selecionadas', exact: true })
      .click();
    await expect(preparo.getByText(/^Unidade \d+ · Pronto$/)).toBeVisible();
    const misto = await ok<Pedido>(await api(request, cliente, '/api/v1/me/pedidos/' + enviado.id));
    expect(misto.unidades.filter((item) => item.estado === 'PRONTO')).toHaveLength(1);
    expect(misto.unidades.filter((item) => item.estado === 'NA_FILA')).toHaveLength(2);
    expect(misto.estado).toBe('EM_PREPARO');
    const dto = await ok<{ itens: unknown[] }>(
      await api(request, tokenCozinha, '/api/v1/cozinha?unidadeId=' + fixture().unidadeA),
    );
    expect(JSON.stringify(dto)).not.toMatch(
      /"(?:precoUnitario|subtotal|saldo|endereco|email|pagoConfirmado)"/,
    );
    const selecao = preparo.locator('label.selecao').first();
    const toque = await selecao.boundingBox();
    expect(toque!.height).toBeGreaterThanOrEqual(48);
    expect(toque!.width).toBeGreaterThanOrEqual(200);
    expect((await selecao.locator('span').boundingBox())!.width).toBeGreaterThanOrEqual(140);
    await capturar(cozinha.page, preparo, 's03-cozinha-estados-mistos');
    const remanescentes = misto.unidades
      .filter((item) => item.estado === 'NA_FILA')
      .map((item) => item.id);
    let atual = await comando(
      request,
      tokenCozinha,
      misto,
      'iniciar',
      remanescentes,
      '/api/v1/cozinha/pedidos',
    );
    atual = await comando(
      request,
      tokenCozinha,
      atual,
      'concluir',
      remanescentes,
      '/api/v1/cozinha/pedidos',
    );
    expect(atual.estado).toBe('PRONTO');
    await page.getByRole('button', { name: 'Atualizar pedidos', exact: true }).click();
    await expect(
      page
        .getByRole('article', { name: 'Pedido ' + enviado.id, exact: true })
        .getByText('Pronto', { exact: true })
        .first(),
    ).toBeVisible();
  } finally {
    await atendimento.context.close();
    await cozinha.context.close();
  }
});

test('S03-UI02 mesa autoriza rodada, ajuda e fechamento sem liberar sessão antiga', async ({
  page,
  browser,
  playwright,
  request,
}) => {
  const administrador = await loginApi(request);
  await ok(
    await api(request, administrador, '/api/v1/auth/reautenticar', 'POST', {
      senha: fixture().senha,
    }),
  );
  const mesa = await ok<Mesa>(
    await api(request, administrador, '/api/v1/operacao/mesas', 'POST', {
      id: randomUUID(),
      unidadeId: fixture().unidadeA,
      nome: 'Mesa UI ' + randomUUID().slice(0, 8),
    }),
  );
  const atendimento = await contexto(browser);
  const caixa = await contexto(browser);
  try {
    await loginUi(atendimento.page, fixture().contas.atendimento);
    const salao = await operacao(atendimento.page, 'Mesas e comandas');
    await localizarMesa(salao, mesa.nome);
    const aberturaResposta = atendimento.page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/v1/operacao/mesas/' + mesa.id + '/abrir',
    );
    await salao
      .getByRole('button', { name: 'Abrir atendimento em ' + mesa.nome, exact: true })
      .click();
    const abertura = await ok<AberturaAtendimento>(await aberturaResposta);
    expect(abertura.codigoTemporario).toBeTruthy();
    await salao.getByRole('button', { name: 'Mostrar QR de ' + mesa.nome, exact: true }).click();
    await expect(
      salao.getByRole('img', { name: 'QR para abrir a mesa ' + mesa.nome, exact: true }),
    ).toBeVisible();
    const link = salao.getByRole('link', {
      name: 'Abrir o link público de ' + mesa.nome,
      exact: true,
    });
    await expect(link).toHaveAttribute(
      'href',
      process.env['RM_BASE_URL']!.replace(/\/$/, '') + '/mesa/' + mesa.id,
    );
    expect(await link.getAttribute('href')).not.toContain(abertura.codigoTemporario!);
    await page.goto('/mesa/' + mesa.id);
    await page
      .getByLabel('Código temporário do atendimento', { exact: true })
      .fill(abertura.codigoTemporario!);
    const autorizacaoResposta = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/v1/mesa/auth/autorizar',
    );
    await page.getByRole('button', { name: 'Autorizar participação na mesa', exact: true }).click();
    const tokenMesa = (await ok<{ accessToken: string }>(await autorizacaoResposta)).accessToken;
    await montarCarrinho(page, catalogo.simples, 'MESA', 1);
    const rodada = await enviarUi(page, true);
    expect(rodada.estado).toBe('NA_FILA');
    expect(rodada.expirarEm).toBeNull();
    const participanteB = await playwright.request.newContext({
      baseURL: process.env['RM_BASE_URL'],
      ignoreHTTPSErrors: true,
    });
    try {
      const csrfB = await (await participanteB.get('/api/v1/mesa/auth/csrf')).json();
      const tokenB = (
        await ok<{ accessToken: string }>(
          await participanteB.post('/api/v1/mesa/auth/autorizar', {
            headers: { [csrfB.headerName]: csrfB.token },
            data: { mesaId: mesa.id, codigo: abertura.codigoTemporario },
          }),
        )
      ).accessToken;
      const sessaoA = await ok<ParticipanteAtual>(
        await api(request, tokenMesa, '/api/v1/mesa/sessao'),
      );
      const sessaoB = await ok<ParticipanteAtual>(
        await api(participanteB, tokenB, '/api/v1/mesa/sessao'),
      );
      expect(sessaoB.comandaId).toBe(sessaoA.comandaId);
      expect(sessaoB.participanteId).not.toBe(sessaoA.participanteId);
      expect(sessaoB.sessaoId).not.toBe(sessaoA.sessaoId);
      const cancelarAlheio = await api(
        participanteB,
        tokenB,
        '/api/v1/mesa/pedidos/' + rodada.id + '/cancelar',
        'POST',
        {
          intencaoId: randomUUID(),
          versao: rodada.versao,
          motivo: 'Tentativa de cancelar rodada de outro participante',
          unidades: [],
        },
      );
      expect(cancelarAlheio.status()).toBe(404);
      expect(
        await ok<Pedido>(await api(request, tokenMesa, '/api/v1/mesa/pedidos/' + rodada.id)),
      ).toMatchObject({ estado: 'NA_FILA', versao: rodada.versao, primeiroPreparoEm: null });
    } finally {
      await participanteB.dispose();
    }
    await page.getByRole('button', { name: 'Pedir ajuda à equipe', exact: true }).click();
    await expect(
      page.getByText('Pedido de ajuda registrado. Aguarde a equipe.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Solicitar a conta', exact: true }).click();
    await expect(page.getByText('Pedido de conta registrado.', { exact: false })).toBeVisible();
    // Aguarde as duas inserções via SSE antes de clicar na lista que muda de posição.
    for (const texto of ['Solicitou ajuda da equipe', 'Solicitou a conta']) {
      await expect(
        salao.getByRole('article').filter({ hasText: mesa.nome }).filter({ hasText: texto }),
      ).toContainText('Pendente');
    }
    for (const texto of ['Solicitou ajuda da equipe', 'Solicitou a conta']) {
      const solicitacao = salao
        .getByRole('article')
        .filter({ hasText: mesa.nome })
        .filter({ hasText: texto });
      const atendimentoConfirmado = atendimento.page.waitForResponse(
        (r) =>
          /^\/api\/v1\/operacao\/mesas\/solicitacoes\/[^/]+\/atender$/.test(
            new URL(r.url()).pathname,
          ) && r.request().method() === 'POST',
      );
      await solicitacao
        .getByRole('button', { name: 'Marcar solicitação atendida', exact: true })
        .click();
      expect((await atendimentoConfirmado).status()).toBe(200);
      await expect(solicitacao).toContainText('Atendida');
    }
    await loginUi(caixa.page, fixture().contas.caixa);
    const contas = await operacao(caixa.page, 'Mesas e comandas');
    await localizarMesa(contas, mesa.nome);
    await contas
      .getByRole('button', { name: 'Consultar comanda de ' + mesa.nome, exact: true })
      .click();
    await contas
      .getByRole('button', { name: 'Iniciar fechamento da comanda', exact: true })
      .click();
    await expect(page.getByText('A equipe iniciou o fechamento.', { exact: false })).toBeVisible();
    await contas
      .getByRole('button', { name: 'Reabrir comanda antes de recebimentos', exact: true })
      .click();
    await expect(
      contas.getByRole('region', { name: 'Resumo da comanda', exact: true }),
    ).toContainText('Aberta');
    await expect(page.getByText('A equipe iniciou o fechamento.', { exact: false })).toHaveCount(0);
    await contas
      .getByRole('button', { name: 'Iniciar fechamento da comanda', exact: true })
      .click();
    await expect(page.getByText('A equipe iniciou o fechamento.', { exact: false })).toBeVisible();
    const snapshot = await ok<Pedido>(
      await api(request, tokenMesa, '/api/v1/mesa/pedidos/' + rodada.id),
    );
    await page
      .getByRole('article', { name: 'Pedido ' + rodada.id, exact: true })
      .getByLabel('Motivo de recusa, cancelamento ou avaliação', { exact: true })
      .fill('Rodada própria sem preparo');
    await page
      .getByRole('button', { name: 'Cancelar meu pedido integralmente', exact: true })
      .click();
    await expect(
      page
        .getByRole('article', { name: 'Pedido ' + rodada.id, exact: true })
        .getByText('Cancelado', { exact: true })
        .first(),
    ).toBeVisible();
    expect(snapshot.primeiroPreparoEm).toBeNull();
    await contas.getByRole('button', { name: 'Atualizar mesas', exact: true }).click();
    await contas.getByRole('button', { name: 'Concluir fechamento', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Autorizar participação na mesa', exact: true }),
    ).toBeVisible({ timeout: 15000 });
    expect((await api(request, tokenMesa, '/api/v1/mesa/comanda')).status()).toBe(401);
    const antiga = await request.get('/api/v1/mesa/auth/csrf');
    const csrf = await antiga.json();
    const repetir = await request.post('/api/v1/mesa/auth/autorizar', {
      headers: { [csrf.headerName]: csrf.token },
      data: { mesaId: mesa.id, codigo: abertura.codigoTemporario },
    });
    expect(repetir.status()).toBe(401);
    const financeiroComanda = contas.getByRole('region', {
      name: 'Recebimentos e devoluções',
      exact: true,
    });
    await expect(
      financeiroComanda
        .locator('dt')
        .filter({ hasText: /^Total devido$/ })
        .locator('xpath=following-sibling::dd[1]'),
    ).toContainText('0,00');
    await capturar(
      caixa.page,
      contas.getByRole('region', { name: 'Resumo da comanda', exact: true }),
      's03-comanda-encerrada',
    );
  } finally {
    await atendimento.context.close();
    await caixa.context.close();
  }
});

test.describe(() => {
  // O roteamento Playwright não intercepta requisições sob Service Worker.
  // Só esta prova de perda no transporte bloqueia o worker; a API continua real.
  test.use({ serviceWorkers: 'block' });

  test('S03-UI03 resposta perdida mantém intenção e não duplica pedido', async ({
    page,
    request,
  }) => {
    const token = await loginUi(page, fixture().contas.clienteA);
    await montarCarrinho(page, catalogo.simples, 'RETIRADA', 1);
    await page.getByText('Sobre o carrinho e os valores', { exact: true }).click();
    const orientacao = page.getByText(
      'Os itens ficam nesta aba durante a navegação. Atualizar ou fechar a página descarta o rascunho. O resumo é validado pelo restaurante antes do envio.',
      { exact: true },
    );
    await expect(orientacao).toBeVisible();
    await orientacao.screenshot({ path: test.info().outputPath('s03-texto-envio-carrinho.png') });
    let corpo: object | undefined;
    let pedido: Pedido | undefined;
    let interceptacoes = 0;
    let perdaAplicada = false;
    await page.route('**/api/v1/pedidos', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      interceptacoes++;
      corpo = route.request().postDataJSON();
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      pedido = await response.json();
      await route.abort('connectionreset');
      perdaAplicada = true;
    });
    await page.getByRole('button', { name: 'Enviar pedido para aceite', exact: true }).click();
    await expect
      .poll(() => perdaAplicada, {
        message: 'POST real confirmado e resposta abortada no transporte',
      })
      .toBe(true);
    expect(interceptacoes).toBe(1);
    expect(pedido?.id).toBeTruthy();
    await expect(page.getByText('Envio sem confirmação.', { exact: false })).toBeVisible();
    await expect(page.getByText('Pedido confirmado:', { exact: false })).toHaveCount(0);
    await expect(
      page.getByText('Resumo confirmado. O envio do pedido exige confirmação separada.', {
        exact: true,
      }),
    ).toBeVisible();
    await page.context().setOffline(true);
    const avisoOffline = page.getByText(
      'Sem conexão. O resumo foi invalidado; consulte o resultado de qualquer envio pendente antes de tentar novamente.',
      { exact: true },
    );
    await expect(avisoOffline).toBeVisible();
    await expect(page.getByText('Envio sem confirmação.', { exact: false })).toBeVisible();
    await expect(page.getByText('nenhum pedido foi criado', { exact: false })).toHaveCount(0);
    await avisoOffline.screenshot({
      path: test.info().outputPath('s03-texto-envio-incerto-offline.png'),
    });
    await page.context().setOffline(false);
    await page.unroute('**/api/v1/pedidos');
    await navegarUi(page, '/pedidos');
    await expect(
      page.getByRole('article', { name: 'Pedido ' + pedido!.id, exact: true }),
    ).toBeVisible();
    await navegarUi(page, '/carrinho');
    await expect(page.getByText('Envio sem confirmação.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Consultar resultado do envio', exact: true }).click();
    await expect(
      page.getByText('Pedido confirmado: ' + pedido!.id + '.', { exact: false }),
    ).toBeVisible();
    const replay = await ok<Pedido>(await api(request, token, '/api/v1/pedidos', 'POST', corpo));
    expect(replay.id).toBe(pedido!.id);
    const conflito = await api(request, token, '/api/v1/pedidos', 'POST', {
      ...corpo,
      observacao: 'Payload diferente',
    });
    expect(conflito.status()).toBe(409);
    const outro = await loginApi(request, fixture().contas.clienteB);
    expect((await api(request, outro, '/api/v1/me/pedidos/' + pedido!.id)).status()).toBe(404);
    await capturar(
      page,
      page.getByRole('region', { name: 'Enviar pedido', exact: true }),
      's03-envio-recuperado',
    );
  });
});

test('S03-UI12 paginação alcança mesas, solicitações e comanda assistida além de cinquenta registros', async ({
  page,
  request,
  playwright,
}, testInfo) => {
  const admin = await loginApi(request);
  await ok(
    await api(request, admin, '/api/v1/auth/reautenticar', 'POST', { senha: fixture().senha }),
  );
  const prefixo = 'ZZZ Pag ' + Date.now() + '-' + randomUUID().slice(0, 8);
  let mesa!: Mesa;
  for (let i = 0; i < 51; i++) {
    mesa = await ok<Mesa>(
      await api(request, admin, '/api/v1/operacao/mesas', 'POST', {
        id: randomUUID(),
        unidadeId: fixture().unidadeA,
        nome: prefixo + ' ' + String(i).padStart(2, '0'),
      }),
    );
  }
  const abertura = await ok<AberturaAtendimento>(
    await api(request, admin, '/api/v1/operacao/mesas/' + mesa.id + '/abrir', 'POST', {
      intencaoId: randomUUID(),
    }),
  );
  const participante = await playwright.request.newContext({
    baseURL: process.env['RM_BASE_URL'],
    ignoreHTTPSErrors: true,
  });
  try {
    const csrf = await (await participante.get('/api/v1/mesa/auth/csrf')).json();
    const token = (
      await ok<{ accessToken: string }>(
        await participante.post('/api/v1/mesa/auth/autorizar', {
          headers: { [csrf.headerName]: csrf.token },
          data: { mesaId: mesa.id, codigo: abertura.codigoTemporario },
        }),
      )
    ).accessToken;
    let antiga!: SolicitacaoMesa;
    for (let i = 0; i < 51; i++) {
      const solicitacao = await ok<SolicitacaoMesa>(
        await api(participante, token, '/api/v1/mesa/solicitacoes', 'POST', {
          intencaoId: randomUUID(),
          tipo: i === 0 ? 'CONTA' : 'AJUDA',
        }),
      );
      if (i === 0) antiga = solicitacao;
    }
    await loginUi(page, fixture());
    const salao = await operacao(page, 'Mesas e comandas');
    const alvo = await localizarMesa(salao, mesa.nome);
    const paginasMesas = salao.getByRole('navigation', { name: 'Páginas de mesas', exact: true });
    const paginaMesa = await paginasMesas.getByRole('status').innerText();
    expect(paginaMesa).not.toBe('Página de mesas 1');
    await alvo
      .getByRole('button', { name: 'Consultar comanda de ' + mesa.nome, exact: true })
      .click();
    const resumo = salao.getByRole('region', { name: 'Resumo da comanda', exact: true });
    await expect(resumo).toContainText(mesa.nome);
    const solicitacao = salao
      .getByRole('article')
      .filter({ hasText: mesa.nome })
      .filter({ hasText: 'Solicitou a conta' });
    await expect(solicitacao).toHaveCount(0);
    const paginasSolicitacoes = salao.getByRole('navigation', {
      name: 'Páginas de solicitações',
      exact: true,
    });
    const proxima = paginasSolicitacoes.getByRole('button', {
      name: 'Próximas solicitações',
      exact: true,
    });
    await expect(proxima).toBeEnabled();
    expect((await proxima.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    if (testInfo.project.use.hasTouch) await proxima.tap();
    else {
      await proxima.focus();
      await expect(proxima).toBeFocused();
      await proxima.press('Enter');
    }
    await expect(paginasSolicitacoes.getByRole('status')).toHaveText('Página de solicitações 2');
    await expect(solicitacao).toContainText('Pendente');
    const atendida = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname ===
          '/api/v1/operacao/mesas/solicitacoes/' + antiga.id + '/atender' &&
        r.request().method() === 'POST',
    );
    await solicitacao
      .getByRole('button', { name: 'Marcar solicitação atendida', exact: true })
      .click();
    expect((await atendida).status()).toBe(200);
    await expect(solicitacao).toContainText('Atendida');
    await expect(paginasMesas.getByRole('status')).toHaveText(paginaMesa);
    await expect(paginasSolicitacoes.getByRole('status')).toHaveText('Página de solicitações 2');
    await capturar(page, paginasSolicitacoes, 's03-paginacao-solicitacoes');
    await montarCarrinho(page, catalogo.simples, 'MESA', 1);
    await selecionarComanda(page, mesa.nome);
    await expect(
      page
        .getByRole('navigation', { name: 'Páginas de mesas para pedido assistido', exact: true })
        .getByRole('status'),
    ).not.toHaveText('Página de mesas 1');
    const envio = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/api/v1/operacao/pedidos' && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Enviar pedido assistido', exact: true }).click();
    const pedido = await ok<Pedido>(await envio);
    expect(pedido.comandaId).toBe(abertura.comandaId);
    expect(pedido.estado).toBe('NA_FILA');
    await expect(
      page.getByText('Pedido confirmado: ' + pedido.id + '.', { exact: false }),
    ).toBeVisible();
    await capturar(
      page,
      page.getByRole('navigation', { name: 'Páginas de mesas para pedido assistido', exact: true }),
      's03-paginacao-assistido',
    );
  } finally {
    await participante.dispose();
  }
});

test.describe(() => {
  // Exercita perda de resposta real após o commit, sem intermediação do service worker.
  test.use({ serviceWorkers: 'block' });

  test('S03-UI13 cadastro de mesa corrige nome rejeitado e recupera resposta perdida sem duplicar', async ({
    page,
    request,
  }) => {
    const admin = await loginUi(page, fixture());
    await ok(
      await api(request, admin, '/api/v1/auth/reautenticar', 'POST', { senha: fixture().senha }),
    );
    const nomeOriginal = 'ZZZ Cadastro ' + randomUUID().slice(0, 8);
    await ok(
      await api(request, admin, '/api/v1/operacao/mesas', 'POST', {
        id: randomUUID(),
        unidadeId: fixture().unidadeA,
        nome: nomeOriginal,
      }),
    );
    const salao = await operacao(page, 'Mesas e comandas');
    await salao
      .getByText('Cadastrar mesa e confirmar acesso administrativo', { exact: true })
      .click();
    const nome = salao.getByLabel('Nome da mesa', { exact: true });
    await nome.fill(nomeOriginal);
    const rejeicao = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/api/v1/operacao/mesas' && r.request().method() === 'POST',
    );
    await salao.getByRole('button', { name: 'Cadastrar mesa', exact: true }).click();
    const rejeitada = await rejeicao;
    expect(rejeitada.status()).toBe(409);
    const idRejeitado = rejeitada.request().postDataJSON().id;
    await expect(salao.getByRole('alert')).toContainText(
      'Já existe uma mesa com esse nome nesta unidade.',
    );
    await expect(nome).toBeEnabled();
    const nomeCorrigido = nomeOriginal + ' corrigido';
    await nome.fill(nomeCorrigido);
    let confirmado: Mesa | null = null;
    let corpoOriginal: object | null = null;
    let abortos = 0;
    await page.route('**/api/v1/operacao/mesas', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      corpoOriginal = route.request().postDataJSON();
      confirmado = await ok<Mesa>(await route.fetch());
      await route.abort('connectionreset');
      abortos++;
    });
    await salao.getByRole('button', { name: 'Cadastrar mesa', exact: true }).click();
    await expect
      .poll(() => abortos, { message: 'Perda aplicada somente após POST confirmado pelo servidor' })
      .toBe(1);
    await expect(nome).toBeDisabled();
    const recuperar = salao.getByRole('button', {
      name: 'Recuperar cadastro da mesma mesa',
      exact: true,
    });
    await expect(recuperar).toBeEnabled();
    await navegarUi(page, '/gestao/pedidos');
    await navegarUi(page, '/gestao/mesas');
    await salao
      .getByText('Cadastrar mesa e confirmar acesso administrativo', { exact: true })
      .click();
    await expect(nome).toHaveValue(nomeCorrigido);
    await expect(nome).toBeDisabled();
    await expect(recuperar).toBeEnabled();
    await page.unroute('**/api/v1/operacao/mesas');
    const recuperacao = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/api/v1/operacao/mesas' && r.request().method() === 'POST',
    );
    await recuperar.click();
    const replay = await recuperacao;
    expect(replay.request().postDataJSON()).toEqual(corpoOriginal);
    const resultado = await ok<Mesa>(replay);
    expect(resultado.id).not.toBe(idRejeitado);
    expect(resultado.id).toBe((confirmado as Mesa | null)?.id);
    expect(resultado.nome).toBe(nomeCorrigido);
    await expect(nome).toBeEnabled();
    await expect(nome).toHaveValue('');
    const cadastro = await localizarMesa(salao, nomeCorrigido);
    await expect(cadastro).toHaveCount(1);
    let quantidade = 0;
    for (let pagina = 0; ; pagina++) {
      const mesas = await ok<Mesa[]>(
        await api(
          request,
          admin,
          '/api/v1/operacao/mesas?unidadeId=' + fixture().unidadeA + '&pagina=' + pagina,
        ),
      );
      quantidade += mesas.filter((mesa) => mesa.nome === nomeCorrigido).length;
      if (mesas.length < 50) break;
    }
    expect(quantidade).toBe(1);
    await capturar(page, cadastro, 's03-cadastro-mesa-recuperado');

    // Três registros consecutivos garantem duas comandas próprias na mesma página,
    // mesmo quando o banco preservado está exatamente no limite de cinquenta.
    const candidatas: Mesa[] = [];
    for (let i = 0; i < 3; i++)
      candidatas.push(
        await ok<Mesa>(
          await api(request, admin, '/api/v1/operacao/mesas', 'POST', {
            id: randomUUID(),
            unidadeId: fixture().unidadeA,
            nome: nomeOriginal + ' seleção ' + i,
          }),
        ),
      );
    let dupla: Mesa[] = [];
    for (let pagina = 0; ; pagina++) {
      const mesas = await ok<Mesa[]>(
        await api(
          request,
          admin,
          '/api/v1/operacao/mesas?unidadeId=' + fixture().unidadeA + '&pagina=' + pagina,
        ),
      );
      const proprias = mesas.filter((mesa) =>
        candidatas.some((candidata) => candidata.id === mesa.id),
      );
      if (proprias.length >= 2) {
        dupla = proprias.slice(0, 2);
        break;
      }
      if (mesas.length < 50) break;
    }
    expect(dupla).toHaveLength(2);
    const aberturaA = await ok<AberturaAtendimento>(
      await api(request, admin, '/api/v1/operacao/mesas/' + dupla[0].id + '/abrir', 'POST', {
        intencaoId: randomUUID(),
      }),
    );
    const aberturaB = await ok<AberturaAtendimento>(
      await api(request, admin, '/api/v1/operacao/mesas/' + dupla[1].id + '/abrir', 'POST', {
        intencaoId: randomUUID(),
      }),
    );
    await salao.getByRole('button', { name: 'Atualizar mesas', exact: true }).click();
    const mesaA = await localizarMesa(salao, dupla[0].nome);
    await mesaA
      .getByRole('button', { name: 'Consultar comanda de ' + dupla[0].nome, exact: true })
      .click();
    const resumo = salao.getByRole('region', { name: 'Resumo da comanda', exact: true });
    await expect(resumo).toContainText(dupla[0].nome);
    await expect(salao.getByRole('button', { name: 'Atualizar mesas', exact: true })).toBeEnabled();
    let liberar!: () => void;
    const espera = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    let retida = false;
    let entregue = false;
    const rotaA = '**/api/v1/comandas/' + aberturaA.comandaId;
    await page.route(rotaA, async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      retida = true;
      await espera;
      await route.fulfill({ response });
      entregue = true;
    });
    try {
      // O evento real provoca o refresh sem depender de clicar num botão que
      // pode ter sido desabilitado por outro snapshot iniciado no mesmo instante.
      await ok(
        await api(request, admin, '/api/v1/operacao/mesas/' + dupla[0].id + '/codigo', 'POST', {
          versao: aberturaA.versao,
        }),
      );
      await expect.poll(() => retida, { timeout: 15000 }).toBe(true);
      await salao
        .getByRole('button', { name: 'Consultar comanda de ' + dupla[1].nome, exact: true })
        .click();
      await expect(resumo).toContainText(dupla[1].nome);
      liberar();
      await expect.poll(() => entregue).toBe(true);
      await expect(
        salao.getByRole('button', { name: 'Atualizar mesas', exact: true }),
      ).toBeEnabled();
      await expect(resumo).toContainText(dupla[1].nome);
      const fechamento = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname ===
            '/api/v1/comandas/' + aberturaB.comandaId + '/iniciar-fechamento' &&
          r.request().method() === 'POST',
      );
      await resumo
        .getByRole('button', { name: 'Iniciar fechamento da comanda', exact: true })
        .click();
      expect((await fechamento).status()).toBe(200);
      expect(
        (await ok<Comanda>(await api(request, admin, '/api/v1/comandas/' + aberturaA.comandaId)))
          .estado,
      ).toBe('ABERTA');
      expect(
        (await ok<Comanda>(await api(request, admin, '/api/v1/comandas/' + aberturaB.comandaId)))
          .estado,
      ).toBe('EM_FECHAMENTO');
      await expect(resumo).toContainText(dupla[1].nome);
      await capturar(page, resumo, 's03-comanda-selecao-preservada');
    } finally {
      liberar();
      await page.unroute(rotaA);
    }
  });
});

test('S03-UI04 combo cancela unidade completa e preserva primeiro preparo', async ({
  page,
  browser,
  request,
}) => {
  const cliente = await loginApi(request, fixture().contas.clienteA);
  const criado = await enviarApi(request, cliente, catalogo.combo, 'RETIRADA', 2);
  const gerente = await loginUi(page, fixture().contas.gerente);
  let pedido = await comando(request, gerente, criado.pedido, 'aceitar');
  pedido = await comando(
    request,
    gerente,
    pedido,
    'iniciar',
    [pedido.unidades[0].id],
    '/api/v1/cozinha/pedidos',
  );
  const primeiro = pedido.primeiroPreparoEm;
  const fila = await operacao(page);
  const card = fila.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true });
  // O login já abre a fila; aguarde o snapshot posterior ao preparo feito pelo setup.
  const unidadeEmPreparo = card.getByRole('checkbox', {
    name: 'Unidade 1 · Em preparo',
    exact: true,
  });
  await expect(unidadeEmPreparo).toBeVisible();
  await unidadeEmPreparo.check();
  await card
    .getByLabel('Motivo de recusa, cancelamento ou avaliação', { exact: true })
    .fill('Cancelamento da unidade inteira do combo');
  await card.getByRole('button', { name: 'Cancelar unidades selecionadas', exact: true }).click();
  await expect(card.getByText(/^Unidade \d+ · Cancelado$/).first()).toBeVisible();
  const atual = await ok<Pedido>(await api(request, cliente, '/api/v1/me/pedidos/' + pedido.id));
  expect(atual.unidades.filter((item) => item.estado === 'CANCELADO')).toHaveLength(1);
  expect(atual.linhas[0].quantidade).toBe(2);
  expect(atual.saldo!.totalDevido).toBe('35.00');
  expect(atual.primeiroPreparoEm).toBe(primeiro);
  expect(atual.estado).toBe('EM_PREPARO');
  const componente = await api(
    request,
    gerente,
    '/api/v1/operacao/pedidos/' + pedido.id + '/cancelar',
    'POST',
    {
      intencaoId: randomUUID(),
      versao: atual.versao,
      motivo: 'Componente não é unidade comercial',
      unidades: [catalogo.combo.opcaoId],
    },
  );
  expect(componente.status()).toBe(409);
  const autocancelar = await api(
    request,
    cliente,
    '/api/v1/me/pedidos/' + pedido.id + '/cancelar',
    'POST',
    {
      intencaoId: randomUUID(),
      versao: atual.versao,
      motivo: 'Autocancelamento bloqueado',
      unidades: [],
    },
  );
  expect(autocancelar.status()).toBe(409);
  await capturar(page, card, 's03-combo-cancelamento-parcial');
  const clienteUi = await contexto(browser);
  try {
    await loginUi(clienteUi.page, fixture().contas.clienteA);
    const proprio = clienteUi.page.getByRole('article', {
      name: 'Pedido ' + pedido.id,
      exact: true,
    });
    await proprio
      .getByLabel('Motivo de recusa, cancelamento ou avaliação', { exact: true })
      .fill('Solicitação após preparo do combo');
    await proprio
      .getByRole('button', { name: 'Solicitar avaliação de cancelamento', exact: true })
      .click();
    await expect(proprio).toContainText('Solicitação após preparo do combo · PENDENTE');
    await card
      .getByLabel('Motivo de recusa, cancelamento ou avaliação', { exact: true })
      .fill('Aprovação operacional do remanescente');
    await card.getByRole('button', { name: 'Aprovar solicitação', exact: true }).click();
    await expect(proprio.getByText('Cancelado', { exact: true }).first()).toBeVisible();
    const resolvido = await ok<Pedido>(
      await api(request, cliente, '/api/v1/me/pedidos/' + pedido.id),
    );
    expect(resolvido.saldo!.totalDevido).toBe('0.00');
    expect(resolvido.primeiroPreparoEm).toBe(primeiro);
    expect(resolvido.solicitacoes![0].estado).toBe('APROVADA');
  } finally {
    await clienteUi.context.close();
  }
});

test('S03-UI05 prazos configuráveis expiram e emitem um único alerta durável', async ({
  page,
  request,
}) => {
  const admin = await loginUi(page, fixture());
  const painel = await operacao(page, 'Configurar prazos de aceite');
  await painel.getByLabel('Herdar padrão da empresa', { exact: true }).uncheck();
  await painel.getByLabel('Alerta após (segundos)', { exact: true }).fill('1');
  await painel.getByLabel('Cancelar automaticamente após (segundos)', { exact: true }).fill('4');
  await painel
    .getByLabel('Confirme sua senha para salvar prazos', { exact: true })
    .fill(fixture().senha);
  await painel.getByRole('button', { name: 'Salvar prazos de aceite', exact: true }).click();
  await expect(
    painel.getByText('Prazos salvos para futuros pedidos.', { exact: true }),
  ).toBeVisible();
  try {
    const cliente = await loginApi(request, fixture().contas.clienteA);
    const criado = await enviarApi(request, cliente, catalogo.simples);
    await expect
      .poll(
        async () =>
          (await ok<Pedido>(await api(request, cliente, '/api/v1/me/pedidos/' + criado.pedido.id)))
            .estado,
        { timeout: 20000 },
      )
      .toBe('CANCELADO');
    const final = await ok<Pedido>(
      await api(request, cliente, '/api/v1/me/pedidos/' + criado.pedido.id),
    );
    expect(final.saldo!.totalDevido).toBe('0.00');
    expect(final.historico!.filter((evento) => evento.tipo === 'ACEITE_ATRASADO')).toHaveLength(1);
    const expirado = await api(
      request,
      admin,
      '/api/v1/operacao/pedidos/' + final.id + '/aceitar',
      'POST',
      { intencaoId: randomUUID(), versao: final.versao, motivo: '', unidades: [] },
    );
    expect(expirado.status()).toBe(409);
  } finally {
    const atual = await ok<{ versao: number }>(
      await api(
        request,
        admin,
        '/api/v1/configuracoes/unidades/' + fixture().unidadeA + '/prazos-aceite',
      ),
    );
    await ok(
      await api(
        request,
        admin,
        '/api/v1/configuracoes/unidades/' + fixture().unidadeA + '/prazos-aceite',
        'PUT',
        { versao: atual.versao, alertaSegundos: 120, expiracaoSegundos: 300, herdar: true },
      ),
    );
  }
});

test('S03-UI06 perfis operacionais respeitam ações e não recebem dados financeiros da cozinha', async ({
  browser,
  request,
}) => {
  const cliente = await loginApi(request, fixture().contas.clienteA);
  const criado = await enviarApi(request, cliente, catalogo.simples);
  for (const perfil of ['gerente', 'atendimento', 'caixa', 'cozinha', 'expedicao'] as const) {
    const atual = await contexto(browser);
    try {
      const token = await loginUi(atual.page, fixture().contas[perfil]);
      const painel = await operacao(atual.page);
      await expect(
        painel.getByRole('article', { name: 'Pedido ' + criado.pedido.id, exact: true }),
      ).toBeVisible();
      expect(
        (
          await api(request, token, '/api/v1/operacao/pedidos?unidadeId=' + fixture().unidadeB)
        ).status(),
      ).toBe(404);
      const menu = atual.page.getByRole('button', { name: 'Abrir menu de gestão', exact: true });
      if (await menu.isVisible()) await menu.click();
      const navegacao = atual.page.getByRole('navigation', {
        name: 'Gestão do restaurante',
        exact: true,
      });
      if (perfil === 'cozinha') {
        await expect(navegacao.getByRole('link', { name: 'Cozinha', exact: true })).toBeVisible();
      }
      if (perfil === 'atendimento' || perfil === 'caixa' || perfil === 'expedicao')
        await expect(navegacao.getByRole('link', { name: 'Cozinha', exact: true })).toHaveCount(0);
      if (await menu.isVisible()) await atual.page.keyboard.press('Escape');
      const negado = await api(
        request,
        token,
        '/api/v1/configuracoes/unidades/' + fixture().unidadeA + '/prazos-aceite',
      );
      expect(negado.status()).toBe(403);
      if (perfil === 'caixa' || perfil === 'cozinha' || perfil === 'expedicao') {
        await expect(painel.getByRole('checkbox')).toHaveCount(0);
        await expect(
          painel.getByLabel('Motivo de recusa, cancelamento ou avaliação', { exact: true }),
        ).toHaveCount(0);
        const aceite = await api(
          request,
          token,
          '/api/v1/operacao/pedidos/' + criado.pedido.id + '/aceitar',
          'POST',
          { intencaoId: randomUUID(), versao: criado.pedido.versao, motivo: '', unidades: [] },
        );
        expect(aceite.status()).toBe(403);
      }
      const campos = await ok<{ itens: unknown[] }>(
        await api(request, token, '/api/v1/operacao/pedidos?unidadeId=' + fixture().unidadeA),
      );
      expect(JSON.stringify(campos)).not.toMatch(
        /"(?:saldo|endereco|pagoConfirmado|precoUnitario)"/,
      );
      await capturar(atual.page, painel, 's03-perfil-' + perfil);
    } finally {
      await atual.context.close();
    }
  }
});

test('S03-UI07 delivery comercial confirma endereço e taxa e admite recusa por atendimento', async ({
  page,
  request,
}) => {
  const admin = await loginApi(request);
  await ok(
    await api(request, admin, '/api/v1/auth/reautenticar', 'POST', { senha: fixture().senha }),
  );
  const rota = '/api/v1/configuracoes/unidades/' + fixture().unidadeA + '/delivery';
  const atual = await ok<{ versao: number }>(await api(request, admin, rota));
  await ok(
    await api(request, admin, rota, 'PUT', {
      versao: atual.versao,
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
  const cliente = await loginUi(page, fixture().contas.clienteA);
  await montarCarrinho(page, catalogo.simples, 'DELIVERY', 1);
  for (const [rotulo, valor] of Object.entries({
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
  await page.getByRole('button', { name: 'Calcular e confirmar entrega', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /Centro.*Entrega/ })).toContainText(
    '5,00',
  );
  const pedido = await enviarUi(page);
  expect(pedido.estado).toBe('AGUARDANDO_ACEITE');
  expect(pedido.saldo!.totalDevido).toBe('15.00');
  const equipe = await loginApi(request, fixture().contas.atendimento);
  const recusado = await comando(request, equipe, pedido, 'recusar');
  expect(recusado.estado).toBe('CANCELADO');
  const final = await ok<Pedido>(await api(request, cliente, '/api/v1/me/pedidos/' + pedido.id));
  expect(final.saldo!.totalDevido).toBe('0.00');
  expect(final.historico!.some((item) => item.motivo.includes('Sprint 3'))).toBe(true);
});

test('S03-UI08 offline invalida confirmação e mantém formulário utilizável por teclado', async ({
  page,
  context,
}) => {
  await loginUi(page, fixture().contas.clienteA);
  await montarCarrinho(page, catalogo.simples, 'RETIRADA', 1);
  const enviar = page.getByRole('button', { name: 'Enviar pedido para aceite', exact: true });
  await expect(enviar).toBeEnabled();
  await context.setOffline(true);
  await expect(enviar).toBeDisabled();
  await expect(
    page.getByText(
      'Você está offline. Reconecte para consultar o cardápio e enviar pedidos. Nenhuma operação foi confirmada.',
      { exact: true },
    ),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Revisar meu pedido', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar composição e valores', exact: true }).click();
  await expect(
    page.getByText('Resumo confirmado. O envio do pedido exige confirmação separada.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(enviar).toBeEnabled();
  const observacao = page.getByLabel('Observação de preparo', { exact: true });
  await observacao.focus();
  await page.keyboard.type('Sem pimenta');
  await page.keyboard.press('Tab');
  await expect(enviar).toBeFocused();
  expect((await enviar.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await capturar(
    page,
    page.getByRole('region', { name: 'Enviar pedido', exact: true }),
    's03-pedido-teclado-mobile',
  );
  const resposta = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/v1/pedidos' && r.request().method() === 'POST',
  );
  if (test.info().project.use.hasTouch) await enviar.tap();
  else await page.keyboard.press('Enter');
  const pedido = await ok<Pedido>(await resposta);
  expect(pedido.estado).toBe('AGUARDANDO_ACEITE');
  expect(pedido.observacao).toBe('Sem pimenta');
  await expect(
    page.getByText('Pedido confirmado: ' + pedido.id + '.', { exact: false }),
  ).toBeVisible();
});

test('S03-UI09 pedido assistido e serviço na mesa seguem ações próprias', async ({
  page,
  request,
}) => {
  const admin = await loginApi(request);
  await ok(
    await api(request, admin, '/api/v1/auth/reautenticar', 'POST', { senha: fixture().senha }),
  );
  const mesa = await ok<Mesa>(
    await api(request, admin, '/api/v1/operacao/mesas', 'POST', {
      id: randomUUID(),
      unidadeId: fixture().unidadeA,
      nome: 'Assistida ' + randomUUID().slice(0, 8),
    }),
  );
  await ok(
    await api(request, admin, '/api/v1/operacao/mesas/' + mesa.id + '/abrir', 'POST', {
      intencaoId: randomUUID(),
    }),
  );
  const atendimento = await loginUi(page, fixture().contas.atendimento);
  await montarCarrinho(page, catalogo.simples, 'MESA', 1);
  await selecionarComanda(page, mesa.nome);
  const resposta = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/api/v1/operacao/pedidos' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Enviar pedido assistido', exact: true }).click();
  let pedido = await ok<Pedido>(await resposta);
  expect(pedido.estado).toBe('NA_FILA');
  pedido = await comando(
    request,
    admin,
    pedido,
    'iniciar',
    pedido.unidades.map((item) => item.id),
    '/api/v1/cozinha/pedidos',
  );
  pedido = await comando(
    request,
    admin,
    pedido,
    'concluir',
    pedido.unidades.map((item) => item.id),
    '/api/v1/cozinha/pedidos',
  );
  const fila = await operacao(page);
  await expect(fila.getByLabel('Estado dos pedidos', { exact: true })).toHaveValue(
    'AGUARDANDO_ACEITE,NA_FILA,EM_PREPARO,PRONTO',
  );
  await fila.getByLabel('Estado dos pedidos', { exact: true }).selectOption('');
  const card = fila.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true });
  await card.getByRole('button', { name: 'Marcar servido na mesa', exact: true }).click();
  await expect(card.getByText('Concluído', { exact: true }).first()).toBeVisible();
  const confirmado = await ok<Pedido>(
    await api(request, atendimento, '/api/v1/operacao/pedidos/' + pedido.id),
  );
  expect(confirmado.estado).toBe('CONCLUIDO');
  const cliente = await loginApi(request, fixture().contas.clienteA);
  expect((await api(request, cliente, '/api/v1/me/pedidos/' + pedido.id)).status()).toBe(404);
});

test('S03-UI10 revogação encerra acompanhamento e remove ações com JWT ainda válido', async ({
  page,
  request,
}) => {
  const admin = await loginApi(request);
  await ok(
    await api(request, admin, '/api/v1/auth/reautenticar', 'POST', { senha: fixture().senha }),
  );
  const matriz = await ok<{ versao: number; perfis: Record<string, string[]> }>(
    await api(request, admin, '/api/v1/configuracoes/acessos'),
  );
  const originais = matriz.perfis['COZINHA'];
  const cliente = await loginApi(request, fixture().contas.clienteA);
  const criado = await enviarApi(request, cliente, catalogo.simples);
  await comando(request, admin, criado.pedido, 'aceitar');
  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/eventos')) requests.push(req.url());
  });
  const token = await loginUi(page, fixture().contas.cozinha);
  const painel = await operacao(page, 'Painel da cozinha');
  await expect(
    painel.getByRole('article', { name: 'Pedido ' + criado.pedido.id, exact: true }),
  ).toBeVisible();
  const conexao = painel.getByText('Acompanhamento em tempo real conectado.', { exact: false });
  // O replay pagina o histórico preservado antes de abrir SSE. Essa é uma
  // precondição da revogação, limitada pelo orçamento global de 180 s do teste.
  await conexao.waitFor({ state: 'visible', timeout: 0 });
  await expect(conexao).toBeVisible();
  const validade = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as {
    exp: number;
  };
  expect(validade.exp).toBeGreaterThan(Date.now() / 1000);
  expect(requests.some((url) => url.includes('/eventos/stream'))).toBe(true);
  expect(requests.every((url) => !/[?&](?:token|accessToken|authorization)=/i.test(url))).toBe(
    true,
  );
  try {
    await ok(
      await api(request, admin, '/api/v1/configuracoes/acessos', 'PUT', {
        versao: matriz.versao,
        perfil: 'COZINHA',
        acoes: originais.filter(
          (acao) => !acao.startsWith('pedido.') && !acao.startsWith('cozinha.'),
        ),
      }),
    );
    await expect(
      painel.getByRole('heading', { name: 'Seu acesso foi atualizado', exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(painel.getByRole('article')).toHaveCount(0);
    expect(
      (await api(request, token, '/api/v1/cozinha?unidadeId=' + fixture().unidadeA)).status(),
    ).toBe(403);
    expect(
      (
        await api(request, token, '/api/v1/eventos?unidadeId=' + fixture().unidadeA + '&depois=-1')
      ).status(),
    ).toBe(403);
    const streamNegado = await request.get(
      '/api/v1/eventos/stream?unidadeId=' + fixture().unidadeA + '&depois=-1',
      {
        headers: { Authorization: 'Bearer ' + token, Accept: 'text/event-stream' },
      },
    );
    expect(streamNegado.status()).toBe(403);
    expect(streamNegado.headers()['content-type']).toContain('application/json');
    const cursorInvalido = await request.get(
      '/api/v1/eventos/stream?unidadeId=' + fixture().unidadeA + '&depois=invalido',
      {
        headers: { Authorization: 'Bearer ' + admin, Accept: 'text/event-stream' },
      },
    );
    expect(cursorInvalido.status()).toBe(400);
    expect(cursorInvalido.headers()['content-type']).toContain('application/json');
    await capturar(page, painel, 's03-revogacao-tempo-real');
  } finally {
    const atual = await ok<{ versao: number }>(
      await api(request, admin, '/api/v1/configuracoes/acessos'),
    );
    await ok(
      await api(request, admin, '/api/v1/configuracoes/acessos', 'PUT', {
        versao: atual.versao,
        perfil: 'COZINHA',
        acoes: originais,
      }),
    );
  }
});

test.describe(() => {
  // A falha de transporte precisa alcançar page.route, sem intermediação do worker.
  test.use({ serviceWorkers: 'block' });

  test('S03-UI11 falha de transporte SSE usa polling real e recupera o acompanhamento', async ({
    page,
    request,
  }) => {
    const cliente = await loginApi(request, fixture().contas.clienteA);
    const criado = await enviarApi(request, cliente, catalogo.simples);
    const consultas: string[] = [];
    let fluxosAbortados = 0;
    page.on('request', (req) => {
      if (new URL(req.url()).pathname === '/api/v1/eventos') consultas.push(req.url());
    });
    await page.route('**/api/v1/eventos/stream?**', async (route) => {
      await route.abort('connectionreset');
      fluxosAbortados++;
    });
    await loginUi(page, fixture().contas.clienteA);
    const card = page.getByRole('article', { name: 'Pedido ' + criado.pedido.id, exact: true });
    await expect(card.getByText('Aguardando aceite', { exact: true })).toBeVisible();
    await expect
      .poll(() => fluxosAbortados, { message: 'Falha SSE aplicada no transporte' })
      .toBeGreaterThan(0);
    await expect(
      page
        .getByRole('region', { name: 'Meus pedidos', exact: true })
        .getByText('Sem conexão confirmada. Os dados podem estar desatualizados.', {
          exact: false,
        }),
    ).toBeVisible();
    const atendimento = await loginApi(request, fixture().contas.atendimento);
    await comando(request, atendimento, criado.pedido, 'aceitar');
    await expect(card.getByText('Na fila', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect.poll(() => consultas.length, { timeout: 15000 }).toBeGreaterThanOrEqual(2);
    await page.unroute('**/api/v1/eventos/stream?**');
    await expect(
      page
        .getByRole('region', { name: 'Meus pedidos', exact: true })
        .getByText('Acompanhamento em tempo real conectado.', { exact: false }),
    ).toBeVisible({ timeout: 45000 });
    const estado = await ok<Pedido>(
      await api(request, cliente, '/api/v1/me/pedidos/' + criado.pedido.id),
    );
    expect(estado.estado).toBe('NA_FILA');
  });
});

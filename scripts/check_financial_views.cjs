// Exercita os bundles e as rotas Angular reais com transporte controlado.
const { chromium } = require('../frontend/node_modules/@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const [anterior, candidato, destino] = process.argv.slice(2);
assert(
  anterior && candidato && destino,
  'Informe o diretório browser anterior, o candidato e o destino das capturas.',
);
const host = 'https://s08-ui.localhost';
const out = path.resolve(destino);
fs.mkdirSync(out, { recursive: true });
const unidade = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Salão central',
  fuso: 'America/Sao_Paulo',
  ativa: true,
};
const pedidoId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const data = '2026-11-18T14:30:00Z';
const operacaoId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const venda = {
  inicio: '2026-11-18',
  fim: '2026-11-18',
  fuso: unidade.fuso,
  consultadoEm: data,
  pedidosCriados: 17,
  canceladosAtualmente: 1,
  cobrancasOriginais: '920.00',
  ajustesNoPeriodo: '20.00',
  recebimentosConfirmados: '720.00',
  devolucoesConfirmadas: '15.00',
  saldoAReceberAtual: '195.00',
  saldoADevolverAtual: '0.00',
  reservasAtuais: '0.00',
  dias: [{ data: '2026-11-18', recebido: '720.00', devolvido: '15.00', ajustes: '20.00' }],
  canais: [
    { canal: 'MESA', pedidos: 12, cancelados: 0, cobrancaOriginal: '690.00' },
    { canal: 'RETIRADA', pedidos: 5, cancelados: 1, cobrancaOriginal: '230.00' },
  ],
  movimentos: [
    {
      id: operacaoId,
      registradoEm: data,
      tipo: 'RECEBIMENTO',
      valor: '35.00',
      metodo: 'PIX',
      pedidoId,
      comandaId: null,
      mesa: null,
      canal: 'RETIRADA',
      entregue: '35.00',
      troco: '0.00',
      recebimentoId: null,
    },
  ],
  maisMovimentos: false,
};
const base = {
  id: operacaoId,
  pedidoId,
  tentativas: 2,
  proximaTentativaEm: data,
  emProcessamento: false,
  ultimaTentativaFalhou: false,
  canalPedido: 'RETIRADA',
  estadoPedido: 'AGUARDANDO_PAGAMENTO',
  fuso: unidade.fuso,
};
const pagamento = {
  ...base,
  tipo: 'CHECKOUT',
  estado: 'AGUARDANDO',
  criadoEm: data,
  valor: '30.00',
  substituida: false,
  solicitadoAoProvedor: true,
  recebimentoId: null,
};
const notificacao = {
  ...base,
  tipo: 'PEDIDO_ACEITO',
  estado: 'CAPTURADO',
  criadaEm: data,
  proximaTentativaEm: null,
};

function servir(ctx, dir) {
  return ctx.route('**/*', async (r) => {
    const u = new URL(r.request().url());
    if (u.origin !== host) return r.abort();
    const api = u.pathname.slice(8);
    if (u.pathname.startsWith('/api/v1/')) {
      const fixed = {
        restaurante: { nome: 'Restaurante de teste' },
        'auth/csrf': { token: 'controle', headerName: 'X-Test' },
        'auth/refresh': { accessToken: 'controle', expiresIn: 999 },
        'auth/me': { usuarioId: pedidoId, perfil: 'GERENTE', emailVerificado: true },
        'acessos/efetivos': {
          perfil: 'GERENTE',
          acoes: ['relatorio.consultar', 'pagamento.reconciliar'],
          unidades: [unidade],
        },
        'operacao/unidades-existentes': [unidade],
        'relatorios/vendas': venda,
        'operacao/pagamentos': [pagamento],
        'operacao/notificacoes': [notificacao],
      };
      let result = fixed[api];
      if (api.endsWith('/pagina')) {
        const i = api.includes('pagamentos') ? pagamento : notificacao;
        result = {
          itens:
            (!u.searchParams.get('estado') || u.searchParams.get('estado') === i.estado) &&
            (!u.searchParams.get('tipo') || u.searchParams.get('tipo') === i.tipo)
              ? [i]
              : [],
          temMais: false,
        };
      }
      return r.fulfill({ json: result ?? {} });
    }
    const asset = path.resolve(dir, '.' + u.pathname);
    if (!asset.startsWith(path.resolve(dir) + path.sep) && asset !== path.resolve(dir))
      return r.abort();
    const file =
      fs.existsSync(asset) && fs.statSync(asset).isFile() ? asset : path.join(dir, 'index.html');
    const type =
      {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.json': 'application/json',
      }[path.extname(file)] || 'application/octet-stream';
    return r.fulfill({ body: fs.readFileSync(file), contentType: type });
  });
}

async function capturar(page, stage, route, width, tema) {
  await page.goto(host + '/gestao/' + route);
  await page.locator(route === 'relatorios' ? 'app-vendas' : 'app-pendencias-pagamento').waitFor();
  if (route === 'relatorios')
    await page.getByText('Pedidos criados no período', { exact: true }).waitFor();
  if (route === 'pendencias' && stage === 'depois')
    await page.locator('app-fila-operacional:visible summary').first().waitFor();
  if (stage === 'depois' && tema === 'escuro') {
    const bg = await page
      .locator('details.linha-operacional:visible')
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundColor);
    assert.ok(
      !['rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)'].includes(bg),
      'Superfície escura de detalhes',
    );
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, stage + ' ' + route + ' ' + width + ' overflow ' + overflow);
  await page.screenshot({
    path: path.join(out, [stage, route, width, tema].join('-') + '.png'),
    fullPage: true,
  });

  if (stage === 'depois' && route === 'pendencias') {
    await page.getByRole('button', { name: 'Notificações por e-mail' }).click();
    const fila = page.getByRole('region', {
      name: 'Notificações por e-mail',
      exact: true,
    });
    await fila.locator('summary').first().click();
    await fila.getByText('Tentativas', { exact: true }).waitFor();
    await page.screenshot({
      path: path.join(out, ['depois', 'notificacoes', width, tema].join('-') + '.png'),
      fullPage: true,
    });

    await fila.getByLabel('Estado', { exact: true }).selectOption('FALHOU');
    await fila.getByText('Nenhuma notificação nesta página.').waitFor();
  }
}

async function verificarTelas(browser, dir, stage, width, tema) {
  const ctx = await browser.newContext({
    viewport: { width, height: 850 },
    serviceWorkers: 'block',
    hasTouch: width < 1000,
  });
  try {
    await ctx.addInitScript((t) => localStorage.setItem('rm-tema-gestao', t), tema);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await servir(ctx, dir);
    for (const route of ['relatorios', 'pendencias'])
      await capturar(page, stage, route, width, tema);
    assert.deepEqual(errors, []);
  } finally {
    await ctx.close();
  }
}

async function executar() {
  const browser = await chromium.launch({
    channel: process.env.RM_CHROMIUM_CHANNEL || undefined,
    headless: true,
  });
  try {
    for (const [stage, dir] of [
      ['antes', anterior],
      ['depois', candidato],
    ]) {
      for (const width of [360, 768, 1280]) {
        for (const tema of ['claro', 'escuro'])
          await verificarTelas(browser, dir, stage, width, tema);
      }
    }
    console.log(
      '30 capturas. Telas Angular, filtros e detalhes verificados com transporte controlado.',
    );
  } finally {
    await browser.close();
  }
}
executar().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

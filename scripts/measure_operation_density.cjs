// Compara dois builds locais nas mesmas rotas e dados fictícios, sem tocar a operação.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, expect } = require('../frontend/node_modules/@playwright/test');

const base = process.argv[2];
const candidato = process.argv[3];
assert(base && candidato, 'Informe os diretórios browser dos builds base e candidato.');
const criadoEm = new Date(Date.now() - 15 * 60000).toISOString();
const unidade = { id: 'unidade', nome: 'Unidade de teste' };
const acoes = [
  'pedido.consultar',
  'pedido.entregar',
  'entrega.registrar_ocorrencia',
  'cozinha.iniciar',
  'cozinha.concluir',
];
const pedidos = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1).padStart(8, '0') + '-0000-4000-8000-000000000000',
  versao: 1,
  criadoEm,
  primeiroPreparoEm: criadoEm,
  estado: 'EM_ENTREGA',
  canal: 'DELIVERY',
  unidadeId: unidade.id,
  comandaId: null,
  observacao: 'Conferir o adicional na embalagem.',
  linhas: [
    {
      id: 'linha',
      nome: 'Prato da casa',
      tipo: 'SIMPLES',
      quantidade: 2,
      adicionais: [{ nome: 'Queijo', quantidade: 1 }],
      escolhas: [],
    },
  ],
  unidades: ['a', 'b'].map((id) => ({
    id,
    linhaId: 'linha',
    estado: 'PRONTO',
    iniciadoEm: criadoEm,
    concluidoEm: criadoEm,
  })),
  historico: [{ tipo: 'PEDIDO_ACEITO', motivo: '', ocorridoEm: criadoEm }],
  solicitacoes: [],
}));
const lista = pedidos.map((pedido) => ({
  pedido,
  endereco: {
    destinatario: 'Pessoa fictícia',
    contato: 'Contato de teste',
    logradouro: 'Rua de teste',
    numero: '12',
    complemento: 'Bloco de teste',
    bairro: 'Centro',
    cidade: 'Cidade de teste',
    uf: 'SP',
    cep: '01000000',
  },
  entrega: { regiao: 'Região central', taxa: '5.00', minimo: '10.00', total: '40.00' },
  ocorrencia: null,
}));
const grupoVazio = { itens: [], total: 0, mais: false };
const fila = pedidos.map((pedido) => ({
  pedido: {
    ...pedido,
    estado: 'NA_FILA',
    primeiroPreparoEm: null,
    unidades: pedido.unidades.map((u) => ({
      ...u,
      estado: 'NA_FILA',
      iniciadoEm: null,
      concluidoEm: null,
    })),
  },
  mesaNome: null,
  prontoEm: null,
}));
const respostas = {
  '/api/v1/restaurante': { nome: 'Restaurante de teste' },
  '/api/v1/auth/csrf': { token: 'teste', headerName: 'X-CSRF-TOKEN' },
  '/api/v1/auth/refresh': { accessToken: 'simulado', expiresIn: 900 },
  '/api/v1/auth/me': { usuarioId: 'operador', perfil: 'GERENTE', emailVerificado: true },
  '/api/v1/acessos/efetivos': { perfil: 'GERENTE', acoes, unidades: [unidade] },
  '/api/v1/operacao/unidades-existentes': [unidade],
  '/api/v1/expedicao': { itens: lista, mais: false },
  '/api/v1/eventos': { eventos: [], proximo: '0', temMais: false },
  '/api/v1/cozinha/painel': {
    fuso: 'America/Sao_Paulo',
    consultadoEm: criadoEm,
    fila: { itens: fila, total: fila.length, mais: false },
    emPreparo: grupoVazio,
    prontos: grupoVazio,
    anteriores: grupoVazio,
  },
};
const contentTypes = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
};

async function medir(browser, pasta, rota, largura, tema, novo) {
  const pagina = await browser.newPage({
    viewport: { width: largura, height: 900 },
    hasTouch: largura < 1024,
    serviceWorkers: 'block',
  });
  try {
    await pagina.addInitScript((tema) => localStorage.setItem('rm-tema-gestao', tema), tema);
    await pagina.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://localhost') return route.abort();
      if (url.pathname === '/api/v1/eventos/stream')
        return route.fulfill({ contentType: 'text/event-stream', body: ': conexão simulada\n\n' });
      if (url.pathname.startsWith('/api/'))
        return route.fulfill({
          status: Object.hasOwn(respostas, url.pathname) ? 200 : 404,
          json: respostas[url.pathname] ?? {},
        });
      const caminho = path.extname(url.pathname) ? url.pathname.slice(1) : 'index.html';
      try {
        const body = await fs.readFile(path.join(pasta, caminho));
        return route.fulfill({
          body,
          contentType: contentTypes[path.extname(caminho)] ?? 'application/octet-stream',
        });
      } catch {
        return route.fulfill({ status: 404, body: '' });
      }
    });
    await pagina.goto('http://localhost' + rota);
    const cozinha = rota === '/cozinha';
    const linhas = pagina.locator(
      cozinha ? '.coluna:first-child app-cartao-cozinha' : 'app-expedicao > section > article',
    );
    await expect(linhas).toHaveCount(pedidos.length);
    const medida = await linhas.evaluateAll((elements) => {
      const caixas = elements.map((element) => element.getBoundingClientRect());
      return {
        altura: Math.round(caixas[0].height),
        visiveis: caixas.filter((caixa) => caixa.top >= 0 && caixa.bottom <= innerHeight).length,
      };
    });
    if (process.env.RM_DENSIDADE_CAPTURAS) {
      const arquivo =
        [novo ? 'depois' : 'antes', cozinha ? 'cozinha' : 'expedicao', largura, tema].join('-') +
        '.png';
      await fs.mkdir(process.env.RM_DENSIDADE_CAPTURAS, { recursive: true });
      await pagina.screenshot({ path: path.join(process.env.RM_DENSIDADE_CAPTURAS, arquivo) });
    }
    if (novo) {
      await expect(pagina.locator('.workplace')).toHaveAttribute('data-tema-gestao', tema);
      assert(
        await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'Rolagem horizontal',
      );
      const fundo = await (cozinha ? linhas.first().locator('.cartao') : linhas.first()).evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      if (tema === 'escuro') assert.equal(fundo, 'rgb(38, 35, 34)');
      else assert.equal(fundo, 'rgb(255, 255, 255)');
      if (cozinha) {
        const produto = linhas.first();
        await expect(produto.getByText('2 × Prato da casa')).toBeVisible();
        await expect(produto.getByText('Histórico e referência')).toBeVisible();
        await produto.getByText('Histórico e referência').click();
        await expect(produto.getByText('PEDIDO_ACEITO', { exact: false })).toBeVisible();
        await expect(produto.locator('address')).toHaveCount(0);
        await expect(produto.getByText('Pessoa fictícia')).toHaveCount(0);
        await produto.getByText('Histórico e referência').click();
        await expect(produto.locator('.alca')).toHaveCount(largura >= 1024 ? 1 : 0);
        assert(
          (await produto.getByRole('button', { name: 'Iniciar pedido (2)' }).boundingBox())
            .height >= 48,
        );
      } else {
        const linha = linhas.first();
        await expect(linha.getByText('Região central', { exact: true }).first()).toBeVisible();
        await expect(linha.locator('address')).toBeHidden();
        const detalhes = linha.getByRole('button', { name: /Detalhes do pedido/ });
        await detalhes.focus();
        await detalhes.press('Enter');
        await expect(linha.locator('address')).toContainText('Pessoa fictícia');
        await expect(linha.getByText('Total da cotação')).toBeVisible();
        await expect(linha.getByText('Conclusão', { exact: false }).first()).toBeVisible();
        const motivo = linha.getByLabel('Motivo da ocorrência ou decisão');
        await motivo.fill('Conferir local');
        const atualizacao = pagina.waitForResponse((r) => r.url().includes('/api/v1/expedicao?'));
        await pagina.getByRole('button', { name: 'Atualizar expedição' }).click();
        await atualizacao;
        await expect(motivo).toHaveValue('Conferir local');
        await detalhes.click();
        await expect(linha.locator('address')).toBeHidden();
        assert((await detalhes.boundingBox()).height >= (largura < 1024 ? 48 : 38));
        await pagina.route('**/api/v1/expedicao?*', (route) =>
          route.fulfill({ status: 403, json: { mensagem: 'Acesso negado.' } }),
        );
        await pagina.getByRole('button', { name: 'Atualizar expedição' }).click();
        await expect(linhas).toHaveCount(0);
        await expect(pagina.locator('address')).toHaveCount(0);
      }
    }
    return medida;
  } finally {
    await pagina.close();
  }
}
(async () => {
  const browser = await chromium.launch();
  try {
    for (const largura of [360, 768, 1280]) {
      for (const rota of ['/gestao/expedicao', '/cozinha']) {
        for (const tema of ['claro', 'escuro']) {
          const antes = await medir(browser, base, rota, largura, tema, false);
          const depois = await medir(browser, candidato, rota, largura, tema, true);
          console.log(JSON.stringify({ largura, rota, tema, antes, depois }));
          if (rota === '/gestao/expedicao') assert(depois.altura < antes.altura);
        }
      }
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

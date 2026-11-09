import { abrirConta, navegarUi, nomePerfil } from '../e2e-identidade/apoio';
import { APIRequestContext, Page, expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fixture, loginApi, loginUi } from './apoio';

interface Matriz {
  versao: number;
  perfis: Record<string, string[]>;
}

interface Funcionario {
  id: string;
  versao: number;
  perfil: string;
  ativo: boolean;
  unidades: string[];
}

interface ProdutoPreparado {
  id: string;
  nome: string;
  categoriaId: string;
}

const acoes = ['catalogo.consultar', 'catalogo.editar', 'catalogo.alterar_unidade'];
const perfis = [
  ['GERENTE', 'gerente'],
  ['ATENDIMENTO', 'atendimento'],
  ['CAIXA', 'caixa'],
  ['COZINHA', 'cozinha'],
  ['EXPEDICAO', 'expedicao'],
] as const;

function headers(token: string): Record<string, string> {
  return { Authorization: 'Bearer ' + token };
}

async function matriz(request: APIRequestContext, token: string): Promise<Matriz> {
  const resposta = await request.get('/api/v1/configuracoes/acessos', { headers: headers(token) });
  expect(resposta.status()).toBe(200);
  return resposta.json();
}

async function funcionario(
  request: APIRequestContext,
  token: string,
  id: string,
): Promise<Funcionario> {
  for (let pagina = 0; pagina <= 10000; pagina++) {
    const resposta = await request.get('/api/v1/equipe?pagina=' + pagina, {
      headers: headers(token),
    });
    expect(resposta.status()).toBe(200);
    const equipe = (await resposta.json()) as Funcionario[];
    const conta = equipe.find((item) => item.id === id);
    if (conta) return conta;
    if (equipe.length < 50) break;
  }
  throw new Error('Funcionário fictício não encontrado na empresa preparada.');
}

async function configurarPerfil(
  request: APIRequestContext,
  token: string,
  perfil: string,
  permissoes: string[],
): Promise<void> {
  const atual = await matriz(request, token);
  const resposta = await request.put('/api/v1/configuracoes/acessos', {
    headers: headers(token),
    data: { versao: atual.versao, perfil, acoes: permissoes },
  });
  expect(resposta.status()).toBe(200);
}

async function prepararProduto(
  request: APIRequestContext,
  token: string,
): Promise<ProdutoPreparado> {
  const massa = fixture();
  const categoriaId = randomUUID();
  const produto = { id: randomUUID(), nome: 'Perfil ' + randomUUID(), categoriaId };
  expect(
    (
      await request.post('/api/v1/gestao/catalogo/categorias', {
        headers: headers(token),
        data: { id: categoriaId, nome: 'Categoria ' + categoriaId, ativa: true, versao: 0 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post('/api/v1/gestao/catalogo/produtos', {
        headers: headers(token),
        data: {
          ...produto,
          versao: 0,
          descricao: 'Produto fictício da matriz de acessos',
          tipo: 'SIMPLES',
          ativo: true,
          sugerido: false,
          midiaId: null,
          adicionais: [],
          grupos: [],
        },
      })
    ).status(),
  ).toBe(200);
  for (const unidade of [massa.unidadeA, massa.unidadeB]) {
    expect(
      (
        await request.put(oferta(produto.id, unidade), {
          headers: headers(token),
          data: {
            versao: 0,
            preco: '12.00',
            disponivel: true,
            canais: ['DELIVERY', 'RETIRADA', 'MESA'],
          },
        })
      ).status(),
    ).toBe(200);
  }
  return produto;
}

function oferta(produto: string, unidade: string): string {
  return '/api/v1/gestao/catalogo/produtos/' + produto + '/unidades/' + unidade;
}

async function abrirGestao(page: Page): Promise<void> {
  await navegarUi(page, '/gestao/catalogo');
  await expect(
    page.getByRole('heading', { name: 'Gestão do catálogo', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Gestão do catálogo', exact: true }),
  ).toHaveAttribute('aria-busy', 'false');
}

async function localizarOferta(page: Page, nome: string): Promise<void> {
  const botao = page.getByRole('button', { name: 'Oferta de ' + nome, exact: true });
  for (let pagina = 0; pagina <= 10000; pagina++) {
    if (await botao.count()) {
      await botao.click();
      return;
    }
    const proxima = page.getByRole('button', { name: 'Próxima página de produtos', exact: true });
    await expect(proxima).toBeEnabled();
    const resposta = page.waitForResponse(
      (item) =>
        item.request().method() === 'GET' &&
        /\/(operacao\/catalogo|gestao\/catalogo\/produtos)\?/.test(item.url()),
    );
    await proxima.click();
    expect((await resposta).status()).toBe(200);
    await expect(
      page.getByRole('region', { name: 'Gestão do catálogo', exact: true }),
    ).toHaveAttribute('aria-busy', 'false');
  }
  throw new Error('Oferta fictícia não apareceu na paginação completa.');
}

async function procurarNoCardapio(page: Page, produto: ProdutoPreparado): Promise<void> {
  await navegarUi(page, '/cardapio');
  await page.getByLabel('Unidade do cardápio', { exact: true }).selectOption(fixture().unidadeA);
  await expect(page.getByLabel('Buscar produtos', { exact: true })).toBeVisible();
  await page.getByLabel('Buscar produtos', { exact: true }).fill(produto.nome);
  const consulta = page.waitForResponse(
    (item) => item.url().includes('/api/v1/catalogo?') && item.url().includes('busca='),
  );
  await page.getByRole('button', { name: 'Buscar no cardápio', exact: true }).click();
  expect((await consulta).status()).toBe(200);
  await expect(page.getByRole('article', { name: produto.nome, exact: true })).toBeVisible();
}

async function selecionarOferta(page: Page, produto: string, unidade: string): Promise<void> {
  const consulta = page.waitForResponse(
    (item) => item.url().endsWith(oferta(produto, unidade)) && item.request().method() === 'GET',
  );
  await page.getByLabel('Unidade da oferta', { exact: true }).selectOption(unidade);
  expect((await consulta).status()).toBe(200);
  await expect(page.getByLabel('Preço base nesta unidade (R$)', { exact: true })).toBeEnabled();
}

for (const [perfil, chave] of perfis) {
  test(`S02-UI-PERFIL-${perfil}: concessão e revogação reais, escrita compartilhada e filial restrita`, async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);
    const massa = fixture();
    const conta = massa.contas[chave];
    if (!conta.id)
      throw new Error('A fixture precisa identificar o funcionário do perfil ' + perfil);
    const admin = await loginApi(request);
    const politicaOriginal = await matriz(request, admin);
    const original = await funcionario(request, admin, conta.id);
    const outrasAcoes = politicaOriginal.perfis[perfil].filter((acao) => !acoes.includes(acao));
    expect(
      (
        await request.post('/api/v1/auth/reautenticar', {
          headers: headers(admin),
          data: { senha: massa.senha },
        })
      ).status(),
    ).toBe(204);

    try {
      expect(
        (
          await request.put('/api/v1/equipe/' + conta.id, {
            headers: headers(admin),
            data: { versao: original.versao, perfil, ativo: true, unidades: [massa.unidadeA] },
          })
        ).status(),
      ).toBe(200);
      await configurarPerfil(request, admin, perfil, [...outrasAcoes, ...acoes]);
      const produto = await prepararProduto(request, admin);
      const token = await loginUi(page, conta);
      await abrirConta(page);
      await expect(page.getByText(nomePerfil[perfil], { exact: true })).toBeVisible();
      await abrirGestao(page);
      await expect(page.getByRole('button', { name: 'Novo produto', exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Categorias', exact: true }).click();
      await page.getByRole('button', { name: 'Nova categoria', exact: true }).click();
      await page.getByLabel('Nome da categoria', { exact: true }).fill('Concessão ' + randomUUID());
      const criada = page.waitForResponse(
        (item) =>
          item.url().endsWith('/gestao/catalogo/categorias') && item.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Criar categoria', exact: true }).click();
      expect((await criada).status()).toBe(200);
      await expect(
        page.getByRole('status').filter({ hasText: 'Categoria salva no servidor.' }),
      ).toBeVisible();

      await configurarPerfil(request, admin, perfil, [
        ...outrasAcoes,
        'catalogo.consultar',
        'catalogo.alterar_unidade',
      ]);
      await page.getByRole('button', { name: 'Nova categoria', exact: true }).click();
      await page.getByLabel('Nome da categoria', { exact: true }).fill('Revogada ' + randomUUID());
      const negada = page.waitForResponse(
        (item) =>
          item.url().endsWith('/gestao/catalogo/categorias') && item.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Criar categoria', exact: true }).click();
      expect((await negada).status()).toBe(403);
      await expect(
        page.getByRole('region', { name: 'Gestão do catálogo', exact: true }).getByRole('alert'),
      ).toContainText('Acesso negado');
      expect(
        (
          await request.get('/api/v1/gestao/catalogo/produtos', { headers: headers(token) })
        ).status(),
      ).toBe(403);

      await page.reload();
      await abrirConta(page);
      await expect(page.getByText(nomePerfil[perfil], { exact: true })).toBeVisible();
      await abrirGestao(page);
      await expect(page.getByRole('button', { name: 'Novo produto', exact: true })).toHaveCount(0);
      await expect(
        page.getByLabel('Unidade do catálogo operacional').locator('option'),
      ).toHaveCount(1);
      await expect(page.getByLabel('Unidade do catálogo operacional')).toHaveValue(massa.unidadeA);
      await localizarOferta(page, produto.nome);
      await selecionarOferta(page, produto.id, massa.unidadeA);
      await page.getByLabel('Preço base nesta unidade (R$)', { exact: true }).fill('13.00');
      const salva = page.waitForResponse(
        (item) =>
          item.url().endsWith(oferta(produto.id, massa.unidadeA)) &&
          item.request().method() === 'PUT',
      );
      await page.getByRole('button', { name: 'Salvar oferta da unidade', exact: true }).click();
      expect((await salva).status()).toBe(200);

      expect(
        (
          await request.get(oferta(produto.id, massa.unidadeB), { headers: headers(token) })
        ).status(),
      ).toBe(404);
      expect(
        (
          await request.put(oferta(produto.id, massa.unidadeB), {
            headers: headers(token),
            data: { versao: 1, preco: '0.01', disponivel: true, canais: ['RETIRADA'] },
          })
        ).status(),
      ).toBe(404);
      expect(
        (
          await request.put('/api/v1/clientes/me/favoritos/' + produto.id, {
            headers: headers(token),
          })
        ).status(),
      ).toBe(403);
      const outraOferta = await request.get(oferta(produto.id, massa.unidadeB), {
        headers: headers(admin),
      });
      expect((await outraOferta.json()).preco).toBe('12.00');

      await configurarPerfil(request, admin, perfil, [...outrasAcoes, 'catalogo.consultar']);
      expect(
        (
          await request.put(oferta(produto.id, massa.unidadeA), {
            headers: headers(token),
            data: { versao: 2, preco: '0.01', disponivel: true, canais: ['RETIRADA'] },
          })
        ).status(),
      ).toBe(403);
      await configurarPerfil(request, admin, perfil, outrasAcoes);
      expect(
        (
          await request.get('/api/v1/operacao/catalogo?unidadeId=' + massa.unidadeA, {
            headers: headers(token),
          })
        ).status(),
      ).toBe(403);
      await page.reload();
      await expect(page).toHaveURL(/\/sem-acesso$/);
      await expect(
        page.getByRole('heading', { name: 'Esta área não está no seu acesso.', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('region', { name: 'Gestão do catálogo', exact: true }),
      ).toHaveCount(0);
      await abrirConta(page);
      await expect(page.getByText(nomePerfil[perfil], { exact: true })).toBeVisible();
      await expect(page.locator('a[href="/gestao/catalogo"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );
    } finally {
      await configurarPerfil(request, admin, perfil, politicaOriginal.perfis[perfil]);
      const atual = await funcionario(request, admin, conta.id);
      expect(
        (
          await request.put('/api/v1/equipe/' + conta.id, {
            headers: headers(admin),
            data: {
              versao: atual.versao,
              perfil: original.perfil,
              ativo: original.ativo,
              unidades: original.unidades,
            },
          })
        ).status(),
      ).toBe(200);
    }
  });
}

test('S02-UI-PERFIL-ADMINISTRADOR: gestão compartilhada e oferta nas duas unidades', async ({
  page,
  request,
}) => {
  const massa = fixture();
  const token = await loginUi(page);
  const produto = await prepararProduto(request, token);
  await abrirGestao(page);
  await expect(page.getByRole('button', { name: 'Novo produto', exact: true })).toBeEnabled();
  await localizarOferta(page, produto.nome);
  for (const unidade of [massa.unidadeA, massa.unidadeB]) {
    await selecionarOferta(page, produto.id, unidade);
    await page.getByLabel('Preço base nesta unidade (R$)', { exact: true }).fill('14.00');
    const resposta = page.waitForResponse(
      (item) =>
        item.url().endsWith(oferta(produto.id, unidade)) && item.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Salvar oferta da unidade', exact: true }).click();
    expect((await resposta).status()).toBe(200);
    const consulta = await request.get(oferta(produto.id, unidade), { headers: headers(token) });
    expect((await consulta.json()).preco).toBe('14.00');
  }
  expect(
    (await request.get('/api/v1/clientes/me/favoritos', { headers: headers(token) })).status(),
  ).toBe(403);
});

test('S02-UI-PERFIS-CLIENTES: favoritos pessoais de duas contas e gestão negada', async ({
  page,
  request,
}) => {
  const massa = fixture();
  const admin = await loginApi(request);
  const produto = await prepararProduto(request, admin);
  const tokenA = await loginUi(page, massa.contas.clienteA);
  await expect(page.locator('a[href="/gestao/catalogo"]')).toHaveCount(0);
  await procurarNoCardapio(page, produto);
  const adicionar = page.waitForResponse(
    (item) =>
      item.url().endsWith('/clientes/me/favoritos/' + produto.id) &&
      item.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Favoritar: ' + produto.nome, exact: true }).click();
  expect((await adicionar).status()).toBe(204);
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos: ' + produto.nome, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  const favoritosA = await request.get('/api/v1/clientes/me/favoritos', {
    headers: headers(tokenA),
  });
  expect((await favoritosA.json()).produtoIds).toContain(produto.id);
  const cardapio = page.getByRole('region', { name: 'Nosso cardápio', exact: true });
  const buscaPorDescricao = 'Produto fictício da matriz de acessos';
  expect(produto.nome).not.toContain(buscaPorDescricao);
  await cardapio.getByLabel('Buscar produtos', { exact: true }).fill(buscaPorDescricao);
  await cardapio
    .getByLabel('Categoria do cardápio', { exact: true })
    .selectOption(produto.categoriaId);
  await cardapio.getByRole('button', { name: 'Buscar no cardápio', exact: true }).click();
  await expect(cardapio).toHaveAttribute('aria-busy', 'false');
  await expect(cardapio.getByRole('article', { name: produto.nome, exact: true })).toBeVisible();
  await cardapio.getByRole('button', { name: 'Meus favoritos', exact: true }).click();
  await expect(cardapio).toHaveAttribute('aria-busy', 'false');
  await expect(cardapio.getByRole('article', { name: produto.nome, exact: true })).toBeVisible();
  expect(
    (await request.get('/api/v1/gestao/catalogo/produtos', { headers: headers(tokenA) })).status(),
  ).toBe(403);
  expect(
    (
      await request.put(oferta(produto.id, massa.unidadeA), {
        headers: headers(tokenA),
        data: { versao: 1, preco: '0.01', disponivel: true, canais: ['RETIRADA'] },
      })
    ).status(),
  ).toBe(403);

  await abrirConta(page);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  const tokenB = await loginUi(page, massa.contas.clienteB);
  await expect(page.locator('a[href="/gestao/catalogo"]')).toHaveCount(0);
  await procurarNoCardapio(page, produto);
  await expect(
    page.getByRole('button', { name: 'Favoritar: ' + produto.nome, exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  const favoritosB = await request.get('/api/v1/clientes/me/favoritos', {
    headers: headers(tokenB),
  });
  expect((await favoritosB.json()).produtoIds).not.toContain(produto.id);
  expect(
    (
      await request.delete('/api/v1/clientes/me/favoritos/' + produto.id, {
        headers: headers(tokenB),
      })
    ).status(),
  ).toBe(204);
  expect(
    (await request.get('/api/v1/gestao/catalogo/produtos', { headers: headers(tokenB) })).status(),
  ).toBe(403);
  expect(
    (await request.get('/api/v1/clientes/me/favoritos', { headers: headers(tokenA) })).status(),
  ).toBe(401);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

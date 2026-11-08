import {
  APIRequestContext,
  APIResponse,
  Response,
  Browser,
  BrowserContext,
  Locator,
  Page,
  expect,
  test,
} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { EnvioPedido, Pedido } from '../src/app/pedidos/modelos';

export interface Conta {
  email: string;
  senha: string;
  id?: string;
}
export interface Fixture extends Conta {
  unidadeA: string;
  unidadeB: string;
  contas: Record<
    'gerente' | 'atendimento' | 'caixa' | 'cozinha' | 'expedicao' | 'clienteA' | 'clienteB',
    Conta
  >;
}
export interface ProdutoTeste {
  id: string;
  nome: string;
  grupoId?: string;
  opcaoId?: string;
}
export interface CatalogoTeste {
  simples: ProdutoTeste;
  combo: ProdutoTeste;
}

export function fixture(): Fixture {
  const arquivo = process.env['RM_PEDIDOS_FIXTURE'];
  if (!arquivo || !path.isAbsolute(arquivo))
    throw new Error('A Sprint 3 exige fixture privada absoluta.');
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as Fixture;
  if (!dados.email || !dados.senha || !dados.unidadeA || !dados.unidadeB || !dados.contas)
    throw new Error('Fixture Sprint 3 incompleta.');
  return dados;
}

export async function loginApi(
  request: APIRequestContext,
  conta: Conta = fixture(),
): Promise<string> {
  const csrf = await (await request.get('/api/v1/auth/csrf')).json();
  const response = await request.post('/api/v1/auth/login', {
    headers: { [csrf.headerName]: csrf.token },
    data: { email: conta.email, senha: conta.senha },
  });
  expect(response.status(), 'Login de fixture').toBe(200);
  return (await response.json()).accessToken;
}

export async function api(
  request: APIRequestContext,
  token: string,
  rota: string,
  method = 'GET',
  data?: object,
): Promise<APIResponse> {
  return request.fetch(rota, { method, headers: { Authorization: 'Bearer ' + token }, data });
}

export async function ok<T>(response: APIResponse | Response): Promise<T> {
  expect([200, 204], new URL(response.url()).pathname).toContain(response.status());
  if (response.status() === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const equipes = new WeakMap<Page, boolean>();

export async function navegarUi(page: Page, destino: string): Promise<void> {
  if (new URL(page.url()).pathname === destino) return;
  if (destino.startsWith('/gestao/') || destino === '/cozinha') {
    if (new URL(page.url()).pathname === '/cozinha') {
      await page.getByRole('link', { name: 'Gestão', exact: true }).click();
    } else if (!new URL(page.url()).pathname.startsWith('/gestao/')) {
      await page.getByRole('link', { name: 'Área da equipe', exact: true }).click();
      await expect(page.getByLabel('Unidade da operação', { exact: true })).toBeVisible();
    }
    if (destino === '/gestao/pedidos/novo') await navegarUi(page, '/gestao/pedidos');
  }
  if (new URL(page.url()).pathname === destino) return;
  const menu = page.getByRole('button', { name: 'Abrir menu de gestão', exact: true });
  if (
    (await page.locator('.sidebar a[href="' + destino + '"]').count()) > 0 &&
    (await menu.isVisible()) &&
    (await menu.getAttribute('aria-expanded')) !== 'true'
  ) {
    await menu.click();
  }
  await page
    .locator('a[href="' + destino + '"]:visible')
    .first()
    .click();
  await expect(page).toHaveURL((url) => url.pathname === destino);
}

export async function loginUi(page: Page, conta: Conta): Promise<string> {
  const clientes = fixture().contas;
  const equipe = ![clientes.clienteA.email, clientes.clienteB.email].includes(conta.email);
  equipes.set(page, equipe);
  await page.goto(equipe ? '/gestao/entrar' : '/entrar');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
  await page.getByLabel('E-mail', { exact: true }).fill(conta.email);
  await page.getByLabel('Senha', { exact: true }).fill(conta.senha);
  const resposta = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/v1/auth/login' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const token = (await ok<{ accessToken: string }>(await resposta)).accessToken;
  if (equipe) {
    await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeVisible();
  } else {
    await expect(page).toHaveURL((url) => url.pathname === '/cardapio');
    await expect(page.locator('a[href="/conta"]:visible').first()).toBeVisible();
    await navegarUi(page, '/pedidos');
    await expect(page.getByRole('region', { name: 'Meus pedidos', exact: true })).toBeVisible();
  }
  return token;
}

export async function contexto(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: process.env['RM_BASE_URL'],
    ignoreHTTPSErrors: true,
    viewport: test.info().project.use.viewport,
    isMobile: test.info().project.use.isMobile,
    hasTouch: test.info().project.use.hasTouch,
  });
  return { context, page: await context.newPage() };
}

export async function operacao(
  page: Page,
  area:
    | 'Fila de pedidos'
    | 'Painel da cozinha'
    | 'Mesas e comandas'
    | 'Configurar prazos de aceite' = 'Fila de pedidos',
): Promise<Locator> {
  const destinos = {
    'Fila de pedidos': '/gestao/pedidos',
    'Painel da cozinha': '/cozinha',
    'Mesas e comandas': '/gestao/mesas',
    'Configurar prazos de aceite': '/gestao/configuracoes/prazos',
  };
  await navegarUi(page, destinos[area]);
  await page.getByLabel('Unidade da operação', { exact: true }).selectOption(fixture().unidadeA);
  const painel = page.getByRole('main');
  if (area === 'Painel da cozinha') {
    // A cozinha abre pelos mais antigos; esta massa compartilhada busca o pedido recém-criado.
    await painel.getByLabel('Ordenar pedidos', { exact: true }).selectOption('RECENTES');
  }
  return painel;
}

export async function localizarMesa(painel: Locator, nome: string): Promise<Locator> {
  const paginas = painel.getByRole('navigation', { name: 'Páginas de mesas', exact: true });
  const anterior = paginas.getByRole('button', { name: 'Mesas anteriores', exact: true });
  const proxima = paginas.getByRole('button', { name: 'Próximas mesas', exact: true });
  const atualizar = painel.getByRole('button', { name: 'Atualizar mesas', exact: true });
  await expect(atualizar).toBeEnabled();
  while (await anterior.isEnabled()) {
    const pagina = await paginas.getByRole('status').innerText();
    await anterior.click();
    await expect(paginas.getByRole('status')).not.toHaveText(pagina);
  }
  const mesa = painel.getByRole('article', { name: 'Mesa ' + nome, exact: true });
  while (true) {
    await expect
      .poll(async () => (await mesa.count()) > 0 || (await proxima.isEnabled()), {
        message: 'Mesa preparada ou próxima página deve aparecer após a consulta',
      })
      .toBe(true);
    if ((await mesa.count()) > 0) break;
    await expect(proxima, 'Mesa preparada deve estar acessível por paginação').toBeEnabled();
    const pagina = await paginas.getByRole('status').innerText();
    await proxima.click();
    await expect(paginas.getByRole('status')).not.toHaveText(pagina);
  }
  await expect(mesa).toBeVisible();
  return mesa;
}

export async function selecionarComanda(page: Page, nome: string): Promise<void> {
  const select = page.getByLabel('Comanda do pedido assistido', { exact: true });
  const paginas = page.getByRole('navigation', {
    name: 'Páginas de mesas para pedido assistido',
    exact: true,
  });
  const anterior = paginas.getByRole('button', {
    name: 'Mesas anteriores para pedido assistido',
    exact: true,
  });
  const proxima = paginas.getByRole('button', {
    name: 'Próximas mesas para pedido assistido',
    exact: true,
  });
  await expect(select).toBeEnabled();
  while (await anterior.isEnabled()) {
    const pagina = await paginas.getByRole('status').innerText();
    await anterior.click();
    await expect(paginas.getByRole('status')).not.toHaveText(pagina);
  }
  const opcao = select.getByRole('option', { name: nome, exact: true });
  while (true) {
    await expect
      .poll(async () => (await opcao.count()) > 0 || (await proxima.isEnabled()), {
        message: 'Comanda preparada ou próxima página deve aparecer após a consulta',
      })
      .toBe(true);
    if ((await opcao.count()) > 0) break;
    await expect(proxima, 'Comanda preparada deve estar acessível por paginação').toBeEnabled();
    const pagina = await paginas.getByRole('status').innerText();
    await proxima.click();
    await expect(paginas.getByRole('status')).not.toHaveText(pagina);
  }
  await select.selectOption({ label: nome });
}

export async function prepararCatalogo(request: APIRequestContext): Promise<CatalogoTeste> {
  const token = await loginApi(request);
  await ok(
    await api(request, token, '/api/v1/auth/reautenticar', 'POST', { senha: fixture().senha }),
  );
  for (const unidade of [fixture().unidadeA, fixture().unidadeB]) {
    const funcionamento = await ok<{ versao: number; versaoUnidade: number }>(
      await api(request, token, '/api/v1/configuracoes/unidades/' + unidade + '/funcionamento'),
    );
    await ok(
      await api(
        request,
        token,
        '/api/v1/configuracoes/unidades/' + unidade + '/funcionamento',
        'PUT',
        {
          versao: funcionamento.versao,
          versaoUnidade: funcionamento.versaoUnidade,
          canais: ['RETIRADA', 'DELIVERY', 'MESA'],
          horarios: ['RETIRADA', 'DELIVERY', 'MESA'].flatMap((canal) =>
            Array.from({ length: 7 }, (_, index) => ({
              canal,
              diaSemana: index + 1,
              inicio: '00:00',
              fim: '24:00',
            })),
          ),
        },
      ),
    );
  }
  const categoriaId = randomUUID();
  const sufixo = categoriaId.slice(0, 8);
  await ok(
    await api(request, token, '/api/v1/gestao/catalogo/categorias', 'POST', {
      id: categoriaId,
      nome: 'Sprint 3 ' + sufixo,
      ativa: true,
      versao: 0,
    }),
  );
  const simples = { id: randomUUID(), nome: 'S3 simples ' + sufixo };
  const combo = {
    id: randomUUID(),
    nome: 'S3 combo ' + sufixo,
    grupoId: randomUUID(),
    opcaoId: randomUUID(),
  };
  for (const produto of [simples, combo]) {
    await ok(
      await api(request, token, '/api/v1/gestao/catalogo/produtos', 'POST', {
        id: produto.id,
        nome: produto.nome,
        versao: 0,
        descricao: 'Preparação fictícia para validar pedidos.',
        categoriaId,
        tipo: produto.id === combo.id ? 'COMBO' : 'SIMPLES',
        ativo: true,
        sugerido: false,
        midiaId: null,
        adicionais: [],
        grupos:
          produto.id === combo.id
            ? [
                {
                  id: combo.grupoId,
                  nome: 'Principal',
                  minimo: 1,
                  maximo: 1,
                  opcoes: [
                    {
                      id: combo.opcaoId,
                      produtoId: simples.id,
                      acrescimo: '5.00',
                      limite: 1,
                      adicionaisPermitidos: [],
                    },
                  ],
                },
              ]
            : [],
      }),
    );
    for (const unidade of [fixture().unidadeA, fixture().unidadeB]) {
      await ok(
        await api(
          request,
          token,
          '/api/v1/gestao/catalogo/produtos/' + produto.id + '/unidades/' + unidade,
          'PUT',
          {
            versao: 0,
            preco: produto.id === combo.id ? '30.00' : '10.00',
            disponivel: true,
            canais: ['RETIRADA', 'MESA', 'DELIVERY'],
          },
        ),
      );
    }
  }
  return { simples, combo };
}

export async function montarCarrinho(
  page: Page,
  produto: ProdutoTeste,
  canal: 'RETIRADA' | 'MESA' | 'DELIVERY',
  quantidade: number,
): Promise<void> {
  const equipe = equipes.get(page) === true;
  await navegarUi(page, equipe ? '/gestao/pedidos/novo' : '/cardapio');
  const vitrine = page.getByRole('region', { name: 'Nosso cardápio', exact: true });
  if (equipe) {
    await page.getByLabel('Unidade da operação', { exact: true }).selectOption(fixture().unidadeA);
    await expect(vitrine.getByLabel('Unidade do cardápio', { exact: true })).toHaveValue(
      fixture().unidadeA,
    );
  } else {
    await vitrine
      .getByLabel('Unidade do cardápio', { exact: true })
      .selectOption(fixture().unidadeA);
  }
  await expect(vitrine).toHaveAttribute('aria-busy', 'false');
  await vitrine.getByLabel('Canal do cardápio', { exact: true }).selectOption(canal);
  await expect(vitrine).toHaveAttribute('aria-busy', 'false');
  await vitrine.getByLabel('Buscar produtos', { exact: true }).fill(produto.nome);
  await vitrine.getByRole('button', { name: 'Buscar no cardápio', exact: true }).click();
  await expect(vitrine).toHaveAttribute('aria-busy', 'false');
  await vitrine.getByRole('button', { name: 'Ver opções de ' + produto.nome, exact: true }).click();
  const configurador = page
    .getByRole('dialog', { name: 'Configurar produto', exact: true })
    .getByRole('region', {
      name: 'Configurar ' + produto.nome,
      exact: true,
    });
  await configurador.getByLabel('Quantidade do produto', { exact: true }).fill(String(quantidade));
  if (produto.opcaoId) {
    await configurador
      .getByRole('button', { name: 'Adicionar escolha de Principal', exact: true })
      .click();
    await configurador
      .getByLabel('Opção da escolha', { exact: true })
      .selectOption(produto.opcaoId);
  }
  await configurador.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  const revisar = page.getByRole('button', { name: 'Revisar meu pedido', exact: true });
  if (!(await revisar.isVisible())) await navegarUi(page, '/carrinho');
  await revisar.click();
  await page.getByRole('button', { name: 'Confirmar composição e valores', exact: true }).click();
  await expect(
    page.getByText('Resumo confirmado. O envio do pedido exige confirmação separada.', {
      exact: true,
    }),
  ).toBeVisible();
}

export async function enviarUi(page: Page, mesa = false): Promise<Pedido> {
  const rota = mesa ? '/api/v1/mesa/pedidos' : '/api/v1/pedidos';
  const resposta = page.waitForResponse(
    (r) => new URL(r.url()).pathname === rota && r.request().method() === 'POST',
  );
  await page
    .getByRole('button', {
      name: mesa ? 'Enviar rodada para a cozinha' : 'Enviar pedido para aceite',
      exact: true,
    })
    .click();
  const pedido = await ok<Pedido>(await resposta);
  await expect(
    page.getByText('Pedido confirmado: ' + pedido.id + '.', { exact: false }),
  ).toBeVisible();
  await navegarUi(page, mesa ? '/mesa' : '/pedidos');
  await expect(
    page.getByRole('article', { name: 'Pedido ' + pedido.id, exact: true }),
  ).toBeVisible();
  return pedido;
}

export async function enviarApi(
  request: APIRequestContext,
  token: string,
  produto: ProdutoTeste,
  canal: 'RETIRADA' | 'MESA' | 'DELIVERY' = 'RETIRADA',
  quantidade = 1,
  comandaId: string | null = null,
  mesa = false,
): Promise<{ pedido: Pedido; corpo: EnvioPedido }> {
  const linhas = [
    {
      id: randomUUID(),
      produtoId: produto.id,
      quantidade,
      adicionais: [],
      escolhas: produto.opcaoId
        ? [{ grupoId: produto.grupoId!, opcaoId: produto.opcaoId, quantidade: 1, adicionais: [] }]
        : [],
    },
  ];
  const resumo = await ok<{ revisao: string }>(
    await request.post('/api/v1/carrinho/calcular', {
      data: { unidadeId: fixture().unidadeA, canal, linhas },
    }),
  );
  const corpo: EnvioPedido = {
    intencaoId: randomUUID(),
    unidadeId: fixture().unidadeA,
    canal,
    comandaId,
    revisao: resumo.revisao,
    linhas,
    observacao: '',
    endereco:
      canal === 'DELIVERY'
        ? {
            logradouro: 'Rua fictícia',
            numero: '100',
            complemento: 'Teste',
            bairro: 'Bairro fictício',
            cidade: 'Cidade fictícia',
            uf: 'SP',
            cep: '01001000',
          }
        : null,
  };
  return {
    pedido: await ok<Pedido>(
      await api(request, token, mesa ? '/api/v1/mesa/pedidos' : '/api/v1/pedidos', 'POST', corpo),
    ),
    corpo,
  };
}

export async function comando(
  request: APIRequestContext,
  token: string,
  pedido: Pedido,
  acao: string,
  unidades: string[] = [],
  base = '/api/v1/operacao/pedidos',
): Promise<Pedido> {
  return ok<Pedido>(
    await api(request, token, base + '/' + pedido.id + '/' + acao, 'POST', {
      intencaoId: randomUUID(),
      versao: pedido.versao,
      motivo: 'Verificação fictícia da Sprint 3',
      unidades,
    }),
  );
}

export async function capturar(page: Page, alvo: Locator, nome: string): Promise<void> {
  await alvo.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.screenshot({ path: test.info().outputPath(nome + '.png'), fullPage: false });
}

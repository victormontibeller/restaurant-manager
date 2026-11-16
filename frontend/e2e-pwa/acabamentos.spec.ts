import { expect, test } from '@playwright/test';

test('Falha de abertura exibe ação de recuperação e recarrega o mesmo endereço', async ({
  page,
}) => {
  const endereco = '/cardapio?abertura=teste';
  await page.route(
    '**' + endereco,
    async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      expect(body).toContain('<app-root></app-root>');
      // A ausência do elemento raiz faz a inicialização real do Angular rejeitar.
      await route.fulfill({ response, body: body.replace('<app-root></app-root>', '') });
    },
    { times: 1 },
  );
  await page.goto(endereco);
  const titulo = page.getByRole('heading', { name: 'Não foi possível abrir o aplicativo' });
  await expect(titulo).toBeFocused();
  await page.keyboard.press('Tab');
  const recarregar = page.getByRole('button', { name: 'Recarregar página' });
  await expect(recarregar).toBeFocused();
  expect((await recarregar.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Nosso cardápio' })).toBeVisible();
  await expect(page).toHaveURL(/\/cardapio\?abertura=teste$/);
});

test('Navegação pelo Angular mostra a recuperação de link antes de pedir login', async ({
  page,
}) => {
  await page.goto('/cardapio');
  await expect(page.getByRole('heading', { name: 'Nosso cardápio' })).toBeVisible();
  const caminho = '/pedidos/id-invalido';
  await page.evaluate((url) => {
    history.pushState(history.state, '', url);
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  }, caminho);
  await expect(page).toHaveURL(new RegExp(caminho + '$'));
  await expect(page.getByRole('heading', { name: 'Essa página saiu do cardápio.' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver cardápio' }).click();
  await expect(page.getByRole('heading', { name: 'Nosso cardápio' })).toBeVisible();
});

test.describe('Página de recuperação sem JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('Link de mesa malformado retorna 404 e permite voltar para uma rota válida', async ({
    page,
    browserName,
  }) => {
    const teclaTab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
    const resposta = await page.goto('/mesa/codigo-invalido');
    expect(resposta?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Essa página saiu do cardápio.' }),
    ).toBeVisible();
    await page.keyboard.press(teclaTab);
    await expect(page.getByRole('link', { name: 'Ver cardápio' })).toBeFocused();
    await page.keyboard.press(teclaTab);
    const mesa = page.getByRole('link', { name: 'Minha mesa' });
    await expect(mesa).toBeFocused();
    expect((await mesa.boundingBox())?.height).toBeGreaterThanOrEqual(48);
    const retorno = page.waitForResponse(
      (response) =>
        response.request().isNavigationRequest() && new URL(response.url()).pathname === '/mesa',
    );
    await page.keyboard.press('Enter');
    expect((await retorno).status()).toBe(200);
  });
});

import { test, expect } from '@playwright/test';

test('S00-UI01: shell conecta à API e PostgreSQL reais', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Conexão com o sistema' }).getByRole('status'),
  ).toHaveText('Sistema conectado. Banco de dados disponível.');
  await expect(
    page.getByText('Nenhum pedido ou pagamento é aceito nesta versão.', { exact: false }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  expect(
    await page
      .getByRole('button', { name: 'Verificar conexão' })
      .evaluate((e) => e.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(48);
  expect(await page.locator('main').evaluate((e) => getComputedStyle(e).paddingLeft)).not.toBe(
    '0px',
  );
  expect(errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('shell.png'), fullPage: true });
});

test('S00-UI02: teclado e recuperação após rede indisponível', async ({
  page,
  context,
  browserName,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('region', { name: 'Conexão com o sistema' }).getByRole('status'),
  ).toContainText('Sistema conectado');
  // No WebKit/macOS, Option-Tab inclui links na navegação nativa por teclado.
  await page.keyboard.press(
    browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab',
  );
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Verificar conexão' })).toBeFocused();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Verificar conexão' }).click();
  await expect(
    page.getByRole('region', { name: 'Conexão com o sistema' }).getByRole('status'),
  ).toContainText('Sem conexão com o sistema');
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Verificar conexão' }).click();
  await expect(
    page.getByRole('region', { name: 'Conexão com o sistema' }).getByRole('status'),
  ).toContainText('Sistema conectado');
});

test.describe('Fronteira de rede S00-UI03', () => {
  // A falha/gate é aplicada à API real por page.route. O worker pode impedir
  // essa interceptação; PWA e jornadas normais permanecem com worker ativo.
  test.use({ serviceWorkers: 'block' });

  test('S00-UI03: carregamento aguarda resposta real sem duplicar consulta', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Somente retarda a requisição; resposta continua sendo da API/PostgreSQL reais.
    await page.route('**/actuator/health', async (route) => {
      await gate;
      await route.continue();
    });
    try {
      await page.goto('/');
      await expect(
        page.getByRole('region', { name: 'Conexão com o sistema' }).getByRole('status'),
      ).toHaveText('Verificando conexão…');
      await expect(page.getByRole('button', { name: 'Verificar conexão' })).toBeDisabled();
    } finally {
      release();
    }
    await expect(
      page.getByRole('region', { name: 'Conexão com o sistema' }).getByRole('status'),
    ).toContainText('Sistema conectado');
    await expect(page.getByRole('button', { name: 'Verificar conexão' })).toBeEnabled();
  });
});

test('S00-API01: gestão privada e domínio arbitrário negados', async ({ request }) => {
  const unknown = await request.get('/api/v1/unidades', {
    headers: { Host: 'desconhecido.localhost' },
  });
  expect(unknown.status()).toBe(404);
  expect((await unknown.json()).codigo).toBe('EMPRESA_INDISPONIVEL');
  const privateHost = process.env['RM_PRIVATE_HOST'] ?? 'a.localhost';
  expect(['a.localhost', 'hmla.localhost']).toContain(privateHost);
  const privateRoute = await request.get('/api/v1/equipe', { headers: { Host: privateHost } });
  expect(privateRoute.status()).toBe(401);
  expect((await privateRoute.json()).codigo).toBe('AUTENTICACAO_NECESSARIA');
  const health = await request.get('/actuator/health');
  expect(await health.json()).toEqual({ status: 'UP' });
});

import { test, expect } from '@playwright/test';

test('S00-UI01: shell conecta à API e PostgreSQL reais', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Sistema conectado. Banco de dados disponível.');
  await expect(page.getByText('Nenhum pedido ou pagamento é aceito nesta versão.', {exact:false})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('shell.png'), fullPage: true });
});

test('S00-UI02: teclado e recuperação após rede indisponível', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Sistema conectado');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Verificar conexão' })).toBeFocused();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Verificar conexão' }).click();
  await expect(page.getByRole('status')).toContainText('Sem conexão com o sistema');
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Verificar conexão' }).click();
  await expect(page.getByRole('status')).toContainText('Sistema conectado');
});

test('S00-API01: gestão privada e domínio arbitrário negados', async ({ request }) => {
  const unknown = await request.get('/api/v1/unidades', { headers: { Host: 'desconhecido.localhost' } });
  expect(unknown.status()).toBe(404);
  expect((await unknown.json()).codigo).toBe('EMPRESA_INDISPONIVEL');
  const privateRoute = await request.get('/api/v1/equipe');
  expect(privateRoute.status()).toBe(401);
  expect((await privateRoute.json()).codigo).toBe('AUTENTICACAO_NECESSARIA');
  const health = await request.get('/actuator/health');
  expect(await health.json()).toEqual({status:'UP'});
});

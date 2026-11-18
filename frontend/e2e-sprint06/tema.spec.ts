import { expect, test } from '@playwright/test';

test('S06-UI02: o tema acompanha o cardápio, o carrinho e a recarga', async ({ page }) => {
  await page.goto('/cardapio');
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.getByRole('button', { name: 'Filtros', exact: true }).click();
  const filtros = page.getByRole('dialog');
  await expect(filtros).toBeVisible();
  await expect(filtros).toHaveCSS('color-scheme', 'dark');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Abrir carrinho', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.getByRole('button', { name: 'Ativar tema claro' }).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
});

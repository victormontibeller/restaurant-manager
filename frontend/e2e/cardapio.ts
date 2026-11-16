import { expect, Locator, Page } from '@playwright/test';
import type { Canal } from '../src/app/catalogo/modelos';

export async function abrirFiltrosCardapio(vitrine: Locator): Promise<Locator> {
  await expect(vitrine).toHaveAttribute('aria-busy', 'false');
  await vitrine.getByRole('button', { name: 'Filtros', exact: true }).click();
  const filtros = vitrine.page().getByRole('dialog', { name: 'Filtros do cardápio', exact: true });
  await expect(filtros).toBeVisible();
  return filtros;
}

export async function aplicarContextoCardapio(
  vitrine: Locator,
  unidade: string,
  canal?: Canal,
): Promise<void> {
  const filtros = await abrirFiltrosCardapio(vitrine);
  await filtros.getByLabel('Unidade do cardápio', { exact: true }).selectOption(unidade);
  if (canal) {
    await filtros.getByLabel('Canal do cardápio', { exact: true }).selectOption(canal);
  }
  await filtros.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await expect(filtros).toBeHidden();
  await expect(vitrine).toHaveAttribute('aria-busy', 'false');
}

export async function abrirCarrinhoPelaVitrine(page: Page): Promise<void> {
  await page.getByRole('link', { name: /^Ver (meu )?carrinho/ }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/carrinho');
}

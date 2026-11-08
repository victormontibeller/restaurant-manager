import { expect, Page } from '@playwright/test';

export const nomePerfil: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  ATENDIMENTO: 'Atendimento',
  CAIXA: 'Caixa',
  COZINHA: 'Equipe da cozinha',
  EXPEDICAO: 'Expedição',
  CLIENTE: 'Cliente',
};

async function abrirMenu(page: Page): Promise<void> {
  const abrir = page.getByRole('button', { name: 'Abrir menu de gestão', exact: true });
  if ((await abrir.isVisible()) && (await abrir.getAttribute('aria-expanded')) !== 'true')
    await abrir.click();
}

export async function abrirConta(page: Page): Promise<void> {
  await expect(page).not.toHaveURL(/\/entrar(?:\?|$)/);
  if (new URL(page.url()).pathname === '/conta') return;
  await expect(page.locator('a[href="/conta"]').first()).toBeAttached();
  if ((await page.locator('a[href="/conta"]:visible').count()) === 0) {
    if (new URL(page.url()).pathname === '/cozinha') {
      await page.getByRole('link', { name: 'Gestão', exact: true }).click();
      await expect(page).toHaveURL(/\/gestao\/pedidos$/);
    }
    await abrirMenu(page);
  }
  await page.locator('a[href="/conta"]:visible').first().click();
  await expect(page).toHaveURL(/\/conta$/);
}

export async function navegarGestao(page: Page, rota: string): Promise<void> {
  await expect(page).not.toHaveURL(/\/entrar(?:\?|$)/);
  if (new URL(page.url()).pathname === rota) return;
  const equipe = page.getByRole('link', { name: 'Abrir área da equipe', exact: true });
  if (await equipe.isVisible()) {
    await equipe.click();
    await expect(page).toHaveURL(/\/(gestao(?:\/[^?]*)?|cozinha)$/);
  }
  if (new URL(page.url()).pathname === '/cozinha') {
    await page.getByRole('link', { name: 'Gestão', exact: true }).click();
    await expect(page).toHaveURL(/\/gestao\/pedidos$/);
  }
  if (new URL(page.url()).pathname === rota) return;
  await expect(page.locator('app-equipe-layout')).toBeVisible();
  await abrirMenu(page);
  await page
    .locator('a[href="' + rota + '"]:visible')
    .first()
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(rota);
}

export async function confirmarNavegacaoBloqueada(page: Page, rota: string): Promise<void> {
  const anterior = new URL(page.url()).pathname;
  await abrirMenu(page);
  await page
    .locator('a[href="' + rota + '"]:visible')
    .first()
    .click();
  await expect(
    page.getByRole('alert').filter({
      hasText: 'Aguarde a operação ou confira o resultado pendente antes de mudar de tela.',
    }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(anterior);
  await page.getByRole('button', { name: 'Fechar aviso', exact: true }).click();
  const fechar = page.getByRole('button', { name: 'Fechar menu', exact: true });
  if (await fechar.first().isVisible()) await fechar.first().click();
}

/** Navega pelos links disponíveis sem recarregar a aplicação ou perder intenções em memória. */
export async function navegarUi(page: Page, rota: string): Promise<void> {
  if (new URL(page.url()).pathname === rota) return;
  if (rota === '/conta') return abrirConta(page);
  if (rota.startsWith('/gestao') && rota !== '/gestao/entrar') return navegarGestao(page, rota);
  if (new URL(page.url()).pathname === '/cozinha') {
    await page.getByRole('link', { name: 'Gestão', exact: true }).click();
    await expect(page).toHaveURL(/\/gestao\/pedidos$/);
  }
  const links = page.locator('a[href="' + rota + '"]:visible');
  if ((await links.count()) === 0) await abrirMenu(page);
  if (
    (await links.count()) === 0 &&
    rota !== '/cardapio' &&
    (await page.locator('app-equipe-layout').count())
  ) {
    await navegarUi(page, '/cardapio');
  }
  await expect(links.first()).toBeVisible();
  await links.first().click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(rota);
}

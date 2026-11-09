import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
const arquivo = process.env['RM_PLATFORM_FIXTURE'];
if (!arquivo) throw new Error('Fixture privada de operador SaaS obrigatória.');
const fixture = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as { email: string; senha: string };
async function abrir(page: Page): Promise<void> {
  // A entrada histórica continua redirecionando para a área SaaS separada.
  await page.goto('/?area=plataforma');
  await expect(page).toHaveURL(/\/plataforma$/);
  await expect(
    page.getByRole('button', { name: 'Entrar na plataforma', exact: true }),
  ).toBeEnabled();
}
async function entrar(page: Page): Promise<void> {
  await page.getByLabel('E-mail do operador').fill(fixture.email);
  await page.getByLabel('Senha do operador').fill(fixture.senha);
  const resposta = page.waitForResponse(
    (r) => r.url().endsWith('/plataforma/auth/login') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Entrar na plataforma', exact: true }).click();
  expect((await resposta).status()).toBe(200);
  await expect(page.getByText('Perfil: OPERADOR_SAAS', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Consulta atualizada.' })).toBeVisible();
}
test('S01-UI23: operador consulta metadados, renova e encerra sessão separada', async ({
  page,
  context,
}) => {
  await abrir(page);
  await entrar(page);
  await expect(page.getByRole('article').first()).toBeVisible();
  const cookies = await context.cookies();
  const refresh = cookies.find((c) => c.name === 'RM_PLATFORM_REFRESH');
  expect(refresh?.httpOnly).toBe(true);
  expect(refresh?.secure).toBe(true);
  expect(refresh?.sameSite).toBe('Strict');
  expect(refresh?.path).toBe('/api/v1/plataforma/auth');
  expect(cookies.some((c) => c.name === 'RM_REFRESH')).toBe(false);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.reload();
  await expect(page.getByText('Perfil: OPERADOR_SAAS', { exact: true })).toBeVisible();
  await expect(page.getByRole('article').first()).toBeVisible();
  expect((await context.cookies()).find((c) => c.name === 'RM_PLATFORM_REFRESH')?.value).not.toBe(
    refresh?.value,
  );
  const resposta = page.waitForResponse(
    (r) => r.url().endsWith('/plataforma/auth/logout') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Sair da plataforma', exact: true }).click();
  expect((await resposta).status()).toBe(204);
  await expect(page.getByLabel('E-mail do operador')).toBeFocused();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Entrar na plataforma', exact: true }),
  ).toBeEnabled();
  await expect(page.getByText('Perfil: OPERADOR_SAAS', { exact: true })).toHaveCount(0);
});
test('S01-UI24: credencial negada, foco, teclado e consulta offline sem dados inventados', async ({
  page,
  context,
}) => {
  // O indicador do sistema pode estar offline enquanto HTTP responde. Não ocultar erro real.
  await page.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false, configurable: true }),
  );
  await abrir(page);
  await page.getByLabel('E-mail do operador').fill(fixture.email);
  await page.getByLabel('Senha do operador').fill('senha-incorreta');
  await page.getByRole('button', { name: 'Entrar na plataforma', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Credencial inválida');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Senha do operador')).toHaveValue('');
  await entrar(page);
  const quantidade = await page.getByRole('article').count();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Atualizar empresas', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Sem conexão');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByRole('article')).toHaveCount(quantidade);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page
    .getByRole('heading', { name: 'Administração SaaS', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('saas-mobile.png'), fullPage: false });
  await page.getByRole('alert').screenshot({ path: test.info().outputPath('saas-erro.png') });
  await page
    .getByRole('status')
    .filter({ hasText: 'Consulta não atualizada.' })
    .screenshot({ path: test.info().outputPath('saas-estado-consulta.png') });
  await page
    .getByRole('article')
    .first()
    .screenshot({ path: test.info().outputPath('saas-metadados.png') });
  await page
    .getByRole('navigation', { name: 'Páginas de empresas', exact: true })
    .screenshot({ path: test.info().outputPath('saas-paginacao.png') });
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Atualizar empresas', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sair da plataforma', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Entrar na plataforma', exact: true }),
  ).toBeEnabled();
});
test('S01-UI25: origem empresarial recusa painel SaaS e consulta sem Bearer é negada', async ({
  page,
}) => {
  await abrir(page);
  await entrar(page);
  const response = await page.request.get('/api/v1/plataforma/empresas');
  expect(response.status()).toBe(401);
  const host = new URL(page.url());
  host.hostname = 'c4.localhost';
  await page.goto(host.toString());
  await expect(page.getByRole('alert')).toContainText('Plataforma indisponível');
  await expect(page.getByRole('article')).toHaveCount(0);
  const negado = await page.request.get(new URL('/api/v1/plataforma/auth/csrf', host).toString());
  expect(negado.status()).toBe(404);
});

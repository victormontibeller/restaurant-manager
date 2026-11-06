import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const arquivo = process.env['RM_RECOVERY_FIXTURE'];
if (!arquivo) throw new Error('Fixture privada de captura obrigatória.');
const fixture = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as { captureDirectory: string };
async function abrir(page: Page): Promise<void> {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Criar conta de cliente', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Criar conta de cliente', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Criar conta de cliente', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Criar conta de cliente', exact: true }),
  ).toBeFocused();
}
async function solicitar(page: Page, email: string): Promise<string> {
  const anteriores = new Set(
    fs.existsSync(fixture.captureDirectory) ? fs.readdirSync(fixture.captureDirectory) : [],
  );
  await page.getByLabel('E-mail do cadastro').fill(email);
  const resposta = page.waitForResponse(
    (r) => r.url().endsWith('/auth/cadastro') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Solicitar código de cadastro', exact: true }).click();
  expect((await resposta).status()).toBe(202);
  await expect(
    page.getByRole('status').filter({ hasText: 'Se o endereço estiver elegível' }),
  ).toBeVisible();
  let codigo = '';
  await expect
    .poll(
      () => {
        if (!fs.existsSync(fixture.captureDirectory)) return false;
        for (const file of fs.readdirSync(fixture.captureDirectory)) {
          if (anteriores.has(file) || !file.endsWith('.txt')) continue;
          const text = fs.readFileSync(path.join(fixture.captureDirectory, file), 'utf8');
          if (
            text.startsWith('Para: ' + email + '\n') &&
            text.includes('Assunto: Criar conta de cliente')
          )
            codigo = text
              .split('\n')
              .find((l) => l.startsWith('Código: '))!
              .slice(8);
        }
        return codigo.length === 43;
      },
      { timeout: 30000, intervals: [500, 1000] },
    )
    .toBe(true);
  return codigo;
}
async function preencher(page: Page, codigo: string, senha: string): Promise<void> {
  await page.getByLabel('Código de cadastro', { exact: true }).fill(codigo);
  await page.getByLabel('Senha da nova conta', { exact: true }).fill(senha);
  await page.getByLabel('Confirmar senha da nova conta', { exact: true }).fill(senha);
}
async function login(page: Page, email: string, senha: string): Promise<void> {
  await page.getByRole('button', { name: 'Voltar ao login', exact: true }).click();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Perfil: CLIENTE', { exact: true })).toBeVisible();
  await expect(page.getByText('E-mail verificado.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gerenciar acessos', exact: true })).toHaveCount(0);
}
test('S01-UI13: cadastro verificado, login de cliente e código consumido', async ({ page }) => {
  const email = crypto.randomUUID() + '@example.invalid',
    senha = crypto.randomUUID();
  await abrir(page);
  const codigo = await solicitar(page, email);
  await preencher(page, codigo, senha);
  await page.getByRole('button', { name: 'Verificar e criar conta', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Conta criada com e-mail verificado.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Senha da nova conta', { exact: true })).toHaveValue('');
  await preencher(page, codigo, crypto.randomUUID());
  await page.getByRole('button', { name: 'Verificar e criar conta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Código inválido, expirado ou já utilizado.');
  await expect(page.getByRole('alert')).toBeFocused();
  await login(page, email, senha);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(page.url()).not.toContain(codigo);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
});
test('S01-UI14: cadastro inválido, validação de senha, foco e offline', async ({
  page,
  context,
}) => {
  await abrir(page);
  await preencher(page, 'A'.repeat(43), crypto.randomUUID());
  await page.getByLabel('Confirmar senha da nova conta', { exact: true }).fill(crypto.randomUUID());
  await page.getByRole('button', { name: 'Verificar e criar conta', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('As senhas devem ser iguais.');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Confirmar senha da nova conta', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(
    page.getByLabel('Confirmar senha da nova conta', { exact: true }),
  ).toHaveAccessibleDescription('As senhas devem ser iguais.');
  await preencher(page, 'A'.repeat(43), ' '.repeat(12));
  await page.getByRole('button', { name: 'Verificar e criar conta', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'A senha não pode conter somente espaços em branco.',
  );
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Senha da nova conta', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Senha da nova conta', { exact: true })).toHaveAccessibleDescription(
    /A senha não pode conter somente espaços em branco\./,
  );
  await preencher(page, 'A'.repeat(43), 'á'.repeat(37));
  await page.getByRole('button', { name: 'Verificar e criar conta', exact: true }).click();
  await expect(page.getByLabel('Senha da nova conta', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Senha da nova conta', { exact: true })).toHaveAccessibleDescription(
    /A senha deve ter no máximo 72 bytes\./,
  );
  await preencher(page, 'A'.repeat(43), crypto.randomUUID());
  await page.getByRole('button', { name: 'Verificar e criar conta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Código inválido, expirado ou já utilizado.');
  await expect(page.getByLabel('Senha da nova conta', { exact: true })).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(
    page.getByLabel('Confirmar senha da nova conta', { exact: true }),
  ).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Código de cadastro', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Código de cadastro', { exact: true })).toHaveAccessibleDescription(
    /Código inválido, expirado ou já utilizado\./,
  );
  await context.setOffline(true);
  await page.getByLabel('E-mail do cadastro').fill(crypto.randomUUID() + '@example.invalid');
  await page.getByRole('button', { name: 'Solicitar código de cadastro', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sem conexão.');
  await expect(page.getByLabel('Código de cadastro', { exact: true })).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await context.setOffline(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.getByLabel('Código de cadastro', { exact: true }).fill('');
  await page.screenshot({ path: test.info().outputPath('cadastro-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Voltar ao login', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Acessar minha conta', exact: true }),
  ).toBeVisible();
});
test('S01-UI15: resposta perdida no cadastro é reconciliada pelo login', async ({ page }) => {
  const email = crypto.randomUUID() + '@example.invalid',
    senha = crypto.randomUUID();
  await abrir(page);
  const codigo = await solicitar(page, email);
  await preencher(page, codigo, senha);
  await page.route(
    '**/api/v1/auth/cadastro/confirmar',
    async (route) => {
      const real = await route.fetch();
      expect(real.status()).toBe(204);
      await route.abort('failed');
    },
    { times: 1 },
  );
  const perda = page.waitForEvent('requestfailed', (r) =>
    r.url().endsWith('/auth/cadastro/confirmar'),
  );
  await page.getByRole('button', { name: 'Verificar e criar conta', exact: true }).click();
  await perda;
  await expect(page.getByRole('alert')).toContainText(
    'A resposta não chegou. A conta pode ter sido criada.',
  );
  await expect(
    page.getByText('Conta criada com e-mail verificado. Volte ao login para entrar.', {
      exact: true,
    }),
  ).toHaveCount(0);
  await login(page, email, senha);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
});
test('S01-UI16: erro HTML do intermediário após commit mantém resultado incerto', async ({
  page,
}) => {
  const email = crypto.randomUUID() + '@example.invalid',
    senha = crypto.randomUUID();
  await abrir(page);
  const codigo = await solicitar(page, email);
  await preencher(page, codigo, senha);
  await page.route(
    '**/api/v1/auth/cadastro/confirmar',
    async (route) => {
      const real = await route.fetch();
      expect(real.status()).toBe(204);
      await route.fulfill({
        status: 502,
        contentType: 'text/html',
        body: '<html>Falha do intermediário fictício</html>',
      });
    },
    { times: 1 },
  );
  const falha = page.waitForResponse(
    (r) => r.url().endsWith('/auth/cadastro/confirmar') && r.status() === 502,
  );
  await page.getByRole('button', { name: 'Verificar e criar conta', exact: true }).click();
  await falha;
  await expect(page.getByRole('alert')).toContainText(
    'A resposta não chegou. A conta pode ter sido criada.',
  );
  await expect(page.getByRole('alert')).not.toContainText('JSON');
  await login(page, email, senha);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
});

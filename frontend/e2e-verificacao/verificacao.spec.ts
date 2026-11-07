import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const arquivo = process.env['RM_VERIFICACAO_FIXTURE'];
if (!arquivo) throw new Error('Fixture privada de funcionários preexistentes obrigatória.');
const fixture = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as {
  contas: Record<string, { email: string; senha: string }>;
  captureDirectory: string;
};
async function abrir(page: Page): Promise<void> {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Verificar e-mail existente', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Verificar e-mail existente', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Verificar e-mail existente', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Verificar e-mail existente', exact: true }),
  ).toBeFocused();
}
async function solicitar(page: Page, email: string): Promise<string> {
  const anteriores = new Set(
    fs.existsSync(fixture.captureDirectory) ? fs.readdirSync(fixture.captureDirectory) : [],
  );
  await page.getByLabel('E-mail da conta existente').fill(email);
  const resposta = page.waitForResponse(
    (r) => r.url().endsWith('/auth/verificacao') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Solicitar código de verificação', exact: true }).click();
  expect((await resposta).status()).toBe(202);
  await expect(
    page.getByRole('status').filter({ hasText: 'Se a conta estiver elegível' }),
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
            text.includes('Assunto: Verificar e-mail')
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
async function conferirConta(page: Page, conta: { email: string; senha: string }): Promise<void> {
  await page.getByRole('button', { name: 'Voltar ao login', exact: true }).click();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused();
  await page.getByLabel('E-mail', { exact: true }).fill(conta.email);
  await page.getByLabel('Senha', { exact: true }).fill(conta.senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Perfil: COZINHA', { exact: true })).toBeVisible();
  await expect(page.getByText('E-mail verificado.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gerenciar acessos', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
}
test('S01-UI20: funcionário preexistente verifica e preserva senha e perfil', async ({
  page,
}, info) => {
  const conta = fixture.contas[info.project.name + '-normal'];
  await abrir(page);
  const codigo = await solicitar(page, conta.email);
  await page.getByLabel('Código de verificação', { exact: true }).fill(codigo);
  await page.getByRole('button', { name: 'Confirmar verificação', exact: true }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'E-mail verificado. Sua senha e seu perfil foram preservados.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Código de verificação', { exact: true })).toHaveValue('');
  await page.getByLabel('Código de verificação', { exact: true }).fill(codigo);
  await page.getByRole('button', { name: 'Confirmar verificação', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Código inválido, expirado ou já utilizado.');
  await expect(page.getByRole('alert')).toBeFocused();
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(page.url()).not.toContain(codigo);
  await conferirConta(page, conta);
});
test('S01-UI21: código inválido, erro de rede, teclado e layout', async ({ page, context }) => {
  await abrir(page);
  await page.getByLabel('Código de verificação', { exact: true }).fill('A'.repeat(43));
  await page.getByRole('button', { name: 'Confirmar verificação', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Código inválido, expirado ou já utilizado.');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Código de verificação', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(
    page.getByLabel('Código de verificação', { exact: true }),
  ).toHaveAccessibleDescription(/Código inválido, expirado ou já utilizado\./);
  await context.setOffline(true);
  await page.getByLabel('E-mail da conta existente').fill(crypto.randomUUID() + '@example.invalid');
  await page.getByRole('button', { name: 'Solicitar código de verificação', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sem conexão.');
  await expect(page.getByLabel('Código de verificação', { exact: true })).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await context.setOffline(false);
  await page.getByLabel('Código de verificação', { exact: true }).fill('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.screenshot({ path: test.info().outputPath('verificacao-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Voltar ao login', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Acessar minha conta', exact: true }),
  ).toBeVisible();
});
test.describe('Fronteira de rede S01-UI22', () => {
  // A falha/gate é aplicada à API real por page.route. O worker pode impedir
  // essa interceptação; PWA e jornadas normais permanecem com worker ativo.
  test.use({ serviceWorkers: 'block' });

  test('S01-UI22: confirmação com resposta perdida é reconciliada na conta', async ({
    page,
  }, info) => {
    const conta = fixture.contas[info.project.name + '-incerto'];
    await abrir(page);
    const codigo = await solicitar(page, conta.email);
    await page.getByLabel('Código de verificação', { exact: true }).fill(codigo);
    await page.route(
      '**/api/v1/auth/verificacao/confirmar',
      async (route) => {
        const real = await route.fetch();
        expect(real.status()).toBe(204);
        await route.abort('failed');
      },
      { times: 1 },
    );
    const perda = page.waitForEvent('requestfailed', (r) =>
      r.url().endsWith('/auth/verificacao/confirmar'),
    );
    await page.getByRole('button', { name: 'Confirmar verificação', exact: true }).click();
    await perda;
    await expect(page.getByRole('alert')).toContainText(
      'A resposta não chegou. O e-mail pode ter sido verificado.',
    );
    await expect(
      page.getByText('E-mail verificado. Sua senha e seu perfil foram preservados.', {
        exact: true,
      }),
    ).toHaveCount(0);
    await conferirConta(page, conta);
  });
});

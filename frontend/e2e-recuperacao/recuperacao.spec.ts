import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const arquivo = process.env['RM_RECOVERY_FIXTURE'];
if (!arquivo) throw new Error('Fixture privada de recuperação obrigatória.');
const fixture = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as {
  emails: Record<string, string>;
  captureDirectory: string;
};
async function abrir(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Recuperar senha', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Recuperar senha', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Recuperar senha', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recuperar senha', exact: true })).toBeFocused();
}
async function solicitar(page: Page, email: string): Promise<string> {
  const anteriores = new Set(
    fs.existsSync(fixture.captureDirectory) ? fs.readdirSync(fixture.captureDirectory) : [],
  );
  await page.getByLabel('E-mail da recuperação').fill(email);
  const resposta = page.waitForResponse(
    (r) => r.url().endsWith('/auth/recuperacao') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Solicitar código', exact: true }).click();
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
          if (text.startsWith('Para: ' + email + '\n') && text.includes('Código: '))
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
  await page.getByLabel('Código de recuperação', { exact: true }).fill(codigo);
  await page.getByLabel('Nova senha', { exact: true }).fill(senha);
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill(senha);
}
async function login(page: Page, email: string, senha: string): Promise<void> {
  await page.getByRole('button', { name: 'Voltar ao login', exact: true }).click();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Perfil: CLIENTE', { exact: true })).toBeVisible();
}
test('S01-UI10: recuperação capturada, senha nova e código de uso único', async ({
  page,
}, info) => {
  const email = fixture.emails[info.project.name];
  const senha = crypto.randomUUID();
  await abrir(page);
  const codigo = await solicitar(page, email);
  await preencher(page, codigo, senha);
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Senha alterada e sessões anteriores encerradas.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveValue('');
  await preencher(page, codigo, crypto.randomUUID());
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Código inválido, expirado ou já utilizado.');
  await expect(page.getByRole('alert')).toBeFocused();
  await login(page, email, senha);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
});
test('S01-UI11: validação, código inválido, teclado e rede indisponível', async ({
  page,
  context,
}) => {
  await abrir(page);
  await preencher(page, 'A'.repeat(43), crypto.randomUUID());
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill(crypto.randomUUID());
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('As senhas devem ser iguais.');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Confirmar nova senha', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(
    page.getByLabel('Confirmar nova senha', { exact: true }),
  ).toHaveAccessibleDescription('As senhas devem ser iguais.');
  await preencher(page, 'A'.repeat(43), ' '.repeat(12));
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'A senha não pode conter somente espaços em branco.',
  );
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveAccessibleDescription(
    /A senha não pode conter somente espaços em branco\./,
  );
  await preencher(page, 'A'.repeat(43), 'á'.repeat(37));
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveAccessibleDescription(
    /A senha deve ter no máximo 72 bytes\./,
  );
  await preencher(page, 'A'.repeat(43), crypto.randomUUID());
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Código inválido, expirado ou já utilizado.');
  await expect(page.getByLabel('Nova senha', { exact: true })).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Confirmar nova senha', { exact: true })).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Código de recuperação', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(
    page.getByLabel('Código de recuperação', { exact: true }),
  ).toHaveAccessibleDescription(/Código inválido, expirado ou já utilizado\./);
  await context.setOffline(true);
  await page.getByLabel('E-mail da recuperação').fill(crypto.randomUUID() + '@example.invalid');
  await page.getByRole('button', { name: 'Solicitar código', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sem conexão.');
  await expect(page.getByLabel('Código de recuperação', { exact: true })).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await context.setOffline(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.getByLabel('Código de recuperação', { exact: true }).fill('');
  await page.screenshot({ path: test.info().outputPath('recuperacao-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Voltar ao login', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Acessar minha conta', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused();
});
test('S01-UI12: resposta perdida não confirma alteração e login reconcilia', async ({
  page,
}, info) => {
  const email = fixture.emails[info.project.name];
  const senha = crypto.randomUUID();
  await abrir(page);
  const codigo = await solicitar(page, email);
  await preencher(page, codigo, senha);
  await page.route(
    '**/api/v1/auth/recuperacao/confirmar',
    async (route) => {
      const real = await route.fetch();
      expect(real.status()).toBe(204);
      await route.abort('failed');
    },
    { times: 1 },
  );
  const perda = page.waitForEvent('requestfailed', (r) =>
    r.url().endsWith('/auth/recuperacao/confirmar'),
  );
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await perda;
  await expect(page.getByRole('alert')).toContainText(
    'A resposta não chegou. A senha pode ter sido alterada.',
  );
  await expect(
    page.getByText(
      'Senha alterada e sessões anteriores encerradas. Volte ao login para entrar com a nova senha.',
      { exact: true },
    ),
  ).toHaveCount(0);
  await login(page, email, senha);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
});

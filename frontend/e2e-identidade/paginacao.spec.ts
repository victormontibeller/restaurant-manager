import { test, expect } from '@playwright/test';
import fs from 'node:fs';

// O worker pode impedir page.route no WebKit. Esta prova injeta falha na leitura
// real; o bloqueio é exclusivo deste cenário, sem substituir a cobertura PWA.
test.use({ serviceWorkers: 'block' });

const fixture = JSON.parse(fs.readFileSync(process.env['RM_AUTH_FIXTURE']!, 'utf8')) as {
  email: string;
  senha: string;
};

test('S01-UI09: falha de paginação mantém página e registros confirmados', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.senha);
  const login = page.waitForResponse(
    (r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const response = await login;
  expect(response.status()).toBe(200);
  const access = (await response.json()).accessToken;
  await page.getByRole('button', { name: 'Gerenciar unidades', exact: true }).click();
  await page.getByLabel('Confirme sua senha').fill(fixture.senha);
  const reauth = page.waitForResponse(
    (r) => r.url().endsWith('/auth/reautenticar') && r.request().method() === 'POST',
    { timeout: 12000 },
  );
  await page.getByRole('button', { name: 'Confirmar identidade' }).click();
  expect((await reauth).status()).toBe(204);
  const headers = { Authorization: 'Bearer ' + access };
  const primeira = await page.request.get('/api/v1/configuracoes/unidades?pagina=0', { headers });
  expect(primeira.status()).toBe(200);
  const quantidade = (await primeira.json()).length;
  for (let i = quantidade; i < 51; i++) {
    const criada = await page.request.post('/api/v1/configuracoes/unidades', {
      headers,
      data: {
        id: crypto.randomUUID(),
        nome: 'zz paginação ' + crypto.randomUUID().slice(0, 8),
        fuso: 'UTC',
        ativa: false,
      },
    });
    expect(criada.status()).toBe(200);
  }
  await page.getByRole('button', { name: 'Recarregar unidades' }).click();
  await expect(page.getByRole('article')).toHaveCount(50);
  const anteriores = await page.getByRole('article').getByRole('heading').allTextContents();
  await page.route('**/api/v1/configuracoes/unidades?pagina=1', (route) => route.abort('failed'), {
    times: 1,
  });
  await page.getByRole('button', { name: 'Próxima página de unidades' }).click();
  await expect(page.getByRole('alert')).toContainText('Conexão interrompida');
  const paginacao = page.getByRole('navigation', { name: 'Páginas de unidades' });
  await expect(paginacao.getByText('Página 1', { exact: true })).toBeVisible();
  expect(await page.getByRole('article').getByRole('heading').allTextContents()).toEqual(
    anteriores,
  );
  await expect(page.getByRole('button', { name: 'Página anterior de unidades' })).toBeDisabled();
  await page.getByRole('button', { name: 'Próxima página de unidades' }).click();
  await expect(paginacao.getByText('Página 2', { exact: true })).toBeVisible();
  expect(await page.getByRole('article').getByRole('heading').allTextContents()).not.toEqual(
    anteriores,
  );
  await page.getByRole('button', { name: 'Página anterior de unidades' }).click();
  await expect(paginacao.getByText('Página 1', { exact: true })).toBeVisible();
  expect(await page.getByRole('article').getByRole('heading').allTextContents()).toEqual(
    anteriores,
  );
  await page.getByRole('button', { name: 'Sair da conta' }).click();
});

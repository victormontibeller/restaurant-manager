import { navegarGestao, confirmarNavegacaoBloqueada } from './apoio';
import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

// Estas provas injetam falha/gate entre a API real e o navegador. O worker pode
// impedir page.route no WebKit; PWA e jornadas sem injeção mantêm o worker ativo.
test.use({ serviceWorkers: 'block' });

const fixture = JSON.parse(fs.readFileSync(process.env['RM_AUTH_FIXTURE']!, 'utf8')) as {
  email: string;
  senha: string;
};
async function entrar(page: Page): Promise<void> {
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.senha);
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.locator('app-equipe-layout')).toBeVisible();
}
async function confirmar(page: Page): Promise<void> {
  await page.getByLabel('Confirme sua senha').fill(fixture.senha);
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/auth/reautenticar') && r.request().method() === 'POST',
    { timeout: 12000 },
  );
  await page.getByRole('button', { name: 'Confirmar identidade' }).click();
  expect((await response).status()).toBe(204);
}
test('S01-UI07: logout e retry sem reautenticação não descartam intenção incerta', async ({
  page,
}) => {
  await page.goto('/gestao/entrar');
  await entrar(page);
  await navegarGestao(page, '/gestao/unidades');
  await confirmar(page);
  const nome = 'Pendente ' + crypto.randomUUID().slice(0, 8);
  await page.getByRole('button', { name: 'Nova unidade', exact: true }).click();
  await page.getByLabel('Nome da nova unidade').fill(nome);
  await page.getByLabel('Fuso da nova unidade').fill('America/Manaus');
  let id = '';
  await page.route(
    '**/api/v1/configuracoes/unidades',
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      id = (await response.json()).id;
      await route.abort('failed');
    },
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Criar unidade', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Conexão interrompida');
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page.getByText('Sessão encerrada no servidor.')).toBeVisible();
  await entrar(page);
  await expect(page.getByRole('button', { name: 'Reconciliar criação' })).toBeVisible();
  await expect(page.getByLabel('Intenção preservada')).toHaveText(nome + ' · America/Manaus');
  await confirmarNavegacaoBloqueada(page, '/gestao/equipe');
  const retry = page.waitForResponse(
    (r) => r.url().endsWith('/configuracoes/unidades') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Reenviar criação' }).click();
  const denied = await retry;
  expect(denied.status()).toBe(403);
  expect(denied.request().postDataJSON().id).toBe(id);
  await expect(page.getByRole('button', { name: 'Reconciliar criação' })).toBeVisible();
  await expect(page.getByLabel('Nome da nova unidade')).toBeDisabled();
  await page.getByRole('button', { name: 'Reconciliar criação' }).click();
  await expect(page.getByRole('heading', { name: nome, exact: true })).toHaveCount(1);
  await expect(
    page.getByText('Unidade criada no servidor. Recarregue para ordenar a lista.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sair da conta' }).click();
});

test('S01-UI08: gravação de acessos bloqueia navegação até resposta real', async ({ page }) => {
  await page.goto('/gestao/entrar');
  await entrar(page);
  await navegarGestao(page, '/gestao/acessos');
  await confirmar(page);
  let liberar!: () => void;
  const gate = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  let gravou!: () => void;
  const gravada = new Promise<void>((resolve) => {
    gravou = resolve;
  });
  await page.route('**/api/v1/configuracoes/acessos/matriz', async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    gravou();
    await gate;
    await route.fulfill({ response });
  });
  const recebida = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/v1/configuracoes/acessos/matriz') && r.request().method() === 'PUT',
  );
  const celula = page.getByRole('button', { name: 'Cozinha · Cozinha', exact: true });
  await celula.click();
  const iniciar = page.getByRole('checkbox', { name: 'Iniciar preparo', exact: true });
  const original = await iniciar.isChecked();
  await iniciar.setChecked(!original);
  await page.getByRole('button', { name: 'Concluir seleção' }).click();
  await page.getByRole('button', { name: 'Salvar acessos' }).click();
  await gravada;
  try {
    await confirmarNavegacaoBloqueada(page, '/gestao/unidades');
  } finally {
    liberar();
  }
  const response = await recebida;
  await page.unroute('**/api/v1/configuracoes/acessos/matriz');
  expect(response.status()).toBe(200);
  await response.finished();
  await expect(
    page.getByRole('region', { name: 'Matriz de acessos', exact: true }),
  ).toHaveAttribute('aria-busy', 'false', { timeout: 15000 });
  await expect(page.getByText('Permissões salvas no servidor.')).toBeVisible();
  await celula.click();
  await iniciar.setChecked(original);
  await page.getByRole('button', { name: 'Concluir seleção' }).click();
  await page.getByRole('button', { name: 'Salvar acessos' }).click();
  await expect(page.getByText('Permissões salvas no servidor.')).toBeVisible();
  await navegarGestao(page, '/gestao/unidades');
  await expect(
    page.getByRole('heading', { name: 'Unidades e horários', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sair da conta' }).click();
});

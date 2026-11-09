import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const arquivo = process.env['RM_PROVISION_FIXTURE'];
if (!arquivo || !process.env['RM_PROVISION_JAR'])
  throw new Error('Fixture SaaS e artefato privado obrigatórios.');
const fixtures = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as Record<
  string,
  { email: string; senha: string }
>;
function credenciais(): { email: string; senha: string } {
  const fixture = fixtures[test.info().project.name];
  if (!fixture) throw new Error('Operador fictício do projeto ausente.');
  return fixture;
}
const base = '/api/v1/plataforma/provisionamentos';
async function entrar(page: Page): Promise<string> {
  const fixture = credenciais();
  await page.goto('/plataforma');
  await expect(page).toHaveURL(/\/plataforma$/);
  await expect(
    page.getByRole('button', { name: 'Entrar na plataforma', exact: true }),
  ).toBeEnabled();
  await page.getByLabel('E-mail do operador').fill(fixture.email);
  await page.getByLabel('Senha do operador', { exact: true }).fill(fixture.senha);
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/plataforma/auth/login') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Entrar na plataforma', exact: true }).click();
  const login = await response;
  expect(login.status()).toBe(200);
  await expect(page.getByRole('status').filter({ hasText: 'Consulta atualizada.' })).toBeVisible();
  return ((await login.json()) as { accessToken: string }).accessToken;
}
async function confirmar(page: Page): Promise<void> {
  const fixture = credenciais();
  await page.getByLabel('Senha do operador para provisionamento').fill(fixture.senha);
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/plataforma/auth/reautenticar') && r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Confirmar acesso ao provisionamento', exact: true })
    .click();
  expect((await response).status()).toBe(204);
  await expect(
    page.getByRole('status').filter({ hasText: 'Acesso ao provisionamento confirmado' }),
  ).toBeVisible();
}
async function preencher(page: Page): Promise<{ id: string; senha: string; host: string }> {
  const id = (await page.getByTestId('provisionamento-intencao').innerText()).trim();
  const senha = randomUUID();
  const host = 'ui-' + id + '.localhost';
  await page.getByLabel('Nome do novo restaurante').fill('Restaurante UI fictício');
  await page.getByLabel('Domínio local do novo restaurante').fill(host);
  await page.getByLabel('Nome da unidade inicial').fill('Unidade UI inicial');
  await page.getByLabel('E-mail do Administrador inicial').fill('admin@example.invalid');
  await page.getByLabel('Senha inicial do Administrador').fill(senha);
  return { id, senha, host };
}
async function enviar(page: Page, esperado = 202): Promise<void> {
  const response = page.waitForResponse(
    (r) => r.url().endsWith(base) && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Solicitar provisionamento', exact: true }).click();
  expect((await response).status()).toBe(esperado);
  if (esperado === 202)
    await expect(page.getByTestId('provisionamento-detalhe')).toContainText('SOLICITADO');
}
async function consultar(page: Page, id: string, estado: string): Promise<void> {
  await page.getByLabel('Identificador da solicitação').fill(id);
  const response = page.waitForResponse(
    (r) => r.url().endsWith(base + '/' + id) && r.request().method() === 'GET',
  );
  await page.getByRole('button', { name: 'Consultar provisionamento', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByTestId('provisionamento-detalhe')).toContainText(estado);
}
function processar(id: string, falhar = false): void {
  const repo = path.resolve('..');
  const r = spawnSync(
    'bash',
    [
      path.join(repo, 'scripts/with-env.sh'),
      'test',
      'python3',
      path.join(repo, 'scripts/provisionamento-test-worker.py'),
      id,
      ...(falhar ? ['--falhar'] : []),
    ],
    { cwd: repo, env: process.env, encoding: 'utf8', timeout: 90000 },
  );
  fs.writeFileSync(
    test.info().outputPath('worker-' + (falhar ? 'falha' : 'sucesso') + '.log'),
    r.stdout + r.stderr,
    { mode: 0o600 },
  );
  expect(r.status).toBe(0);
}
test('S01-UI29: operador solicita e worker real ativa empresa sem impersonação', async ({
  page,
}) => {
  await entrar(page);
  await page.getByLabel('Senha do operador para provisionamento').fill('incorreta');
  const invalid = page.waitForResponse(
    (r) => r.url().endsWith('/plataforma/auth/reautenticar') && r.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Confirmar acesso ao provisionamento', exact: true })
    .click();
  expect((await invalid).status()).toBe(422);
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Senha do operador para provisionamento')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(
    page.getByLabel('Senha do operador para provisionamento'),
  ).toHaveAccessibleDescription('Senha de confirmação inválida.');
  await confirmar(page);
  await expect(page.getByLabel('Senha do operador para provisionamento')).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  const p = await preencher(page);
  await enviar(page);
  await expect(page.getByLabel('Senha inicial do Administrador')).toHaveValue('');
  processar(p.id);
  await consultar(page, p.id, 'CONCLUIDO');
  const destino = new URL(page.url());
  destino.hostname = p.host;
  destino.search = '';
  destino.pathname = '/api/v1/unidades';
  const unidades = await page.request.get(destino.toString());
  expect(unidades.status()).toBe(200);
  expect(await unidades.text()).toContain('Unidade UI inicial');
  destino.pathname = '/api/v1/auth/me';
  expect((await page.request.get(destino.toString())).status()).toBe(401);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page
    .getByTestId('provisionamento-detalhe')
    .screenshot({ path: test.info().outputPath('provisionamento-concluido.png') });
});
test.describe('Fronteira de rede S01-UI30', () => {
  // A falha/gate é aplicada à API real por page.route. O worker pode impedir
  // essa interceptação; PWA e jornadas normais permanecem com worker ativo.
  test.use({ serviceWorkers: 'block' });

  test('S01-UI30: resposta perdida conserva UUID entre logout e consulta sem duplicar', async ({
    page,
  }) => {
    const fixture = credenciais();
    await entrar(page);
    await confirmar(page);
    const p = await preencher(page);
    let escritas = 0;
    page.on('request', (r) => {
      if (r.url().endsWith(base) && r.method() === 'POST') escritas++;
    });
    await page.route(
      '**' + base,
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        const r = await route.fetch();
        expect(r.status()).toBe(202);
        await route.fulfill({
          status: 502,
          contentType: 'text/html',
          body: 'Resposta perdida no intermediário de teste',
        });
      },
      { times: 1 },
    );
    await enviar(page, 502);
    await expect(page.getByRole('alert')).toContainText('A escrita pode ter sido aplicada');
    await expect(page.getByRole('alert')).toBeFocused();
    await page.getByRole('button', { name: 'Sair da plataforma', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Entrar na plataforma', exact: true }),
    ).toBeEnabled();
    // A mesma página preserva apenas a intenção por operador, não o payload/senha.
    await page.getByLabel('E-mail do operador').fill(fixture.email);
    await page.getByLabel('Senha do operador', { exact: true }).fill(fixture.senha);
    await page.getByRole('button', { name: 'Entrar na plataforma', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Consulta atualizada.' }),
    ).toBeVisible();
    await expect(page.getByTestId('provisionamento-intencao')).toHaveText(p.id);
    await consultar(page, p.id, 'SOLICITADO');
    expect(escritas).toBe(1);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  });
});
test('S01-UI31: falha de ativação é visível e retomada versionada conclui sem duplicar', async ({
  page,
}) => {
  const token = await entrar(page);
  await confirmar(page);
  const p = await preencher(page);
  await enviar(page);
  processar(p.id, true);
  await consultar(page, p.id, 'FALHOU');
  const consulta = await page.request.get(base + '/' + p.id, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const antes = (await consulta.json()) as { versao: number };
  const response = page.waitForResponse(
    (r) => r.url().endsWith(base + '/' + p.id + '/retomar') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Solicitar retomada', exact: true }).click();
  expect((await response).status()).toBe(202);
  await expect(page.getByTestId('provisionamento-detalhe')).toContainText('SOLICITADO');
  expect(
    (
      await page.request.post(base + '/' + p.id + '/retomar', {
        headers: { Authorization: 'Bearer ' + token },
        data: { versao: antes.versao },
      })
    ).status(),
  ).toBe(409);
  processar(p.id);
  await consultar(page, p.id, 'CONCLUIDO');
});

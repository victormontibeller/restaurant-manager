import { navegarGestao } from '../e2e-identidade/apoio';
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
interface Conta {
  id: string;
  email: string;
  senha: string;
}
const file = process.env['RM_EVENT_FIXTURE'];
if (!file) throw new Error('Massa privada obrigatória.');
const fixtures = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<
  string,
  { admin: Conta; cozinha: Conta }
>;

test('S01-UI35: vínculo inativo visível, reversível e revogação real do funcionário', async ({
  page,
  request,
}) => {
  const fixture = fixtures[test.info().project.name];
  async function login(conta: Conta): Promise<string> {
    const csrf = await (await request.get('/api/v1/auth/csrf')).json();
    const response = await request.post('/api/v1/auth/login', {
      headers: { [csrf.headerName]: csrf.token },
      data: { email: conta.email, senha: conta.senha },
    });
    expect(response.status()).toBe(200);
    return (await response.json()).accessToken;
  }

  // Prepara o funcionário vinculado a uma unidade que será inativada.
  const admin = await login(fixture.admin);
  const worker = await login(fixture.cozinha);
  const headers = { Authorization: 'Bearer ' + admin };
  expect(
    (
      await request.post('/api/v1/auth/reautenticar', {
        headers,
        data: { senha: fixture.admin.senha },
      })
    ).status(),
  ).toBe(204);
  const id = crypto.randomUUID();
  expect(
    (
      await request.post('/api/v1/configuracoes/unidades', {
        headers,
        data: { id, nome: 'Vínculo inativo ' + id, fuso: 'UTC', ativa: true },
      })
    ).status(),
  ).toBe(200);
  const team = await (await request.get('/api/v1/equipe', { headers })).json();
  const original = team.find((f: { id: string }) => f.id === fixture.cozinha.id);
  expect(original).toBeTruthy();
  expect(
    (
      await request.put('/api/v1/equipe/' + fixture.cozinha.id, {
        headers,
        data: { versao: original.versao, perfil: 'COZINHA', ativo: true, unidades: [id] },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.put('/api/v1/configuracoes/unidades/' + id, {
        headers,
        data: { versao: 0, nome: 'Vínculo inativo ' + id, fuso: 'UTC', ativa: false },
      })
    ).status(),
  ).toBe(200);

  // Abre a equipe pela interface com uma nova sessão de Administrador.
  await page.goto('/gestao/entrar');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.admin.email);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.admin.senha);
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST',
  );
  const loaded = Promise.all(
    ['/auth/me', '/configuracoes/acessos', '/equipe?pagina=0', '/operacao/unidades'].map((path) =>
      page.waitForResponse((r) => r.url().endsWith(path) && r.request().method() === 'GET'),
    ),
  );
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  expect((await response).status()).toBe(200);
  await navegarGestao(page, '/gestao/equipe');
  for (const result of await loaded) {
    expect(result.status()).toBe(200);
    await result.finished();
  }
  await expect(page.getByLabel('Perfil operacional')).toBeEnabled();
  await page.getByLabel('Confirme sua senha').fill(fixture.admin.senha);
  const reauth = page.waitForResponse((r) => r.url().endsWith('/auth/reautenticar'));
  await page.getByRole('button', { name: 'Confirmar identidade' }).click();
  expect((await reauth).status()).toBe(204);

  const card = page.getByRole('article').filter({ hasText: fixture.cozinha.email });
  await expect(card.getByLabel('Perfil do funcionário')).toHaveValue('COZINHA');
  const editarUnidades = card.getByRole('button', {
    name: 'Editar unidades atribuídas',
    exact: true,
  });
  await expect(editarUnidades).toHaveAttribute('aria-expanded', 'false');
  await editarUnidades.focus();
  await page.keyboard.press('Enter');
  await expect(editarUnidades).toHaveAttribute('aria-expanded', 'true');
  const link = card.getByLabel('Vínculo em unidade inativa · ' + id);
  await expect(link).toBeChecked();
  await link.focus();
  // Valida teclado: uncheck() usa mouse, que remove o foco nativamente no WebKit/macOS.
  await page.keyboard.press('Space');
  await expect(link).not.toBeChecked();
  await expect(link).toBeFocused();
  await page.keyboard.press('Space');
  await expect(link).toBeChecked();
  await expect(link).toBeFocused();

  // A lista acumulada pode ter centenas de unidades. Registrar o vínculo
  // exercitado, sem gerar uma imagem vertical ilimitada do editor inteiro.
  await card
    .locator('label')
    .filter({ hasText: 'Vínculo em unidade inativa · ' + id })
    .screenshot({ path: test.info().outputPath('vinculo-inativo-preservado.png') });
  await card
    .getByText('Unidades inativas não concedem acesso.', { exact: false })
    .screenshot({ path: test.info().outputPath('vinculo-inativo-ajuda.png') });
  await editarUnidades.click();
  await expect(link).toHaveCount(0);
  await editarUnidades.click();
  await expect(link).toBeChecked();

  // Inativar o funcionário revoga seu JWT mesmo preservando o vínculo inativo.
  await card.getByLabel('Ativo', { exact: true }).uncheck();
  const save = () =>
    page.waitForResponse(
      (r) => r.url().endsWith('/equipe/' + fixture.cozinha.id) && r.request().method() === 'PUT',
    );
  let saved = save();
  await card.getByRole('button', { name: 'Salvar funcionário' }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByText('Funcionário atualizado no servidor.')).toBeVisible();
  expect(
    (
      await request.get('/api/v1/auth/me', { headers: { Authorization: 'Bearer ' + worker } })
    ).status(),
  ).toBe(401);
  await expect(link).toBeChecked();

  // Reativar e remover o vínculo não recupera a sessão revogada.
  await card.getByLabel('Ativo', { exact: true }).check();
  await link.uncheck();
  saved = save();
  await card.getByRole('button', { name: 'Salvar funcionário' }).click();
  expect((await saved).status()).toBe(200);
  await expect(link).toHaveCount(0);
  await expect(card.getByLabel('Perfil do funcionário')).toHaveValue('COZINHA');
  const updated = (await (await request.get('/api/v1/equipe', { headers })).json()).find(
    (f: { id: string }) => f.id === fixture.cozinha.id,
  );
  expect(updated.ativo).toBe(true);
  expect(updated.unidades).toEqual([]);
  expect(
    (
      await request.get('/api/v1/auth/me', { headers: { Authorization: 'Bearer ' + worker } })
    ).status(),
  ).toBe(401);

  // Alterar e persistir, não apenas comparar o valor inicial do select.
  await card.getByLabel('Perfil do funcionário').selectOption('EXPEDICAO');
  saved = save();
  await card.getByRole('button', { name: 'Salvar funcionário' }).click();
  const changed = await saved;
  expect(changed.status()).toBe(200);
  expect(changed.request().postDataJSON().perfil).toBe('EXPEDICAO');
  expect((await changed.json()).perfil).toBe('EXPEDICAO');
  const reload = Promise.all(
    ['/configuracoes/acessos', '/equipe?pagina=0', '/operacao/unidades'].map((path) =>
      page.waitForResponse((r) => r.url().endsWith(path) && r.request().method() === 'GET'),
    ),
  );
  await page.getByRole('button', { name: 'Recarregar acessos' }).click();
  for (const response of await reload) expect(response.status()).toBe(200);
  await expect(card.getByLabel('Perfil do funcionário')).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(card.getByLabel('Perfil do funcionário')).toHaveValue('EXPEDICAO');
  await expect(editarUnidades).toHaveAttribute('aria-expanded', 'false');
  await editarUnidades.click();
  await expect(link).toHaveCount(0);
  expect(
    (await (await request.get('/api/v1/equipe', { headers })).json()).find(
      (f: { id: string }) => f.id === fixture.cozinha.id,
    ).perfil,
  ).toBe('EXPEDICAO');

  // Restaura o perfil da fixture por UI para as jornadas seguintes.
  await card.getByLabel('Perfil do funcionário').selectOption('COZINHA');
  saved = save();
  await card.getByRole('button', { name: 'Salvar funcionário' }).click();
  expect((await saved).status()).toBe(200);
  await expect(card.getByLabel('Perfil do funcionário')).toHaveValue('COZINHA');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await editarUnidades.click();
  await expect(editarUnidades).toHaveAttribute('aria-expanded', 'false');
  await expect(card.getByRole('group', { name: 'Unidades atribuídas' })).toHaveCount(0);
  await expect(card.getByText('Vínculos nesta edição: 0.', { exact: false })).toBeVisible();
  await card.screenshot({ path: test.info().outputPath('vinculo-inativo-revogado.png') });
});

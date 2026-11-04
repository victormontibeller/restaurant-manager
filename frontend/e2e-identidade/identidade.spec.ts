import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

async function enviarLogin(page: Page, status = 200): Promise<void> {
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method()==='POST', {timeout:12000});
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  expect((await response).status()).toBe(status);
}

test('S01-UI03: abas concorrentes e logout após perda de conexão', async ({page,context}) => {
  if (!fixture) throw new Error('Massa privada obrigatória.');
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeEnabled();
  await page.getByLabel('E-mail').fill(fixture.email);
  await page.getByLabel('Senha',{exact:true}).fill(fixture.senha);
  await enviarLogin(page);
  await expect(page.getByText('Perfil: ADMINISTRADOR')).toBeVisible();
  const other = await context.newPage();
  await Promise.all([page.reload(),other.goto('/')]);
  await expect(page.getByText('Perfil: ADMINISTRADOR')).toBeVisible();
  await expect(other.getByText('Perfil: ADMINISTRADOR')).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button',{name:'Sair da conta'}).click();
  await expect(page.getByRole('button',{name:'Tentar encerrar novamente'})).toBeEnabled();
  await expect(page.getByText('Sessão encerrada no servidor.')).toHaveCount(0);
  await context.setOffline(false);
  await page.getByRole('button',{name:'Tentar encerrar novamente'}).click();
  await expect(page.getByText('Sessão encerrada no servidor.')).toBeVisible();
  await expect(other.getByRole('heading',{name:'Acessar minha conta'})).toBeVisible();
  await other.close();
});

// Massa privada criada pelo provisionador real em rm_test; nunca API mockada.
const fixtureFile = process.env['RM_AUTH_FIXTURE'];
const fixture = fixtureFile ? JSON.parse(fs.readFileSync(fixtureFile, 'utf8')) as {email:string; senha:string} : null;

test('S01-UI01: login, recarga com refresh e logout revogam acesso real', async ({ page, context }) => {
  if (!fixture) throw new Error('RM_AUTH_FIXTURE privado é obrigatório para o teste de identidade.');
  await page.goto('/');
  await expect(page.getByRole('heading', {name:'Acessar minha conta'})).toBeVisible();
  await page.getByLabel('E-mail').fill(fixture.email);
  await page.getByLabel('Senha', {exact:true}).fill(fixture.senha);
  await enviarLogin(page);
  await expect(page.getByText('Perfil: ADMINISTRADOR')).toBeVisible();
  expect(await page.evaluate(() => [localStorage.length,sessionStorage.length])).toEqual([0,0]);
  const cookies = await context.cookies();
  const refresh = cookies.find(c => c.name==='RM_REFRESH');
  expect(refresh?.httpOnly).toBe(true); expect(refresh?.secure).toBe(true); expect(refresh?.sameSite).toBe('Strict');
  await page.reload();
  await expect(page.getByText('Perfil: ADMINISTRADOR')).toBeVisible();
  await page.getByRole('button', {name:'Sair da conta'}).click();
  await expect(page.getByRole('heading', {name:'Acessar minha conta'})).toBeVisible();
  await expect(page.getByText('Sessão encerrada no servidor.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', {name:'Entrar',exact:true})).toBeEnabled();
  await expect(page.getByText('Perfil: ADMINISTRADOR')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('login.png'),fullPage:true});
});

test('S01-UI02: senha inválida, validação acessível e tentativa sem CSRF', async ({ page, request }) => {
  if (!fixture) throw new Error('RM_AUTH_FIXTURE privado é obrigatório.');
  await page.goto('/');
  await page.getByLabel('E-mail').fill(fixture.email);
  await page.getByLabel('Senha',{exact:true}).fill('invalida-para-teste');
  await enviarLogin(page,401);
  await expect(page.getByRole('alert')).toHaveText('Credencial inválida ou sessão encerrada.');
  await expect(page.getByRole('alert')).toBeFocused();
  const direct = await request.post('/api/v1/auth/login',{data:{email:fixture.email,senha:'invalida'}});
  expect(direct.status()).toBe(403);
  await page.getByLabel('Senha',{exact:true}).fill(fixture.senha);
  await enviarLogin(page);
  await expect(page.getByText('Perfil: ADMINISTRADOR')).toBeVisible();
  await page.getByRole('button',{name:'Sair da conta'}).click();
});

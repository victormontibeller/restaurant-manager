import { APIRequestContext, Page, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { abrirConta } from '../e2e-identidade/apoio';

export interface ContaCatalogo {
  id?: string;
  email: string;
  senha: string;
}

export interface FixtureCatalogo extends ContaCatalogo {
  unidadeA: string;
  unidadeB: string;
  contas: Record<
    'gerente' | 'atendimento' | 'caixa' | 'cozinha' | 'expedicao' | 'clienteA' | 'clienteB',
    ContaCatalogo
  >;
}

export function fixture(): FixtureCatalogo {
  const arquivo = process.env['RM_CATALOG_FIXTURE'];
  if (!arquivo || !path.isAbsolute(arquivo)) {
    throw new Error('A matriz de catálogo exige uma fixture privada absoluta.');
  }
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as FixtureCatalogo;
  if (!dados.email || !dados.senha || !dados.unidadeA || !dados.unidadeB || !dados.contas) {
    throw new Error('A fixture de catálogo está incompleta.');
  }
  return dados;
}

export async function loginUi(page: Page, conta: ContaCatalogo = fixture()): Promise<string> {
  const clientes = fixture().contas;
  const cliente = [clientes.clienteA.email, clientes.clienteB.email].includes(conta.email);
  await page.goto(cliente ? '/entrar' : '/gestao/entrar');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
  await page.getByLabel('E-mail', { exact: true }).fill(conta.email);
  await page.getByLabel('Senha', { exact: true }).fill(conta.senha);
  const resposta = page.waitForResponse(
    (item) => item.url().endsWith('/api/v1/auth/login') && item.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const login = await resposta;
  expect(login.status()).toBe(200);
  await abrirConta(page);
  await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeVisible();
  return ((await login.json()) as { accessToken: string }).accessToken;
}

export async function loginApi(
  request: APIRequestContext,
  conta: ContaCatalogo = fixture(),
): Promise<string> {
  const csrfResponse = await request.get('/api/v1/auth/csrf');
  expect(csrfResponse.status()).toBe(200);
  const csrf = (await csrfResponse.json()) as { headerName: string; token: string };
  const login = await request.post('/api/v1/auth/login', {
    headers: { [csrf.headerName]: csrf.token },
    data: { email: conta.email, senha: conta.senha },
  });
  expect(login.status()).toBe(200);
  return ((await login.json()) as { accessToken: string }).accessToken;
}

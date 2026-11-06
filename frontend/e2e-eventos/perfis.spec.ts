import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
interface Conta {
  id: string;
  email: string;
  senha: string;
}
interface Funcionario {
  id: string;
  versao: number;
  perfil: string;
  ativo: boolean;
  unidades: string[];
}
const arquivo = process.env['RM_EVENT_FIXTURE'];
if (!arquivo) throw new Error('Massa privada de eventos obrigatória.');
const fixtures = JSON.parse(fs.readFileSync(arquivo, 'utf8')) as Record<
  string,
  { admin: Conta; cozinha: Conta }
>;
const perfis = ['GERENTE', 'ATENDIMENTO', 'CAIXA', 'COZINHA', 'EXPEDICAO'];
for (const [indice, perfil] of perfis.entries()) {
  test(`S01-UI${36 + indice}: ${perfil} acompanha filial, perde ação e não administra acessos`, async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);
    const fixture = fixtures[test.info().project.name];
    const csrf = await (await request.get('/api/v1/auth/csrf')).json();
    const login = await request.post('/api/v1/auth/login', {
      headers: { [csrf.headerName]: csrf.token },
      data: { email: fixture.admin.email, senha: fixture.admin.senha },
    });
    expect(login.status()).toBe(200);
    const admin = (await login.json()).accessToken;
    const headers = { Authorization: 'Bearer ' + admin };
    expect(
      (
        await request.post('/api/v1/auth/reautenticar', {
          headers,
          data: { senha: fixture.admin.senha },
        })
      ).status(),
    ).toBe(204);
    const equipe = async (): Promise<Funcionario[]> => {
      const r = await request.get('/api/v1/equipe', { headers });
      expect(r.status()).toBe(200);
      return r.json();
    };
    const original = (await equipe()).find((f) => f.id === fixture.cozinha.id)!;
    expect(original).toBeTruthy();
    const matriz = await (await request.get('/api/v1/configuracoes/acessos', { headers })).json();
    const unidade = crypto.randomUUID(),
      outra = crypto.randomUUID();
    for (const [id, nome] of [
      [unidade, 'Filial permitida ' + unidade],
      [outra, 'Filial negada ' + outra],
    ]) {
      expect(
        (
          await request.post('/api/v1/configuracoes/unidades', {
            headers,
            data: { id, nome, fuso: 'UTC', ativa: true },
          })
        ).status(),
      ).toBe(200);
    }
    const permitidas = [...new Set<string>([...matriz.perfis[perfil], 'unidade.acompanhar'])];
    try {
      expect(
        (
          await request.put('/api/v1/equipe/' + original.id, {
            headers,
            data: { versao: original.versao, perfil, ativo: true, unidades: [unidade] },
          })
        ).status(),
      ).toBe(200);
      expect(
        (
          await request.put('/api/v1/configuracoes/acessos', {
            headers,
            data: { versao: matriz.versao, perfil, acoes: permitidas },
          })
        ).status(),
      ).toBe(200);
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
      await page.getByLabel('E-mail', { exact: true }).fill(fixture.cozinha.email);
      await page.getByLabel('Senha', { exact: true }).fill(fixture.cozinha.senha);
      const resposta = page.waitForResponse(
        (r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST',
        { timeout: 20000 },
      );
      await page.getByRole('button', { name: 'Entrar', exact: true }).click();
      const response = await resposta;
      expect(response.status()).toBe(200);
      const token = (await response.json()).accessToken;
      const worker = { Authorization: 'Bearer ' + token };
      await expect(page.getByText('Perfil: ' + perfil, { exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Configurações da empresa' })).toHaveCount(
        0,
      );
      // Confirmação de senha não transforma perfil operacional em Administrador.
      expect(
        (
          await request.post('/api/v1/auth/reautenticar', {
            headers: worker,
            data: { senha: fixture.cozinha.senha },
          })
        ).status(),
      ).toBe(204);
      const politica = await (
        await request.get('/api/v1/configuracoes/acessos', { headers })
      ).json();
      const antes = await equipe();
      expect(
        (
          await request.put('/api/v1/configuracoes/acessos', {
            headers: worker,
            data: { versao: politica.versao, perfil, acoes: [] },
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await request.put('/api/v1/equipe/' + original.id, {
            headers: worker,
            data: {
              versao: original.versao + 1,
              perfil: 'ADMINISTRADOR',
              ativo: true,
              unidades: [],
            },
          })
        ).status(),
      ).toBe(403);
      expect(
        (await request.get('/api/v1/configuracoes/acessos', { headers: worker })).status(),
      ).toBe(403);
      expect(await equipe()).toEqual(antes);
      expect(
        await (await request.get('/api/v1/configuracoes/acessos', { headers })).json(),
      ).toEqual(politica);
      await page.getByRole('button', { name: 'Acompanhar atualizações da unidade' }).click();
      const select = page.getByLabel('Unidade acompanhada', { exact: true });
      await expect(select.locator('option[value="' + unidade + '"]')).toHaveCount(1);
      await expect(select.locator('option[value="' + outra + '"]')).toHaveCount(0);
      await select.selectOption(unidade);
      await expect(page.getByTestId('unidade-atual')).toBeVisible();
      expect(
        (
          await request.get('/api/v1/operacao/unidades/' + outra + '/eventos', { headers: worker })
        ).status(),
      ).toBe(404);
      expect(
        (
          await request.get('/api/v1/operacao/unidades/' + outra + '/eventos', { headers })
        ).status(),
      ).toBe(200);
      expect(
        (
          await request.put('/api/v1/configuracoes/acessos', {
            headers,
            data: {
              versao: politica.versao,
              perfil,
              acoes: permitidas.filter((a) => a !== 'unidade.acompanhar'),
            },
          })
        ).status(),
      ).toBe(200);
      await expect(
        page.getByText(
          'Acesso à unidade removido ou sessão encerrada. Recarregue as unidades permitidas.',
        ),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId('unidade-atual')).toHaveCount(0);
      expect(
        (
          await request.get('/api/v1/operacao/unidades/' + unidade + '/eventos', {
            headers: worker,
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await request.put('/api/v1/configuracoes/acessos', {
            headers,
            data: { versao: politica.versao + 1, perfil, acoes: permitidas },
          })
        ).status(),
      ).toBe(200);
      await page.getByRole('button', { name: 'Recarregar unidades permitidas' }).click();
      await expect(select.locator('option[value="' + unidade + '"]')).toHaveCount(1);
      await select.selectOption(unidade);
      await expect(page.getByTestId('unidade-atual')).toBeVisible();
      await select.focus();
      await expect(select).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );
      await page
        .getByTestId('unidade-atual')
        .screenshot({ path: test.info().outputPath('perfil-' + perfil + '.png') });
      await page.reload();
      await expect(page.getByText('Perfil: ' + perfil, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Sair da conta' }).click();
      await expect(page.getByRole('heading', { name: 'Acessar minha conta' })).toBeVisible();
      expect((await request.get('/api/v1/auth/me', { headers: worker })).status()).toBe(401);
      expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([
        0, 0,
      ]);
    } finally {
      const atual = await (await request.get('/api/v1/configuracoes/acessos', { headers })).json();
      expect(
        (
          await request.put('/api/v1/configuracoes/acessos', {
            headers,
            data: { versao: atual.versao, perfil, acoes: matriz.perfis[perfil] },
          })
        ).status(),
      ).toBe(200);
      const funcionario = (await equipe()).find((f) => f.id === original.id)!;
      expect(
        (
          await request.put('/api/v1/equipe/' + original.id, {
            headers,
            data: {
              versao: funcionario.versao,
              perfil: original.perfil,
              ativo: original.ativo,
              unidades: original.unidades,
            },
          })
        ).status(),
      ).toBe(200);
    }
  });
}

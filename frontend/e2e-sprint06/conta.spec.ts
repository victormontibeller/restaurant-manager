import { expect, test } from '@playwright/test';
import { api, fixture, loginUi, ok } from '../e2e-pedidos/apoio';
import { abrirConta } from '../e2e-identidade/apoio';

for (const perfil of ['clienteA', 'gerente'] as const) {
  test(`S06-UI01: ${perfil} consulta, altera e reabre sua conta`, async ({ page, request }) => {
    const titular = fixture().contas[perfil];
    const token = await loginUi(page, titular);
    await abrirConta(page);
    const painel = page.getByRole('region', { name: 'Dados pessoais' });
    await expect(painel.getByText(titular.email, { exact: true })).toBeVisible();
    await expect(painel.getByText('Data do cadastro', { exact: true })).toBeVisible();
    if (perfil === 'gerente') {
      await expect(page.locator('app-equipe-layout')).toBeVisible();
      await expect(painel.getByRole('heading', { name: 'Unidades de acesso' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Meus endereços' })).toHaveCount(0);
    } else {
      await expect(page.getByRole('region', { name: 'Meus endereços' })).toBeVisible();
      await expect(painel.getByRole('heading', { name: 'Unidades de acesso' })).toHaveCount(0);
    }
    const recurso = '/api/v1/me/perfil';
    const anterior = await ok<{ nome: string | null; telefone: string | null }>(
      await api(request, token, recurso),
    );
    const editar = painel.getByRole('button', { name: 'Editar dados pessoais' });
    await editar.click();
    const nome = painel.getByLabel('Nome', { exact: true });
    await expect(nome).toBeFocused();
    const alterado =
      anterior.nome === 'Pessoa de teste' ? 'Outra pessoa de teste' : 'Pessoa de teste';
    await nome.fill(alterado);
    await painel.getByLabel('Telefone', { exact: true }).fill('(11) 98888-7777');
    try {
      await painel.getByRole('button', { name: 'Salvar dados pessoais' }).click();
      await expect(painel.getByText('Dados pessoais salvos.')).toBeVisible();
      await expect(editar).toBeFocused();
      await page.reload();
      await expect(painel.getByText(alterado, { exact: true })).toBeVisible();
      await expect(painel.getByText('11988887777', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Minha conta');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    } finally {
      const atual = await ok<{ versao: number }>(await api(request, token, recurso));
      await ok(
        await api(request, token, recurso, 'PUT', {
          versao: atual.versao,
          nome: anterior.nome,
          telefone: anterior.telefone,
        }),
      );
    }
  });
}

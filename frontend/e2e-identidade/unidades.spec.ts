import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const file = process.env['RM_AUTH_FIXTURE'];
if (!file) throw new Error('Massa privada obrigatória.');
const fixture = JSON.parse(fs.readFileSync(file, 'utf8')) as { email: string; senha: string };

test('S01-UI05: criar, editar, inativar e recuperar unidade com conflito', async ({ page }) => {
  // A massa persistente ultrapassa uma página; recarregar ordena no servidor.
  async function recarregarELocalizar(nome: string): Promise<void> {
    const heading = page.getByRole('heading', { name: nome, exact: true });
    const section = page.getByRole('region', { name: 'Configurações de unidades' });
    async function carregar(acao: () => Promise<void>): Promise<void> {
      const response = page.waitForResponse(
        (r) =>
          r.url().includes('/configuracoes/unidades?pagina=') && r.request().method() === 'GET',
      );
      await acao();
      const result = await response;
      expect(result.status()).toBe(200);
      await result.finished();
      await expect(section).toHaveAttribute('aria-busy', 'false');
    }
    await carregar(() =>
      page.getByRole('button', { name: 'Recarregar unidades', exact: true }).click(),
    );
    // Voltar ao início também cobre mudança de posição após edição do nome.
    const previous = page.getByRole('button', { name: 'Página anterior de unidades', exact: true });
    while (await previous.isEnabled()) await carregar(() => previous.click());
    const next = page.getByRole('button', { name: 'Próxima página de unidades', exact: true });
    while ((await heading.count()) === 0 && (await next.isEnabled()))
      await carregar(() => next.click());
    await expect(heading).toBeVisible();
  }
  await page.goto('/');
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.senha);
  const login = page.waitForResponse(
    (r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const autenticada = await login;
  expect(autenticada.status()).toBe(200);
  const access = (await autenticada.json()).accessToken;
  await page.getByRole('button', { name: 'Gerenciar unidades', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configurações de unidades' })).toBeVisible();
  const orientacao = page.getByText(
    'Configure horários e canais em cada unidade. Ajuste os prazos de aceite em Operar pedidos e mesas. Regiões de entrega ainda não estão disponíveis.',
    { exact: true },
  );
  const inativacao = page.getByText(
    'Somente o Administrador configura unidades. Inativar bloqueia novas vendas e remove a unidade da lista pública, preservando o cadastro, os vínculos e a resolução de operações existentes por usuários autorizados.',
    { exact: true },
  );
  await expect(orientacao).toBeVisible();
  await expect(inativacao).toBeVisible();
  await orientacao.screenshot({ path: test.info().outputPath('s03-texto-prazos-unidade.png') });
  await inativacao.screenshot({ path: test.info().outputPath('s03-texto-inativacao-unidade.png') });
  const nome = 'Unidade ' + crypto.randomUUID().slice(0, 8);
  await page.getByLabel('Nome da nova unidade').fill(nome);
  await page.getByRole('button', { name: 'Criar unidade', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Confirme sua senha antes de alterar acessos.');
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByLabel('Confirme sua senha').fill(fixture.senha);
  const reauth = page.waitForResponse(
    (r) => r.url().endsWith('/auth/reautenticar') && r.request().method() === 'POST',
    { timeout: 12000 },
  );
  await page.getByRole('button', { name: 'Confirmar identidade' }).click();
  expect((await reauth).status()).toBe(204);
  await expect(page.getByText('Identidade confirmada por cinco minutos.')).toBeVisible();
  await page.getByLabel('Fuso da nova unidade').fill('Inexistente/Fuso');
  await page.getByRole('button', { name: 'Criar unidade', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Informe um fuso IANA válido, como America/Sao_Paulo.',
  );
  await page.getByLabel('Fuso da nova unidade').fill('America/Manaus');
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/configuracoes/unidades') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Criar unidade', exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(200);
  const unidade = await response.json();
  const row = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: nome, exact: true }) });
  await expect(row).toBeVisible();
  const concorrente = await page.request.put('/api/v1/configuracoes/unidades/' + unidade.id, {
    headers: { Authorization: 'Bearer ' + access },
    data: { versao: unidade.versao, nome, fuso: 'UTC', ativa: true },
  });
  expect(concorrente.status()).toBe(200);
  await row.getByRole('button', { name: 'Salvar unidade' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'A unidade foi alterada. Recarregue antes de salvar.',
  );
  await recarregarELocalizar(nome);
  await expect(row.getByLabel('Fuso da unidade')).toHaveValue('UTC');
  await row.getByLabel('Nome da unidade', { exact: true }).fill(nome + ' editada');
  await row.getByLabel('Unidade ativa').uncheck();
  await row.getByRole('button', { name: 'Salvar unidade' }).click();
  await expect(page.getByText('Unidade atualizada no servidor.')).toBeVisible();
  await recarregarELocalizar(nome + ' editada');
  const editada = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: nome + ' editada', exact: true }) });
  await expect(editada.getByLabel('Unidade ativa')).not.toBeChecked();
  const publico = await page.request.get('/api/v1/unidades');
  expect((await publico.json()).map((u: { id: string }) => u.id)).not.toContain(unidade.id);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await editada.screenshot({ path: test.info().outputPath('unidade-editada.png') });
  await page
    .locator('app-unidades > section > form')
    .nth(1)
    .screenshot({ path: test.info().outputPath('unidades.png') });
  await page
    .getByRole('navigation', { name: 'Páginas de unidades', exact: true })
    .screenshot({ path: test.info().outputPath('paginacao-unidades.png') });
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page.getByRole('heading', { name: 'Configurações de unidades' })).toHaveCount(0);
});

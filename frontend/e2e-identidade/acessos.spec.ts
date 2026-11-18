import { navegarGestao } from './apoio';
import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
const file = process.env['RM_AUTH_FIXTURE'];
if (!file) throw new Error('Massa privada obrigatória.');
const fixture = JSON.parse(fs.readFileSync(file, 'utf8')) as { email: string; senha: string };

async function confirmarResposta(
  page: Page,
  rota: string,
  metodo: string,
  status: number,
  acao: () => Promise<void>,
): Promise<void> {
  const resposta = page.waitForResponse(
    (r) => r.url().endsWith(rota) && r.request().method() === metodo,
    { timeout: 15000 },
  );
  await acao();
  expect((await resposta).status()).toBe(status);
}

test('S01-UI04: matriz, reautenticação, persistência e último administrador', async ({ page }) => {
  // Trace medido: Firefox gasta 16s no setup e WebKit chega ao último
  // comando após 60s. Prazo da jornada, não retry nem relaxamento de assertivas.
  test.setTimeout(120000);
  await page.goto('/gestao/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.senha);
  const login = page.waitForResponse(
    (r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST',
    { timeout: 12000 },
  );
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  expect((await login).status()).toBe(200);
  await navegarGestao(page, '/gestao/acessos');
  await expect(page.getByRole('heading', { name: 'Acessos', exact: true })).toBeVisible();

  const celulaCozinha = page.getByRole('button', { name: 'Cozinha · Cozinha', exact: true });
  const celulaAtualizacoes = page.getByRole('button', {
    name: 'Atualizações · Atendimento',
    exact: true,
  });
  const iniciar = page.getByRole('checkbox', { name: 'Iniciar preparo', exact: true });
  const acompanhar = page.getByRole('checkbox', {
    name: 'Acompanhar atualizações cadastrais da unidade',
    exact: true,
  });
  const concluir = page.getByRole('button', { name: 'Concluir seleção' });
  const salvar = page.getByRole('button', { name: 'Salvar acessos' });
  const buscar = page.getByLabel('Buscar módulo ou ação');

  await celulaCozinha.click();
  const preparoOriginal = await iniciar.isChecked();
  await iniciar.setChecked(!preparoOriginal);
  await concluir.click();
  await expect(celulaCozinha).toBeFocused();
  await celulaAtualizacoes.click();
  const atualizacoesOriginal = await acompanhar.isChecked();
  await acompanhar.setChecked(!atualizacoesOriginal);
  await concluir.click();

  await buscar.fill('atualizacoes');
  await expect(celulaCozinha).toHaveCount(0);
  await expect(celulaAtualizacoes).toBeVisible();
  await confirmarResposta(page, '/configuracoes/acessos/matriz', 'PUT', 403, () => salvar.click());
  await expect(page.getByRole('alert')).toHaveText('Confirme sua senha antes de alterar acessos.');
  const campoSenha = page.getByLabel('Confirme sua senha');
  const confirmar = page.getByRole('button', { name: 'Confirmar identidade' });
  await campoSenha.fill('senha-incorreta');
  await confirmarResposta(page, '/auth/reautenticar', 'POST', 422, () => confirmar.click());
  await expect(page.getByRole('alert')).toHaveText('Senha de confirmação inválida.');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(campoSenha).toHaveAttribute('aria-invalid', 'true');
  await expect(campoSenha).toHaveAccessibleDescription('Senha de confirmação inválida.');
  await campoSenha.fill(fixture.senha);
  await confirmarResposta(page, '/auth/reautenticar', 'POST', 204, () => confirmar.click());
  await expect(page.getByText('Identidade confirmada por cinco minutos.')).toBeVisible();
  await expect(campoSenha).not.toHaveAttribute('aria-invalid', 'true');
  await confirmarResposta(page, '/configuracoes/acessos/matriz', 'PUT', 200, () => salvar.click());
  await expect(page.getByText('Permissões salvas no servidor.')).toBeVisible();
  await confirmarResposta(page, '/configuracoes/acessos', 'GET', 200, () =>
    page.getByRole('button', { name: 'Recarregar matriz' }).click(),
  );

  await celulaAtualizacoes.click();
  await expect(acompanhar).toBeChecked({ checked: !atualizacoesOriginal });
  await acompanhar.setChecked(atualizacoesOriginal);
  await concluir.click();
  await buscar.clear();
  await celulaCozinha.click();
  await expect(iniciar).toBeChecked({ checked: !preparoOriginal });
  await iniciar.setChecked(preparoOriginal);
  await page.getByRole('dialog').screenshot({ path: test.info().outputPath('acoes-cozinha.png') });
  await concluir.click();
  await page
    .getByRole('table', { name: 'Permissões por módulo e perfil' })
    .locator('..')
    .screenshot({
      path: test.info().outputPath('matriz-acessos.png'),
    });
  await confirmarResposta(page, '/configuracoes/acessos/matriz', 'PUT', 200, () => salvar.click());
  await expect(page.getByText('Permissões salvas no servidor.')).toBeVisible();
  await navegarGestao(page, '/gestao/equipe');
  await expect(page.getByRole('heading', { name: 'Equipe', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Funcionários' })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  const employee = page.getByRole('article').filter({ hasText: fixture.email });
  // Convites de execuções anteriores permanecem no PostgreSQL. O Administrador
  // não é necessariamente um dos primeiros cinquenta funcionários ordenados.
  const pages = page.getByRole('navigation', { name: 'Páginas de funcionários' });
  let pagina = 0;
  while ((await employee.count()) === 0) {
    await expect(pages.getByRole('button', { name: 'Próxima página', exact: true })).toBeEnabled();
    pagina++;
    const loaded = Promise.all(
      ['/equipe?pagina=' + pagina, '/operacao/unidades'].map((path) =>
        page.waitForResponse((r) => r.url().endsWith(path) && r.request().method() === 'GET'),
      ),
    );
    await pages.getByRole('button', { name: 'Próxima página', exact: true }).click();
    for (const response of await loaded) {
      expect(response.status()).toBe(200);
      await response.finished();
    }
    await expect(pages.getByText('Página ' + (pagina + 1), { exact: true })).toBeVisible();
  }
  await expect(employee).toHaveCount(1);
  const editar = employee.getByRole('button', { name: 'Editar funcionário', exact: true });
  await editar.click();
  await employee.getByLabel('Ativo', { exact: true }).uncheck();
  const protectedResponse = page.waitForResponse(
    (r) => r.url().includes('/api/v1/equipe/') && r.request().method() === 'PUT',
    { timeout: 15000 },
  );
  await employee.getByRole('button', { name: 'Salvar funcionário' }).click();
  expect((await protectedResponse).status()).toBe(409);
  await expect(page.getByRole('alert')).toHaveText('Mantenha pelo menos um Administrador ativo.');
  await employee.getByLabel('Ativo', { exact: true }).check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page
    .getByRole('alert')
    .screenshot({ path: test.info().outputPath('protecao-administrador.png') });
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page.getByRole('heading', { name: 'Equipe', exact: true })).toHaveCount(0);
});

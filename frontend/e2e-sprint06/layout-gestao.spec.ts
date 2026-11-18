import { expect, test } from '@playwright/test';
import { fixture, loginUi } from '../e2e-pedidos/apoio';

test('S06-UI03: somente o conteúdo da gestão rola e o menu permanece acessível', async ({
  page,
}) => {
  const consultasSaude: string[] = [];
  page.on('request', (requisicao) => {
    if (new URL(requisicao.url()).pathname !== '/actuator/health') return;
    const rota = new URL(page.url()).pathname;
    if (rota.startsWith('/gestao/') && rota !== '/gestao/entrar') consultasSaude.push(rota);
  });
  // Exercita o estado sem oferta de instalação, independente do navegador da matriz.
  await page.addInitScript(() => {
    window.addEventListener(
      'beforeinstallprompt',
      (evento) => {
        evento.preventDefault();
        evento.stopImmediatePropagation();
      },
      { capture: true },
    );
  });
  await loginUi(page, fixture());
  const largura = page.viewportSize()!.width;
  await page.setViewportSize({ width: largura, height: 400 });
  const painel = page.getByRole('region', { name: 'Conteúdo da página' });
  await expect(painel.getByLabel('Estado dos pedidos')).toBeVisible();
  const utilitarios = page.locator('.app-utilities');
  const aviso = utilitarios.locator('app-pwa .offline-notice');
  const alturaUtilitarios = () =>
    utilitarios.evaluate((elemento) => elemento.getBoundingClientRect().height);
  await expect(utilitarios.locator('details')).toHaveCount(0);
  await expect(aviso).toBeEmpty();
  await expect.poll(alturaUtilitarios).toBe(0);
  const barra = page.locator('.workspace-header');
  const titulo = page.getByRole('heading', { level: 1, name: 'Pedidos' });
  const acao = page.getByRole('link', { name: '+ Novo pedido', exact: true });
  const lateral = page.locator('#menu-gestao');
  const fixos = [barra, titulo, acao];
  if (largura > 800) fixos.push(lateral);
  const posicoes = () =>
    Promise.all(
      fixos.map((item) =>
        item.evaluate((elemento) => {
          const { x, y } = elemento.getBoundingClientRect();
          return { x, y };
        }),
      ),
    );
  const antes = await posicoes();

  await painel.focus();
  await page.keyboard.press('PageDown');
  await expect.poll(() => painel.evaluate((alvo) => alvo.scrollTop)).toBeGreaterThan(0);
  expect(await posicoes()).toEqual(antes);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    largura,
  );

  if (largura <= 800) {
    const abrir = page.getByRole('button', { name: 'Abrir menu de gestão' });
    await abrir.click();
    await expect(page.getByRole('dialog', { name: 'Menu de gestão' })).toBeVisible();
    const primeiroLink = lateral.getByRole('link').first();
    await expect(primeiroLink).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(lateral.getByRole('link').last()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(abrir).toBeFocused();
    await expect(abrir).toHaveAttribute('aria-expanded', 'false');
    await abrir.click();
    await lateral.getByRole('link', { name: 'Pedidos', exact: true }).click();
    await expect(abrir).toBeFocused();
  } else {
    await lateral.getByRole('link', { name: 'Ver cardápio do cliente' }).focus();
    await expect.poll(() => lateral.evaluate((alvo) => alvo.scrollTop)).toBeGreaterThan(0);
    expect(await posicoes()).toEqual(antes);
  }

  const salto = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await salto.focus();
  await salto.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  expect(await painel.evaluate((alvo) => alvo.scrollTop)).toBe(0);
  await acao.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Novo pedido');
  expect(await painel.evaluate((alvo) => alvo.scrollTop)).toBe(0);

  await page.context().setOffline(true);
  try {
    await expect(aviso).toContainText('Você está offline');
    await expect.poll(alturaUtilitarios).toBeGreaterThan(0);
    await expect(aviso).toBeInViewport();
    await expect(barra).toBeInViewport();
    await expect(painel).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  } finally {
    await page.context().setOffline(false);
  }
  await expect(aviso).toBeEmpty();
  await expect.poll(alturaUtilitarios).toBe(0);
  await expect(utilitarios.locator('details')).toHaveCount(0);
  expect(consultasSaude, 'Consultas de saúde originadas nas rotas de Gestão').toEqual([]);
});

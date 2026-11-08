import { expect, test } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { Socket } from 'node:net';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const build = path.resolve(__dirname, '../dist/restaurant-manager/browser');

test('S02-PWA01: shell integrado abre offline sem armazenar API ou dados de sessão', async ({
  page,
  context,
  request,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);
  const data = await manifest.json();
  expect(data).toMatchObject({
    name: 'Restaurant Manager',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'pt-BR',
  });
  expect(data.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(['192x192', '512x512']);
  for (const icon of data.icons) {
    const response = await request.get(icon.src);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  }
  expect((await request.get('/api/v1/unidades')).status()).toBe(200);
  // O GET percorre o navegador controlado pelo worker; nenhuma API pode entrar no cache.
  await page.evaluate(async () => {
    await fetch('/api/v1/unidades');
    await fetch('/api/v1/auth/me');
  });
  await page.goto('/?retorno=marcador-privado-de-teste');
  const urls = await page.evaluate(async () => {
    const result: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith('rm-shell-')) continue;
      result.push(...(await (await caches.open(name)).keys()).map((request) => request.url));
    }
    return result;
  });
  expect(urls.length).toBeGreaterThan(4);
  expect(urls.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  expect(urls.some((url) => /api\/|actuator|marcador|retorno=/.test(url))).toBe(false);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Aplicativo e conexão' })).toContainText(
    'Você está offline',
  );
  await expect(
    page.getByRole('region', { name: 'Conexão com o sistema' }).getByRole('status'),
  ).toContainText('Sem conexão');
  await page.getByRole('region', { name: 'Aplicativo e conexão' }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.screenshot({ path: test.info().outputPath('pwa-offline.png'), fullPage: false });
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Verificar conexão' }).click();
  await expect(
    page.getByRole('region', { name: 'Conexão com o sistema' }).getByRole('status'),
  ).toContainText('Sistema conectado');
});

// Fronteira de atualização: shell real do build em servidor local controlado. APIs devolvem503,
// sem substituir respostas na jornada integrada. Alteramos somente a versão do worker.
test('S02-PWA02: atualização do shell espera consentimento e preserva outras abas', async ({
  page,
  context,
}) => {
  let version = 'primeira';
  const files = new Map<string, Buffer>();
  for (const name of readdirSync(build)) {
    if (/\.(js|css|html|webmanifest)$/.test(name))
      files.set('/' + name, readFileSync(path.join(build, name)));
  }
  for (const name of ['icon-192.png', 'icon-512.png'])
    files.set('/icons/' + name, readFileSync(path.join(build, 'icons', name)));
  const sockets = new Set<Socket>();
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const key = url.pathname === '/' ? '/index.html' : url.pathname;
    let content = files.get(key);
    if (!content) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end('{"mensagem":"API não participa desta prova de atualização."}');
      return;
    }
    if (key === '/sw.js')
      content = Buffer.from(
        content.toString().replace(/const VERSION = "[^"]+";/, `const VERSION = "${version}";`),
      );
    const type = key.endsWith('.js')
      ? 'text/javascript'
      : key.endsWith('.css')
        ? 'text/css'
        : key.endsWith('.png')
          ? 'image/png'
          : key.endsWith('.webmanifest')
            ? 'application/manifest+json'
            : 'text/html';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(content);
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Servidor de fronteira indisponível.');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page.goto(origin);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    const other = await context.newPage();
    await other.goto(origin);
    await other.evaluate(() => {
      document.body.dataset['rascunho'] = 'preservado';
    });
    await page.evaluate(() => {
      document.body.dataset['rascunho'] = 'preservado';
    });
    version = 'segunda';
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    const update = page.getByRole('button', { name: 'Atualizar aplicativo', exact: true });
    await expect(update).toBeVisible();
    expect(await page.evaluate(() => document.body.dataset['rascunho'])).toBe('preservado');
    await update.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    await page.screenshot({
      path: test.info().outputPath('pwa-atualizacao-consentimento.png'),
      fullPage: false,
    });
    page.once('dialog', (dialog) => dialog.dismiss());
    await update.click();
    await expect(update).toBeEnabled();
    expect(await page.evaluate(() => document.body.dataset['rascunho'])).toBe('preservado');
    page.once('dialog', (dialog) => dialog.accept());
    await Promise.all([page.waitForEvent('load'), update.click()]);
    expect(await page.evaluate(() => document.body.dataset['rascunho'])).toBeUndefined();
    expect(await other.evaluate(() => document.body.dataset['rascunho'])).toBe('preservado');
    await expect
      .poll(() => page.evaluate(async () => (await caches.keys()).includes('rm-shell-segunda')))
      .toBe(true);
    await other.close();
  } finally {
    const encerrado = new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    // Preconnect sem requisição HTTP também mantém server.close pendente.
    // Encerre somente conexões deste servidor de fronteira, inclusive em falhas.
    for (const socket of sockets) socket.destroy();
    await encerrado;
  }
});

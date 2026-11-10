#!/usr/bin/env node
/* Contraste de texto no DOM real; não substitui inspeção visual ou WCAG completa.
 * node scripts/check_contrast.cjs --config /diretorio/privado/contrast.json
 * --plan valida configuração sem abrir navegador; --self-test valida a matemática.
 * Config: {runtime, output, cases:[{id, origin, path, fixture?, account?, ready?,
 *   viewport?:{width,height}, actions?:[{role,name}|{label,value}|{select,value}]}]}.
 * account='administrador'/'plataforma' usa a raiz; demais perfis usam contas[account].
 * ready={role,name}; actions são passos explícitos revisados pelo operador.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');

function requireCondition(value, message) {
  if (!value) throw new Error(message);
}

function luminance(rgb) {
  const channels = rgb.slice(0, 3).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

function composite(foreground, background) {
  const alpha = foreground[3] + background[3] * (1 - foreground[3]);
  if (!alpha) return [0, 0, 0, 0];
  return [0, 1, 2].map((i) =>
    (foreground[i] * foreground[3] + background[i] * background[3] * (1 - foreground[3])) / alpha,
  ).concat(alpha);
}

function threshold(size, weight) {
  return size >= 24 || (weight >= 700 && size >= 56 / 3) ? 3 : 4.5;
}

function privatePath(name, directory = false) {
  requireCondition(typeof name === 'string' && path.isAbsolute(name), 'Caminho privado absoluto obrigatório.');
  const actual = fs.realpathSync(name);
  const stat = fs.lstatSync(name);
  requireCondition(!stat.isSymbolicLink() && (directory ? stat.isDirectory() : stat.isFile())
    && stat.uid === process.getuid() && !(stat.mode & 0o077)
    && actual !== ROOT && !actual.startsWith(ROOT + path.sep), 'Arquivo/diretório precisa ser privado e externo ao checkout.');
  return actual;
}

function localOrigin(value) {
  const url = new URL(value);
  requireCondition(url.protocol === 'https:' && url.port === '8089'
    && /^(?:127\.0\.0\.1|[a-z0-9.-]+\.localhost)$/.test(url.hostname)
    && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash,
  'Origem de contraste restrita ao candidato HTTPS local na porta 8089.');
  return url.origin;
}

function contextKey(item) {
  return JSON.stringify([item.origin, item.fixture || null, item.account || null]);
}

function loadConfig(filename) {
  const config = JSON.parse(fs.readFileSync(privatePath(filename), 'utf8'));
  privatePath(config.runtime);
  requireCondition(typeof config.output === 'string' && path.isAbsolute(config.output)
    && !fs.existsSync(config.output), 'Relatório deve usar caminho novo e absoluto.');
  privatePath(path.dirname(config.output), true);
  requireCondition(Array.isArray(config.cases) && config.cases.length > 0, 'Lista de casos ausente.');
  const ids = new Set();
  for (const item of config.cases) {
    requireCondition(/^[a-zA-Z0-9_-]+$/.test(item.id) && !ids.has(item.id), 'Identificador de caso inválido/duplicado.');
    ids.add(item.id);
    item.origin = localOrigin(item.origin);
    requireCondition(typeof item.path === 'string' && item.path.startsWith('/') && !item.path.startsWith('//')
      && new URL(item.path, item.origin).origin === item.origin, 'Rota de contraste deve ser local.');
    if (item.fixture) item.fixture = privatePath(item.fixture);
    requireCondition(!item.account || item.fixture, 'Conta requer fixture privada.');
    if (item.ready) requireCondition(typeof item.ready.role === 'string' && typeof item.ready.name === 'string',
      'Elemento de prontidão inválido.');
    if (item.ready?.level !== undefined) requireCondition(item.ready.role === 'heading'
      && Number.isInteger(item.ready.level) && item.ready.level >= 1 && item.ready.level <= 6,
    'Nível do heading de prontidão inválido.');
    for (const action of item.actions || []) {
      requireCondition((typeof action.role === 'string' && typeof action.name === 'string' && !action.label)
        || (typeof action.label === 'string' && typeof action.value === 'string' && !action.role && !action.select)
        || (typeof action.select === 'string' && typeof action.value === 'string' && !action.role && !action.label),
      'Ação precisa de role/name, label/value ou select/value.');
    }
  }
  const groups = new Map();
  for (const item of config.cases.filter((item) => item.account)) {
    const account = JSON.stringify([item.fixture, item.account]);
    if (!groups.has(account)) groups.set(account, new Set());
    groups.get(account).add(contextKey(item));
  }
  requireCondition([...groups.values()].every((keys) => keys.size <= 2),
    'Plano excede dois logins por conta; reutilize a mesma origem/contexto.');
  return config;
}

function runtimeIdentity(filename) {
  const runtime = JSON.parse(fs.readFileSync(privatePath(filename), 'utf8'));
  requireCondition(Number.isSafeInteger(runtime.pid) && runtime.pid > 0
    && /^[a-f0-9]{64}$/.test(runtime.sha256) && path.isAbsolute(runtime.jar), 'Identidade do runtime inválida.');
  requireCondition(!fs.lstatSync(runtime.jar).isSymbolicLink()
    && crypto.createHash('sha256').update(fs.readFileSync(runtime.jar)).digest('hex') === runtime.sha256,
  'Artefato do runtime divergiu.');
  const args = execFileSync('/bin/ps', ['-ww', '-p', String(runtime.pid), '-o', 'args='], { encoding: 'utf8' }).trim();
  const started = execFileSync('/bin/ps', ['-ww', '-p', String(runtime.pid), '-o', 'lstart='], { encoding: 'utf8' }).trim();
  requireCondition(args.endsWith('-jar ' + runtime.jar) && /(?:^|\/)java\s/.test(args), 'Processo registrado não executa o JAR esperado.');
  const listeners = execFileSync('/usr/sbin/lsof', ['-nP', '-a', '-p', String(runtime.pid), '-iTCP:8089', '-sTCP:LISTEN', '-Fpn'], { encoding: 'utf8' });
  requireCondition(listeners.split('\n').filter((line) => line.startsWith('p')).join() === 'p' + runtime.pid,
    'Listener não pertence ao runtime registrado.');
  const addresses = listeners.split('\n').filter((line) => line.startsWith('n'));
  requireCondition(addresses.length > 0 && addresses.every((line) =>
    ['n127.0.0.1:8089', 'n[::1]:8089'].includes(line)), 'Listener deve ser exclusivo de loopback.');
  return { pid: runtime.pid, started, sha256: runtime.sha256, jar: runtime.jar };
}

// Executada no navegador, sem valores sensíveis de campos ou conteúdo de senhas.
function collectComputedText() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  function rgba(value) {
    if (!CSS.supports('color', value)) return null;
    const numeric = value.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,?\s+(\d+(?:\.\d+)?)\s*,?\s+(\d+(?:\.\d+)?)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
    if (numeric) return numeric.slice(1, 4).map(Number).concat(numeric[4] === undefined ? 1 : Number(numeric[4]));
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const result = [...ctx.getImageData(0, 0, 1, 1).data];
    result[3] /= 255;
    return result;
  }
  function selector(element) {
    const parts = [];
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      const siblings = node.parentElement ? [...node.parentElement.children].filter((item) => item.tagName === node.tagName) : [];
      parts.unshift(node.tagName.toLowerCase() + ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')');
    }
    return 'html > ' + parts.join(' > ');
  }
  const rows = [];
  function capture(element, text, kind = 'text', pseudo = null, textRects = null, textNode = null) {
    const rect = element.getBoundingClientRect();
    const normal = getComputedStyle(element);
    if (!rect.width || !rect.height || normal.visibility !== 'visible' || normal.display === 'none') return;
    const style = pseudo ? getComputedStyle(element, pseudo) : normal;
    const layers = [], reasons = [], opacityGroups = [];
    let opaque = false;
    for (let node = element; node; node = node.parentElement) {
      const parent = getComputedStyle(node);
      if (parent.visibility !== 'visible' || parent.display === 'none' || Number(parent.opacity) === 0) return;
      if (parent.clip === 'rect(0px, 0px, 0px, 0px)' || parent.clipPath === 'inset(50%)') return;
      if (Number(parent.opacity) !== 1) {
        reasons.push('opacity de grupo');
        opacityGroups.push({ selector: selector(node), opacity: Number(parent.opacity) });
      }
      if (parent.filter !== 'none' || parent.mixBlendMode !== 'normal') reasons.push('filter/mix-blend-mode');
      if (!opaque) {
        if (parent.backgroundImage !== 'none') reasons.push('imagem/gradiente no fundo');
        if (parent.backdropFilter && parent.backdropFilter !== 'none') reasons.push('backdrop-filter');
        const color = rgba(parent.backgroundColor);
        if (!color) reasons.push('cor de fundo não interpretada');
        else { layers.push(color); opaque = color[3] === 1; }
      }
    }
    const foreground = rgba(style.color);
    if (!foreground) reasons.push('cor de texto não interpretada');
    if (pseudo && foreground) foreground[3] *= Number(style.opacity);
    if (style.backgroundClip === 'text' || style.webkitBackgroundClip === 'text') reasons.push('background-clip:text');
    if (style.textShadow !== 'none') reasons.push('text-shadow');
    const disabled = !!element.closest(':disabled,[aria-disabled="true"],[data-disabled="true"]');
    rows.push({ selector: selector(element), kind, text: text.replace(/\s+/g, ' ').trim().slice(0, 100),
      color: style.color, foreground, backgroundLayers: layers,
      fontSize: parseFloat(style.fontSize), fontWeight: parseFloat(style.fontWeight),
      disabled, reviewReasons: [...new Set(reasons)], opacityGroups,
      textColorAlpha: foreground?.[3], pseudoOpacity: pseudo ? Number(style.opacity) : null,
      textNodeIndex: textNode ? [...element.childNodes].indexOf(textNode) : null,
      textRects: (textRects || [...element.getClientRects()]).filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
      inViewport: rect.bottom > 0 && rect.top < innerHeight });
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    if (node.textContent.trim() && !node.parentElement.closest('script,style,noscript,option,svg')) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (rects.length) capture(node.parentElement, node.textContent, 'text', null, rects, node);
    }
  }
  for (const element of document.querySelectorAll('input,textarea,select')) {
    if (element.type === 'hidden' || element.type === 'checkbox' || element.type === 'radio') continue;
    if (element.value) capture(element, '[valor do campo omitido]', 'control-value');
    else if (element.placeholder) capture(element, '[placeholder do campo]', 'placeholder', '::placeholder');
  }
  return rows;
}

async function measureRenderedBackground(page, rows) {
  let eligible = rows.map((row, index) => ({ row, index })).filter(({ row }) =>
    row.status === 'review-required' && row.kind === 'text' && row.foreground
    && row.reviewReasons.every((reason) => ['imagem/gradiente no fundo', 'backdrop-filter'].includes(reason)));
  if (!eligible.length) return rows;
  // Apenas pintura dos glifos: currentColor, fundos, geometria e estado Angular
  // ficam intactos. O PNG intermediário existe somente em memória para análise.
  let style;
  let background;
  try {
    style = await page.addStyleTag({ content: '*::before, *::after, * { '
      + '-webkit-text-fill-color: transparent !important; text-shadow: none !important; '
      + 'text-decoration-color: transparent !important; caret-color: transparent !important; }' });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const stable = await page.evaluate((candidates) => candidates.map(({ row, index }) => {
      const element = document.querySelector(row.selector);
      const node = element?.childNodes[row.textNodeIndex];
      if (!node || node.nodeType !== Node.TEXT_NODE) return { index, stable: false };
      const computed = getComputedStyle(element);
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
      return { index, stable: computed.webkitTextFillColor === 'rgba(0, 0, 0, 0)'
        && computed.color === row.color && JSON.stringify(rects) === JSON.stringify(row.textRects)
        && node.textContent.replace(/\s+/g, ' ').trim().slice(0, 100) === row.text };
    }), eligible);
    const valid = new Set(stable.filter((entry) => entry.stable).map((entry) => entry.index));
    for (const { row, index } of eligible) {
      if (!valid.has(index)) row.renderedBackground = { approved: false,
        reason: 'Texto/geometria/pintura não permaneceram idênticos durante a captura do fundo.' };
    }
    eligible = eligible.filter(({ index }) => valid.has(index));
    if (eligible.length) background = await page.screenshot({ scale: 'css', animations: 'disabled' });
  } finally {
    if (style) await style.evaluate((element) => element.remove());
  }
  if (!background) return rows;
  const measurements = await page.evaluate(async ({ png, candidates }) => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + png;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    return candidates.map(({ row, index }) => {
      // Uma aprovação precisa abranger TODOS os pixels dos retângulos reais do
      // texto. Recortes/áreas fora da captura permanecem explicitamente pendentes.
      if (!row.textRects.length || row.textRects.some((r) => r.x < 0 || r.y < 0
        || r.x + r.width > image.width || r.y + r.height > image.height)) {
        return { index, reason: 'Retângulo de texto não está integralmente na captura.' };
      }
      const colors = new Map();
      let sampledPixels = 0;
      for (const rect of row.textRects) {
        for (let y = Math.floor(rect.y); y < Math.ceil(rect.y + rect.height); y++) {
          for (let x = Math.floor(rect.x); x < Math.ceil(rect.x + rect.width); x++) {
            const offset = 4 * (y * image.width + x);
            const rgba = [...pixels.slice(offset, offset + 4)];
            if (rgba[3] !== 255) return { index, reason: 'PNG contém fundo não opaco.' };
            colors.set(rgba.slice(0, 3).join(','), rgba.slice(0, 3).concat(1));
            sampledPixels++;
          }
        }
      }
      return { index, sampledPixels, backgrounds: [...colors.values()], width: image.width, height: image.height };
    });
  }, { png: background.toString('base64'), candidates: eligible });
  for (const measured of measurements) {
    const row = rows[measured.index];
    if (measured.reason) {
      row.renderedBackground = { approved: false, reason: measured.reason };
      continue;
    }
    const worst = measured.backgrounds.map((color) => ({ color,
      foreground: composite(row.foreground, color), ratio: contrast(composite(row.foreground, color), color) }))
      .reduce((minimum, current) => current.ratio < minimum.ratio ? current : minimum);
    row.renderedBackground = { approved: worst.ratio >= row.minimum, source: 'PNG em memória com pintura de texto transparente',
      sampledPixels: measured.sampledPixels, uniqueBackgroundColors: measured.backgrounds.length,
      screenshotSize: { width: measured.width, height: measured.height },
      worstBackground: worst.color, worstEffectiveForeground: worst.foreground, minimumRatio: worst.ratio,
      textColor: row.color, textColorAlpha: row.textColorAlpha, opacityGroups: row.opacityGroups,
      textGeometryAndColorVerified: true, temporaryStyleRemoved: true,
      rectanglePolicy: 'todos os pixels dos retângulos de texto; limite conservador, sem inferir posição dos glifos' };
    if (worst.ratio >= row.minimum) {
      row.status = 'passed-rendered-bound';
      row.ratio = worst.ratio;
    }
    // Um pixel do retângulo pode estar entre glifos. Razão baixa exige inspeção;
    // não vira falha definitiva nem verde a partir de uma amostra favorável.
  }
  return rows;
}

function analyze(rows) {
  return rows.map((row) => {
    let background = [255, 255, 255, 1];
    for (const layer of [...row.backgroundLayers].reverse()) background = composite(layer, background);
    const foreground = row.foreground && composite(row.foreground, background);
    const ratio = foreground ? contrast(foreground, background) : null;
    const minimum = threshold(row.fontSize, row.fontWeight);
    return { ...row, background, effectiveForeground: foreground, ratio, minimum,
      status: row.disabled ? 'exempt-disabled' : row.reviewReasons.length ? 'review-required' :
        ratio >= minimum ? 'passed' : 'failed' };
  });
}

async function run(config) {
  const { chromium } = require(require.resolve('@playwright/test', { paths: [path.join(ROOT, 'frontend')] }));
  const initial = runtimeIdentity(config.runtime);
  const screenshots = path.join(path.dirname(config.output), path.basename(config.output, '.json') + '-screenshots');
  fs.mkdirSync(screenshots, { mode: 0o700 });
  const browser = await chromium.launch({ headless: true,
    args: ['--host-resolver-rules=MAP *.localhost 127.0.0.1'] });
  const report = { approved: false, scope: 'contraste de texto calculável no candidato Mac',
    linuxHomologation: false, completeWCAGAudit: false, runtime: initial, cases: [], logins: [],
    limitations: ['Imagens/gradientes podem passar pelo pior pixel do retângulo de texto; os demais casos exigem revisão explícita.',
      'Ícones, bordas, foco, estados hover e tecnologia assistiva não são aprovados por esta medição.'] };
  const sessions = new Map();
  let activeCase = null;
  let activeStep = null;
  try {
    for (const item of config.cases) {
      activeCase = item.id;
      activeStep = 'contexto';
      const key = contextKey(item);
      let session = sessions.get(key);
      if (!session) {
        const context = await browser.newContext({ baseURL: item.origin, ignoreHTTPSErrors: true,
          viewport: item.viewport || { width: 1280, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
        const external = [];
        await context.route('**/*', (route) => {
          const url = new URL(route.request().url());
          if (url.origin !== item.origin) { external.push(url.origin); return route.abort(); }
          return route.continue();
        });
        const page = await context.newPage();
        session = { context, page, external };
        sessions.set(key, session);
        if (item.account) {
          activeStep = 'login';
          const fixture = JSON.parse(fs.readFileSync(privatePath(item.fixture), 'utf8'));
          const platform = item.account === 'plataforma';
          const account = item.account === 'administrador' || platform ? fixture : fixture.contas[item.account];
          requireCondition(account && account.email && account.senha, 'Conta fictícia não encontrada.');
          const entry = platform ? '/plataforma' :
            item.account.startsWith('cliente') ? '/entrar' : '/gestao/entrar';
          await page.goto(entry);
          await page.getByLabel(platform ? 'E-mail do operador' : 'E-mail', { exact: true }).fill(account.email);
          await page.getByLabel(platform ? 'Senha do operador' : 'Senha', { exact: true }).fill(account.senha);
          const login = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login')
            || response.url().endsWith('/api/v1/plataforma/auth/login'));
          await page.getByRole('button', { name: platform ? 'Entrar na plataforma' : 'Entrar', exact: true }).click();
          requireCondition((await login).status() === 200, 'Login de contraste recusado.');
          report.logins.push({ origin: item.origin, account: item.account, count: 1 });
        }
      }
      const { page, external } = session;
      activeStep = 'navegacao';
      await page.setViewportSize(item.viewport || { width: 1280, height: 900 });
      await page.goto(item.path);
      for (const action of item.actions || []) {
        activeStep = 'acao-' + (action.label ? 'fill' : action.select ? 'select' : 'click');
        if (action.label) await page.getByLabel(action.label, { exact: true }).fill(action.value);
        else if (action.select) await page.getByRole('combobox', { name: action.select, exact: true }).selectOption(action.value);
        else await page.getByRole(action.role, { name: action.name, exact: true }).click();
      }
      activeStep = 'prontidao';
      if (item.ready) await page.getByRole(item.ready.role, { name: item.ready.name, exact: true,
        ...(item.ready.level ? { level: item.ready.level } : {}) }).waitFor({ state: 'visible' });
      await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      activeStep = 'medicao';
      const rows = await measureRenderedBackground(page, analyze(await page.evaluate(collectComputedText)));
      requireCondition(rows.length > 0 && external.length === 0, 'Caso sem texto ou com tentativa de acesso externo.');
      const screenshot = path.join(screenshots, item.id + '.png');
      await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled' });
      fs.chmodSync(screenshot, 0o600);
      report.cases.push({ id: item.id, origin: item.origin, path: item.path,
        account: item.account || 'publico', viewport: page.viewportSize(), screenshot, rows,
        counts: Object.fromEntries(['passed','passed-rendered-bound','failed','review-required','exempt-disabled']
          .map((status) => [status, rows.filter((row) => row.status === status).length])) });
    }
    assert.deepEqual(runtimeIdentity(config.runtime), initial, 'Runtime mudou durante a medição.');
    report.approved = report.cases.every((item) => !item.counts.failed && !item.counts['review-required']);
  } catch (error) {
    report.error = { case: activeCase, step: activeStep, type: error.name,
      diagnostic: activeStep === 'prontidao' ? error.message.split('\n')[0] : null };
    throw error;
  } finally {
    await Promise.allSettled([...sessions.values()].map((session) => session.context.close()));
    await browser.close();
    fs.writeFileSync(config.output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  console.log(JSON.stringify({ approved: report.approved, cases: report.cases.map(({ id, counts }) => ({ id, counts })), output: config.output }));
  return report.approved ? 0 : 1;
}

function selfTest() {
  assert.equal(contrast([0, 0, 0], [255, 255, 255]), 21);
  assert.equal(contrast([100, 100, 100], [100, 100, 100]), 1);
  assert.deepEqual(composite([0, 0, 0, 0.5], [255, 255, 255, 1]), [127.5, 127.5, 127.5, 1]);
  assert.equal(threshold(18, 700), 4.5);
  assert.equal(threshold(56 / 3, 700), 3);
  assert.equal(threshold(23, 650), 4.5);
  assert.equal(threshold(24, 400), 3);
  assert.throws(() => localOrigin('https://example.invalid:8089'));
  assert.throws(() => localOrigin('https://a.localhost:8095'));
  assert.equal(localOrigin('https://a.localhost:8089'), 'https://a.localhost:8089');
  const row = { foreground: [118.66, 118.66, 118.66, 1], backgroundLayers: [[255, 255, 255, 1]],
    fontSize: 16, fontWeight: 400, reviewReasons: [], disabled: false };
  assert.equal(analyze([row])[0].status, 'failed'); // 4.499 < 4.5; sem arredondar para aprovar.
  assert.equal(analyze([{ ...row, reviewReasons: ['imagem'] }])[0].status, 'review-required');
  const session = { origin: 'https://a.localhost:8089', fixture: '/private/fixture.json', account: 'administrador' };
  assert.equal(contextKey({ ...session, path: '/gestao/catalogo' }), contextKey({ ...session, path: '/gestao/mesas', viewport: { width: 360, height: 800 } }));
  assert.notEqual(contextKey(session), contextKey({ ...session, account: 'cozinha' }));
  console.log('14 verificações de matemática, limites, destino e reutilização de sessão aprovadas; nenhuma navegação executada.');
}

module.exports = { contrast, composite, threshold, analyze, localOrigin, contextKey, collectComputedText };
if (require.main === module) {
  (async () => {
    if (process.argv.includes('--self-test')) { selfTest(); return; }
    const index = process.argv.indexOf('--config');
    requireCondition(index >= 0 && process.argv[index + 1], 'Informe --config com JSON privado.');
    const config = loadConfig(process.argv[index + 1]);
    if (process.argv.includes('--plan')) console.log(JSON.stringify({ cases: config.cases.map(({ id, origin, path }) => ({ id, origin, path })), navigation: false }));
    else process.exitCode = await run(config);
  })().catch(() => { console.error('Verificação de contraste interrompida; revisar configuração/registro privado.'); process.exitCode = 2; });
}

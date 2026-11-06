const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const { chromium } = require(repo + '/frontend/node_modules/playwright');
(async () => {
  const source = fs.readFileSync(repo + '/frontend/src/app/acessos/convites.component.ts', 'utf8');
  const styles = [...source.matchAll(/^\s*styles\s*:\s*`([^`]+)`/gm)];
  assert.equal(styles.length, 1, 'Estilo único do componente de convites obrigatório.');
  const css = styles[0][1];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 360, height: 800 },
      isMobile: true,
      hasTouch: true,
    });
    const email = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.example.invalid';
    await page.setContent(
      '<meta name="viewport" content="width=device-width, initial-scale=1"><style>' +
        fs.readFileSync(repo + '/frontend/src/styles.css', 'utf8') +
        css +
        '</style><main><section><section><article><h3>' +
        email +
        '</h3><button>Revogar convite de ' +
        email +
        '</button></article></section></section></main>',
    );
    const bounds = await page.evaluate(() => ({
      innerWidth,
      documento: document.documentElement.scrollWidth,
      botao: document.querySelector('button').getBoundingClientRect().right,
    }));
    console.log(JSON.stringify(bounds));
    assert.ok(
      bounds.documento <= page.viewportSize().width,
      'Botão de revogação ultrapassa viewport mobile',
    );
    await page.getByRole('button').focus();
    await page.keyboard.press('Enter');
    console.log('Layout isolado com CSS real aprovado; não substitui E2E Angular.');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

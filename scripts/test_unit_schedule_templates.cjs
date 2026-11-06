// Editor e integração Angular reais com transporte fictício; não é E2E da API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const { build } = require(repo + '/frontend/node_modules/esbuild');
const playwright = require(repo + '/frontend/node_modules/playwright');
const { expect } = require(repo + '/frontend/node_modules/@playwright/test');

(async () => {
  const built = await build({
    stdin: {
      contents: `
        import '@angular/compiler';
        import { signal } from '@angular/core';
        import { bootstrapApplication } from '@angular/platform-browser';
        import { UnidadesComponent } from './src/app/unidades/unidades.component';
        import { ApiFailure, SessaoService } from './src/app/identidade/sessao.service';
        const unidades = [
          { id: 'A', nome: 'Centro fictício', fuso: 'America/Sao_Paulo', ativa: true, versao: 3 },
          { id: 'B', nome: 'Bairro fictício', fuso: 'UTC', ativa: true, versao: 2 },
        ];
        const dados = {
          unidadeId: 'A',
          versao: 0,
          versaoUnidade: 4,
          fuso: 'UTC',
          canais: ['DELIVERY'],
          horarios: [{ canal: 'DELIVERY', diaSemana: 7, inicio: '22:00', fim: '02:00' }],
        };
        const requests = [];
        const blocked = [];
        const mock = {
          identidade: signal({ usuarioId: 'fixture', perfil: 'ADMINISTRADOR' }),
          api: async (url, method = 'GET', body) => {
            requests.push({ url, method, body: body && structuredClone(body) });
            if (url.endsWith('/auth/reautenticar')) {
              window.failure = 0;
              return;
            }
            if (!url.endsWith('/funcionamento')) return structuredClone(unidades);
            if (window.hold && method === 'PUT')
              await new Promise((resolve) => window.release = resolve);
            if (window.failure)
              throw new ApiFailure(
                window.failure,
                window.failure === 409 ? 'O funcionamento foi alterado por outra sessão.' : 'Operação recusada.',
                window.failure === 403 ? 'REAUTENTICACAO_NECESSARIA' : 'CONFLITO',
              );
            if (method === 'PUT') {
              if (body.versaoUnidade !== dados.versaoUnidade)
                throw new ApiFailure(409, 'O cadastro da unidade foi alterado. Recarregue antes de salvar.', 'CONFLITO');
              Object.assign(dados, structuredClone(body), { versao: dados.versao + 1 });
            }
            return structuredClone(dados);
          },
        };
        bootstrapApplication(UnidadesComponent, {
          providers: [{ provide: SessaoService, useValue: mock }],
        }).then((app) => {
          app.components[0].instance.bloqueio.subscribe((value) => blocked.push(value));
          window.fixture = { app, mock, dados, requests, blocked };
        });
      `,
      resolveDir: repo + '/frontend',
      sourcefile: 'unit-schedule-template-probe.ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
    logLevel: 'silent',
  });
  const name = process.env.RM_TEMPLATE_BROWSER || 'chromium';
  assert.ok(['chromium', 'firefox', 'webkit'].includes(name));
  const browser = await playwright[name].launch(
    name === 'webkit' && process.env.RM_WEBKIT_EXECUTABLE
      ? { executablePath: process.env.RM_WEBKIT_EXECUTABLE }
      : {},
  );
  const styles = fs.readFileSync(repo + '/frontend/src/styles.css', 'utf8');
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<style>' + styles + '</style><main><app-unidades></app-unidades></main>');
  });
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.addScriptTag({ content: built.outputFiles[0].text });
    await expect(
      page.getByRole('button', { name: 'Configurar horários e canais', exact: true }),
    ).toHaveCount(2);
    assert.equal(
      await page.evaluate(
        () =>
          window.fixture.requests.filter((request) => request.url.endsWith('/funcionamento'))
            .length,
      ),
      0,
    );
    const editor = page.locator('app-funcionamento-unidade').first();
    const outroEditor = page.locator('app-funcionamento-unidade').nth(1);
    const abrir = editor.getByRole('button', { name: 'Configurar horários e canais', exact: true });
    await abrir.focus();
    await page.keyboard.press('Enter');
    await expect(
      editor.getByRole('button', { name: 'Consultar funcionamento no servidor' }),
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(editor.getByRole('status')).toContainText('Funcionamento consultado no servidor');
    await expect(page.locator('#fuso-A')).toHaveValue('America/Sao_Paulo');
    await expect(editor.getByText('Horários no fuso UTC.', { exact: false })).toBeVisible();
    await expect(
      editor.getByText('Horários no fuso America/Sao_Paulo.', { exact: false }),
    ).toHaveCount(0);
    const horario = editor.getByRole('group', { name: 'Horário 1', exact: true });
    await expect(horario.getByLabel('Dia de início', { exact: true })).toHaveValue('7');
    await expect(horario.getByLabel('Canal', { exact: true })).toHaveValue('DELIVERY');
    await expect(
      horario.getByText('Este horário termina no dia seguinte ao selecionado.'),
    ).toBeVisible();

    // Alterações distintas do estado inicial detectam bindings/listeners obsoletos.
    await horario.getByLabel('Dia de início', { exact: true }).selectOption('6');
    await horario.getByLabel('Canal', { exact: true }).selectOption('MESA');
    await horario.getByLabel('Início (HH:mm)', { exact: true }).fill('23:00');
    await horario.getByLabel('Fim (HH:mm ou 24:00)', { exact: true }).fill('24:00');
    await editor.getByRole('checkbox', { name: 'Mesa', exact: true }).check();
    await editor.getByRole('checkbox', { name: 'Delivery', exact: true }).uncheck();
    await page.evaluate(() => (window.hold = true));
    const salvar = editor.getByRole('button', { name: 'Salvar funcionamento', exact: true });
    await salvar.click();
    await expect(salvar).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Recarregar unidades', exact: true }),
    ).toBeDisabled();
    await expect(
      outroEditor.getByRole('button', { name: 'Configurar horários e canais', exact: true }),
    ).toBeDisabled();
    assert.equal(await page.evaluate(() => window.fixture.blocked.at(-1)), true);
    assert.deepEqual(await page.evaluate(() => window.fixture.requests.at(-1).body), {
      versao: 0,
      versaoUnidade: 4,
      canais: ['MESA'],
      horarios: [{ canal: 'MESA', diaSemana: 6, inicio: '23:00', fim: '24:00' }],
    });
    await page.evaluate(() => {
      window.hold = false;
      window.release();
    });
    await expect(editor.getByRole('status')).toHaveText('Funcionamento salvo no servidor.');
    await expect(
      page.getByRole('button', { name: 'Recarregar unidades', exact: true }),
    ).toBeEnabled();
    assert.equal(await page.evaluate(() => window.fixture.blocked.at(-1)), false);

    // Conflito exige consulta; o formulário não repete a versão antiga.
    await page.evaluate(() => (window.failure = 409));
    await salvar.click();
    await expect(editor.getByRole('alert')).toBeFocused();
    await expect(salvar).toBeDisabled();
    await expect(horario.getByLabel('Início (HH:mm)', { exact: true })).toBeDisabled();
    await page.evaluate(() => {
      window.failure = 0;
      window.fixture.dados.versao = 9;
    });
    await editor
      .getByRole('button', { name: 'Consultar funcionamento no servidor', exact: true })
      .click();
    await expect(salvar).toBeEnabled();
    await expect(editor.getByText('Versão do funcionamento: 9.', { exact: true })).toBeVisible();

    // Cadastro/fuso mudam sem alterar a versão do funcionamento: também há conflito.
    await page.evaluate(() => {
      window.fixture.dados.versaoUnidade = 5;
      window.fixture.dados.fuso = 'America/Manaus';
    });
    await salvar.click();
    await expect(editor.getByRole('alert')).toContainText('O cadastro da unidade foi alterado.');
    await expect(salvar).toBeDisabled();
    await editor
      .getByRole('button', { name: 'Consultar funcionamento no servidor', exact: true })
      .click();
    await expect(salvar).toBeEnabled();
    await expect(
      editor.getByText('Horários no fuso America/Manaus.', { exact: false }),
    ).toBeVisible();
    await expect(page.locator('#fuso-A')).toHaveValue('America/Sao_Paulo');

    // A confirmação existente no pai libera o fluxo sem perder o rascunho.
    await horario.getByLabel('Fim (HH:mm ou 24:00)', { exact: true }).fill('01:00');
    await page.evaluate(() => (window.failure = 403));
    await salvar.click();
    await expect(editor.getByRole('alert')).toContainText('Confirme sua identidade');
    await expect(salvar).toBeEnabled();
    await page.getByLabel('Confirme sua senha', { exact: true }).fill('Senha fictícia');
    await page.getByRole('button', { name: 'Confirmar identidade', exact: true }).click();
    await expect(page.getByLabel('Confirme sua senha', { exact: true })).toHaveValue('');
    await expect(salvar).toBeEnabled();
    await salvar.click();
    await expect(editor.getByRole('status')).toHaveText('Funcionamento salvo no servidor.');
    assert.equal(await page.evaluate(() => window.fixture.requests.at(-1).body.versao), 9);
    assert.equal(await page.evaluate(() => window.fixture.requests.at(-1).body.versaoUnidade), 5);
    assert.equal(
      await page.evaluate(() => window.fixture.requests.at(-1).body.horarios[0].fim),
      '01:00',
    );

    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        (await page.evaluate(() => document.documentElement.scrollWidth)) <= width,
        'Editor excede viewport',
      );
      const box = await salvar.boundingBox();
      assert(box && box.height >= 48, 'Salvar precisa de alvo de toque de 48 px');
      const directory = process.env.RM_TEMPLATE_REPORT_DIR;
      if (directory) {
        assert(path.isAbsolute(directory) && !path.resolve(directory).startsWith(repo + path.sep));
        await editor.screenshot({
          path: path.join(directory, name + '-funcionamento-' + width + '.png'),
        });
      }
    }
    // Logout durante escrita elimina dados; a resposta tardia não restaura o editor.
    await page.evaluate(() => (window.hold = true));
    await salvar.click();
    await page.evaluate(() => window.fixture.mock.identidade.set(null));
    await expect(editor.locator('form')).toHaveCount(0);
    await expect(
      editor.getByRole('button', { name: 'Configurar horários e canais', exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      window.hold = false;
      window.release();
    });
    await expect(editor.getByRole('status')).toHaveCount(0);
    assert.deepEqual(
      await page.evaluate(() => [localStorage.length, sessionStorage.length]),
      [0, 0],
    );
    assert.deepEqual(errors, []);
    console.log(
      name +
        ': horários, bindings, bloqueio do pai, conflito, reautenticação, logout e layout aprovados; transporte fictício.',
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});

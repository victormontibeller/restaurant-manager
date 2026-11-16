// Probe de template Angular real; API em memória somente nesta unidade de UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
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
        import { provideRouter } from '@angular/router';
        import { AcessosComponent } from './src/app/acessos/acessos.component';
        import { ConvitesComponent } from './src/app/acessos/convites.component';
        import { UnidadesComponent } from './src/app/unidades/unidades.component';
        import { SessaoService } from './src/app/identidade/sessao.service';
        import { PlataformaComponent } from './src/app/plataforma/plataforma.component';
        import { PlataformaSessaoService } from './src/app/plataforma/plataforma-sessao.service';
        const roles = ['ADMINISTRADOR', 'GERENTE', 'ATENDIMENTO', 'CAIXA', 'COZINHA', 'EXPEDICAO'];
        const team = roles.map((perfil, i) => ({
          id: 'f' + i,
          email: 'p' + i + '@example.invalid',
          perfil,
          ativo: true,
          versao: 0,
          unidades: [],
        }));
        const units = Array.from({ length: 100 }, (_, i) => ({ id: 'u' + i, nome: 'Filial ' + i }));
        const writes = [];
        const invitations = [];
        const matrix = {
          versao: 0,
          acoes: [
            {
              codigo: 'UNIDADE_CONSULTAR',
              descricao: 'Consultar unidade',
              escopo: 'UNIDADE',
              dependencia: null,
            },
          ],
          perfis: Object.fromEntries(roles.slice(1).map((r) => [r, []])),
        };
        const mock = {
          identidade: () => ({ usuarioId: 'ficticio' }),
          api: async (path, method = 'GET', body) => {
            if (method !== 'GET') writes.push({ path, method, body: structuredClone(body) });
            if (path.endsWith('/auth/reautenticar') && window.confirmFailure)
              throw await SessaoService.prototype['erroComando'](
                new Response(
                  JSON.stringify({
                    codigo: window.confirmCode,
                    mensagem: 'Senha de confirmação inválida.',
                  }),
                  { status: window.confirmFailure },
                ),
              );
            if (path.includes('/configuracoes/acessos')) {
              if (window.failLoad) throw new Error('Falha fictícia de consulta.');
              if (method === 'PUT') {
                matrix.perfis[body.perfil] = [...body.acoes];
                matrix.versao++;
              }
              return structuredClone(matrix);
            }
            if (path.includes('/equipe/convites')) {
              if (method === 'POST' && path.endsWith('/revogar')) {
                const c = invitations.find((c) => path === '/api/v1/equipe/convites/' + c.id + '/revogar');
                if (!c) throw new Error('Convite fictício não encontrado.');
                c.estado = 'REVOGADO';
                return structuredClone(c);
              }
              if (method === 'POST') {
                const c = { ...body, estado: 'PENDENTE', expiraEm: '2026-11-13T00:15:00Z' };
                invitations.push(c);
                return structuredClone(c);
              }
              return structuredClone(invitations);
            }
            if (path.includes('/equipe')) {
              if (method === 'PUT') {
                const i = team.findIndex((f) => path.endsWith('/' + f.id));
                team[i] = { ...team[i], ...body, versao: body.versao + 1 };
                return structuredClone(team[i]);
              }
              return structuredClone(team);
            }
            if (path.includes('/operacao/unidades')) return structuredClone(units);
            return [];
          },
          atualizarIdentidade: async () => {},
        };
        const company = {
          id: '00000000-0000-0000-0000-000000000001',
          nome: 'Fictícia',
          estado: 'ATIVO',
          versao: 0,
          dominios: [],
        };
        const platform = {
          autenticado: signal(true),
          usuarioId: signal('ficticio'),
          restaurar: async () => {},
          empresas: async () => [company],
          empresa: async () => company,
          intencaoProvisionamento: () => '',
          reautenticar: async () => {
            if (window.confirmFailure)
              throw await PlataformaSessaoService.prototype['erro'](
                new Response(
                  JSON.stringify({
                    codigo: window.confirmCode,
                    mensagem: 'Senha de confirmação inválida.',
                  }),
                  { status: window.confirmFailure },
                ),
              );
          },
        };
        const bootstrapStartedAt = Date.now();
        const bootstrapPerformance = performance.now();
        console.info('RM_TEMPLATE_BOOTSTRAP ' + JSON.stringify({
          pagina: window.kind || 'acessos', fase: 'inicio', instante: new Date().toISOString(),
        }));
        bootstrapApplication(
          window.kind === 'plataforma'
            ? PlataformaComponent
            : window.kind === 'convites'
              ? ConvitesComponent
              : window.kind === 'unidades'
                ? UnidadesComponent
                : AcessosComponent,
          {
            providers: [
              provideRouter([]),
              { provide: SessaoService, useValue: mock },
              { provide: PlataformaSessaoService, useValue: platform },
            ],
          },
        ).then((app) => {
          window.fixture = { appRef: app, app: app.components[0], team, roles, writes };
          console.info('RM_TEMPLATE_BOOTSTRAP ' + JSON.stringify({
            pagina: window.kind || 'acessos', fase: 'concluido',
            duracaoMs: Date.now() - bootstrapStartedAt,
            duracaoMonotonicaMs: Math.round(performance.now() - bootstrapPerformance),
          }));
        });
      `,
      resolveDir: repo + '/frontend',
      sourcefile: 'profile-template-probe.ts',
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
  const styles =
    fs.readFileSync(repo + '/frontend/src/styles.css', 'utf8') +
    fs.readFileSync(repo + '/frontend/src/app/ui/gestao.css', 'utf8');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      '<style>' +
        styles +
        '</style><main class="gestao-compacta"><section>' +
        (req.url === '/plataforma'
          ? '<app-plataforma></app-plataforma>'
          : req.url === '/convites'
            ? '<app-convites></app-convites>'
            : req.url === '/unidades'
              ? '<app-unidades></app-unidades>'
              : '<app-acessos></app-acessos>') +
        '</section></main>',
    );
  });
  const errors = [];
  const consoleErrors = [];
  const observePage = (target) => {
    target.on('pageerror', (error) =>
      errors.push({ url: target.url(), erro: error.stack || error.message }),
    );
    target.on('console', (message) => {
      if (message.type() === 'error')
        consoleErrors.push({ url: target.url(), erro: message.text() });
      if (message.text().startsWith('RM_TEMPLATE_BOOTSTRAP ')) console.log(message.text());
    });
  };
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    observePage(page);
    // Valores iguais não provam que o @for atualizou o objeto do listener.
    // Esperar a view sem repetir mutação nem forçar detecção de mudanças.
    const stable = async (target) => {
      await target.waitForFunction(() => window.fixture && !window.fixture.app.instance.ocupado());
      await target.evaluate(() => window.fixture.appRef.whenStable());
    };
    const capture = async (label, target) => {
      const directory = process.env.RM_TEMPLATE_REPORT_DIR;
      if (!directory) return;
      assert(path.isAbsolute(directory) && !path.resolve(directory).startsWith(repo + path.sep));
      await target.screenshot({ path: path.join(directory, name + '-' + label + '.png') });
    };
    await page.goto(origin);
    await page.addScriptTag({ content: built.outputFiles[0].text });
    await page.waitForFunction(
      () => window.fixture && document.querySelectorAll('article').length === 6,
    );
    await stable(page);
    const checkConfirmation = async (target, label, button) => {
      const confirmation = target.getByLabel(label, { exact: true });
      for (const [status, code, invalid] of [
        [422, 'CONFIRMACAO_INVALIDA', true],
        [422, 'OUTRO_ERRO', false],
        [429, 'CONFIRMACAO_INVALIDA', false],
        [503, 'CONFIRMACAO_INVALIDA', false],
      ]) {
        await confirmation.fill('Senha fictícia');
        await target.evaluate(
          ({ status, code }) => {
            window.confirmFailure = status;
            window.confirmCode = code;
          },
          { status, code },
        );
        await target.getByRole('button', { name: button, exact: true }).click();
        await stable(target);
        await expect(target.getByRole('alert')).toBeFocused();
        await expect(confirmation).toHaveValue('');
        if (invalid) {
          await expect(confirmation).toHaveAttribute('aria-invalid', 'true');
          await expect(confirmation).toHaveAccessibleDescription('Senha de confirmação inválida.');
        } else {
          await expect(confirmation).not.toHaveAttribute('aria-invalid', 'true');
          await expect(confirmation).not.toHaveAttribute('aria-describedby');
        }
      }
      await target.evaluate(() => (window.confirmFailure = 0));
      await confirmation.fill('Senha fictícia');
      await target.getByRole('button', { name: button, exact: true }).click();
      await stable(target);
      await expect(target.getByRole('alert')).toHaveCount(0);
      await expect(confirmation).not.toHaveAttribute('aria-invalid', 'true');
    };
    await checkConfirmation(page, 'Confirme sua senha', 'Confirmar identidade');
    // A lista mostra só o resumo; os controles são montados no editor aberto.
    const roles = ['ADMINISTRADOR', 'GERENTE', 'ATENDIMENTO', 'CAIXA', 'COZINHA', 'EXPEDICAO'];
    const cards = page.locator('article');
    const kitchenCard = cards.nth(4);
    const editEmployee = kitchenCard.getByRole('button', {
      name: 'Editar funcionário',
      exact: true,
    });
    const editUnits = kitchenCard.getByRole('button', {
      name: 'Editar unidades atribuídas',
      exact: true,
    });
    const saveEmployee = kitchenCard.getByRole('button', {
      name: 'Salvar funcionário',
      exact: true,
    });
    const employeeRole = kitchenCard.getByLabel('Perfil do funcionário');
    const matrix = page.getByRole('button', { name: 'Matriz de permissões', exact: true });
    const reload = page.getByRole('button', { name: 'Recarregar acessos' });
    const assertRoles = async () => {
      await expect(cards).toHaveCount(roles.length);
      for (const [index, role] of roles.entries()) {
        await expect(cards.nth(index)).toContainText(role);
        await cards
          .nth(index)
          .getByRole('button', { name: 'Editar funcionário', exact: true })
          .click();
        await expect(cards.nth(index).getByLabel('Perfil do funcionário')).toHaveValue(role);
        await cards.nth(index).getByRole('button', { name: 'Cancelar', exact: true }).click();
      }
    };
    await assertRoles();
    await expect(page.locator('article input[type=checkbox]')).toHaveCount(0);
    await editEmployee.click();
    await expect(kitchenCard.getByRole('heading', { name: 'Editar funcionário' })).toBeFocused();
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        (await page.evaluate(() => document.documentElement.scrollWidth)) <= width,
        'Lista excede viewport',
      );
      const edit = await editUnits.boundingBox();
      const save = await saveEmployee.boundingBox();
      const altura = (box) =>
        box &&
        (width <= 768
          ? Math.round(box.height) >= 48
          : Math.round(box.height) >= 36 && Math.round(box.height) <= 40);
      assert(
        altura(edit) && altura(save) && save.y >= edit.y + edit.height + 7,
        `Ações devem ter altura adequada e separação visível a ${width}px: ${JSON.stringify({ edit, save })}`,
      );
      await capture('lista-' + width, page.locator('app-acessos'));
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await editUnits.focus();
    await page.keyboard.press('Enter');
    await expect(editUnits).toHaveAttribute('aria-expanded', 'true');
    await expect(editUnits).toBeFocused();
    await expect(page.locator('article fieldset')).toHaveCount(1);
    await expect(
      kitchenCard
        .getByRole('group', { name: 'Unidades atribuídas', exact: true })
        .getByRole('checkbox'),
    ).toHaveCount(100);
    assert(
      (await page.evaluate(() => document.documentElement.scrollWidth)) <= 360,
      'Editor excede viewport',
    );
    await capture('unidades-abertas-mobile', kitchenCard);
    await kitchenCard.getByLabel('Filial 0', { exact: true }).check();
    await editUnits.click();
    await expect(page.locator('article input[type=checkbox]')).toHaveCount(1);
    await editUnits.click();
    await expect(kitchenCard.getByLabel('Filial 0', { exact: true })).toBeChecked();
    await cards.nth(1).getByRole('button', { name: 'Editar funcionário', exact: true }).click();
    await expect(editUnits).toHaveCount(0);
    await expect(page.locator('article input[type=checkbox]')).toHaveCount(1);
    await editEmployee.click();
    await editUnits.click();
    await expect(kitchenCard.getByLabel('Filial 0', { exact: true })).not.toBeChecked();
    await page.evaluate(() => (window.failLoad = true));
    await reload.click();
    await stable(page);
    await expect(page.getByRole('alert')).toHaveText('Falha fictícia de consulta.');
    await expect(page.locator('article fieldset')).toHaveCount(1);
    await page.evaluate(() => (window.failLoad = false));
    await reload.click();
    await stable(page);
    await expect(page.locator('article fieldset')).toHaveCount(0);
    await matrix.click();
    await page.getByLabel('Perfil operacional').selectOption('COZINHA');
    await reload.click();
    await stable(page);
    await expect(page.getByLabel('Perfil operacional')).toHaveValue('COZINHA');
    await assertRoles();
    await editEmployee.click();
    await employeeRole.selectOption('GERENTE');
    await employeeRole.focus();
    assert.equal(
      await page.evaluate(() => window.fixture.app.instance.rascunhoFuncionario().perfil),
      'GERENTE',
    );
    assert.equal(
      await page.evaluate(() => window.fixture.app.instance.equipe()[4].perfil),
      'COZINHA',
    );
    await reload.click();
    await stable(page);
    await editEmployee.click();
    await expect(employeeRole).toHaveValue('COZINHA');
    await employeeRole.selectOption('EXPEDICAO');
    await editUnits.click();
    await kitchenCard.getByLabel('Filial 7', { exact: true }).check();
    await editUnits.click();
    await saveEmployee.click();
    await stable(page);
    await expect(editEmployee).toBeFocused();
    assert.deepEqual(await page.evaluate(() => window.fixture.writes.at(-1)), {
      path: '/api/v1/equipe/f4',
      method: 'PUT',
      body: { versao: 0, perfil: 'EXPEDICAO', ativo: true, unidades: ['u7'] },
    });
    await reload.click();
    await stable(page);
    await editEmployee.click();
    await expect(employeeRole).toHaveValue('EXPEDICAO');
    await editUnits.click();
    await expect(kitchenCard.getByLabel('Filial 7', { exact: true })).toBeChecked();
    await kitchenCard.getByLabel('Filial 7', { exact: true }).uncheck();
    await editUnits.click();
    await saveEmployee.click();
    await stable(page);
    assert.deepEqual(await page.evaluate(() => window.fixture.writes.at(-1)), {
      path: '/api/v1/equipe/f4',
      method: 'PUT',
      body: { versao: 1, perfil: 'EXPEDICAO', ativo: true, unidades: [] },
    });
    await editEmployee.click();
    await editUnits.click();
    await kitchenCard.getByLabel('Filial 7', { exact: true }).check();
    await employeeRole.selectOption('ADMINISTRADOR');
    await expect(page.locator('article fieldset')).toHaveCount(0);
    assert.deepEqual(
      await page.evaluate(() => window.fixture.app.instance.rascunhoFuncionario().unidades),
      [],
    );
    await employeeRole.selectOption('EXPEDICAO');
    await expect(editUnits).toHaveAttribute('aria-expanded', 'false');
    await editUnits.click();
    await expect(kitchenCard.getByLabel('Filial 7', { exact: true })).not.toBeChecked();
    await editUnits.click();
    await matrix.click();
    await page.getByLabel('Consultar unidade', { exact: true }).check();
    await page.getByRole('button', { name: 'Salvar permissões' }).click();
    await stable(page);
    assert.deepEqual(await page.evaluate(() => window.fixture.writes.at(-1)), {
      path: '/api/v1/configuracoes/acessos',
      method: 'PUT',
      body: { versao: 0, perfil: 'COZINHA', acoes: ['UNIDADE_CONSULTAR'] },
    });
    await reload.click();
    await stable(page);
    await expect(page.getByLabel('Perfil operacional')).toHaveValue('COZINHA');
    await expect(page.getByLabel('Consultar unidade', { exact: true })).toBeChecked();
    const invitation = await browser.newPage({
      viewport: { width: 360, height: 800 },
      hasTouch: true,
    });
    observePage(invitation);
    await invitation.goto(origin + '/convites');
    await invitation.evaluate(() => (window.kind = 'convites'));
    await invitation.addScriptTag({ content: built.outputFiles[0].text });
    await invitation.waitForFunction(
      () => window.fixture && window.fixture.app.instance.carregado(),
    );
    await stable(invitation);
    await checkConfirmation(
      invitation,
      'Confirme sua senha para convidar',
      'Confirmar identidade para convites',
    );
    await invitation.getByRole('button', { name: 'Novo convite', exact: true }).click();
    await invitation.getByLabel('Perfil do convite').selectOption('GERENTE');
    await invitation.evaluate(() =>
      window.fixture.app.instance.pendente.set({
        id: 'fixture',
        email: 'convite@example.invalid',
        perfil: 'GERENTE',
        unidades: [],
        incerta: true,
      }),
    );
    await invitation.getByRole('button', { name: 'Reenviar mesma intenção' }).waitFor();
    await stable(invitation);
    await invitation.evaluate(() => window.fixture.app.instance.pendente.set(null));
    await invitation.getByLabel('Perfil do convite').waitFor();
    await stable(invitation);
    await expect(
      invitation.getByLabel('Perfil do convite'),
      'Formulário recriado deve preservar perfil visível',
    ).toHaveValue('GERENTE');
    const longEmail = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.example.invalid';
    await invitation.getByLabel('E-mail do funcionário convidado').fill(longEmail);
    await invitation.getByRole('button', { name: 'Criar convite', exact: true }).click();
    await invitation.waitForFunction(() =>
      window.fixture.writes.some(
        (w) => w.method === 'POST' && w.path === '/api/v1/equipe/convites',
      ),
    );
    await stable(invitation);
    const created = await invitation.evaluate(() => window.fixture.writes.at(-1));
    assert.equal(created.method, 'POST');
    assert.equal(created.path, '/api/v1/equipe/convites');
    assert.equal(created.body.perfil, 'GERENTE');
    assert.equal(created.body.email, longEmail);
    assert.deepEqual(created.body.unidades, []);
    await invitation.getByRole('button', { name: 'Recarregar convites' }).click();
    await stable(invitation);
    await expect(invitation.locator('article')).toContainText('GERENTE');
    await expect(invitation.getByRole('heading', { name: longEmail, exact: true })).toBeVisible();
    const revokeInvitation = invitation.getByRole('button', {
      name: 'Revogar convite de ' + longEmail,
      exact: true,
    });
    await expect(revokeInvitation).toBeVisible();
    assert(
      (await invitation.evaluate(() => document.documentElement.scrollWidth)) <= 360,
      'Convite com e-mail longo excede viewport mobile',
    );
    await revokeInvitation.focus();
    await expect(revokeInvitation).toBeFocused();
    await invitation.keyboard.press('Enter');
    await stable(invitation);
    assert.deepEqual(await invitation.evaluate(() => window.fixture.writes.at(-1)), {
      path: '/api/v1/equipe/convites/' + created.body.id + '/revogar',
      method: 'POST',
      body: {},
    });
    await expect(invitation.locator('article')).toContainText('REVOGADO');
    await expect(revokeInvitation).toHaveCount(0);
    // Logout/401 remove a tela, mas não pode remover o aviso da intenção em memória.
    const exitGuard = await invitation.evaluate(() => {
      const pending = window.fixture.app.instance.pendente;
      pending.set({
        id: 'incerto',
        email: 'convite@example.invalid',
        perfil: 'GERENTE',
        unidades: [],
        incerta: true,
      });
      window.fixture.app.destroy();
      const before = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(before);
      pending.set(null);
      const after = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(after);
      return { pending: before.defaultPrevented, reconciled: after.defaultPrevented };
    });
    assert.deepEqual(
      exitGuard,
      { pending: true, reconciled: false },
      'Destruir a tela mantém o aviso até reconciliar o convite',
    );
    const platform = await browser.newPage({ viewport: { width: 360, height: 800 } });
    observePage(platform);
    await platform.goto(origin + '/plataforma');
    await platform.evaluate(() => (window.kind = 'plataforma'));
    await platform.addScriptTag({ content: built.outputFiles[0].text });
    await stable(platform);
    await platform
      .getByLabel('Identificador da empresa', { exact: true })
      .fill('00000000-0000-0000-0000-000000000001');
    await platform.getByRole('button', { name: 'Consultar estado comercial', exact: true }).click();
    await stable(platform);
    await checkConfirmation(platform, 'Senha de confirmação do operador', 'Confirmar senha SaaS');
    await checkConfirmation(
      platform,
      'Senha do operador para provisionamento',
      'Confirmar acesso ao provisionamento',
    );
    const unitsPage = await browser.newPage({ viewport: { width: 360, height: 800 } });
    observePage(unitsPage);
    await unitsPage.goto(origin + '/unidades');
    await unitsPage.evaluate(() => (window.kind = 'unidades'));
    await unitsPage.addScriptTag({ content: built.outputFiles[0].text });
    await stable(unitsPage);
    await checkConfirmation(unitsPage, 'Confirme sua senha', 'Confirmar identidade');
    assert.deepEqual(errors, []);
    console.log(
      'Perfis, recarga, payloads, convite com e-mail longo no mobile, revogação por teclado, leitura posterior, reautenticação de unidades e intenção após destruir a tela coerentes. API fictícia: não é E2E.',
    );
  } catch (error) {
    console.error(
      JSON.stringify({ browser: name, errosJavaScript: errors, errosConsole: consoleErrors }),
    );
    throw error;
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});

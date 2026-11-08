// Componentes/templates e leitor SSE reais; somente o transporte é fictício.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const { build } = require(repo + '/frontend/node_modules/esbuild');
const playwright = require(repo + '/frontend/node_modules/playwright');
const { expect } = require(repo + '/frontend/node_modules/@playwright/test');
const ts = require(repo + '/frontend/node_modules/typescript');

(async () => {
  const { angularJitApplicationTransform } = await import(
    repo + '/frontend/node_modules/@angular/compiler-cli/bundles/index.js'
  );
  const program = ts.createProgram(
    [
      repo + '/frontend/src/app/mesas/mesas.component.ts',
      repo + '/frontend/src/app/pedidos/confirmar-pedido.component.ts',
    ],
    {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      experimentalDecorators: true,
    },
  );
  const built = await build({
    stdin: {
      contents: `
        import '@angular/compiler';
        import { Component, signal, ViewChild } from '@angular/core';
        import { bootstrapApplication } from '@angular/platform-browser';
        import { MesasComponent } from './src/app/mesas/mesas.component';
        import { ConfirmarPedidoComponent } from './src/app/pedidos/confirmar-pedido.component';
        import { ApiFailure, SessaoService } from './src/app/identidade/sessao.service';
        import { SessaoMesaService } from './src/app/mesas/sessao-mesa.service';
        import { CarrinhoService } from './src/app/carrinho/carrinho.service';
        import { PedidoEnvioService } from './src/app/pedidos/pedido-envio.service';
        const requests = [];
        const contexto = signal({ unidadeId: 'A', canal: 'MESA' });
        const incerta = signal(false);
        let fluxo;
        let cursor = 0;
        const acoes = ['mesa.atender', 'pedido.criar_assistido'];
        const estado = { hold: false, held: false, release: () => {}, eventCount: 0 };
        const mock = {
          identidade: signal({ usuarioId: 'ficticio', perfil: 'ADMINISTRADOR' }),
          api: async (rota, metodo) => {
            const url = new URL(rota, location.origin);
            requests.push({ rota: url.pathname, pagina: Number(url.searchParams.get('pagina')), unidade: url.searchParams.get('unidadeId') });
            if (url.pathname === '/api/v1/acessos/efetivos') return { acoes };
            if (url.pathname === '/api/v1/eventos') return { eventos: [], proximo: String(cursor), temMais: false };
            if (url.pathname === '/api/v1/operacao/mesas' && metodo === 'POST')
              throw new ApiFailure(409, 'Já existe uma mesa com esse nome nesta unidade.');
            if (url.pathname === '/api/v1/operacao/mesas' && estado.hold) {
              estado.hold = false; estado.held = true;
              await new Promise((resolve) => estado.release = () => { estado.held = false; resolve(); });
            }
            const pagina = Number(url.searchParams.get('pagina'));
            const unidade = url.searchParams.get('unidadeId');
            if (url.pathname === '/api/v1/operacao/mesas') return pagina >= 3 ? [] : Array.from({ length: 50 }, (_, i) => ({
              id: unidade + '-' + (pagina * 50 + i), unidadeId: unidade, nome: 'Mesa ' + unidade + ' ' + (pagina * 50 + i),
              ativa: true, versao: 0, atendimentoId: 'atendimento', atendimentoVersao: 0,
              comandaId: 'comanda-' + unidade + '-' + (pagina * 50 + i), estadoComanda: 'ABERTA',
            }));
            if (url.pathname === '/api/v1/operacao/mesas/solicitacoes') return pagina >= 3 ? [] : Array.from({ length: 50 }, (_, i) => ({
              id: 's-' + (pagina * 50 + i), mesaNome: 'Mesa fictícia', tipo: 'AJUDA', estado: 'ATENDIDA', versao: 1,
            }));
            throw new Error('Rota inesperada no transporte fictício.');
          },
          abrirFluxo: async (_rota, abort) => new Response(new ReadableStream({
            start(controller) { fluxo = controller; abort.addEventListener('abort', () => controller.close(), { once: true }); },
          }), { headers: { 'Content-Type': 'text/event-stream' } }),
        };
        @Component({ selector: 'app-probe', imports: [MesasComponent, ConfirmarPedidoComponent],
          template: '<section><app-mesas [unidadeId]="unidade()" [acoes]="acoes" [administrador]="true"/><app-confirmar-pedido/></section>',
        })
        class Probe {
          unidade = signal('A');
          acoes = ['mesa.atender'];
          static propDecorators = {
            mesasComponente: [{ type: ViewChild, args: [MesasComponent] }],
            assistidoComponente: [{ type: ViewChild, args: [ConfirmarPedidoComponent] }],
          };
          mesasComponente;
          assistidoComponente;
          mesas() { return this.mesasComponente; }
          assistido() { return this.assistidoComponente; }
        }
        bootstrapApplication(Probe, { providers: [
          { provide: SessaoService, useValue: mock },
          { provide: SessaoMesaService, useValue: { participante: () => null } },
          { provide: CarrinhoService, useValue: { contexto, confirmado: () => true, resumo: () => ({ unidadeId: contexto().unidadeId, canal: 'MESA' }), online: () => true } },
          { provide: PedidoEnvioService, useFactory: () => {
            const envio = new PedidoEnvioService();
            const pendente = envio.pendente.bind(envio);
            envio.pendente = (mesa) => incerta() ? { corpo: {} } : pendente(mesa);
            return envio;
          } },
        ] }).then((app) => {
          window.fixture = { app, host: app.components[0].instance, estado, requests, contexto, incerta,
            evento() { estado.eventCount++; cursor++; fluxo.enqueue(new TextEncoder().encode('event: atualizacao\\ndata: ' + JSON.stringify({ eventos: [{ id: String(cursor), tipo: 'MESA_AJUDA' }], proximo: String(cursor), temMais: false }) + '\\n\\n')); },
          };
        });
      `,
      resolveDir: repo + '/frontend',
      sourcefile: 'mesa-navigation-template-probe.ts',
    },
    // O JIT recebe o conteúdo dos arquivos reais, sem uma cópia do template no teste.
    plugins: [
      {
        name: 'angular-external-resources',
        setup(plugin) {
          plugin.onLoad(
            { filter: /(?:mesas|confirmar-pedido)\.component\.ts$/ },
            ({ path: file }) => {
              let source = '';
              program.emit(
                program.getSourceFile(file),
                (name, text) => {
                  if (name.endsWith('.js')) source = text;
                },
                undefined,
                false,
                { before: [angularJitApplicationTransform(program)] },
              );
              assert(source, 'O compilador Angular deve emitir os inputs de sinal reais.');
              source = source.replace(
                /templateUrl:\s*'([^']+)'/,
                (_, relative) =>
                  'template: ' +
                  JSON.stringify(
                    fs.readFileSync(path.resolve(path.dirname(file), relative), 'utf8'),
                  ),
              );
              source = source.replace(
                /styleUrls:\s*\[([^\]]+)\]/,
                (_, list) =>
                  'styles: ' +
                  JSON.stringify(
                    [...list.matchAll(/'([^']+)'/g)].map((match) =>
                      fs.readFileSync(path.resolve(path.dirname(file), match[1]), 'utf8'),
                    ),
                  ),
              );
              source = source.replace(
                /styleUrl:\s*'([^']+)'/,
                (_, relative) =>
                  'styles: ' +
                  JSON.stringify([
                    fs.readFileSync(path.resolve(path.dirname(file), relative), 'utf8'),
                  ]),
              );
              return { contents: source, loader: 'js' };
            },
          );
        },
      },
    ],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
    logLevel: 'silent',
  });
  const name = process.env.RM_TEMPLATE_BROWSER || 'chromium';
  assert(['chromium', 'firefox', 'webkit'].includes(name));
  const browser = await playwright[name].launch(
    name === 'webkit' && process.env.RM_WEBKIT_EXECUTABLE
      ? { executablePath: process.env.RM_WEBKIT_EXECUTABLE }
      : {},
  );
  const styles = fs.readFileSync(repo + '/frontend/src/styles.css', 'utf8');
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<style>' + styles + '</style><main><app-probe></app-probe></main>');
  });
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.addScriptTag({ content: built.outputFiles[0].text });
    try {
      await page.waitForFunction(
        () =>
          window.fixture?.host.mesas() &&
          window.fixture.host.assistido() &&
          !window.fixture.host.mesas().carregando() &&
          !window.fixture.host.assistido().carregandoMesas() &&
          window.fixture.host.mesas().acompanhamento.estado().includes('tempo real conectado'),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          errors,
          consoleErrors,
          montagem: await page.evaluate(() => ({
            fixture: !!window.fixture,
            mesas: !!window.fixture?.host.mesas(),
            assistido: !!window.fixture?.host.assistido(),
            tags: document.querySelectorAll('app-mesas').length,
            headings: [...document.querySelectorAll('h3')].map((item) => item.textContent),
          })),
        }),
      );
      throw error;
    }
    const mesas = page.locator('app-mesas');
    const assistido = page.locator('app-confirmar-pedido');
    const paginaMesas = mesas.getByRole('navigation', { name: 'Páginas de mesas', exact: true });
    const paginaSolicitacoes = mesas.getByRole('navigation', {
      name: 'Páginas de solicitações',
      exact: true,
    });
    const paginaAssistido = assistido.getByRole('navigation', {
      name: 'Páginas de mesas para pedido assistido',
      exact: true,
    });
    const atualizar = mesas.getByRole('button', { name: 'Atualizar mesas', exact: true });
    const cadastro = mesas.locator('details');
    const summary = cadastro.locator('summary');
    const estadoVisivel = mesas.getByRole('status').first().locator('span:not([aria-hidden])');
    const medidas = () =>
      page.evaluate(() => {
        const seletores = [
          'app-mesas summary',
          'app-mesas .barra-conexao > button',
          'app-mesas nav[aria-label="Páginas de mesas"]',
          'app-mesas nav[aria-label="Páginas de solicitações"]',
          '#comanda-pedido-assistido',
          '#observacao-pedido',
          'app-confirmar-pedido > section > button',
        ];
        return seletores.map((seletor) => {
          const elemento = document.querySelector(seletor);
          const caixa = elemento.getBoundingClientRect();
          return {
            seletor,
            x: caixa.x + scrollX,
            y: caixa.y + scrollY,
            width: caixa.width,
            height: caixa.height,
          };
        });
      });
    const mesmaGeometria = (antes, depois, contexto) => {
      for (let i = 0; i < antes.length; i++)
        for (const dimensao of ['x', 'y', 'width', 'height'])
          assert(
            Math.abs(antes[i][dimensao] - depois[i][dimensao]) < 0.5,
            `${contexto}: ${antes[i].seletor} ${dimensao} mudou de ${antes[i][dimensao]} para ${depois[i][dimensao]}`,
          );
    };
    const soltar = async () => {
      await page.evaluate(() => window.fixture.estado.release());
      await page.waitForFunction(
        () =>
          !window.fixture.host.mesas().carregando() &&
          !window.fixture.host.assistido().carregandoMesas(),
      );
      await expect(mesas.locator('section').first()).toHaveAttribute('aria-busy', 'false');
      await expect(assistido.locator('section').first()).toHaveAttribute('aria-busy', 'false');
    };
    const focoDuranteSse = async (controle, ativar) => {
      await controle.focus();
      await expect(controle).toBeFocused();
      await page.evaluate(() => {
        window.fixture.estado.hold = true;
        window.fixture.evento();
      });
      await page.waitForFunction(() => window.fixture.estado.held);
      try {
        await expect(mesas.locator('section').first()).toHaveAttribute('aria-busy', 'true');
        await expect(controle).toBeFocused();
        await page.keyboard.press('Tab');
        await controle.focus();
        await expect(controle).toBeFocused();
        await expect(controle).toBeEnabled();
        if (ativar) await page.keyboard.press('Enter');
      } finally {
        await soltar();
      }
      await expect(controle).toBeFocused();
    };
    await expect(
      paginaMesas.getByRole('button', { name: 'Mesas anteriores', exact: true }),
    ).toBeDisabled();
    await expect(
      paginaSolicitacoes.getByRole('button', { name: 'Solicitações anteriores', exact: true }),
    ).toBeDisabled();
    await expect(
      paginaAssistido.getByRole('button', {
        name: 'Mesas anteriores para pedido assistido',
        exact: true,
      }),
    ).toBeDisabled();

    // Todos os textos reais de conexão, com fonte ampliada e quebra natural.
    const acompanhamentoFonte = fs.readFileSync(
      repo + '/frontend/src/app/eventos/acompanhamento.ts',
      'utf8',
    );
    const estados = [
      'Acompanhamento não iniciado.',
      ...new Set(
        [...acompanhamentoFonte.matchAll(/this\.estado\.set\(\s*'([^']+)'/g)].map(
          (match) => match[1],
        ),
      ),
    ];
    const estadoOriginal = await page.evaluate(() => ({
      estado: window.fixture.host.mesas().acompanhamento.estado(),
      horario: window.fixture.host.mesas().acompanhamento.atualizadoEm(),
    }));
    for (const largura of [360, 768, 1280]) {
      await page.setViewportSize({ width: largura, height: 800 });
      for (const fonte of [16, 20]) {
        await page.evaluate((tamanho) => {
          document.documentElement.style.fontSize = tamanho + 'px';
        }, fonte);
        const antes = await medidas();
        for (const estado of estados) {
          for (const horario of ['', '00:00:00', '11:11:11', '23:59:59']) {
            await page.evaluate(
              ({ estado, horario }) => {
                window.fixture.host.mesas().acompanhamento.estado.set(estado);
                window.fixture.host.mesas().acompanhamento.atualizadoEm.set(horario);
              },
              { estado, horario },
            );
            await expect(estadoVisivel).toContainText(estado);
            await expect(estadoVisivel).toContainText(horario || 'ainda não confirmada');
            mesmaGeometria(antes, await medidas(), `${largura}px/fonte${fonte}: ${estado}`);
          }
        }
      }
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await page.evaluate(({ estado, horario }) => {
      document.documentElement.style.fontSize = '16px';
      window.fixture.host.mesas().acompanhamento.estado.set(estado);
      window.fixture.host.mesas().acompanhamento.atualizadoEm.set(horario);
    }, estadoOriginal);
    await expect(estadoVisivel).toContainText(estadoOriginal.estado);
    await summary.scrollIntoViewIfNeeded();
    const antesSse = await medidas();
    const ponto = await summary.boundingBox();
    await page.evaluate(() => {
      window.fixture.estado.hold = true;
      window.fixture.evento();
    });
    await page.waitForFunction(() => window.fixture.estado.held);
    await expect(mesas.locator('section').first()).toHaveAttribute('aria-busy', 'true');
    let ponteiroPressionado = false;
    try {
      mesmaGeometria(antesSse, await medidas(), 'SSE em andamento');
      // Um único clique, com a resposta real do componente liberada entre down/up.
      await page.mouse.move(ponto.x + ponto.width / 2, ponto.y + ponto.height / 2);
      await page.mouse.down();
      ponteiroPressionado = true;
      await soltar();
      mesmaGeometria(antesSse, await medidas(), 'SSE concluído antes do mouseup');
      await page.mouse.up();
      ponteiroPressionado = false;
      await expect(cadastro).toHaveAttribute('open', '');
      await expect(cadastro.getByLabel('Nome da mesa', { exact: true })).toBeVisible();
    } finally {
      await soltar();
      if (ponteiroPressionado) await page.mouse.up();
    }
    await focoDuranteSse(atualizar, true);
    await focoDuranteSse(
      paginaMesas.getByRole('button', { name: 'Próximas mesas', exact: true }),
      true,
    );
    await expect(paginaMesas.getByRole('status')).toHaveText('Página de mesas 2');
    await focoDuranteSse(
      paginaSolicitacoes.getByRole('button', { name: 'Próximas solicitações', exact: true }),
      true,
    );
    await expect(paginaSolicitacoes.getByRole('status')).toHaveText('Página de solicitações 2');
    await expect(paginaMesas.getByRole('status')).toHaveText('Página de mesas 2');

    const select = assistido.getByLabel('Comanda do pedido assistido', { exact: true });
    const enviar = assistido.getByRole('button', { name: 'Enviar pedido assistido', exact: true });
    await select.selectOption('comanda-A-0');
    await expect(enviar).toBeEnabled();
    await select.focus();
    const antesAssistido = await medidas();
    await page.evaluate(() => {
      window.fixture.estado.hold = true;
      void window.fixture.host.assistido().carregarMesas(0);
    });
    await page.waitForFunction(() => window.fixture.estado.held);
    try {
      await expect(select).toBeFocused();
      await expect(select).toBeEnabled();
      await expect(enviar).toBeDisabled();
      await expect(assistido.locator('section').first()).toHaveAttribute('aria-busy', 'true');
      mesmaGeometria(antesAssistido, await medidas(), 'Assistido durante a consulta');
    } finally {
      await soltar();
    }
    await expect(select).toBeFocused();
    await expect(enviar).toBeEnabled();
    mesmaGeometria(antesAssistido, await medidas(), 'Assistido após a consulta');
    const proxima = paginaAssistido.getByRole('button', {
      name: 'Próximas mesas para pedido assistido',
      exact: true,
    });
    await proxima.focus();
    await page.evaluate(() => {
      window.fixture.estado.hold = true;
      void window.fixture.host.assistido().carregarMesas(0);
    });
    await page.waitForFunction(() => window.fixture.estado.held);
    try {
      await expect(proxima).toBeEnabled();
      await expect(proxima).toBeFocused();
      await page.keyboard.press('Enter');
    } finally {
      await soltar();
    }
    await expect(paginaAssistido.getByRole('status')).toHaveText('Página de mesas 2');
    await expect(proxima).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
      paginaAssistido.getByRole('button', {
        name: 'Mesas anteriores para pedido assistido',
        exact: true,
      }),
    ).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(select).toBeFocused();
    await expect(select).toHaveValue('');
    await expect(enviar).toBeDisabled();
    await select.selectOption('comanda-A-50');
    await expect(enviar).toBeEnabled();
    await page.evaluate(() => window.fixture.incerta.set(true));
    await expect(select).toBeDisabled();
    await expect(proxima).toBeDisabled();
    await page.evaluate(() => window.fixture.incerta.set(false));
    await expect(proxima).toBeEnabled();

    await page.evaluate(() => {
      void window.fixture.host.mesas().mudarPaginaMesas(3);
      void window.fixture.host.mesas().mudarPaginaSolicitacoes(3);
      void window.fixture.host.assistido().carregarMesas(3);
    });
    await page.waitForFunction(
      () =>
        window.fixture.host.mesas().paginaMesas() === 3 &&
        window.fixture.host.mesas().paginaSolicitacoes() === 3 &&
        window.fixture.host.assistido().paginaMesas() === 3,
    );
    await expect(
      paginaMesas.getByRole('button', { name: 'Próximas mesas', exact: true }),
    ).toBeDisabled();
    await expect(
      paginaSolicitacoes.getByRole('button', { name: 'Próximas solicitações', exact: true }),
    ).toBeDisabled();
    await expect(proxima).toBeDisabled();
    const antesVazio = await medidas();
    await page.evaluate(() => {
      window.fixture.estado.hold = true;
      void window.fixture.host.assistido().carregarMesas(3);
    });
    await page.waitForFunction(() => window.fixture.estado.held);
    try {
      await expect(assistido.locator('section').first()).toHaveAttribute('aria-busy', 'true');
      await expect(assistido.locator('.status-consulta > span:not([aria-hidden])')).toContainText(
        'Atualizando mesas para o pedido assistido.',
      );
      mesmaGeometria(antesVazio, await medidas(), 'Assistido vazio durante a consulta');
    } finally {
      await soltar();
    }
    await expect(assistido.locator('.status-consulta > span:not([aria-hidden])')).toContainText(
      'Nenhuma comanda aberta nesta página.',
    );
    mesmaGeometria(antesVazio, await medidas(), 'Assistido vazio após a consulta');
    // O GET já em voo não pode apagar a rejeição de uma ação posterior.
    await cadastro.getByLabel('Nome da mesa', { exact: true }).fill('Mesa fictícia duplicada');
    await page.evaluate(() => {
      window.fixture.estado.hold = true;
      window.fixture.evento();
    });
    await page.waitForFunction(() => window.fixture.estado.held);
    await expect(mesas.locator('section').first()).toHaveAttribute('aria-busy', 'true');
    const rejeicao = 'Já existe uma mesa com esse nome nesta unidade.';
    try {
      await cadastro.getByRole('button', { name: 'Cadastrar mesa', exact: true }).click();
      await expect(mesas.getByRole('alert')).toContainText(rejeicao);
      await expect(cadastro.getByLabel('Nome da mesa', { exact: true })).toBeEnabled();
    } finally {
      await soltar();
    }
    await expect(mesas.getByRole('alert')).toContainText(rejeicao);
    await expect(cadastro.getByLabel('Nome da mesa', { exact: true })).toHaveValue(
      'Mesa fictícia duplicada',
    );
    assert.equal(await page.evaluate(() => window.fixture.estado.eventCount), 5);
    assert.deepEqual(errors, []);
    console.log(
      name +
        ': geometria estável em360/768/1280 e fontes16/20; clique único durante SSE, foco, filas, limites, envio bloqueado e rejeição409 preservada após snapshot aprovados. Transporte fictício/JIT.',
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});

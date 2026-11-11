// Componentes, templates e SSE reais; transporte em memória exclusivo deste probe.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const { build } = require(repo + '/frontend/node_modules/esbuild');
const playwright = require(repo + '/frontend/node_modules/playwright');
const { expect } = require(repo + '/frontend/node_modules/@playwright/test');
(async () => {
  const { angularJitApplicationTransform } = await import(
    repo + '/frontend/node_modules/@angular/compiler-cli/bundles/index.js'
  );
  const program = ts.createProgram(
    [
      repo + '/frontend/src/app/cozinha/cozinha.component.ts',
      repo + '/frontend/src/app/cozinha/cartao-cozinha.component.ts',
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
    import {Component, signal} from '@angular/core';
    import {bootstrapApplication} from '@angular/platform-browser';
    import {CozinhaComponent} from './src/app/cozinha/cozinha.component';
    import {SessaoService, ApiFailure} from './src/app/identidade/sessao.service';
    import {SessaoMesaService} from './src/app/mesas/sessao-mesa.service';
    const inicial = () => ({id: '12345678-0000-0000-0000-000000000001', unidadeId: 'A', canal: 'MESA', estado: 'NA_FILA', versao: 0,
      criadoEm: new Date().toISOString(), primeiroPreparoEm: null, observacao: 'Sem cebola', linhas: [{id: 'l',nome: 'Combo da Casa', tipo: 'COMBO',quantidade: 3, adicionais: [{nome: 'Queijo', quantidade: 1}],escolhas: [{grupo: 'Bebida', nome: 'Suco', quantidade: 1}]}],
      unidades: ['a','b','c'].map(id => ({id,linhaId: 'l',estado: 'NA_FILA'})), historico: [], solicitacoes: []});
    let pedido = inicial(); const writes = []; const replies = new Map(); let stream; let cursor = 0;
    let perda = false; let conflito = false;
    const painel = () => {
      const grupo = () => ({itens: [],total: 0,mais: false});
      const dados = {fuso:'America/Sao_Paulo', consultadoEm:new Date().toISOString(),fila:grupo(),emPreparo:grupo(),prontos:grupo(),anteriores:grupo()};
      const chave = {NA_FILA:'fila',EM_PREPARO:'emPreparo',PRONTO:'prontos'}[pedido.estado];
      if (chave) dados[chave] = {itens:[{pedido:structuredClone(pedido),mesaNome:'Mesa 4',prontoEm:pedido.estado === 'PRONTO' ? new Date().toISOString() : null}],total:1,mais:false};
      return dados;
    };
    const mock = {
      identidade: () => ({usuarioId:'cozinheiro'}),
      api: async (route, method='GET', body) => {
        if(route.startsWith('/api/v1/eventos')) return {eventos:[],proximo:String(cursor),temMais:false};
        if(route.startsWith('/api/v1/cozinha/painel')) return painel();
        if(route.startsWith('/api/v1/operacao/pedidos/')) return structuredClone(pedido);
        if(method==='POST') {
          writes.push(structuredClone(body));
          if(replies.has(body.intencaoId)) return structuredClone(replies.get(body.intencaoId));
          if(conflito) {conflito=false; pedido.versao++; throw new ApiFailure(409,'Pedido alterado.');}
          if(body.versao!==pedido.versao) throw new ApiFailure(409,'Versão alterada.');
          const de = route.endsWith('/iniciar') ? 'NA_FILA' : 'EM_PREPARO';
          const para = de==='NA_FILA' ? 'EM_PREPARO' : 'PRONTO';
          if(body.unidades.some(id => pedido.unidades.find(u=>u.id===id)?.estado!==de)) throw new ApiFailure(409,'Estado alterado.');
          pedido.unidades.forEach(u=>{if(body.unidades.includes(u.id)){u.estado=para;if(de==='NA_FILA')u.iniciadoEm=new Date().toISOString();else u.concluidoEm=new Date().toISOString();}});
          pedido.primeiroPreparoEm ??= new Date().toISOString(); pedido.versao++;
          pedido.estado = pedido.unidades.every(u=>u.estado==='PRONTO') ? 'PRONTO' : 'EM_PREPARO';
          replies.set(body.intencaoId,structuredClone(pedido));
          if(perda){perda=false;throw new Error('Resposta perdida após confirmação.');}
          return structuredClone(pedido);
        }
        throw new Error('Rota não prevista: '+route);
      },
      abrirFluxo: async(_route, abort) => new Response(new ReadableStream({start(controller){stream=controller;abort.addEventListener('abort',()=>controller.close(),{once:true});}}),{headers:{'Content-Type':'text/event-stream'}}),
    };
    @Component({selector:'app-probe',imports:[CozinhaComponent],template:'<app-cozinha unidadeId="A" [acoes]="acoes()"/>'})
    class Probe {acoes=signal(['cozinha.iniciar','cozinha.concluir']);}
    bootstrapApplication(Probe,{providers:[{provide:SessaoService,useValue:mock},{provide:SessaoMesaService,useValue:{participante:()=>null}}]}).then((app)=>{
      window.fixture={writes,revogar:()=>app.components[0].instance.acoes.set([]),perder:()=>perda=true,conflitar:()=>conflito=true,reset:()=>{pedido=inicial();replies.clear();},emitir:()=>{cursor++;stream.enqueue(new TextEncoder().encode('data: '+JSON.stringify({eventos:[{id:String(cursor),tipo:'PEDIDO_ACEITO',pedidoId:pedido.id}],proximo:String(cursor),temMais:false})+'\\n\\n'));}};
    });
  `,
      resolveDir: repo + '/frontend',
      sourcefile: 'kitchen-probe.ts',
    },
    plugins: [
      {
        name: 'angular-resources',
        setup(plugin) {
          plugin.onLoad(
            { filter: /(?:cozinha|cartao-cozinha)\.component\.ts$/ },
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
              assert(source);
              source = source.replace(
                /templateUrl:\s*'([^']+)'/,
                (_, name) =>
                  'template: ' +
                  JSON.stringify(fs.readFileSync(path.resolve(path.dirname(file), name), 'utf8')),
              );
              source = source.replace(
                /styleUrl:\s*'([^']+)'/,
                (_, name) =>
                  'styles: ' +
                  JSON.stringify([fs.readFileSync(path.resolve(path.dirname(file), name), 'utf8')]),
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
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      '<style>body{margin:16px;font-family:Arial}*{box-sizing:border-box}</style><app-probe></app-probe><script>' +
        built.outputFiles[0].text +
        '</script>',
    );
  });
  const name = process.env.RM_TEMPLATE_BROWSER || 'chromium';
  const browser = await playwright[name].launch();
  const errors = [];
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    // Áudio é uma fronteira do navegador: simula hardware disponível/indisponível.
    await page.addInitScript(() => {
      window.audioMode = 'running';
      window.audioSignals = 0;
      window.AudioContext = class {
        state = 'suspended';
        currentTime = 0;
        destination = {};
        resume() {
          if (window.audioMode === 'hang') return new Promise(() => {});
          this.state = 'running';
          return Promise.resolve();
        }
        createGain() {
          return { gain: { value: 0 }, connect() {}, disconnect() {} };
        }
        createOscillator() {
          return {
            frequency: { value: 0 },
            connect() {},
            disconnect() {},
            start() {
              window.audioSignals++;
            },
            stop() {
              queueMicrotask(() => this.onended?.());
            },
          };
        }
        close() {
          this.state = 'closed';
          return Promise.resolve();
        }
      };
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    const card = page.getByRole('article');
    await expect(card.getByText('Mesa 4', { exact: true })).toBeVisible();
    await expect(card.getByText('Sem cebola', { exact: false })).toBeVisible();
    const pos = await page
      .locator('.coluna')
      .evaluateAll((nodes) => nodes.map((n) => Math.round(n.getBoundingClientRect().x)));
    assert(pos[0] < pos[1] && pos[1] < pos[2]);
    await card.getByRole('button', { name: 'Selecionar quantidades', exact: true }).click();
    await card.getByRole('checkbox').nth(0).check();
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    await expect(card.getByRole('checkbox').nth(0)).toBeChecked();
    await card.getByRole('button', { name: 'Iniciar selecionadas (1)', exact: true }).click();
    await expect(card).toHaveAttribute('data-estado', 'EM_PREPARO');
    await card.getByRole('button', { name: 'Concluir em preparo (1)', exact: true }).click();
    await expect(card).toHaveAttribute('data-estado', 'EM_PREPARO');
    assert.deepEqual(
      await page.evaluate(() => window.fixture.writes.map((w) => w.unidades.length)),
      [1, 1],
    );
    await card.getByRole('button', { name: 'Iniciar pedido (2)', exact: true }).click();
    await expect(
      card.getByRole('button', { name: 'Concluir em preparo (2)', exact: true }),
    ).toBeEnabled();
    await page.evaluate(() => window.fixture.perder());
    await card.getByRole('button', { name: 'Concluir em preparo (2)', exact: true }).click();
    await expect(card).toHaveAttribute('data-estado', 'PRONTO');
    const recover = page.getByRole('button', { name: 'Recuperar resultado da mesma ação' }).first();
    await expect(recover).toBeVisible();
    await recover.click();
    await expect(
      page.getByRole('button', { name: 'Recuperar resultado da mesma ação' }),
    ).toHaveCount(0);
    const commands = await page.evaluate(() => window.fixture.writes);
    assert.equal(commands.at(-1).intencaoId, commands.at(-2).intencaoId);
    assert.deepEqual(commands.at(-1), commands.at(-2));
    await page.evaluate(() => window.fixture.reset());
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    await expect(
      card.getByRole('button', { name: 'Iniciar pedido (3)', exact: true }),
    ).toBeVisible();
    await card.getByRole('button', { name: 'Selecionar quantidades', exact: true }).click();
    await card.getByRole('checkbox').nth(0).check();
    await page.evaluate(() => window.fixture.conflitar());
    await card.getByRole('button', { name: 'Iniciar selecionadas (1)', exact: true }).click();
    await expect(card.getByRole('alert')).toHaveText('Pedido alterado.');
    await expect(card.getByRole('checkbox').nth(0)).not.toBeChecked();
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (width === 360)
        assert(
          (await page.getByRole('combobox', { name: 'Canal', exact: true }).boundingBox()).width >=
            300,
        );
      if (width < 1024) {
        const tab = page.getByRole('tab', { name: 'Na fila (1)', exact: true });
        await expect(tab).toBeVisible();
        await tab.focus();
        await tab.press('ArrowRight');
        await page.keyboard.press('Enter');
        await expect(
          page.getByRole('tab', { name: 'Em preparo (0)', exact: true }),
        ).toHaveAttribute('aria-selected', 'true');
        const controls = await page
          .getByRole('tab', { name: 'Em preparo (0)', exact: true })
          .getAttribute('aria-controls');
        await expect(page.locator('#' + controls)).toBeVisible();
        await page.getByRole('tab', { name: 'Na fila (1)', exact: true }).click();
      }
    }
    await page.getByRole('button', { name: 'Ativar som', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Desativar som', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.evaluate(() => window.fixture.emitir());
    await expect(card.getByText('Novo', { exact: true })).toBeVisible();
    assert.equal(await page.evaluate(() => window.audioSignals), 1);
    await page.evaluate(() => window.fixture.emitir());
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.audioSignals),
      1,
      'Não repetir o som para o mesmo pedido.',
    );
    await page.getByRole('button', { name: 'Desativar som', exact: true }).click();
    await page.evaluate(() => {
      window.audioMode = 'hang';
    });
    await page.getByRole('button', { name: 'Ativar som', exact: true }).click();
    await expect(
      page.getByText('Áudio indisponível; os avisos visuais continuam ativos.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ativar som', exact: true })).toBeEnabled();
    await page.context().setOffline(true);
    await expect(
      card.getByRole('button', { name: 'Iniciar selecionadas (0)', exact: true }),
    ).toBeDisabled();
    await page.context().setOffline(false);
    await page.evaluate(() => window.fixture.revogar());
    await expect(card.getByRole('checkbox')).toHaveCount(0);
    await expect(
      card.getByRole('button', { name: /Iniciar|Concluir|Selecionar quantidades/ }),
    ).toHaveCount(0);
    await expect(card.getByText(/Unidade .*Na fila/)).toHaveCount(3);
    assert.deepEqual(errors, []);
    console.log(
      name +
        ': painel/ações parciais, seleção após atualização, conflito, recuperação idempotente, teclado, 360/768/1280 e aviso de entrada aprovados (API fictícia).',
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

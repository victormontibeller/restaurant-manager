// Lógica de UI com API fictícia; E2E real continua obrigatório.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (v) => Object.assign(() => v, { set: (x) => (v = x), update: (f) => (v = f(v)) });
class Failure extends Error {
  constructor(status) {
    super();
    this.status = status;
  }
}
async function component() {
  const destroy = {};
  const callbacks = [];
  const timers = [];
  const requests = [];
  let responder = async () => ({
    unidade: { id: 'A', nome: 'Atual no servidor', fuso: 'UTC', versao: '3' },
    eventos: [],
    proximo: '3',
    temMais: false,
  });
  const service = {
    identidade: () => ({ usuarioId: 'conta' }),
    api: async (url) => {
      if (url.includes('efetivos'))
        return { acoes: ['unidade.acompanhar'], unidades: [{ id: 'A', nome: 'A', fuso: 'UTC' }] };
      requests.push(url);
      return responder(url);
    },
  };
  const core = {
    Component: () => (c) => c,
    ViewChild: () => () => {},
    DestroyRef: destroy,
    signal,
    inject: (t) => (t === destroy ? { onDestroy: (cb) => callbacks.push(cb) } : service),
  };
  const blobs = [];
  const links = [];
  const revoked = [];
  const callbacksTimer = [];
  const context = {
    exports: {},
    Blob,
    URL: {
      createObjectURL: (blob) => {
        blobs.push(blob);
        return 'blob:fixture';
      },
      revokeObjectURL: (url) => revoked.push(url),
    },
    document: {
      createElement: () => {
        const link = {
          click() {
            this.clicked = true;
          },
          remove() {
            this.removed = true;
          },
        };
        links.push(link);
        return link;
      },
      body: { append: () => {} },
    },
    require: (n) => (n === '@angular/core' ? core : { ApiFailure: Failure }),
    setTimeout: (fn, ms) => {
      timers.push(ms);
      callbacksTimer.push(fn);
      return 1;
    },
    clearTimeout: () => {},
    console,
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(repo + '/frontend/src/app/unidades/eventos-unidade.component.ts', 'utf8'),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
          experimentalDecorators: true,
        },
      },
    ).outputText,
    context,
  );
  const c = new context.exports.EventosUnidadeComponent();
  await new Promise((r) => setImmediate(r));
  c.selecionada.set('A');
  c.atual.set({ id: 'A', nome: 'Valor antigo', fuso: 'UTC', versao: '1' });
  const originalDownload = c.baixar.bind(c);
  const files = [];
  c.baixar = (id, unidade) => files.push({ id, unidade });
  return {
    c,
    service,
    requests,
    files,
    timers,
    callbacks,
    originalDownload,
    blobs,
    links,
    revoked,
    callbacksTimer,
    setResponder: (fn) => (responder = fn),
  };
}
async function exportaSomenteLeituraAtualAutorizada() {
  const { c, requests, files } = await component();
  await c.exportar();
  assert.deepEqual(requests, ['/api/v1/operacao/unidades/A/eventos?depois=-1']);
  assert.equal(files.length, 1);
  assert.equal(files[0].unidade.nome, 'Atual no servidor');
  assert.equal(files[0].unidade.versao, '3');
  assert.equal(c.exportando(), false);
}
async function falhaOuRevogacaoNaoExportaCache() {
  for (const status of [0, 401, 403, 404]) {
    const { c, files, setResponder } = await component();
    setResponder(async () => {
      throw new Failure(status);
    });
    await c.exportar();
    assert.equal(files.length, 0);
    assert.equal(c.exportando(), false);
    assert.ok(c.erro());
    if (status) {
      assert.equal(c.atual(), null);
      assert.equal(c.selecionada(), '');
    }
  }
}
async function novaTentativaNaoMantemSucessoAnterior() {
  const { c, files, setResponder } = await component();
  await c.exportar();
  assert.equal(c.estado(), 'Arquivo cadastral solicitado ao navegador.');
  let reject;
  setResponder(() => new Promise((_, r) => (reject = r)));
  const pending = c.exportar();
  assert.equal(c.estado(), 'Consultando para exportar…');
  reject(new Failure(0));
  await pending;
  assert.equal(c.estado(), 'Exportação não concluída.');
  assert.ok(c.erro());
  assert.equal(files.length, 1);
  setResponder(async () => ({
    unidade: { id: 'A', nome: 'Recuperada', fuso: 'UTC', versao: '4' },
  }));
  await c.exportar();
  assert.equal(c.estado(), 'Arquivo cadastral solicitado ao navegador.');
  assert.equal(c.erro(), '');
  assert.equal(files.length, 2);
  assert.equal(files[1].unidade.versao, '4');
}
async function respostaAntigaNaoBaixaOutroContexto() {
  for (const change of ['troca', 'destruir', 'logout']) {
    const { c, service, files, callbacks, setResponder } = await component();
    let finish;
    setResponder(() => new Promise((r) => (finish = r)));
    const pending = c.exportar();
    if (change === 'troca') c.selecionar('');
    else if (change === 'logout') service.identidade = () => null;
    else callbacks.forEach((fn) => fn());
    finish({ unidade: { id: 'A', nome: 'Antiga', fuso: 'UTC', versao: '1' } });
    await pending;
    assert.equal(files.length, 0);
  }
}
async function duploCliqueNaoDuplicaDownload() {
  const { c, files, requests, setResponder } = await component();
  let finish;
  setResponder(() => new Promise((r) => (finish = r)));
  const first = c.exportar();
  await c.exportar();
  finish({ unidade: { id: 'A', nome: 'Atual', fuso: 'UTC', versao: '2' } });
  await first;
  assert.equal(requests.length, 1);
  assert.equal(files.length, 1);
}
async function arquivoMinimoLiberaUrlTemporaria() {
  const { originalDownload, blobs, links, revoked, callbacksTimer } = await component();
  originalDownload('A', {
    id: 'A',
    nome: 'Unidade',
    fuso: 'UTC',
    versao: '7',
    email: 'nunca-exportar@example.invalid',
    eventos: ['privado'],
  });
  assert.equal(blobs.length, 1);
  assert.equal(blobs[0].type, 'application/json;charset=utf-8');
  assert.deepEqual(JSON.parse(await blobs[0].text()), {
    unidade: { id: 'A', nome: 'Unidade', fuso: 'UTC', versao: '7' },
  });
  assert.equal(links[0].download, 'unidade-A.json');
  assert.equal(links[0].clicked, true);
  assert.equal(links[0].removed, true);
  callbacksTimer.forEach((fn) => fn());
  assert.deepEqual(revoked, ['blob:fixture']);
}
(async () => {
  let failed = 0;
  for (const fn of [
    exportaSomenteLeituraAtualAutorizada,
    falhaOuRevogacaoNaoExportaCache,
    novaTentativaNaoMantemSucessoAnterior,
    respostaAntigaNaoBaixaOutroContexto,
    duploCliqueNaoDuplicaDownload,
    arquivoMinimoLiberaUrlTemporaria,
  ]) {
    try {
      await fn();
      console.log(fn.name + ': aprovado');
    } catch (error) {
      failed++;
      console.error(fn.name + ': ' + error.message);
    }
  }
  process.exitCode = failed ? 1 : 0;
})();

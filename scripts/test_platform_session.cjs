const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (v) => Object.assign(() => v, { set: (x) => (v = x), update: (f) => (v = f(v)) });
const destroy = {};
function load(file, core, extra = {}) {
  const context = {
    exports: {},
    require: (n) => (n === '@angular/core' ? core : {}),
    setTimeout,
    clearTimeout,
    console,
    Error,
    TypeError,
    AbortSignal,
    crypto: globalThis.crypto,
    BroadcastChannel: class {
      postMessage() {}
    },
    ...extra,
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(repo + '/frontend/src/app/plataforma/' + file, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        experimentalDecorators: true,
      },
    }).outputText,
    context,
  );
  return context.exports;
}
async function sessaoAntiga() {
  let responder;
  const promise = new Promise((resolve) => (responder = resolve));
  const core = { Injectable: () => (c) => c, signal };
  const { PlataformaSessaoService } = load('plataforma-sessao.service.ts', core, {
    fetch: () => promise,
  });
  const service = new PlataformaSessaoService();
  service.access = 'A';
  service.autenticado.set(true);
  service.usuarioId.set('A');
  const request = service.empresa('id').catch(() => {});
  service.limpar();
  service.access = 'B';
  service.autenticado.set(true);
  service.usuarioId.set('B');
  responder({
    ok: false,
    status: 401,
    json: async () => ({ mensagem: 'Sessão antiga revogada.' }),
  });
  await request;
  assert.equal(service.autenticado(), true, '401 antigo não pode desconectar B');
  assert.equal(service.usuarioId(), 'B');
}
async function componenteDestruido() {
  let responder;
  const promise = new Promise((resolve) => (responder = resolve));
  let limpezas = 0;
  const callbacks = [];
  const service = {
    usuarioId: () => 'A',
    autenticado: () => true,
    intencaoProvisionamento: () => 'intencao',
    limparIntencao: () => limpezas++,
    consultarProvisionamento: () => promise,
  };
  const core = {
    Component: () => (c) => c,
    ViewChild: () => () => {},
    HostListener: () => () => {},
    DestroyRef: destroy,
    signal,
    inject: (token) => (token === destroy ? { onDestroy: (cb) => callbacks.push(cb) } : service),
  };
  const { ProvisionamentoComponent } = load('provisionamento.component.ts', core);
  const component = new ProvisionamentoComponent();
  const request = component.consultar({ preventDefault() {} }, 'intencao');
  callbacks.forEach((cb) => cb());
  responder({
    id: 'intencao',
    nome: 'Fictício',
    host: 'ficticio.localhost',
    estado: 'SOLICITADO',
    versao: 0,
    ultimaFalha: null,
  });
  await request;
  assert.equal(limpezas, 0, 'Instância destruída não deve limpar intenção recuperada');
}
(async () => {
  let failed = 0;
  for (const test of [sessaoAntiga, componenteDestruido]) {
    try {
      await test();
      console.log(test.name + ': aprovado');
    } catch (e) {
      failed++;
      console.error(test.name + ': ' + e.message);
    }
  }
  process.exitCode = failed ? 1 : 0;
})();

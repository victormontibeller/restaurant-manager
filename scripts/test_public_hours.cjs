const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (value) => Object.assign(() => value, { set: (next) => (value = next) });
const units = [
  { id: 'A', nome: 'Unidade A', fuso: 'America/Sao_Paulo' },
  { id: 'B', nome: 'Unidade B', fuso: 'UTC' },
];

function detail(id) {
  return {
    unidadeId: id,
    nome: 'Unidade ' + id,
    fuso: id === 'A' ? 'America/Sao_Paulo' : 'UTC',
    consultadoEm: '2026-11-06T21:00:00Z',
    canais: [
      { canal: 'DELIVERY', habilitado: true, aberto: true },
      { canal: 'RETIRADA', habilitado: true, aberto: false },
      { canal: 'MESA', habilitado: false, aberto: false },
    ],
    horarios: [{ canal: 'DELIVERY', diaSemana: 5, inicio: '18:00', fim: '02:00' }],
  };
}

function fixture() {
  const requests = [];
  const timers = new Map();
  const listeners = new Map();
  let timerId = 0;
  let responder = async (url) => ({
    ok: true,
    json: async () => (url === '/api/v1/unidades' ? units : detail(url.split('/')[4])),
  });
  const events = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
      if (listeners.get(name) === fn) listeners.delete(name);
    },
  };
  const context = {
    exports: {},
    require: () => ({ Component: () => (component) => component, signal }),
    window: events,
    document: events,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return responder(url, options);
    },
    AbortController,
    AbortSignal,
    Intl,
    Date,
    setTimeout: (fn, delay) => {
      timers.set(++timerId, { fn, delay });
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(repo + '/frontend/src/app/unidades/disponibilidade.component.ts', 'utf8'),
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
  return {
    c: new context.exports.DisponibilidadeComponent(),
    requests,
    timers,
    listeners,
    setResponder: (fn) => (responder = fn),
  };
}

async function consultaPublicaSemCredenciaisEComEscolhaExplicita() {
  const { c, requests } = fixture();
  await c.carregar();
  assert.equal(c.selecionada(), '');
  assert.equal(c.atual(), null);

  await c.selecionar('A');
  assert.equal(c.atual().unidadeId, 'A');
  assert.equal(c.nomeCanal('RETIRADA'), 'Retirada');
  assert.equal(c.nomeDia(5), 'Sexta-feira');
  assert.match(c.confirmado(), /18:00/);
  assert.equal(c.madrugada(c.horariosDo('DELIVERY')[0]), true);
  assert.equal(c.madrugada({ inicio: '18:00', fim: '24:00' }), false);
  assert.equal(c.horariosDo('MESA').length, 0);
  for (const { options } of requests) {
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers, undefined);
  }
  await c.selecionar('unidade-forjada');
  assert.equal(requests.length, 2);
  assert.equal(c.atual(), null);
}

async function trocaCancelaRequisicaoEDescartaRespostaAntiga() {
  const { c, requests, setResponder } = fixture();
  await c.carregar();
  let finish;
  setResponder(async (url) => ({
    ok: true,
    json: () => (url.includes('/A/') ? new Promise((resolve) => (finish = resolve)) : detail('B')),
  }));
  const previous = c.selecionar('A');
  await new Promise((resolve) => setImmediate(resolve));
  await c.selecionar('B');
  finish(detail('A'));
  await previous;

  assert.equal(c.atual().unidadeId, 'B');
  assert.equal(requests[1].options.signal.aborted, true);
  assert.equal(c.carregando(), false);
}

async function offlineEExpiracaoRetiramDisponibilidadeAntiga() {
  const { c, timers, listeners } = fixture();
  c.ngOnInit();
  await new Promise((resolve) => setImmediate(resolve));
  await c.selecionar('A');
  assert.equal(c.atual().canais[0].aberto, true);

  listeners.get('offline')();
  assert.equal(c.atual(), null);
  assert.equal(c.confirmado(), '');
  assert.match(c.estado(), /Sem conexão/);
  assert.equal(timers.size, 0);

  await c.selecionar('A');
  const expiration = [...timers.values()].find((timer) => timer.delay === 60000);
  assert.ok(expiration);
  expiration.fn();
  assert.equal(c.atual(), null);
  assert.match(c.estado(), /desatualizada/);
  c.ngOnDestroy();
  assert.equal(listeners.size, 0);
}

async function destruicaoDescartaRespostaELimpaTimers() {
  const { c, timers, setResponder } = fixture();
  await c.carregar();
  let finish;
  setResponder(() => new Promise((resolve) => (finish = resolve)));
  const pending = c.selecionar('A');
  c.ngOnDestroy();
  finish({ ok: true, json: async () => detail('A') });
  await pending;

  assert.equal(c.atual(), null);
  assert.equal(c.carregando(), false);
  assert.equal(timers.size, 0);
}

async function falhasNaoExibemPayloadNemConservamDisponibilidade() {
  const { c, setResponder } = fixture();
  await c.carregar();
  await c.selecionar('A');
  setResponder(async () => ({
    ok: false,
    status: 500,
    json: async () => ({ mensagem: '<html>detalhe interno</html>' }),
  }));
  await c.selecionar('A');
  assert.equal(c.atual(), null);
  assert.doesNotMatch(c.erro(), /html|interno/);
  assert.match(c.erro(), /Não foi possível/);

  setResponder(async () => ({ ok: true, json: async () => detail('B') }));
  await c.selecionar('A');
  assert.equal(c.atual(), null);
  assert.ok(c.erro());
}

(async () => {
  let failed = 0;
  for (const test of [
    consultaPublicaSemCredenciaisEComEscolhaExplicita,
    trocaCancelaRequisicaoEDescartaRespostaAntiga,
    offlineEExpiracaoRetiramDisponibilidadeAntiga,
    destruicaoDescartaRespostaELimpaTimers,
    falhasNaoExibemPayloadNemConservamDisponibilidade,
  ]) {
    try {
      await test();
      console.log(test.name + ': aprovado');
    } catch (error) {
      failed++;
      console.error(test.name + ': ' + error.message);
    }
  }
  process.exitCode = failed ? 1 : 0;
})();

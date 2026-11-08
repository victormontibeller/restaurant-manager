// Prova parsing, cursor opaco, fallback e revogação do consumidor SSE real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (initial) => {
  let value = initial;
  return Object.assign(() => value, {
    set: (next) => {
      value = next;
    },
  });
};
class ApiFailure extends Error {
  constructor(status) {
    super('Acesso revogado.');
    this.status = status;
  }
}
const timers = [];
const context = {
  exports: {},
  TextDecoder,
  AbortController,
  URLSearchParams,
  Date,
  setTimeout: (fn, ms) => {
    const timer = { fn, ms, cancelled: false };
    timers.push(timer);
    return timer;
  },
  clearTimeout: (timer) => {
    if (timer) timer.cancelled = true;
  },
  require: (name) => (name === '@angular/core' ? { signal } : { ApiFailure }),
};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(repo + '/frontend/src/app/eventos/acompanhamento.ts', 'utf8'),
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    },
  ).outputText,
  context,
);
const flush = async () => {
  for (let n = 0; n < 8; n++) await new Promise(setImmediate);
};

(async () => {
  const acompanhamento = new context.exports.AcompanhamentoEventos();
  const chamadas = [];
  let snapshots = 0;
  let revogado = false;
  let bloqueado = false;
  const encoder = new TextEncoder();
  const transporte = {
    api: async (rota) => {
      chamadas.push(rota);
      if (bloqueado) throw new ApiFailure(403);
      return { eventos: [], proximo: 'opaco:1.0', temMais: false };
    },
    abrirFluxo: async (rota) => {
      chamadas.push(rota);
      return new Response(
        new ReadableStream({
          start(controller) {
            const data =
              'event: atualizacao\r\ndata: ' +
              JSON.stringify({
                eventos: [{ id: 'evento-2' }],
                proximo: 'opaco:2.0',
                temMais: false,
              }) +
              '\r\n\r\n';
            // Um CRLF pode ser separado entre chunks de rede.
            const corte = data.indexOf('\r') + 1;
            controller.enqueue(encoder.encode(data.slice(0, corte)));
            controller.enqueue(encoder.encode(data.slice(corte)));
            controller.close();
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      );
    },
  };
  acompanhamento.iniciar(
    transporte,
    '/api/v1/mesa/eventos',
    {},
    async () => {
      snapshots++;
    },
    () => {
      revogado = true;
    },
  );
  await flush();
  assert.equal(snapshots, 2);
  assert.match(chamadas[1], /depois=opaco%3A1.0/);
  const fallback = timers.findLast((timer) => !timer.cancelled && timer.ms === 5000);
  assert.ok(fallback, 'Encerramento de SSE precisa recuperar por polling.');
  bloqueado = true;
  fallback.fn();
  await flush();
  assert.match(chamadas.at(-1), /depois=opaco%3A2.0/);
  assert.equal(revogado, true);
  assert.equal(acompanhamento.conectado(), false);
  assert.equal(acompanhamento.atualizadoEm(), '');
  console.log('SSE: chunks, cursor opaco, fallback e revogação aprovados.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

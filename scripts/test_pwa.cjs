// Prova isolada do contrato do worker: cache público restrito e atualização explícita.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(
  path.join(__dirname, '../frontend/src/app/pwa/service-worker.js'),
  'utf8',
);
const shell = [
  '/index.html',
  '/main-AAAA.js',
  '/styles-BBBB.css',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
];
const handlers = new Map();
const stores = new Map();
let offline = false;
let failPath = '';
let skipped = 0;
let claimed = 0;
let reads = [];
const origin = 'https://a.exemplo.test';
const store = (name) => {
  if (!stores.has(name)) stores.set(name, new Map());
  const entries = stores.get(name);
  return {
    put: async (key, response) => entries.set(key, response.clone()),
    match: async (key) => entries.get(key)?.clone(),
  };
};
const context = {
  URL,
  Set,
  Promise,
  Error,
  Request: class extends Request {
    constructor(url, options) {
      super(new URL(url, origin), options);
    }
  },
  fetch: async (request) => {
    const url = typeof request === 'string' ? request : request.url;
    reads.push({ url, credentials: request.credentials });
    if (offline) throw new Error('offline');
    return new Response(url, { status: new URL(url).pathname === failPath ? 503 : 200 });
  },
  caches: {
    open: async (key) => store(key),
    keys: async () => [...stores.keys()],
    delete: async (key) => stores.delete(key),
  },
  self: {
    location: { origin },
    addEventListener: (event, fn) => handlers.set(event, fn),
    skipWaiting: async () => skipped++,
    clients: { claim: async () => claimed++ },
  },
};
vm.runInNewContext(
  source.replace('__RM_VERSION__', '"teste"').replace('__RM_SHELL__', JSON.stringify(shell)),
  context,
);
const lifecycle = (event, extra = {}) => {
  let completion;
  handlers.get(event)({
    ...extra,
    waitUntil: (promise) => {
      completion = promise;
    },
  });
  return completion;
};
const fetchEvent = (url, method = 'GET', mode = 'cors', auth = false) => {
  let intercepted;
  handlers.get('fetch')({
    request: {
      url: new URL(url, origin).href,
      method,
      mode,
      headers: new Headers(auth ? { Authorization: 'Bearer segredo-ficticio' } : {}),
    },
    respondWith: (promise) => {
      intercepted = promise;
    },
  });
  return intercepted;
};
(async () => {
  await lifecycle('install');
  assert.equal(skipped, 0, 'Instalação não deve ativar atualização por conta própria.');
  assert.deepEqual([...stores.get('rm-shell-teste').keys()], shell);
  assert(reads.every((read) => read.credentials === 'omit'));
  for (const url of [
    '/api/v1/auth/me',
    '/api/v1/catalogo?unidadeId=1',
    '/api/v1/midias/foto',
    '/actuator/health',
    '/arquivo-privado',
    '/main-AAAA.js?token=privado',
    'https://b.exemplo.test/index.html',
  ]) {
    assert.equal(fetchEvent(url), undefined, `Recurso excluído do cache: ${url}`);
  }
  assert.equal(fetchEvent('/api/v1/carrinho/calcular', 'POST'), undefined);
  assert.equal(fetchEvent('/index.html', 'GET', 'cors', true), undefined);
  offline = true;
  const navigation = await fetchEvent('/?convite=segredo-nao-armazenavel', 'GET', 'navigate');
  assert.equal(await navigation.text(), origin + '/index.html');
  assert(![...stores.get('rm-shell-teste').keys()].some((key) => key.includes('segredo')));
  await store('rm-shell-antigo').put('/chunk-ANTIGO.js', new Response('anterior'));
  assert.equal(await (await fetchEvent('/chunk-ANTIGO.js')).text(), 'anterior');
  await lifecycle('activate');
  assert.equal(claimed, 1);
  await lifecycle('message', { data: 'desconhecido' });
  assert.equal(skipped, 0);
  await lifecycle('message', { data: 'ATUALIZAR_SHELL' });
  assert.equal(skipped, 1);
  offline = false;
  failPath = '/styles-BBBB.css';
  reads = [];
  await assert.rejects(lifecycle('install'), /Shell incompleto/);
  assert(!stores.has('rm-shell-teste'), 'Falha parcial não deixa shell instalável inconsistente.');
  console.log(
    'PWA: cache somente do shell, query sensível descartada, APIs/credenciais excluídas, atualização explícita e falha atômica; ambiente simulado.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

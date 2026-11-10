/* Gerado com uma lista exata de arquivos públicos do build; nenhuma API é armazenada. */
const VERSION = __RM_VERSION__;
const SHELL = __RM_SHELL__;
const CACHE_PREFIX = 'rm-shell-';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const paths = new Set(SHELL);
const hashedAssetPattern = new RegExp(__RM_HASHED_ASSET_PATTERN__);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      for (const path of SHELL) {
        const response = await fetch(new Request(path, { cache: 'reload', credentials: 'omit' }));
        if (!response.ok || response.redirected) throw new Error('Shell incompleto.');
        await cache.put(path, response);
      }
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
    // Uma atualização espera consentimento ou o encerramento das abas antigas.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const previous = (await caches.keys()).filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
    // Duas versões anteriores mantêm chunks de abas já abertas durante a atualização.
    await Promise.all(previous.slice(0, -2).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'ATUALIZAR_SHELL') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('Authorization')) return;
  // Nem consultas públicas, imagens da empresa, saúde, cookies ou ações entram no cache.
  const appRoute = /^(?:\/|\/index\.html|\/(?:cardapio|carrinho|pedidos(?:\/[^/]+)?|mesa(?:\/[^/]+)?|conta|entrar|cadastro|recuperar-senha|aceitar-convite|verificar-email|sem-acesso|cozinha|plataforma|design-system)|\/gestao(?:\/(?:entrar|pedidos(?:\/novo)?|mesas|catalogo|equipe(?:\/convites)?|convites|unidades|configuracoes\/(?:prazos|delivery)|atualizacoes|expedicao|relatorios|integracoes|pendencias))?)$/;
  const navigation = request.mode === 'navigate' && appRoute.test(url.pathname);
  const hashedAsset = hashedAssetPattern.test(url.pathname);
  if (!navigation && ((!paths.has(url.pathname) && !hashedAsset) || url.search)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = navigation ? '/index.html' : url.pathname;
    const response = await cache.match(key);
    if (response) return response;
    if (hashedAsset) {
      const previous = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX));
      for (const name of previous) {
        const cached = await (await caches.open(name)).match(key);
        if (cached) return cached;
      }
    }
    return fetch(request);
  })());
});

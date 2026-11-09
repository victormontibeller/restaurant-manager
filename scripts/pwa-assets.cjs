// Lista pública exata e formato dos arquivos emitidos pelo Angular.
// Compartilhado pelo empacotador e pelos probes; o worker recebe o padrão no build.
const HASHED_ASSET_PATTERN = '^/(?:main|chunk|styles|polyfills)-[A-Za-z0-9_-]+\\.(?:js|css)$';
const PUBLIC_SHELL_PATHS = [
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/assets/bistro-banner.jpg',
];
module.exports = { HASHED_ASSET_PATTERN, PUBLIC_SHELL_PATHS };

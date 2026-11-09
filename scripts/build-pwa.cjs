// Empacota somente o shell estático produzido pelo Angular. Executado após ng build.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { HASHED_ASSET_PATTERN, PUBLIC_SHELL_PATHS } = require('./pwa-assets.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'frontend/dist/restaurant-manager/browser');
const hashedAsset = new RegExp(HASHED_ASSET_PATTERN);
const shell = [
  ...new Set([
    ...PUBLIC_SHELL_PATHS,
    ...fs
      .readdirSync(output)
      .filter((name) => hashedAsset.test('/' + name))
      .map((name) => '/' + name),
  ]),
];
shell.sort();
if (
  !shell.includes('/index.html') ||
  !shell.includes('/manifest.webmanifest') ||
  !shell.some((name) => name.startsWith('/main-'))
) {
  throw new Error('Build Angular incompleto para gerar a PWA.');
}
const hash = crypto.createHash('sha256');
for (const file of shell) hash.update(file).update(fs.readFileSync(path.join(output, file)));
const template = fs.readFileSync(path.join(root, 'frontend/src/app/pwa/service-worker.js'), 'utf8');
hash.update(template).update(HASHED_ASSET_PATTERN);
const version = hash.digest('hex').slice(0, 20);
fs.writeFileSync(
  path.join(output, 'sw.js'),
  template
    .replace('__RM_VERSION__', JSON.stringify(version))
    .replace('__RM_SHELL__', JSON.stringify(shell))
    .replace('__RM_HASHED_ASSET_PATTERN__', JSON.stringify(HASHED_ASSET_PATTERN)),
);
console.log(`PWA: ${shell.length} arquivos públicos; versão ${version}; APIs excluídas.`);

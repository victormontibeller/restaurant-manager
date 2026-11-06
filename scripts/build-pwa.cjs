// Empacota somente o shell estático produzido pelo Angular. Executado após ng build.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'frontend/dist/restaurant-manager/browser');
const shell = fs.readdirSync(output)
  .filter((name) => name === 'index.html' || name === 'manifest.webmanifest' || /^(main|chunk|styles|polyfills)-[A-Z0-9]+\.(js|css)$/.test(name))
  .map((name) => '/' + name);
for (const icon of ['icon-192.png', 'icon-512.png']) shell.push('/icons/' + icon);
shell.sort();
if (!shell.includes('/index.html') || !shell.includes('/manifest.webmanifest') || !shell.some((name) => name.startsWith('/main-'))) {
  throw new Error('Build Angular incompleto para gerar a PWA.');
}
const hash = crypto.createHash('sha256');
for (const file of shell) hash.update(file).update(fs.readFileSync(path.join(output, file)));
const template = fs.readFileSync(path.join(root, 'frontend/src/app/pwa/service-worker.js'), 'utf8');
hash.update(template);
const version = hash.digest('hex').slice(0, 20);
fs.writeFileSync(path.join(output, 'sw.js'), template
  .replace('__RM_VERSION__', JSON.stringify(version))
  .replace('__RM_SHELL__', JSON.stringify(shell)));
console.log(`PWA: ${shell.length} arquivos públicos; versão ${version}; APIs excluídas.`);

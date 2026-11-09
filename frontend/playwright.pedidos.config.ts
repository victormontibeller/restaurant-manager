import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import foundation from './playwright.config';

const target = process.env['RM_BASE_URL'];
if (!target) throw new Error('RM_BASE_URL é obrigatório para a Sprint 3.');
const url = new URL(target);
const fixturePath = process.env['RM_PEDIDOS_FIXTURE'];
if (!fixturePath || !path.isAbsolute(fixturePath))
  throw new Error('Fixture privada absoluta obrigatória.');
const fixtureHost = JSON.parse(fs.readFileSync(fixturePath, 'utf8')).host as string;
if (
  fixtureHost !== 'sprint03.localhost' &&
  !/^sprint03-redesenho-[a-f0-9]{12}\.localhost$/.test(fixtureHost)
)
  throw new Error('Host de testes não autorizado.');
if (
  url.hostname !== fixtureHost ||
  url.protocol !== 'https:' ||
  url.port !== '8089' ||
  url.username ||
  url.password ||
  url.pathname !== '/' ||
  url.search ||
  url.hash
) {
  throw new Error('Sprint 3 exige HTTPS sprint03.localhost:8089 e massa própria em rm_test.');
}
const spki = process.env['RM_TEST_TLS_SPKI'];
if (spki && !/^[A-Za-z0-9+/]{43}=$/.test(spki))
  throw new Error('RM_TEST_TLS_SPKI deve ser o SHA-256 em base64 da chave pública local.');

export default defineConfig({
  ...foundation,
  projects: foundation.projects?.map((project) =>
    spki && project.use?.browserName === 'chromium'
      ? {
          ...project,
          use: {
            ...project.use,
            launchOptions: { args: ['--ignore-certificate-errors-spki-list=' + spki] },
          },
        }
      : project,
  ),
  testDir: './e2e-pedidos',
  globalSetup: './e2e-identidade/prontidao.ts',
  timeout: 180000,
  workers: 1,
  retries: 0,
  use: { ...foundation.use, baseURL: target, ignoreHTTPSErrors: true },
});

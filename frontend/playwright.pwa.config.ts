import { defineConfig } from '@playwright/test';
import foundation from './playwright.config';

const target = process.env['RM_BASE_URL'];
if (
  !target ||
  new URL(target).hostname !== 'sprint02.localhost' ||
  new URL(target).protocol !== 'https:'
) {
  throw new Error('PWA integrada exige HTTPS sprint02.localhost e massa própria rm_test.');
}
// Chromium valida o certificado do worker fora do contexto ignoreHTTPSErrors.
// Para certificado local privado, aceitar somente a chave pública explicitamente fixada.
const spki = process.env['RM_TEST_TLS_SPKI'];
if (spki && !/^[A-Za-z0-9+/]{43}=$/.test(spki)) {
  throw new Error('RM_TEST_TLS_SPKI deve ser o SHA-256 em base64 da chave pública local.');
}
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
  testDir: './e2e-pwa',
  globalSetup: './e2e-identidade/prontidao.ts',
  timeout: 60000,
  use: { ...foundation.use, baseURL: target, ignoreHTTPSErrors: true },
});

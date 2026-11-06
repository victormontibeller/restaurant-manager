import { defineConfig } from '@playwright/test';
import foundation from './playwright.config';

const target = process.env['RM_BASE_URL'];
if (!target) throw new Error('RM_BASE_URL é obrigatório para a suíte de catálogo.');
const url = new URL(target);
if (
  url.hostname !== 'sprint02.localhost' ||
  url.protocol !== 'https:' ||
  url.username ||
  url.password ||
  url.pathname !== '/' ||
  url.search ||
  url.hash
) {
  throw new Error('Suíte de catálogo exige HTTPS sprint02.localhost e massa própria em rm_test.');
}

export default defineConfig({
  ...foundation,
  testDir: './e2e-catalogo',
  globalSetup: './e2e-identidade/prontidao.ts',
  timeout: 180000,
  workers: 1,
  retries: 0,
  use: { ...foundation.use, baseURL: target, ignoreHTTPSErrors: true },
});

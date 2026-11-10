import { defineConfig } from '@playwright/test';
import foundation from './playwright.config';
import { destinoCatalogo } from './e2e/destino-catalogo';

const target = destinoCatalogo();

export default defineConfig({
  ...foundation,
  testDir: './e2e-catalogo',
  globalSetup: './e2e-identidade/prontidao.ts',
  timeout: 180000,
  workers: 1,
  retries: 0,
  use: { ...foundation.use, baseURL: target, ignoreHTTPSErrors: true },
});

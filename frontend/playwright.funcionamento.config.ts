import { defineConfig } from '@playwright/test';
import foundation from './playwright.config';
import { destinoCatalogo } from './e2e/destino-catalogo';

const target = destinoCatalogo();

export default defineConfig({
  ...foundation,
  testDir: './e2e-funcionamento',
  globalSetup: './e2e-identidade/prontidao.ts',
  // Jornada composta com cadastro, negativas, reconsulta e reload reais nos cinco projetos.
  timeout: 120000,
  workers: 1,
  retries: 0,
  use: { ...foundation.use, baseURL: target, ignoreHTTPSErrors: true },
});

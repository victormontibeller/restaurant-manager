import { defineConfig } from '@playwright/test';
import pedidos from './playwright.pedidos.config';

// Reutiliza as guardas HTTPS/host/fixture privada e os cinco projetos locais.
export default defineConfig({
  ...pedidos,
  testDir: './e2e-sprint04',
  timeout: 180000,
  use: { ...pedidos.use, actionTimeout: 15000, navigationTimeout: 20000 },
});

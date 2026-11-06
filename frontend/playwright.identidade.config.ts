import { defineConfig } from '@playwright/test';
import foundation from './playwright.config';

const target = process.env['RM_BASE_URL'];
if (!target || new URL(target).hostname !== 'c4.localhost' || new URL(target).protocol !== 'https:') {
  throw new Error('Suíte mutante de identidade exige HTTPS c4.localhost e banco rm_test preparado.');
}
export default defineConfig({
  ...foundation,
  testDir: './e2e-identidade',
  globalSetup: './e2e-identidade/prontidao.ts',
  // Jornadas compostas e startup Firefox medidos no host de quatro CPUs.
  // Asserções mantêm o limite padrão; nenhum retry mascara falhas.
  timeout: 60000,
  use: {...foundation.use, baseURL:target, ignoreHTTPSErrors:true},
});

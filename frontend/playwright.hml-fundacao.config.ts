import { defineConfig } from '@playwright/test';
import foundation from './playwright.config';

if (
  process.env['RM_BASE_URL'] !== 'https://hmla.localhost:8088' ||
  process.env['RM_PRIVATE_HOST'] !== 'hmla.localhost'
) {
  throw new Error('Regressão da fundação exige origem e domínio de homologação local.');
}
export default defineConfig({
  ...foundation,
  timeout: 60000,
  use: { ...foundation.use, ignoreHTTPSErrors: true },
});

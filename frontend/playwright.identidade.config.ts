import { defineConfig } from '@playwright/test';
import foundation from './playwright.config';

const target = process.env['RM_BASE_URL'];
if (!target || new URL(target).hostname !== 'c4.localhost' || new URL(target).protocol !== 'https:') {
  throw new Error('Suíte mutante de identidade exige HTTPS c4.localhost e banco rm_test preparado.');
}
export default defineConfig({
  ...foundation,
  testDir: './e2e-identidade',
  use: {...foundation.use, baseURL:target, ignoreHTTPSErrors:true},
});

import {defineConfig} from '@playwright/test';
import foundation from './playwright.config';

if(process.env['RM_BASE_URL']!=='https://hmla.localhost:8088'){
  throw new Error('Smoke de identidade exige origem HTTPS fixa de homologação local.');
}
export default defineConfig({
  ...foundation,
  testDir:'./e2e-hml-identidade',
  timeout:120000,
  use:{...foundation.use,ignoreHTTPSErrors:true},
});

import {defineConfig} from '@playwright/test';
import foundation from './playwright.config';
const target=process.env['RM_BASE_URL'];
const url=target?new URL(target):null;
if(!url || url.protocol!=='https:' || url.port!=='8089'
    || !/^eventos-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.localhost$/.test(url.hostname)
    || url.username || url.password || url.pathname!=='/' || url.search || url.hash) {
  throw new Error('Suíte de eventos exige HTTPS eventos-UUID.localhost:8089 e massa exclusiva rm_test.');
}
export default defineConfig({...foundation,testDir:'./e2e-eventos',
  globalSetup:'./e2e-identidade/prontidao.ts',timeout:90000,
  use:{...foundation.use,baseURL:target,ignoreHTTPSErrors:true}});

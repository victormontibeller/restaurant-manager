import {defineConfig} from '@playwright/test';
import foundation from './playwright.config';
const target=process.env['RM_BASE_URL'];
if(!target||new URL(target).hostname!=='plataforma.localhost'||new URL(target).protocol!=='https:')throw new Error('Suíte SaaS exige HTTPS plataforma.localhost e massa exclusiva rm_test.');
export default defineConfig({...foundation,testDir:'./e2e-plataforma',timeout:60000,use:{...foundation.use,baseURL:target,ignoreHTTPSErrors:true}});

import {defineConfig} from '@playwright/test';
import identidade from './playwright.identidade.config';
export default defineConfig({...identidade,testDir:'./e2e-eventos',timeout:90000});

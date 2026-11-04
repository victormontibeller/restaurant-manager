import {defineConfig} from '@playwright/test';
import identidade from './playwright.identidade.config';

export default defineConfig({...identidade,testDir:'./e2e-cadastro',globalSetup:'./e2e-identidade/prontidao.ts',timeout:90000});

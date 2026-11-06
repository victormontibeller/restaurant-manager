import {defineConfig} from '@playwright/test';
import plataforma from './playwright.plataforma.config';
export default defineConfig({...plataforma,testDir:'./e2e-provisionamento',timeout:180000});

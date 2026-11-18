import { defineConfig } from '@playwright/test';
import pedidos from './playwright.pedidos.config';

export default defineConfig({ ...pedidos, testDir: './e2e-sprint06' });

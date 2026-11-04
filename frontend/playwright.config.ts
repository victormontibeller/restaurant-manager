import { defineConfig } from '@playwright/test';
import path from 'node:path';

const results = process.env['RM_REPORT_DIR'];
if (!results || !path.isAbsolute(results)) throw new Error('RM_REPORT_DIR deve apontar para diretório privado absoluto.');
export default defineConfig({
  testDir: './e2e',
  outputDir: path.join(results, 'artifacts'),
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [['list'], ['html', { outputFolder: path.join(results, 'html'), open: 'never' }], ['json', { outputFile: path.join(results, 'results.json') }]],
  use: { baseURL: process.env['RM_BASE_URL'] ?? 'http://127.0.0.1:8088', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: {width: 1280, height: 900} } },
    { name: 'chromium-mobile', use: { browserName: 'chromium', viewport: {width: 360, height: 800}, isMobile: true, hasTouch: true } },
    { name: 'chromium-tablet', use: { browserName: 'chromium', viewport: {width: 768, height: 1024}, hasTouch: true } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: {width: 1280, height: 900} } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: {width: 1280, height: 900}, launchOptions: { executablePath: process.env['RM_WEBKIT_EXECUTABLE'] } } },
  ],
});

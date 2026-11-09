import { defineConfig } from '@playwright/test';
import foundation from './playwright.config';
import fs from 'node:fs';
import path from 'node:path';

const target = process.env['RM_BASE_URL'];
const destination = target ? new URL(target) : null;
const fixtureFile = process.env['RM_AUTH_FIXTURE'];
if (fixtureFile && !path.isAbsolute(fixtureFile)) {
  throw new Error('A fixture privada de identidade deve ter caminho absoluto.');
}
const fixture = fixtureFile
  ? (JSON.parse(fs.readFileSync(fixtureFile, 'utf8')) as { host?: unknown })
  : {};
const expectedHost = fixture.host ?? 'c4.localhost';
const managedHost =
  typeof expectedHost === 'string' &&
  (expectedHost === 'c4.localhost' ||
    /^c4-redesenho-03-[a-f0-9]{12}\.localhost$/.test(expectedHost));
if (
  !destination ||
  !managedHost ||
  destination.hostname !== expectedHost ||
  destination.protocol !== 'https:' ||
  destination.port !== '8089' ||
  destination.username ||
  destination.password
) {
  throw new Error(
    'Suíte mutante de identidade exige HTTPS local na porta 8089 e o host gerenciado da fixture de rm_test.',
  );
}
export default defineConfig({
  ...foundation,
  testDir: './e2e-identidade',
  globalSetup: './e2e-identidade/prontidao.ts',
  // Jornadas compostas e startup Firefox medidos no host de quatro CPUs.
  // Asserções mantêm o limite padrão; nenhum retry mascara falhas.
  timeout: 60000,
  use: { ...foundation.use, baseURL: target, ignoreHTTPSErrors: true },
});

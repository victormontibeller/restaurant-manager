// Probes de lógica compartilhados pelo CI e pelo build de release.
// Templates com navegador e E2E continuam sendo verificações separadas.
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const tests = [
  'test_platform_session.cjs',
  'test_session_errors.cjs',
  'test_pending_intentions.cjs',
  'test_unit_events.cjs',
  'test_unit_export.cjs',
  'test_event_config.cjs',
  'test_inactive_memberships.cjs',
  'test_hml_fixture.cjs',
];

for (const test of tests) {
  const result = spawnSync(process.execPath, [path.join(__dirname, test)], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    console.error(`Probe não aprovado: ${test}`);
    process.exit(result.status || 1);
  }
}

const { readFileSync } = require('node:fs');
const { Agent } = require('node:https');
const { homedir } = require('node:os');
const { join } = require('node:path');
const { parseEnv } = require('node:util');

const { RM_PORT = '8089' } = parseEnv(readFileSync(join(__dirname, '../.env'), 'utf8'));
const agent = new Agent({
  ca: readFileSync(join(homedir(), '.local/share/restaurant-manager-manual/tls/demo-ca.crt')),
  servername: 'demo.localhost',
});
const backend = {
  target: `https://127.0.0.1:${RM_PORT}`,
  changeOrigin: false,
  agent,
};

module.exports = {
  '/api': backend,
  '/actuator': backend,
};

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (v) => Object.assign(() => v, { set: (x) => (v = x), update: (f) => (v = f(v)) });
const core = {
  Component: () => (c) => c,
  ViewChild: () => () => {},
  signal,
  inject: () => ({}),
  output: () => ({ emit() {} }),
};
const context = {
  exports: {},
  require: (n) => (n === '@angular/core' ? core : {}),
  setTimeout,
  console,
};
const source = fs.readFileSync(repo + '/frontend/src/app/acessos/acessos.component.ts', 'utf8');
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      experimentalDecorators: true,
    },
  }).outputText,
  context,
);
const c = new context.exports.AcessosComponent();
c.unidades.set([{ id: 'ativa', nome: 'A1' }]);
const f = { id: 'ficticio', perfil: 'COZINHA', unidades: ['ativa', 'inativa'] };
c.vinculosOriginais.set({ ficticio: [...f.unidades] });
assert.deepEqual([...c.unidadesInativas(f)], ['inativa']);
c.vincular(f, 'inativa', false);
assert.deepEqual([...f.unidades], ['ativa']);
assert.deepEqual([...c.unidadesInativas(f)], ['inativa']);
c.vincular(f, 'inativa', true);
assert.deepEqual([...f.unidades], ['ativa', 'inativa']);
assert.ok(source.includes('Vínculo em unidade inativa'));
console.log(
  'Vínculo inativo visível e removível sem conceder unidade nova: aprovado (lógica unitária).',
);

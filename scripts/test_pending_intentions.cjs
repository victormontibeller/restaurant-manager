// Serviços reais, eventos de página fictícios: a guarda não depende do componente autenticado.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (value) => Object.assign(() => value, { set: (next) => (value = next) });

for (const [file, name] of [
  ['unidades/criacao-pendente.service.ts', 'CriacaoPendenteService'],
  ['acessos/convite-pendente.service.ts', 'ConvitePendenteService'],
]) {
  const handlers = [];
  const context = {
    exports: {},
    require: () => ({ Injectable: () => (value) => value, signal }),
    location: { origin: 'https://ficticio.localhost' },
    window: {
      addEventListener: (event, handler) => {
        if (event === 'beforeunload') handlers.push(handler);
      },
    },
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(repo + '/frontend/src/app/' + file, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        experimentalDecorators: true,
      },
    }).outputText,
    context,
  );
  const service = new context.exports[name]();
  const pageExitPrevented = () => {
    let prevented = false;
    const event = { preventDefault: () => (prevented = true), returnValue: undefined };
    handlers.forEach((handler) => handler(event));
    return prevented;
  };
  assert.equal(pageExitPrevented(), false, name + ': sem pendência não deve bloquear saída');
  const first = service.daConta('conta-a');
  first.set({ id: 'intencao-a' });
  assert.equal(pageExitPrevented(), true, name + ': deve avisar mesmo sem componente/login ativo');
  const second = service.daConta('conta-b');
  assert.equal(second(), null, name + ': outra conta não recebe a intenção');
  second.set({ id: 'intencao-b' });
  first.set(null);
  assert.equal(pageExitPrevented(), true, name + ': outra intenção ainda precisa de reconciliação');
  second.set(null);
  assert.equal(pageExitPrevented(), false, name + ': reconciliar todas as intenções libera saída');
  console.log(
    name +
      ': saída protegida durante pendência, isolamento entre contas e liberação após reconciliação.',
  );
}

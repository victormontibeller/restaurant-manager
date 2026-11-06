// Transporte fictício: verifica o contrato de erro do login empresarial, sem API/banco.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (value) => Object.assign(() => value, { set: (next) => (value = next) });
const context = {
  exports: {},
  require: () => ({ Injectable: () => (value) => value, signal }),
  Error,
  setTimeout,
  clearTimeout,
  BroadcastChannel: class {
    postMessage() {}
  },
};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(repo + '/frontend/src/app/identidade/sessao.service.ts', 'utf8'),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        experimentalDecorators: true,
      },
    },
  ).outputText,
  context,
);

(async () => {
  const { SessaoService, ApiFailure } = context.exports;
  for (const [status, body, message, code] of [
    [
      401,
      JSON.stringify({ mensagem: 'Credenciais inválidas.', codigo: 'CREDENCIAIS_INVALIDAS' }),
      'Credenciais inválidas.',
      'CREDENCIAIS_INVALIDAS',
    ],
    [
      429,
      JSON.stringify({ mensagem: 'Aguarde antes de tentar novamente.' }),
      'Aguarde antes de tentar novamente.',
      '',
    ],
    [
      403,
      '<html>Acesso negado pelo intermediário</html>',
      'Não foi possível confirmar o resultado da operação.',
      '',
    ],
    [
      500,
      JSON.stringify({ mensagem: 'Detalhe técnico interno', codigo: 'INTERNO' }),
      'Não foi possível confirmar o resultado da operação.',
      '',
    ],
    [
      503,
      '<html>Serviço indisponível</html>',
      'Não foi possível confirmar o resultado da operação.',
      '',
    ],
  ]) {
    const service = new SessaoService();
    await assert.rejects(service.receber(new Response(body, { status })), (error) => {
      assert(
        error instanceof ApiFailure,
        'Falha HTTP deve preservar status sem expor erro de parsing',
      );
      assert.equal(error.status, status);
      assert.equal(error.message, message);
      assert.equal(error.codigo, code);
      return true;
    });
    assert.equal(service.identidade(), null);
  }
  console.log(
    'Login empresarial: erros JSON, HTML de intermediário e 5xx tratados com segurança; transporte fictício.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

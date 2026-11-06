const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (initial) => {
  let value = initial;
  return Object.assign(() => value, {
    set: (next) => {
      value = next;
    },
    update: (fn) => {
      value = fn(value);
    },
  });
};

function formatacaoMonetariaPreservaCentavos() {
  const context = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(repo + '/frontend/src/app/catalogo/modelos.ts', 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  );
  const moeda = context.exports.moeda;
  assert.equal(moeda('198000000000000.01'), 'R$\u00a0198.000.000.000.000,01');
  assert.equal(moeda('46.00'), 'R$\u00a046,00');
  assert.equal(moeda('0'), 'R$\u00a00,00');
  assert.equal(moeda('3.5'), 'R$\u00a03,50');
  assert.equal(moeda('3.123'), 'Valor indisponível');
}

function fixture(source = 'carrinho/carrinho.service.ts', classe = 'CarrinhoService') {
  const calls = [];
  const listeners = new Map();
  const destroy = [];
  const intervals = new Map();
  const navigator = { onLine: true };
  let response = async () => quote('r1', true);
  class CatalogoApiService {}
  class DestroyRef {}
  const api = {
    enviar: async (...args) => {
      calls.push(args);
      return response(...args);
    },
  };
  const context = {
    exports: {},
    require: (name) =>
      name === '@angular/core'
        ? {
            Injectable: () => (value) => value,
            signal,
            DestroyRef,
            inject: (token) =>
              token === DestroyRef ? { onDestroy: (fn) => destroy.push(fn) } : api,
          }
        : name.includes('catalogo-api')
          ? { CatalogoApiService }
          : { mensagemErro: (error) => error.message },
    navigator,
    window: {
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: (name) => listeners.delete(name),
    },
    setInterval: (fn) => {
      intervals.set(1, fn);
      return 1;
    },
    clearInterval: (id) => intervals.delete(id),
    structuredClone,
    AbortController,
    Date,
    Number,
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(repo + '/frontend/src/app/' + source, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        experimentalDecorators: true,
      },
    }).outputText,
    context,
  );
  return {
    carrinho: new context.exports[classe](),
    calls,
    listeners,
    intervals,
    destroy,
    responder: (fn) => {
      response = fn;
    },
    rede: (online) => {
      navigator.onLine = online;
      listeners.get(online ? 'online' : 'offline')();
    },
  };
}

function quote(revisao, requerConfirmacao) {
  return {
    unidadeId: 'a',
    canal: 'DELIVERY',
    moeda: 'BRL',
    revisao,
    requerConfirmacao,
    linhas: [],
    subtotal: '46.00',
    total: '46.00',
  };
}

function preparar(carrinho) {
  carrinho.definirContexto({ unidadeId: 'a', unidadeNome: 'Unidade A', canal: 'DELIVERY' });
  carrinho.guardar(
    {
      id: 'linha-a',
      produtoId: 'combo-a',
      quantidade: 1,
      adicionais: [],
      escolhas: [
        {
          grupoId: 'grupo-a',
          opcaoId: 'opcao-a',
          quantidade: 2,
          adicionais: [{ adicionalId: 'extra-a', quantidade: 1 }],
        },
      ],
    },
    'Combo A',
  );
}

async function confirmacaoExigeRevisaoVigenteSemPrecoNoPayload() {
  const { carrinho, calls, responder } = fixture();
  preparar(carrinho);
  await carrinho.calcular();
  assert.equal(carrinho.confirmado(), false);
  assert.equal(calls[0][2].revisaoAnterior, null);
  assert.deepEqual(Object.keys(calls[0][2]).sort(), [
    'canal',
    'linhas',
    'revisaoAnterior',
    'unidadeId',
  ]);
  assert.equal(JSON.stringify(calls[0][2]).includes('preco'), false);

  responder(async () => quote('r2', true));
  await carrinho.calcular(true);
  assert.equal(calls[1][2].revisaoAnterior, 'r1');
  assert.equal(carrinho.confirmado(), false);
  assert.match(carrinho.aviso(), /catálogo mudou/);

  responder(async () => quote('r2', false));
  await carrinho.calcular(true);
  assert.equal(carrinho.confirmado(), true);
  assert.equal(calls[2][2].revisaoAnterior, 'r2');
  carrinho.alterarQuantidade('linha-a', 2);
  assert.equal(carrinho.confirmado(), false);
  assert.equal(carrinho.resumo(), null);
}

async function respostasAtrasadasNaoRevalidamOutraUnidadeOuRede() {
  const { carrinho, responder, calls, rede } = fixture();
  preparar(carrinho);
  let finish;
  responder(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pendente = carrinho.calcular();
  carrinho.definirContexto({ unidadeId: 'b', unidadeNome: 'Unidade B', canal: 'RETIRADA' });
  finish(quote('antiga', false));
  await pendente;
  assert.equal(carrinho.contexto().unidadeId, 'b');
  assert.equal(carrinho.itens().length, 0);
  assert.equal(carrinho.resumo(), null);
  assert.equal(calls[0][3].aborted, true);

  preparar(carrinho);
  responder(async () => quote('r1', true));
  await carrinho.calcular();
  rede(false);
  assert.equal(carrinho.resumo(), null);
  const chamadas = calls.length;
  await carrinho.calcular(true);
  assert.equal(calls.length, chamadas);
  rede(true);
  assert.equal(carrinho.itens().length, 1);
  assert.equal(carrinho.confirmado(), false);
}

async function indisponibilidadePreservaConfiguracoesSemSubstituir() {
  const { carrinho, responder, destroy, listeners, intervals } = fixture();
  preparar(carrinho);
  const antes = JSON.stringify(carrinho.itens());
  responder(async () => {
    throw new Error('Escolha indisponível.');
  });
  await carrinho.calcular();
  assert.equal(JSON.stringify(carrinho.itens()), antes);
  assert.equal(carrinho.resumo(), null);
  assert.match(carrinho.aviso(), /nenhuma substituição/);
  carrinho.alterarQuantidade('linha-a', 0);
  assert.equal(carrinho.itens()[0].linha.quantidade, 1);
  destroy.forEach((fn) => fn());
  assert.equal(listeners.size, 0);
  assert.equal(intervals.size, 0);
}

async function previaInvalidaEdicaoRedeERespostaAtrasada() {
  const {
    carrinho: previa,
    responder,
    calls,
    rede,
    destroy,
  } = fixture('catalogo/previa-configuracao.service.ts', 'PreviaConfiguracaoService');
  const contexto = { unidadeId: 'a', unidadeNome: 'Unidade A', canal: 'DELIVERY' };
  const linha = {
    id: 'linha-a',
    produtoId: 'combo-a',
    quantidade: 2,
    adicionais: [],
    escolhas: [],
  };
  const resposta = {
    ...quote('previa', true),
    linhas: [{ ...linha, precoUnitario: '46.00', subtotal: '92.00' }],
  };
  responder(async () => resposta);
  await previa.calcular(contexto, linha);
  assert.equal(previa.linha().precoUnitario, '46.00');
  assert.equal(calls[0][2].linhas.length, 1);
  assert.equal(calls[0][2].revisaoAnterior, null);
  previa.invalidar();
  assert.equal(previa.linha(), null);

  let finish;
  responder(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pendente = previa.calcular(contexto, linha);
  previa.invalidar();
  finish(resposta);
  await pendente;
  assert.equal(previa.linha(), null);
  assert.equal(calls[1][3].aborted, true);

  responder(async () => resposta);
  await previa.calcular(contexto, linha);
  rede(false);
  assert.equal(previa.linha(), null);
  const chamadas = calls.length;
  await previa.calcular(contexto, linha);
  assert.equal(calls.length, chamadas);
  assert.match(previa.erro(), /Conecte-se/);
  rede(true);
  await previa.calcular(contexto, linha);
  destroy.forEach((fn) => fn());
  assert.equal(previa.linha(), null);
}

(async () => {
  for (const test of [
    formatacaoMonetariaPreservaCentavos,
    confirmacaoExigeRevisaoVigenteSemPrecoNoPayload,
    respostasAtrasadasNaoRevalidamOutraUnidadeOuRede,
    indisponibilidadePreservaConfiguracoesSemSubstituir,
    previaInvalidaEdicaoRedeERespostaAtrasada,
  ]) {
    await test();
    console.log(test.name + ': aprovado');
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

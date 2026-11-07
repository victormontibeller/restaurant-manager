// Recuperação do editor real de catálogo; transporte fictício neste probe de lógica.
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

const componente = {
  id: 'componente-a',
  nome: 'Hambúrguer fictício',
  tipo: 'SIMPLES',
  ativo: true,
  adicionais: [{ id: 'extra-a', nome: 'Queijo', ativo: true }],
  grupos: [],
};
const combo = {
  id: 'combo-a',
  nome: 'Combo fictício',
  tipo: 'COMBO',
  versao: 0,
  adicionais: [],
  grupos: [
    {
      id: 'grupo-a',
      opcoes: [{ id: 'opcao-a', produtoId: componente.id, adicionaisPermitidos: ['extra-a'] }],
    },
  ],
};

async function fixture() {
  const pendente = signal({ tipo: 'produto', novo: true, dados: structuredClone(combo) });
  const destroys = [];
  const calls = [];
  let consultarCombo = async () => ({ ...structuredClone(combo), versao: 1 });
  let consultarComponente = async () => structuredClone(componente);
  class SessaoService {}
  class CatalogoPendenteService {}
  class MidiaPendenteService {}
  class DestroyRef {}
  class ApiFailure extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  class EventEmitter {
    emit() {}
  }
  const sessao = {
    identidade: () => ({ usuarioId: 'conta-a', perfil: 'ADMINISTRADOR' }),
    api: async (route, method = 'GET') => {
      calls.push({ route, method });
      if (route === '/api/v1/acessos/efetivos')
        return { acoes: ['catalogo.editar', 'catalogo.consultar'], unidades: [] };
      if (route === '/api/v1/gestao/catalogo/produtos/' + combo.id) return consultarCombo();
      if (route === '/api/v1/gestao/catalogo/produtos/' + componente.id)
        return consultarComponente();
      if (route.includes('?pagina=')) return { itens: [], temMais: false };
      throw new Error('Rota inesperada: ' + route);
    },
  };
  const core = {
    Component: () => (value) => value,
    Output: () => () => undefined,
    signal,
    DestroyRef,
    EventEmitter,
    inject: (token) => {
      if (token === SessaoService) return sessao;
      if (token === CatalogoPendenteService) return { daConta: () => pendente };
      if (token === MidiaPendenteService) return { daConta: () => () => null };
      if (token === DestroyRef) return { onDestroy: (fn) => destroys.push(fn) };
      throw new Error('Dependência inesperada.');
    },
  };
  const context = {
    exports: {},
    structuredClone,
    require: (name) => {
      if (name === '@angular/core') return core;
      if (name.includes('sessao')) return { SessaoService, ApiFailure };
      if (name.includes('catalogo-pendente')) return { CatalogoPendenteService };
      if (name.includes('midia-pendente')) return { MidiaPendenteService };
      if (name.includes('modelos')) return { mensagemErro: (error) => error.message };
      return {};
    },
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(repo + '/frontend/src/app/catalogo/gestao-catalogo.component.ts', 'utf8'),
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
  const gestao = new context.exports.GestaoCatalogoComponent();
  await new Promise(setImmediate);
  assert.equal(gestao.incerto(), true);
  assert.equal(gestao.componentes().length, 0);
  return {
    gestao,
    pendente,
    calls,
    ApiFailure,
    destroy: () => destroys.forEach((fn) => fn()),
    responderCombo: (fn) => {
      consultarCombo = fn;
    },
    responderComponente: (fn) => {
      consultarComponente = fn;
    },
  };
}

async function comboSalvoRecuperaOpcoesEAdicionaisAoRetomarConta() {
  const f = await fixture();
  await f.gestao.reconciliar();
  assert.equal(f.gestao.componentes().length, 1, 'O editor precisa das opções referenciadas.');
  assert.deepEqual(f.gestao.componentes()[0], componente);
  assert.equal(f.gestao.produtoSelecionado().versao, 1);
  assert.equal(f.gestao.criando(), false);
  assert.equal(f.gestao.incerto(), false);
  assert.equal(f.pendente(), null);
  assert.ok(
    f.calls.every((call) => call.method === 'GET'),
    'Reconciliação não reenvia escrita.',
  );
}

async function criacaoNaoEncontradaPreservaRascunhoECarregaReferencias() {
  const f = await fixture();
  f.responderCombo(async () => {
    throw new f.ApiFailure(404, 'Produto não encontrado.');
  });
  await f.gestao.reconciliar();
  assert.equal(f.gestao.componentes().length, 1);
  assert.deepEqual(f.gestao.produtoSelecionado(), combo);
  assert.equal(f.gestao.criando(), true);
  assert.equal(f.pendente(), null);
}

async function falhaNaReferenciaMantemPendenciaAteNovaConsulta() {
  const f = await fixture();
  const anterior = f.pendente();
  f.responderComponente(async () => {
    throw new Error('Conexão interrompida ao consultar componente.');
  });
  await f.gestao.reconciliar();
  assert.equal(f.pendente(), anterior);
  assert.equal(f.gestao.incerto(), true);
  assert.equal(f.gestao.produtoSelecionado(), null);
  assert.match(f.gestao.erro(), /Conexão interrompida/);
  f.responderComponente(async () => structuredClone(componente));
  await f.gestao.reconciliar();
  assert.equal(f.gestao.componentes().length, 1);
  assert.equal(f.pendente(), null);
}

async function componenteInativoContinuaIdentificavelNaComposicaoRecuperada() {
  const f = await fixture();
  f.responderComponente(async () => ({ ...structuredClone(componente), ativo: false }));
  await f.gestao.reconciliar();
  assert.equal(f.gestao.componentes()[0].id, componente.id);
  assert.equal(f.gestao.componentes()[0].ativo, false);
  assert.equal(f.gestao.produtoSelecionado().grupos[0].opcoes[0].produtoId, componente.id);
  assert.equal(f.pendente(), null);
}

async function respostaAposDestruicaoNaoReabreEditorNemApagaPendencia() {
  const f = await fixture();
  let concluir;
  f.responderComponente(
    () =>
      new Promise((resolve) => {
        concluir = resolve;
      }),
  );
  const consulta = f.gestao.reconciliar();
  await new Promise(setImmediate);
  assert.equal(typeof concluir, 'function');
  f.destroy();
  concluir(structuredClone(componente));
  await consulta;
  assert.equal(f.gestao.produtoSelecionado(), null);
  assert.equal(f.gestao.componentes().length, 0);
  assert.equal(f.pendente().dados.id, combo.id);
}

(async () => {
  for (const test of [
    comboSalvoRecuperaOpcoesEAdicionaisAoRetomarConta,
    criacaoNaoEncontradaPreservaRascunhoECarregaReferencias,
    falhaNaReferenciaMantemPendenciaAteNovaConsulta,
    componenteInativoContinuaIdentificavelNaComposicaoRecuperada,
    respostaAposDestruicaoNaoReabreEditorNemApagaPendencia,
  ]) {
    await test();
    console.log(test.name + ': aprovado');
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// Regressões de estado da UI com transporte controlado; não substituem a matriz integrada.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (v) => Object.assign(() => v, { set: (x) => (v = x) });
class ApiFailure extends Error {
  constructor(status) {
    super('Acesso negado.');
    this.status = status;
  }
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const espera = () => {
  let resolve, reject;
  const promise = new Promise((ok, erro) => {
    resolve = ok;
    reject = erro;
  });
  return { promise, resolve, reject };
};
async function fixture(tipo) {
  const relatorio = tipo === 'relatorios/vendas';
  const efeitos = [];
  const destrutores = [];
  const requests = [];
  const payload = relatorio
    ? {
        inicio: '2026-11-01',
        fim: '2026-11-02',
        pedidosCriados: 123,
        fuso: 'America/Sao_Paulo',
        consultadoEm: '2026-11-01T12:00:00Z',
      }
    : { itens: [{ pedido: { id: 'pedido-A' }, endereco: { contato: 'ficticio' } }], mais: true };
  let responder = async () => payload;
  const sessao = {
    identidade: signal({ usuarioId: 'conta-A' }),
    api: async (url) => {
      requests.push(url);
      return responder(url);
    },
  };
  const dependencias = {
    sessao,
    nav: { bloquear() {}, liberar() {} },
    comandos: { ocupado: () => false, pendente: () => null },
    destroy: { onDestroy: (fn) => destrutores.push(fn) },
  };
  const core = {
    Component: () => (c) => c,
    DestroyRef: 'destroy',
    signal,
    input: Object.assign(signal, { required: () => signal('unidade-A') }),
    effect: (fn) => efeitos.push(fn),
    untracked: (fn) => fn(),
    inject: (token) => dependencias[token],
  };
  const contexto = {
    exports: {},
    URLSearchParams,
    crypto: { randomUUID },
    setInterval: () => 1,
    clearInterval() {},
    require: (nome) =>
      nome === '@angular/core'
        ? core
        : {
            SessaoService: 'sessao',
            NavegacaoProtegidaService: 'nav',
            PedidoComandoService: 'comandos',
            ApiFailure,
            mensagemErro: (erro) => erro.message,
          },
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(repo + '/frontend/src/app/' + tipo + '.component.ts', 'utf8'),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
          experimentalDecorators: true,
        },
      },
    ).outputText,
    contexto,
  );
  const c = new contexto.exports[relatorio ? 'VendasComponent' : 'ExpedicaoComponent']();
  efeitos.forEach((fn) => fn());
  await tick();
  return {
    c,
    sessao,
    requests,
    payload,
    responder: (fn) => (responder = fn),
    contexto: () => efeitos[0](),
    destruir: () => destrutores.forEach((fn) => fn()),
  };
}
async function expedicaoLimpaDadosQuandoAcessoTermina() {
  for (const status of [401, 403, 404]) {
    const f = await fixture('delivery/expedicao');
    assert.equal(f.c.lista().length, 1);
    f.c.motivos = { 'pedido-A': 'Dado pessoal no motivo' };
    f.c.devolverTaxa = { 'pedido-A': true };
    f.c.pagina.set(2);
    f.responder(async () => {
      throw new ApiFailure(status);
    });
    await f.c.carregar(2);
    assert.equal(f.c.lista().length, 0);
    assert.equal(f.c.pagina(), 0);
    assert.equal(f.c.mais(), false);
    assert.equal(Object.keys(f.c.motivos).length, 0);
    assert.equal(Object.keys(f.c.devolverTaxa).length, 0);
    assert.equal(f.c.carregando(), false);
    assert.equal(f.c.erro(), 'Acesso negado.');
    f.destruir();
  }
}
async function expedicaoDescartaRespostaDeOutraUnidade() {
  const f = await fixture('delivery/expedicao');
  const antiga = espera();
  f.responder(() => antiga.promise);
  const consulta = f.c.carregar(0);
  f.c.unidadeId.set('unidade-B');
  f.responder(async () => ({ itens: [], mais: false }));
  f.contexto();
  await tick();
  antiga.resolve(f.payload);
  await consulta;
  assert.equal(f.c.lista().length, 0);
  assert.equal(f.c.mais(), false);
  f.destruir();
}
async function relatorioIdentificaPeriodoEfetivamenteConsultado() {
  const f = await fixture('relatorios/vendas');
  const resposta = espera();
  f.responder(() => resposta.promise);
  f.c.inicio = '2026-11-01';
  f.c.fim = '2026-11-02';
  const consulta = f.c.carregar();
  assert.equal(f.c.dados(), null, 'Consulta nova retira valores do período anterior.');
  assert.equal(f.c.ocupado(), true);
  f.c.inicio = '2026-11-08';
  f.c.fim = '2026-11-09';
  resposta.resolve(f.payload);
  await consulta;
  assert.equal(f.c.dados().inicio, '2026-11-01');
  assert.equal(f.c.dados().fim, '2026-11-02');
  assert.equal(f.c.dados().pedidosCriados, 123);
  assert.equal(f.c.data(f.c.dados().inicio), '01/11/2026');
  assert.match(f.requests.at(-1), /inicio=2026-11-01&fim=2026-11-02$/);
  f.destruir();
}
async function relatorioComFalhaNaoConservaValoresAntigos() {
  for (const status of [0, 400, 401, 403, 404, 500]) {
    const f = await fixture('relatorios/vendas');
    assert.equal(f.c.dados().pedidosCriados, 123);
    f.responder(async () => {
      throw new ApiFailure(status);
    });
    await f.c.carregar();
    assert.equal(f.c.dados(), null);
    assert.equal(f.c.ocupado(), false);
    assert.equal(f.c.erro(), 'Acesso negado.');
    f.destruir();
  }
}
async function renovacaoDaMesmaContaNaoConsultaRascunho() {
  const f = await fixture('relatorios/vendas');
  const anterior = f.c.dados();
  f.c.inicio = '2026-11-09';
  f.sessao.identidade.set({ usuarioId: 'conta-A' });
  f.contexto();
  await tick();
  assert.equal(f.requests.length, 1);
  assert.equal(f.c.dados(), anterior);
  assert.equal(f.c.inicio, '2026-11-09');
  f.destruir();
}
async function relatorioAtrasadoNaoCruzaContextoOuDestruicao() {
  for (const alteracao of ['unidade', 'conta', 'destruicao']) {
    const f = await fixture('relatorios/vendas');
    const antiga = espera();
    f.responder(() => antiga.promise);
    const consultaAntiga = f.c.carregar();
    if (alteracao === 'destruicao') {
      f.destruir();
    } else {
      const atual = espera();
      f.responder(() => atual.promise);
      if (alteracao === 'unidade') f.c.unidadeId.set('unidade-B');
      else f.sessao.identidade.set({ usuarioId: 'conta-B' });
      f.contexto();
      antiga.resolve(f.payload);
      await consultaAntiga;
      assert.equal(f.c.dados(), null);
      assert.equal(f.c.ocupado(), true, 'Resposta antiga não encerra a consulta vigente.');
      atual.resolve({ ...f.payload, pedidosCriados: 456 });
      await tick();
      assert.equal(f.c.dados().pedidosCriados, 456);
      f.destruir();
      continue;
    }
    antiga.resolve(f.payload);
    await consultaAntiga;
    assert.equal(f.c.dados(), null);
  }
}
(async () => {
  for (const teste of [
    expedicaoLimpaDadosQuandoAcessoTermina,
    expedicaoDescartaRespostaDeOutraUnidade,
    relatorioIdentificaPeriodoEfetivamenteConsultado,
    relatorioComFalhaNaoConservaValoresAntigos,
    renovacaoDaMesmaContaNaoConsultaRascunho,
    relatorioAtrasadoNaoCruzaContextoOuDestruicao,
  ]) {
    await teste();
    console.log(teste.name + ': aprovado');
  }
})().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});

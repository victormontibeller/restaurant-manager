// Evento recebido durante carga manual deve aguardar e reler antes de avançar cursor.
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
  });
};
class DestroyRef {}
class SessaoService {}
class SessaoMesaService {}
class AcompanhamentoEventos {
  iniciar(_transporte, _rota, parametros) {
    this.parametros = parametros;
  }
  encerrar() {}
}
async function verificar(arquivo, nome, metodo) {
  let concluirManual;
  let concluirEvento;
  let chamadas = 0;
  const timers = [];
  const efeitos = [];
  const destruidores = [];
  const sessao = {
    identidade: () => ({ usuarioId: 'cliente' }),
    participante: () => null,
    confirmado: () => 0,
    api: () =>
      new Promise((resolve) => {
        chamadas++;
        if (chamadas === 1) concluirManual = resolve;
        else concluirEvento = resolve;
      }),
  };
  const input = Object.assign((initial) => signal(initial), {
    required: () => signal('unidade-a'),
  });
  const context = {
    exports: {},
    URLSearchParams,
    setTimeout: (fn, ms) => {
      const timer = { fn, ms, cancelado: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout: (timer) => {
      if (timer) timer.cancelado = true;
    },
    require: (name) => {
      if (name === '@angular/core')
        return {
          Component: () => (value) => value,
          signal,
          input,
          effect: (fn) => efeitos.push(fn),
          untracked: (fn) => fn(),
          DestroyRef,
          inject: (type) =>
            type === DestroyRef ? { onDestroy: (fn) => destruidores.push(fn) } : sessao,
        };
      if (name.includes('sessao-mesa')) return { SessaoMesaService };
      if (name.includes('sessao.service'))
        return { SessaoService, ApiFailure: class extends Error {} };
      if (name.includes('acompanhamento')) return { AcompanhamentoEventos };
      if (name.includes('catalogo/modelos')) return { mensagemErro: (error) => error.message };
      return {};
    },
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(repo + '/frontend/src/app/' + arquivo, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        experimentalDecorators: true,
      },
    }).outputText,
    context,
  );
  const Classe = context.exports[nome];
  Classe.prototype.carregarAcessos = async () => {};
  const componente = new Classe();
  if (nome === 'OperacaoPedidosComponent') componente.unidadeId.set('unidade-a');
  const manual = nome === 'CozinhaComponent' ? componente[metodo]() : componente[metodo](0);
  let eventoConfirmado = false;
  const evento = (
    nome === 'CozinhaComponent' ? componente[metodo](true) : componente[metodo](0, true)
  ).then(() => {
    eventoConfirmado = true;
  });
  assert.equal(chamadas, 1, 'Carga anterior deve terminar antes da nova consulta.');
  assert.equal(eventoConfirmado, false);
  concluirManual({ itens: [{ id: 'anterior', versao: 1 }], mais: false });
  await manual;
  await new Promise(setImmediate);
  assert.equal(chamadas, 2, 'Evento exige snapshot posterior à carga manual.');
  assert.equal(
    eventoConfirmado,
    false,
    'Cursor não pode avançar só porque a consulta antiga terminou.',
  );
  const duasUnidades = [
    { id: 'atual', unidadeId: 'unidade-a', versao: 2 },
    { id: 'outro', unidadeId: 'unidade-b', versao: 1 },
  ];
  concluirEvento({
    itens: nome === 'MeusPedidosComponent' ? duasUnidades : [{ id: 'atual', versao: 2 }],
    mais: false,
  });
  await evento;
  assert.equal(componente.pedidos()[0].versao, 2);
  assert.equal(eventoConfirmado, true);
  console.log(nome + ': snapshot posterior ao evento aprovado');
  if (nome === 'MeusPedidosComponent') {
    const ativo = () => timers.filter((timer) => !timer.cancelado);
    assert.equal(ativo().length, 1);
    assert.equal(ativo()[0].ms, 5000);
    const leituraManual = componente.carregar(0);
    const vencimento = ativo()[0];
    vencimento.cancelado = true;
    vencimento.fn();
    const mesmaAtualizacao = componente.carregar(0, true);
    assert.equal(chamadas, 3, 'Timer e SSE aguardam a leitura manual sem consultas paralelas.');
    concluirEvento({ itens: duasUnidades, mais: false });
    await leituraManual;
    await new Promise(setImmediate);
    assert.equal(chamadas, 4, 'Timer e evento devem compartilhar uma única reconsulta.');
    concluirEvento({
      itens: [duasUnidades[0], { ...duasUnidades[1], versao: 2, estado: 'PRONTO' }],
      mais: false,
    });
    await mesmaAtualizacao;
    assert.equal(chamadas, 4);
    assert.equal(
      componente.pedidos()[1].estado,
      'PRONTO',
      'Pedido da segunda unidade atualiza sem evento na primeira.',
    );
    assert.equal(ativo().length, 1, 'Não acumular timers a cada snapshot.');
    const unica = componente.carregar(0, true);
    concluirEvento({ itens: [duasUnidades[1]], mais: false });
    await unica;
    assert.equal(ativo().length, 0, 'Uma única unidade deixa de usar consulta complementar.');
    assert.equal(componente.outrasUnidades(), false);
    assert.equal(
      componente.acompanhamento.parametros.unidadeId,
      'unidade-b',
      'A única unidade remanescente passa a ser o escopo do stream.',
    );
    const multiplas = componente.carregar(0);
    concluirEvento({ itens: duasUnidades, mais: false });
    await multiplas;
    const anterior = ativo()[0];
    efeitos[0]();
    assert.equal(anterior.cancelado, true, 'Troca de contexto cancela o timer anterior.');
    const aposTroca = chamadas;
    anterior.fn();
    assert.equal(chamadas, aposTroca, 'Callback antigo não consulta na sessão nova.');
    concluirEvento({ itens: [duasUnidades[0]], mais: false });
    await new Promise(setImmediate);
    const final = componente.carregar(0);
    concluirEvento({ itens: duasUnidades, mais: false });
    await final;
    const ultimo = ativo()[0];
    destruidores[0]();
    assert.equal(ultimo.cancelado, true, 'Destruição cancela o timer.');
    const antesDestruir = chamadas;
    ultimo.fn();
    assert.equal(chamadas, antesDestruir);
    assert.equal(ativo().length, 0);
    console.log(
      'Múltiplas unidades: atualização em5s, coalescimento, redução para uma unidade e limpeza de contexto/destroy aprovados.',
    );
  }
}
(async () => {
  await verificar('cozinha/cozinha.component.ts', 'CozinhaComponent', 'carregar');
  await verificar('pedidos/meus-pedidos.component.ts', 'MeusPedidosComponent', 'carregar');
  await verificar(
    'pedidos/operacao-pedidos.component.ts',
    'OperacaoPedidosComponent',
    'carregarPedidos',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// Executa os serviços reais de intenção com transporte fictício, sem afirmar E2E.
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
class ApiFailure extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
class SessaoService {}
class SessaoMesaService {}

function preparar(arquivo, nome) {
  let conta = 'cliente-a';
  const chamadas = [];
  let resposta = async () => {
    throw new Error('Resposta perdida depois de confirmar no servidor.');
  };
  const api = async (rota, metodo = 'GET', corpo) => {
    chamadas.push({ rota, metodo, corpo: structuredClone(corpo) });
    return resposta(rota, metodo, corpo);
  };
  const sessao = { identidade: () => ({ usuarioId: conta, perfil: 'CLIENTE' }), api };
  const mesa = { participante: () => ({ participanteId: 'participante-a' }), api };
  const context = {
    exports: {},
    structuredClone,
    location: { origin: 'https://empresa.invalid' },
    window: { addEventListener: () => {} },
    require: (name) => {
      if (name === '@angular/core')
        return {
          Injectable: () => (value) => value,
          signal,
          inject: (type) => (type === SessaoService ? sessao : mesa),
        };
      if (name.includes('sessao-mesa')) return { SessaoMesaService };
      if (name.includes('sessao.service')) return { SessaoService, ApiFailure };
      return {};
    },
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(repo + '/frontend/src/app/pedidos/' + arquivo, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        experimentalDecorators: true,
      },
    }).outputText,
    context,
  );
  return {
    service: new context.exports[nome](),
    chamadas,
    responder: (fn) => {
      resposta = fn;
    },
    trocarConta: (id) => {
      conta = id;
    },
  };
}

const corpo = {
  intencaoId: 'intencao-a',
  unidadeId: 'unidade-a',
  canal: 'RETIRADA',
  comandaId: null,
  revisao: 'confirmada',
  linhas: [{ id: 'linha', quantidade: 3 }],
  observacao: '',
  endereco: null,
};

async function envioIncertoConservaIntencaoEReconciliaSemDuplicar() {
  const f = preparar('pedido-envio.service.ts', 'PedidoEnvioService');
  await assert.rejects(f.service.enviar(corpo, false), /Resposta perdida/);
  assert.equal(f.service.pendente(false).corpo.intencaoId, corpo.intencaoId);
  await assert.rejects(
    f.service.enviar({ ...corpo, intencaoId: 'nova' }, false),
    /sem confirmação/,
  );
  assert.equal(f.chamadas.length, 1);
  f.responder(async () => {
    throw new ApiFailure(404, 'Ainda não encontrado.');
  });
  assert.equal(await f.service.reconciliar(false), null);
  assert.equal(f.service.pendente(false).corpo.intencaoId, corpo.intencaoId);
  f.responder(async () => ({ id: 'pedido-confirmado', estado: 'AGUARDANDO_ACEITE' }));
  const pedido = await f.service.enviar(f.service.pendente(false).corpo, false);
  assert.equal(pedido.id, 'pedido-confirmado');
  assert.equal(f.service.pendente(false), null);
  assert.deepEqual(f.chamadas.at(-1).corpo, corpo);
}

async function rejeicaoDeRetryNaoApagaEnvioAnteriorIncerto() {
  const f = preparar('pedido-envio.service.ts', 'PedidoEnvioService');
  await assert.rejects(f.service.enviar(corpo, false));
  f.responder(async () => {
    throw new ApiFailure(401, 'Sessão encerrada.');
  });
  await assert.rejects(f.service.enviar(corpo, false));
  assert.ok(f.service.pendente(false));
  f.trocarConta('cliente-b');
  assert.equal(f.service.pendente(false), null);
  f.trocarConta('cliente-a');
  assert.ok(f.service.pendente(false));
}

async function rejeicaoDefinitivaInicialLiberaCorrecaoDoCarrinho() {
  const f = preparar('pedido-envio.service.ts', 'PedidoEnvioService');
  f.responder(async () => {
    throw new ApiFailure(409, 'Preço mudou.');
  });
  await assert.rejects(f.service.enviar(corpo, false));
  assert.equal(f.service.pendente(false), null);
}

async function respostaDeOutraContaNaoApareceNaSessaoAtual() {
  const f = preparar('pedido-envio.service.ts', 'PedidoEnvioService');
  let concluir;
  f.responder(
    () =>
      new Promise((resolve) => {
        concluir = resolve;
      }),
  );
  const envio = f.service.enviar(corpo, false);
  f.trocarConta('cliente-b');
  concluir({ id: 'pedido-da-conta-a' });
  await assert.rejects(envio, /sessão anterior/);
  assert.equal(f.service.pendente(false), null);
}

async function comandoIncertoReutilizaMesmasUnidadesEVersao() {
  const f = preparar('pedido-comando.service.ts', 'PedidoComandoService');
  const intencao = {
    rota: '/api/v1/cozinha/pedidos/pedido-a/iniciar',
    corpo: {
      intencaoId: 'comando-a',
      versao: 4,
      motivo: '',
      unidades: ['unidade-1', 'unidade-2'],
    },
  };
  await assert.rejects(f.service.executar('pedido-a', false, intencao));
  await assert.rejects(
    f.service.executar('pedido-a', false, {
      ...intencao,
      corpo: { ...intencao.corpo, unidades: ['unidade-3'] },
    }),
    /ação anterior/,
  );
  assert.equal(f.chamadas.length, 1);
  assert.equal(f.service.pendenciasDaFila('unidade-a').length, 0);
  f.responder(async () => ({ id: 'pedido-a', versao: 5 }));
  await f.service.executar('pedido-a', false, f.service.pendente('pedido-a', false));
  assert.deepEqual(f.chamadas.at(-1).corpo, intencao.corpo);
  assert.equal(f.service.pendente('pedido-a', false), null);
}

async function pendenciaDaFilaPermaneceNaUnidadeENaSessaoDoPedido() {
  const f = preparar('pedido-comando.service.ts', 'PedidoComandoService');
  const intencao = {
    rota: '/api/v1/operacao/pedidos/pedido-a/servir',
    corpo: { intencaoId: 'comando-a', versao: 4, motivo: '', unidades: [] },
  };
  await assert.rejects(f.service.executar('pedido-a', false, intencao, 'unidade-a'));
  assert.deepEqual(Array.from(f.service.pendenciasDaFila('unidade-a')), ['pedido-a']);
  assert.equal(f.service.pendenciasDaFila('unidade-b').length, 0);
  f.trocarConta('cliente-b');
  assert.equal(f.service.pendenciasDaFila('unidade-a').length, 0);
  f.trocarConta('cliente-a');
  f.responder(async () => ({ id: 'pedido-a', versao: 5 }));
  await f.service.executar('pedido-a', false, f.service.pendente('pedido-a', false));
  assert.deepEqual(f.chamadas.at(-1).corpo, intencao.corpo);
  assert.equal(f.service.pendenciasDaFila('unidade-a').length, 0);
}

function prepararDetalhePedido() {
  const efeitos = [];
  const timers = new Map();
  let contador = 0;
  let agora = Date.parse('2026-11-16T12:00:00Z');
  const pedido = {
    id: 'pedido-a',
    versao: 3,
    criadoEm: new Date(agora).toISOString(),
    unidades: [{ id: 'unidade-a', estado: 'NA_FILA' }],
  };
  const input = Object.assign((initial) => signal(initial), { required: () => signal(pedido) });
  class DestroyRef {}
  const context = {
    exports: {},
    Date: class extends Date {
      static now() {
        return agora;
      }
    },
    navigator: { onLine: true },
    window: { addEventListener() {}, removeEventListener() {} },
    setTimeout: (fn, demora) => {
      const id = ++contador;
      timers.set(id, { fn, instante: agora + demora });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    require: (name) => {
      if (name === '@angular/core')
        return {
          Component: () => (value) => value,
          DestroyRef,
          signal,
          computed: (fn) => fn,
          input,
          output: () => ({ emit() {} }),
          effect: (fn) => {
            let limpar;
            const executar = () => {
              limpar?.();
              limpar = undefined;
              fn((callback) => (limpar = callback));
            };
            efeitos.push(executar);
            executar();
          },
          inject: (type) => (type === DestroyRef ? { onDestroy() {} } : {}),
        };
      return {};
    },
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(repo + '/frontend/src/app/pedidos/pedido-detalhe.component.ts', 'utf8'),
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
  return {
    componente: new context.exports.PedidoDetalheComponent(),
    pedido,
    atualizar: () => efeitos.forEach((fn) => fn()),
    proximoIntervalo: () => timers.values().next().value?.instante - agora,
    avancar: () => {
      assert.equal(timers.size, 1);
      const [id, { fn, instante }] = timers.entries().next().value;
      timers.delete(id);
      agora = instante;
      fn();
    },
    agendamentos: () => timers.size,
  };
}

async function selecaoSobreviveSnapshotDaMesmaVersao() {
  const { componente, pedido, atualizar } = prepararDetalhePedido();
  componente.selecionar('unidade-a', true);
  componente.pedido.set(structuredClone(pedido));
  atualizar();
  assert.equal(
    componente.selecionadas().length,
    1,
    'Reconexão/heartbeat não pode apagar seleção vigente.',
  );
  componente.pedido.set({ ...pedido, versao: 4 });
  atualizar();
  assert.equal(componente.selecionadas().length, 0, 'Mudança real do pedido exige nova seleção.');
  let comandos = 0;
  Object.assign(componente.comandos, {
    ocupado: () => false,
    pendente: () => null,
    executar: async () => {
      comandos++;
    },
  });
  componente.pedido.set({
    ...pedido,
    canal: 'MESA',
    estado: 'PRONTO',
    solicitacoes: [{ estado: 'PENDENTE' }],
  });
  assert.equal(componente.cancelamentoPendente(), true);
  await componente.comandar('servir');
  assert.equal(comandos, 0, 'Servir aguarda a decisão do cancelamento pendente.');
  assert.match(componente.erro(), /decisão sobre o cancelamento/);
  componente.pedido.set({
    ...pedido,
    canal: 'MESA',
    estado: 'PRONTO',
    solicitacoes: [{ estado: 'REJEITADA' }],
  });
  assert.equal(componente.cancelamentoPendente(), false);
}

function relogioDePedidoSoAtualizaHorarioVisivel() {
  const { componente, pedido, atualizar, proximoIntervalo, avancar, agendamentos } =
    prepararDetalhePedido();
  assert.equal(agendamentos(), 0, 'Cliente sem prazo não precisa de temporizador.');
  componente.pedido.set({
    ...pedido,
    estado: 'AGUARDANDO_ACEITE',
    expirarEm: '2026-11-16T12:00:02.500Z',
  });
  atualizar();
  assert.equal(proximoIntervalo(), 1000);
  assert.match(componente.prazo(), /3 s/);
  avancar();
  avancar();
  assert.equal(proximoIntervalo(), 500);
  avancar();
  assert.match(componente.prazo(), /Prazo vencido/);
  assert.equal(agendamentos(), 0, 'Prazo vencido permanece estável até atualização da API.');

  componente.contexto.set('operacao');
  componente.pedido.set({ ...pedido, estado: 'NA_FILA' });
  atualizar();
  assert.equal(componente.tempoDecorrido(), 'Agora');
  assert.equal(proximoIntervalo(), 57500);
  avancar();
  assert.equal(componente.tempoDecorrido(), '1 min');
}

async function rascunhoDeCheckoutPermaneceSegregadoPorContaUnidadeECanal() {
  const f = preparar('pedido-envio.service.ts', 'PedidoEnvioService');
  const original = f.service.rascunho(false, 'unidade-a', 'MESA');
  Object.assign(original, { observacao: 'Sem cebola', comandaId: 'comanda-51', paginaMesas: 1 });
  assert.equal(f.service.rascunho(false, 'unidade-b', 'MESA').observacao, '');
  assert.equal(f.service.rascunho(false, 'unidade-a', 'RETIRADA').comandaId, '');
  assert.equal(f.service.rascunho(true, 'unidade-a', 'MESA').observacao, '');
  f.trocarConta('cliente-b');
  assert.equal(f.service.rascunho(false, 'unidade-a', 'MESA').observacao, '');
  f.trocarConta('cliente-a');
  const recuperado = f.service.rascunho(false, 'unidade-a', 'MESA');
  assert.equal(recuperado.observacao, 'Sem cebola');
  assert.equal(recuperado.comandaId, 'comanda-51');
  assert.equal(recuperado.paginaMesas, 1);
}

(async () => {
  for (const test of [
    envioIncertoConservaIntencaoEReconciliaSemDuplicar,
    rejeicaoDeRetryNaoApagaEnvioAnteriorIncerto,
    rejeicaoDefinitivaInicialLiberaCorrecaoDoCarrinho,
    respostaDeOutraContaNaoApareceNaSessaoAtual,
    comandoIncertoReutilizaMesmasUnidadesEVersao,
    pendenciaDaFilaPermaneceNaUnidadeENaSessaoDoPedido,
    selecaoSobreviveSnapshotDaMesmaVersao,
    relogioDePedidoSoAtualizaHorarioVisivel,
    rascunhoDeCheckoutPermaneceSegregadoPorContaUnidadeECanal,
  ]) {
    await test();
    console.log(test.name + ': aprovado');
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

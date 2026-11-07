// Lógica de funcionamento com API fictícia; não substitui PostgreSQL nem E2E.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (value) =>
  Object.assign(() => value, {
    set: (next) => (value = next),
    update: (change) => (value = change(value)),
  });
class Failure extends Error {
  constructor(status, codigo = '', message = 'Resposta recusada pelo servidor.') {
    super(message);
    this.status = status;
    this.codigo = codigo;
  }
}
const copy = (value) => JSON.parse(JSON.stringify(value));
const snapshot = (versao = 0) => ({
  unidadeId: 'A',
  versao,
  versaoUnidade: 3,
  fuso: 'America/Sao_Paulo',
  canais: ['DELIVERY'],
  horarios: [{ canal: 'DELIVERY', diaSemana: 7, inicio: '22:00', fim: '02:00' }],
});

function fixture() {
  const destroy = {};
  const effects = [];
  const callbacks = [];
  const requests = [];
  const blocked = [];
  const identity = signal({ usuarioId: 'conta' });
  let responder = async () => snapshot();
  const sessao = {
    identidade: identity,
    api: (url, method = 'GET', body) => {
      requests.push({ url, method, body: body && copy(body) });
      return responder(url, method, body);
    },
  };
  const core = {
    Component: () => (type) => type,
    Input: () => () => {},
    Output: () => () => {},
    ViewChild: () => () => {},
    EventEmitter: class {
      emit(value) {
        blocked.push(value);
      }
    },
    DestroyRef: destroy,
    signal,
    effect: (callback) => effects.push(callback),
    inject: (token) =>
      token === destroy ? { onDestroy: (callback) => callbacks.push(callback) } : sessao,
  };
  const context = {
    exports: {},
    require: (name) => (name === '@angular/core' ? core : { ApiFailure: Failure }),
    setTimeout: () => 0,
    Error,
    console,
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(repo + '/frontend/src/app/unidades/funcionamento.component.ts', 'utf8'),
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
  const component = new context.exports.FuncionamentoUnidadeComponent();
  component.unidadeId = 'A';
  component.nome = 'Unidade fictícia';
  return {
    component,
    requests,
    blocked,
    identity,
    effects,
    callbacks,
    responder: (next) => (responder = next),
  };
}
const event = () => ({ preventDefault() {} });

async function consultaExplicitaEPayloadDaVersaoAtual() {
  const f = fixture();
  const c = f.component;
  assert.equal(f.requests.length, 0, 'Abrir a lista não consulta horários de todas as unidades');
  await c.consultar();
  assert.equal(c.versao(), 0);
  assert.equal(c.versaoUnidade(), 3);
  assert.equal(c.fusoConsultado(), 'America/Sao_Paulo');
  assert.deepEqual(f.blocked, [true, false]);
  const horario = c.horarios()[0];
  c.habilitar('DELIVERY', false);
  assert.equal(c.horarios().length, 1, 'Desabilitar preserva horário');
  c.habilitar('RETIRADA', true);
  c.alterarCanal(horario.chave, 'RETIRADA');
  c.alterarDia(horario.chave, '6');
  c.alterarHora(horario.chave, 'fim', '24:00');
  f.responder(async (_url, _method, body) => ({ ...snapshot(), ...body, versao: 1 }));
  await c.salvar(event());
  assert.deepEqual(f.requests.at(-1), {
    url: '/api/v1/configuracoes/unidades/A/funcionamento',
    method: 'PUT',
    body: {
      versao: 0,
      versaoUnidade: 3,
      canais: ['RETIRADA'],
      horarios: [{ canal: 'RETIRADA', diaSemana: 6, inicio: '22:00', fim: '24:00' }],
    },
  });
  assert.equal(c.versao(), 1);
  assert.equal(c.aviso(), 'Funcionamento salvo no servidor.');
}

async function conflitoOuFalhaIncertaExigeConsultaAntesDeReenviar() {
  for (const failure of [new Failure(409), new Failure(503), new Error('Conexão interrompida.')]) {
    const f = fixture();
    const c = f.component;
    await c.consultar();
    f.responder(async () => {
      throw failure;
    });
    await c.salvar(event());
    assert.equal(c.reconsultaObrigatoria(), true);
    assert.equal(c.ocupado(), false);
    assert.equal(f.blocked.at(-1), false, 'Reconciliação não bloqueia navegação indefinidamente');
    c.adicionar();
    c.habilitar('MESA', true);
    await c.salvar(event());
    assert.equal(f.requests.length, 2, 'Não reenviar a versão antiga');
    assert.equal(c.horarios().length, 1);
    assert.deepEqual(copy(c.canais()), ['DELIVERY']);
    f.responder(async () => snapshot(7));
    await c.consultar();
    assert.equal(c.reconsultaObrigatoria(), false);
    assert.equal(c.versao(), 7);
    f.responder(async (_url, _method, body) => ({ ...snapshot(), ...body, versao: 8 }));
    await c.salvar(event());
    assert.equal(f.requests.at(-1).body.versao, 7);
  }
}

async function validacaoEReautenticacaoPreservamRascunho() {
  for (const failure of [new Failure(422), new Failure(403, 'REAUTENTICACAO_NECESSARIA')]) {
    const f = fixture();
    const c = f.component;
    await c.consultar();
    c.alterarHora(c.horarios()[0].chave, 'inicio', '21:00');
    f.responder(async () => {
      throw failure;
    });
    await c.salvar(event());
    assert.equal(c.reconsultaObrigatoria(), false);
    assert.equal(c.versao(), 0);
    assert.equal(c.horarios()[0].inicio, '21:00');
    if (failure.status === 403) assert.match(c.erro(), /Confirme sua identidade/);
  }
}

async function consultaNegadaLimpaDadosENaoMantemSucesso() {
  for (const status of [401, 403, 404]) {
    const f = fixture();
    const c = f.component;
    await c.consultar();
    f.responder(async () => {
      throw new Failure(status);
    });
    await c.consultar();
    assert.equal(c.versao(), null);
    assert.equal(c.versaoUnidade(), null);
    assert.equal(c.fusoConsultado(), '');
    assert.equal(c.horarios().length, 0);
    assert.equal(c.canais().length, 0);
    assert.equal(c.aviso(), '');
    assert.ok(c.erro());
  }
}

async function bloqueioEOperacaoEmCursoImpedemDuplicacao() {
  const f = fixture();
  const c = f.component;
  c.bloqueado = true;
  await c.consultar();
  assert.equal(f.requests.length, 0);
  c.bloqueado = false;
  await c.consultar();
  let finish;
  f.responder(() => new Promise((resolve) => (finish = resolve)));
  const pending = c.salvar(event());
  assert.equal(c.ocupado(), true);
  await c.salvar(event());
  await c.consultar();
  c.remover(c.horarios()[0].chave);
  assert.equal(c.horarios().length, 1);
  assert.equal(f.requests.length, 2);
  finish(snapshot(1));
  await pending;
  assert.deepEqual(f.blocked, [true, false, true, false]);
}

async function logoutEDestruicaoLimpamDadosEDescartamResposta() {
  for (const action of ['logout', 'destroy']) {
    const f = fixture();
    const c = f.component;
    await c.consultar();
    let finish;
    f.responder(() => new Promise((resolve) => (finish = resolve)));
    const pending = c.salvar(event());
    if (action === 'logout') {
      f.identity.set(null);
      f.effects.forEach((callback) => callback());
    } else f.callbacks.forEach((callback) => callback());
    finish(snapshot(1));
    await pending;
    assert.equal(c.versao(), null);
    assert.equal(c.versaoUnidade(), null);
    assert.equal(c.fusoConsultado(), '');
    assert.equal(c.horarios().length, 0);
    assert.equal(c.canais().length, 0);
    assert.equal(c.aberto(), false);
    assert.equal(c.ocupado(), false);
    assert.equal(c.aviso(), '');
  }
}

async function limiteDeLinhasEChavesEstaveis() {
  const f = fixture();
  const c = f.component;
  await c.consultar();
  for (let index = 0; index < 90; index++) c.adicionar();
  assert.equal(c.horarios().length, 84);
  assert.equal(new Set(c.horarios().map((row) => row.chave)).size, 84);
  const [first, second] = c.horarios();
  c.remover(first.chave);
  c.alterarHora(second.chave, 'inicio', '10:00');
  c.alterarDia(second.chave, '8');
  c.alterarCanal(second.chave, 'INVENTADO');
  assert.equal(c.horarios()[0].chave, second.chave);
  assert.equal(c.horarios()[0].inicio, '10:00');
  assert.equal(c.horarios()[0].diaSemana, 1);
  assert.equal(c.horarios()[0].canal, 'DELIVERY');
}

async function respostaDeOutraUnidadeNaoPodeSerSalva() {
  const f = fixture();
  f.responder(async () => ({ ...snapshot(), unidadeId: 'B' }));
  await f.component.consultar();
  assert.equal(f.component.versao(), null);
  assert.equal(f.component.reconsultaObrigatoria(), true);
  assert.match(f.component.erro(), /não corresponde à unidade/);
  await f.component.salvar(event());
  assert.equal(f.requests.length, 1);
}

async function mudancaDeFusoExigeNovaConsultaEConfirmaCadastroAtual() {
  const f = fixture();
  const c = f.component;
  let servidor = { ...snapshot(), fuso: 'UTC', versaoUnidade: 4 };
  f.responder(async (_url, method, body) => {
    if (method === 'PUT') {
      if (body.versaoUnidade !== servidor.versaoUnidade)
        throw new Failure(
          409,
          'CONFLITO',
          'O cadastro da unidade foi alterado. Recarregue antes de salvar.',
        );
      servidor = { ...servidor, ...body, versao: servidor.versao + 1 };
    }
    return copy(servidor);
  });
  await c.consultar();
  assert.equal(c.fusoConsultado(), 'UTC');
  assert.equal(c.versaoUnidade(), 4);
  servidor = { ...servidor, fuso: 'America/Manaus', versaoUnidade: 5 };
  await c.salvar(event());
  assert.equal(c.reconsultaObrigatoria(), true);
  assert.equal(c.versao(), 0, 'Conflito cadastral não altera funcionamento');
  assert.equal(c.fusoConsultado(), 'UTC', 'Não adivinhar fuso após conflito');
  await c.salvar(event());
  assert.equal(f.requests.length, 2, 'A versão cadastral antiga não pode ser reenviada');
  await c.consultar();
  assert.equal(c.fusoConsultado(), 'America/Manaus');
  assert.equal(c.versaoUnidade(), 5);
  assert.equal(c.reconsultaObrigatoria(), false);
  await c.salvar(event());
  assert.equal(f.requests.at(-1).body.versaoUnidade, 5);
  assert.equal(f.requests.at(-1).body.versao, 0);
  assert.equal(c.versao(), 1);
}

(async () => {
  for (const test of [
    consultaExplicitaEPayloadDaVersaoAtual,
    conflitoOuFalhaIncertaExigeConsultaAntesDeReenviar,
    validacaoEReautenticacaoPreservamRascunho,
    consultaNegadaLimpaDadosENaoMantemSucesso,
    bloqueioEOperacaoEmCursoImpedemDuplicacao,
    logoutEDestruicaoLimpamDadosEDescartamResposta,
    limiteDeLinhasEChavesEstaveis,
    respostaDeOutraUnidadeNaoPodeSerSalva,
    mudancaDeFusoExigeNovaConsultaEConfirmaCadastroAtual,
  ]) {
    await test();
    console.log(test.name + ': aprovado');
  }
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});

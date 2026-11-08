// Regressões de contexto executam o TypeScript real; o transporte é controlado.
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
class PendenciasMesaService {}
class NavegacaoProtegidaService {}
class DestroyRef {}
class AcompanhamentoEventos {
  iniciar() {}
  encerrar() {}
}
function carregar(arquivo, nome, services = {}, adicionais = {}) {
  const efeitos = [];
  const destruidores = [];
  if (services.mesa) {
    services.mesa.encerramentoPendente ??= signal(false);
    services.mesa.inicializar ??= services.mesa.restaurar;
  }
  const input = Object.assign((initial) => signal(initial), {
    required: () => signal('unidade-a'),
  });
  const context = {
    exports: {},
    Error,
    Response,
    AbortSignal,
    structuredClone,
    crypto: require('node:crypto').webcrypto,
    location: { origin: 'https://empresa.invalid', search: '' },
    window: { addEventListener() {}, confirm: () => false },
    URLSearchParams,
    navigator: { locks: { request: async (_, fn) => fn() } },
    BroadcastChannel: class {
      postMessage() {}
    },
    setTimeout: () => 1,
    clearTimeout() {},
    ...adicionais,
    require: (name) => {
      if (name === '@angular/core')
        return {
          Component: () => (value) => value,
          Injectable: () => (value) => value,
          signal,
          computed: (fn) => fn,
          input,
          effect: (fn) => efeitos.push(fn),
          untracked: (fn) => fn(),
          DestroyRef,
          inject: (type) =>
            type === DestroyRef
              ? { onDestroy: (fn) => destruidores.push(fn) }
              : type === SessaoService
                ? services.sessao
                : type === PendenciasMesaService
                  ? (services.pendencias ??= servicoReal(
                      'mesas/pendencias-mesa.service.ts',
                      'PendenciasMesaService',
                    ))
                  : type === NavegacaoProtegidaService
                    ? (services.navegacao ??= servicoReal(
                        'rotas/navegacao-protegida.service.ts',
                        'NavegacaoProtegidaService',
                      ))
                    : services.mesa,
        };
      if (name.includes('sessao-mesa')) return { SessaoMesaService };
      if (name.includes('sessao.service')) return { SessaoService, ApiFailure };
      if (name.includes('pendencias-mesa.service')) return { PendenciasMesaService };
      if (name.includes('navegacao-protegida.service')) return { NavegacaoProtegidaService };
      if (name.includes('acompanhamento')) return { AcompanhamentoEventos };
      if (name.includes('catalogo/modelos'))
        return { mensagemErro: (error) => error.message, moeda: (value) => value };
      return {};
    },
  };
  function servicoReal(relative, exported) {
    const modulo = { ...context, exports: {} };
    vm.runInNewContext(
      ts.transpileModule(fs.readFileSync(repo + '/frontend/src/app/' + relative, 'utf8'), {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
          experimentalDecorators: true,
        },
      }).outputText,
      modulo,
    );
    return new modulo.exports[exported]();
  }
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(repo + '/frontend/src/app/mesas/' + arquivo, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        experimentalDecorators: true,
      },
    }).outputText,
    context,
  );
  return { instance: new context.exports[nome](), efeitos, destruidores, context, services };
}
const participante = (id) => ({
  participanteId: id,
  sessaoId: 'sessao-' + id,
  empresaId: 'empresa',
  atendimentoId: 'atendimento-' + id,
  comandaId: 'comanda-' + id,
  unidadeId: 'unidade-a',
});
const json = (value) =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

async function trocaNoRefreshDescartaRespostaAnteriorSemInventarRejeicaoHTTP() {
  let concluir;
  const f = carregar(
    'sessao-mesa.service.ts',
    'SessaoMesaService',
    {},
    {
      fetch: async (rota) =>
        rota.endsWith('/sessao')
          ? json(participante('b'))
          : new Promise((resolve) => {
              concluir = resolve;
            }),
    },
  );
  f.instance.access = 'token-a';
  f.instance.participante.set(participante('a'));
  const anterior = f.instance.api('/api/v1/mesa/pedidos', 'POST', { intencaoId: 'original' });
  await f.instance.receber(json({ accessToken: 'token-b', expiresIn: 300 }), 0);
  assert.equal(f.instance.participante().participanteId, 'b');
  concluir(json({ id: 'pedido-confirmado-a' }));
  await assert.rejects(
    anterior,
    (error) => !(error instanceof ApiFailure) && /anterior descartada/.test(error.message),
  );
  assert.equal(f.instance.geracao, 1);
}

async function refreshDaMesmaParticipacaoPreservaContextoERequisicoes() {
  let concluir;
  const f = carregar(
    'sessao-mesa.service.ts',
    'SessaoMesaService',
    {},
    {
      fetch: async (rota) =>
        rota.endsWith('/sessao')
          ? json(participante('a'))
          : new Promise((resolve) => {
              concluir = resolve;
            }),
    },
  );
  f.instance.access = 'token-a';
  const identidade = participante('a');
  f.instance.participante.set(identidade);
  const anterior = f.instance.api('/api/v1/mesa/comanda');
  await f.instance.receber(json({ accessToken: 'token-renovado', expiresIn: 300 }), 0);
  concluir(json({ id: 'comanda-a' }));
  assert.equal((await anterior).id, 'comanda-a');
  assert.equal(f.instance.participante(), identidade);
  assert.equal(f.instance.geracao, 0);
}

async function mesaNaoExibeCodigoDeOutraUnidadeDepoisDeRespostaAtrasada() {
  let concluir;
  const sessao = {
    identidade: signal({ usuarioId: 'atendente' }),
    api: () =>
      new Promise((resolve) => {
        concluir = resolve;
      }),
  };
  const f = carregar('mesas.component.ts', 'MesasComponent', { sessao });
  f.instance.acoes.set(['pedido.criar_assistido']);
  f.efeitos.forEach((fn) => fn());
  const operacao = f.instance.abrir({ id: 'mesa-a' });
  f.instance.unidadeId.set('unidade-b');
  f.efeitos.forEach((fn) => fn());
  concluir({ codigoTemporario: 'codigo-a' });
  await operacao;
  assert.equal(f.instance.abertura(), null);
  assert.equal(f.instance.aviso(), '');
}

async function cadastroPendenteNaoCruzaUnidades() {
  const sessao = {
    identidade: signal({ usuarioId: 'admin' }),
    api: async () => {
      throw new Error('Resposta perdida');
    },
  };
  const f = carregar('mesas.component.ts', 'MesasComponent', { sessao });
  f.efeitos.forEach((fn) => fn());
  f.instance.nome = 'Mesa da unidade A';
  await f.instance.criar({ preventDefault() {} });
  const original = f.instance.criacaoPendente();
  assert.equal(original.unidadeId, 'unidade-a');
  f.instance.unidadeId.set('unidade-b');
  f.efeitos.forEach((fn) => fn());
  assert.equal(f.instance.criacaoPendente(), null);
  f.instance.unidadeId.set('unidade-a');
  f.efeitos.forEach((fn) => fn());
  assert.equal(f.instance.criacaoPendente(), original);
}

async function ajudaPendentePermaneceComSeuParticipante() {
  const mesa = {
    participante: signal(participante('a')),
    restaurar: async () => {},
    api: async () => {
      throw new Error('Resposta perdida');
    },
  };
  const f = carregar('participante-mesa.component.ts', 'ParticipanteMesaComponent', { mesa });
  f.efeitos.forEach((fn) => fn());
  await f.instance.solicitar('AJUDA');
  const original = f.instance.intencao();
  mesa.participante.set(participante('b'));
  f.efeitos.forEach((fn) => fn());
  assert.equal(f.instance.intencao(), null);
  await f.instance.solicitar('CONTA');
  assert.equal(f.instance.intencao().participante, 'b');
  mesa.participante.set(participante('a'));
  f.efeitos.forEach((fn) => fn());
  assert.equal(f.instance.intencao(), original);
}

async function erroDeSolicitacaoSobreviveConsultasSemPerderIntencao() {
  for (const [tipo, automatica] of [
    ['AJUDA', true],
    ['CONTA', false],
  ]) {
    let liberar;
    let reter = true;
    let falharConsulta = false;
    let revogarConsulta = 0;
    let falharSolicitacao = true;
    const corpos = [];
    const mesa = {
      participante: signal(participante('a')),
      restaurar: async () => {},
      api: async (_rota, metodo, corpo) => {
        if (metodo === 'POST') {
          corpos.push(corpo);
          if (falharSolicitacao) throw new Error('Resposta da solicitação perdida');
          return {};
        }
        if (reter) {
          reter = false;
          await new Promise((resolve) => (liberar = resolve));
        }
        if (revogarConsulta) throw new ApiFailure(revogarConsulta, 'Participação revogada');
        if (falharConsulta) throw new Error('Consulta da comanda indisponível');
        return { id: 'comanda-a' };
      },
    };
    const f = carregar('participante-mesa.component.ts', 'ParticipanteMesaComponent', { mesa });
    f.efeitos.forEach((fn) => fn());
    const leituraAnterior = f.instance.consultar(automatica);
    await f.instance.solicitar(tipo);
    const original = f.instance.intencao();
    const erro = f.instance.erro();
    assert.match(erro, /Resposta da solicitação perdida/);
    liberar();
    await leituraAnterior;
    assert.equal(f.instance.erro(), erro, 'Consulta em voo não confirma a solicitação incerta.');
    await f.instance.consultar(automatica);
    assert.equal(f.instance.erro(), erro, 'Consulta posterior também não confirma a ação.');
    falharConsulta = true;
    await f.instance.consultar();
    assert(f.instance.erro().includes(erro), 'Falha de consulta não substitui a falha de ação.');
    assert.match(f.instance.erro(), /Consulta da comanda indisponível/);
    revogarConsulta = automatica ? 403 : 401;
    await f.instance.consultar();
    assert(f.instance.erro().includes(erro));
    assert.match(f.instance.erro(), /Participação revogada/, 'Revogação não pode ficar oculta.');
    revogarConsulta = 0;
    await f.instance.consultar();
    assert.equal(f.instance.intencao(), original, 'UUID e payload permanecem reconciliáveis.');
    falharSolicitacao = false;
    await f.instance.repetirSolicitacao();
    assert.deepEqual(corpos[1], corpos[0]);
    assert.equal(f.instance.intencao(), null);
    assert.match(f.instance.erro(), /Consulta da comanda indisponível/);
    falharConsulta = false;
    await f.instance.consultar(true);
    assert.equal(f.instance.erro(), '', 'Consulta recuperada limpa apenas a falha de leitura.');
    falharSolicitacao = true;
    await f.instance.solicitar(tipo);
    falharConsulta = true;
    await f.instance.consultar();
    mesa.participante.set(participante('b'));
    f.efeitos.forEach((fn) => fn());
    assert.equal(f.instance.erro(), '', 'Troca de participante limpa erros do contexto anterior.');
  }
}

async function cadastroIncertoSobreviveNavegacaoSemCruzarContas() {
  const corpos = [];
  const services = {
    sessao: {
      identidade: signal({ usuarioId: 'admin-a' }),
      api: async (_rota, metodo, corpo) => {
        if (metodo !== 'POST') return [];
        corpos.push(structuredClone(corpo));
        if (corpos.length === 1) throw new Error('Resposta perdida depois do cadastro');
        return { id: corpo.id };
      },
    },
  };
  const anterior = carregar('mesas.component.ts', 'MesasComponent', services);
  anterior.efeitos.forEach((fn) => fn());
  anterior.instance.nome = 'Mesa com resposta incerta';
  await anterior.instance.criar({ preventDefault() {} });
  const original = structuredClone(anterior.instance.criacaoPendente());
  anterior.destruidores.forEach((fn) => fn());
  const nova = carregar('mesas.component.ts', 'MesasComponent', services);
  nova.efeitos.forEach((fn) => fn());
  assert.deepEqual(
    nova.instance.criacaoPendente(),
    original,
    'Trocar de rota conserva o cadastro incerto.',
  );
  services.sessao.identidade.set({ usuarioId: 'admin-b' });
  nova.efeitos.forEach((fn) => fn());
  assert.equal(
    nova.instance.criacaoPendente(),
    null,
    'Outra conta não recebe a intenção anterior.',
  );
  services.sessao.identidade.set({ usuarioId: 'admin-a' });
  nova.efeitos.forEach((fn) => fn());
  await nova.instance.criar({ preventDefault() {} });
  assert.deepEqual(
    corpos[1],
    corpos[0],
    'Recuperação após navegação conserva UUID e payload completos.',
  );
  assert.equal(nova.instance.criacaoPendente(), null);
}

async function aberturaIncertaSobreviveNavegacaoEReutilizaIntencao() {
  const corpos = [];
  const services = {
    sessao: {
      identidade: signal({ usuarioId: 'admin-a' }),
      api: async (_rota, metodo, corpo) => {
        if (metodo !== 'POST') return [];
        corpos.push(structuredClone(corpo));
        if (corpos.length === 1) throw new Error('Resposta da abertura perdida');
        return { mesaId: 'mesa-a', codigoTemporario: null, versao: 0 };
      },
    },
  };
  const anterior = carregar('mesas.component.ts', 'MesasComponent', services);
  anterior.instance.acoes.set(['pedido.criar_assistido']);
  anterior.efeitos.forEach((fn) => fn());
  await anterior.instance.abrir({ id: 'mesa-a' });
  anterior.destruidores.forEach((fn) => fn());
  const nova = carregar('mesas.component.ts', 'MesasComponent', services);
  nova.instance.acoes.set(['pedido.criar_assistido']);
  nova.efeitos.forEach((fn) => fn());
  assert.equal(
    nova.instance.aberturaPendente({ id: 'mesa-a', atendimentoId: 'atendimento-ja-criado' }),
    true,
  );
  await nova.instance.abrir({ id: 'mesa-a' });
  assert.deepEqual(corpos[1], corpos[0]);
  assert.equal(nova.instance.aberturaPendente({ id: 'mesa-a' }), false);
  assert.equal(nova.instance.abertura().mesaId, 'mesa-a');
}

async function solicitacaoIncertaSobreviveRecriacaoDoComponente() {
  const corpos = [];
  const services = {
    mesa: {
      participante: signal(participante('a')),
      restaurar: async () => {},
      api: async (_rota, metodo, corpo) => {
        if (metodo !== 'POST') return {};
        corpos.push(structuredClone(corpo));
        if (corpos.length === 1) throw new Error('Resposta da solicitação perdida');
        return { id: corpo.intencaoId };
      },
    },
  };
  const anterior = carregar(
    'participante-mesa.component.ts',
    'ParticipanteMesaComponent',
    services,
  );
  anterior.efeitos.forEach((fn) => fn());
  await anterior.instance.solicitar('AJUDA');
  anterior.destruidores.forEach((fn) => fn());
  const nova = carregar('participante-mesa.component.ts', 'ParticipanteMesaComponent', services);
  nova.efeitos.forEach((fn) => fn());
  assert.equal(nova.instance.intencao().intencaoId, corpos[0].intencaoId);
  await nova.instance.repetirSolicitacao();
  assert.deepEqual(corpos[1], corpos[0]);
  assert.equal(nova.instance.intencao(), null);
}

(async () => {
  for (const test of [
    trocaNoRefreshDescartaRespostaAnteriorSemInventarRejeicaoHTTP,
    refreshDaMesmaParticipacaoPreservaContextoERequisicoes,
    mesaNaoExibeCodigoDeOutraUnidadeDepoisDeRespostaAtrasada,
    cadastroPendenteNaoCruzaUnidades,
    ajudaPendentePermaneceComSeuParticipante,
    erroDeSolicitacaoSobreviveConsultasSemPerderIntencao,
    cadastroIncertoSobreviveNavegacaoSemCruzarContas,
    aberturaIncertaSobreviveNavegacaoEReutilizaIntencao,
    solicitacaoIncertaSobreviveRecriacaoDoComponente,
  ]) {
    await test();
    console.log(test.name + ': aprovado');
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

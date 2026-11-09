// Paginação e recuperação executam os componentes reais, controlando apenas o transporte.
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
class DestroyRef {}
class SessaoService {}
class SessaoMesaService {}
class CarrinhoService {}
class PedidoEnvioService {}
class PendenciasMesaService {}
class NavegacaoProtegidaService {}
class AcompanhamentoEventos {
  iniciar() {}
  encerrar() {}
}
const tick = () => new Promise(setImmediate);
function componente(arquivo, nome, api) {
  const efeitos = [];
  const destruidores = [];
  const sessao = { identidade: signal({ usuarioId: 'admin', perfil: 'ADMINISTRADOR' }), api };
  const carrinho = { contexto: signal({ unidadeId: 'unidade-a', canal: 'MESA' }) };
  const raiz = {};
  const input = Object.assign((initial) => signal(initial), {
    required: () => signal('unidade-a'),
  });
  const context = {
    exports: {},
    Error,
    structuredClone,
    URLSearchParams,
    crypto: require('node:crypto').webcrypto,
    location: { origin: 'https://empresa.invalid' },
    window: { addEventListener() {}, confirm: () => false },
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
                ? sessao
                : type === CarrinhoService
                  ? carrinho
                  : type === SessaoMesaService
                    ? { participante: () => null }
                    : type === PendenciasMesaService
                      ? (raiz.pendencias ??= servicoReal(
                          'mesas/pendencias-mesa.service.ts',
                          'PendenciasMesaService',
                        ))
                      : type === NavegacaoProtegidaService
                        ? (raiz.navegacao ??= servicoReal(
                            'rotas/navegacao-protegida.service.ts',
                            'NavegacaoProtegidaService',
                          ))
                        : (raiz.envio ??= servicoReal(
                            'pedidos/pedido-envio.service.ts',
                            'PedidoEnvioService',
                          )),
        };
      if (name.includes('sessao-mesa')) return { SessaoMesaService };
      if (name.includes('sessao.service')) return { SessaoService, ApiFailure };
      if (name.includes('carrinho.service')) return { CarrinhoService };
      if (name.includes('pedido-envio.service')) return { PedidoEnvioService };
      if (name.includes('pendencias-mesa.service')) return { PendenciasMesaService };
      if (name.includes('navegacao-protegida.service')) return { NavegacaoProtegidaService };
      if (name.includes('acompanhamento')) return { AcompanhamentoEventos };
      if (name.includes('catalogo/modelos')) return { mensagemErro: (error) => error.message };
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
    ts.transpileModule(fs.readFileSync(repo + '/frontend/src/app/' + arquivo, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        experimentalDecorators: true,
      },
    }).outputText,
    context,
  );
  const instance = new context.exports[nome]();
  if (instance.acoes)
    instance.acoes.set(['mesa.atender', 'comanda.iniciar_fechamento', 'pedido.criar_assistido']);
  efeitos.forEach((fn) => fn());
  return { instance, efeitos, destruidores, sessao, carrinho };
}
const mesa = (numero, aberta = false) => ({
  id: 'mesa-' + numero,
  nome: 'Mesa ' + numero,
  estadoComanda: aberta ? 'ABERTA' : null,
  comandaId: aberta ? 'comanda-' + numero : null,
});

async function mesasESolicitacoesAlemDaPrimeiraPagina() {
  const chamadas = [];
  const f = componente('mesas/mesas.component.ts', 'MesasComponent', async (rota) => {
    const url = new URL(rota, 'https://empresa.invalid');
    chamadas.push(url);
    const pagina = Number(url.searchParams.get('pagina') ?? 0);
    return pagina === 0 ? Array.from({ length: 50 }, (_, i) => mesa(i)) : [mesa(50)];
  });
  await f.instance.carregar();
  assert.equal(f.instance.mesas().length, 50);
  await f.instance.mudarPaginaMesas(1);
  assert.equal(f.instance.mesas()[0].id, 'mesa-50', 'A 51ª mesa deve ficar acessível.');
  assert.equal(f.instance.paginaSolicitacoes(), 0, 'As duas listas têm páginas independentes.');
  await f.instance.mudarPaginaSolicitacoes(1);
  assert.equal(f.instance.solicitacoes()[0].id, 'mesa-50');
  await f.instance.carregar(true);
  assert.equal(f.instance.paginaMesas(), 1);
  assert.equal(f.instance.paginaSolicitacoes(), 1, 'SSE preserva as páginas selecionadas.');
  assert(
    chamadas.some(
      (url) => url.pathname.endsWith('/solicitacoes') && url.searchParams.get('pagina') === '1',
    ),
  );
  f.instance.unidadeId.set('unidade-b');
  f.efeitos.forEach((fn) => fn());
  assert.equal(f.instance.paginaMesas(), 0);
  assert.equal(f.instance.paginaSolicitacoes(), 0);
  assert.equal(f.instance.mesas().length, 0);
}

async function assistidoEncontraComandaDepoisDeCinquentaMesasFechadas() {
  const f = componente(
    'pedidos/confirmar-pedido.component.ts',
    'ConfirmarPedidoComponent',
    async (rota) => {
      if (rota.endsWith('/efetivos')) return { acoes: ['pedido.criar_assistido'] };
      return new URL(rota, 'https://empresa.invalid').searchParams.get('pagina') === '1'
        ? [mesa(50, true)]
        : Array.from({ length: 50 }, (_, i) => mesa(i));
    },
  );
  await tick();
  assert.equal(f.instance.mesas().length, 0);
  assert.equal(
    f.instance.maisMesas(),
    true,
    'O limite considera a página bruta, antes de filtrar comandas abertas.',
  );
  await f.instance.carregarMesas(1);
  assert.equal(f.instance.mesas()[0].comandaId, 'comanda-50');
  f.instance.comandaId = 'comanda-50';
  await f.instance.carregarMesas(0);
  assert.equal(
    f.instance.comandaId,
    '',
    'Trocar de página não pode enviar uma comanda que ficou invisível.',
  );
}

async function rejeicaoDefinitivaPermiteCorrigirNome() {
  const corpos = [];
  const f = componente(
    'mesas/mesas.component.ts',
    'MesasComponent',
    async (_rota, metodo, corpo) => {
      if (metodo !== 'POST') return [];
      corpos.push(corpo);
      if (corpos.length === 1)
        throw new ApiFailure(409, 'Já existe uma mesa com esse nome nesta unidade.');
      return mesa(1);
    },
  );
  f.instance.nome = 'Mesa já cadastrada';
  await f.instance.criar({ preventDefault() {} });
  assert.equal(
    f.instance.criacaoPendente(),
    null,
    'A primeira rejeição HTTP definitiva deve liberar o nome.',
  );
  f.instance.nome = 'Nome corrigido';
  await f.instance.criar({ preventDefault() {} });
  assert.equal(corpos[1].nome, 'Nome corrigido');
  assert.notEqual(corpos[1].id, corpos[0].id);
}

async function respostaPerdidaPreservaUuidMesmoDepoisDeRecusaDoReplay() {
  const corpos = [];
  const f = componente(
    'mesas/mesas.component.ts',
    'MesasComponent',
    async (_rota, metodo, corpo) => {
      if (metodo !== 'POST') return [];
      corpos.push(corpo);
      if (corpos.length === 1) throw new Error('Resposta perdida depois do commit');
      if (corpos.length === 2) throw new ApiFailure(403, 'Reautenticação exigida');
      return mesa(1);
    },
  );
  f.instance.nome = 'Cadastro incerto';
  await f.instance.criar({ preventDefault() {} });
  const original = f.instance.criacaoPendente();
  f.instance.nome = 'Não deve substituir o payload';
  await f.instance.criar({ preventDefault() {} });
  assert.deepEqual(f.instance.criacaoPendente(), original);
  await f.instance.criar({ preventDefault() {} });
  assert.equal(f.instance.criacaoPendente(), null);
  assert(
    corpos.every((corpo) => JSON.stringify(corpo) === JSON.stringify(original)),
    'Todos os reenvios usam UUID e payload originais.',
  );
}

async function rejeicaoDeCadastroSobreviveConsultasAutomaticasEManuais() {
  for (const automatica of [true, false]) {
    let liberar;
    let reter = true;
    let falharConsulta = false;
    let revogarConsulta = 0;
    let rejeitarCadastro = true;
    const f = componente('mesas/mesas.component.ts', 'MesasComponent', async (_rota, metodo) => {
      if (metodo === 'POST') {
        if (rejeitarCadastro) throw new ApiFailure(409, 'Nome já cadastrado');
        return mesa(1);
      }
      if (reter) {
        reter = false;
        await new Promise((resolve) => (liberar = resolve));
      }
      if (revogarConsulta) throw new ApiFailure(revogarConsulta, 'Acesso à unidade revogado');
      if (falharConsulta) throw new Error('Consulta indisponível');
      return [];
    });
    const leituraAnterior = f.instance.carregar(automatica);
    await tick();
    f.instance.nome = 'Mesa repetida';
    await f.instance.criar({ preventDefault() {} });
    const rejeicao = f.instance.erro();
    assert.match(rejeicao, /Nome já cadastrado/);
    liberar();
    await leituraAnterior;
    assert.equal(
      f.instance.erro(),
      rejeicao,
      `GET ${automatica ? 'automático' : 'manual'} iniciado antes do409 não confirma o cadastro.`,
    );
    await f.instance.carregar(automatica);
    assert.equal(f.instance.erro(), rejeicao, 'Nova consulta não confirma a ação rejeitada.');
    falharConsulta = true;
    await f.instance.carregar(false);
    assert(f.instance.erro().includes(rejeicao), 'Erro de leitura não substitui erro de ação.');
    assert.match(f.instance.erro(), /Consulta indisponível/);
    revogarConsulta = automatica ? 403 : 401;
    await f.instance.carregar(false);
    assert(f.instance.erro().includes(rejeicao));
    assert.match(
      f.instance.erro(),
      /Acesso à unidade revogado/,
      'Revogação não pode ficar oculta.',
    );
    assert.equal(f.instance.mesas().length, 0);
    assert.equal(f.instance.comanda(), null);
    revogarConsulta = 0;
    falharConsulta = false;
    rejeitarCadastro = false;
    f.instance.nome = 'Nome corrigido';
    await f.instance.criar({ preventDefault() {} });
    assert.equal(f.instance.erro(), '', 'Nova ação e consulta bem-sucedidas resolvem seus erros.');
    falharConsulta = true;
    await f.instance.carregar(false);
    assert.match(f.instance.erro(), /Consulta indisponível/);
    falharConsulta = false;
    await f.instance.carregar(true);
    assert.equal(f.instance.erro(), '', 'Leitura recuperada limpa seu próprio erro.');
    rejeitarCadastro = true;
    f.instance.nome = 'Outra rejeição';
    await f.instance.criar({ preventDefault() {} });
    falharConsulta = true;
    await f.instance.carregar(false);
    f.instance.unidadeId.set('unidade-b');
    f.efeitos.forEach((fn) => fn());
    assert.equal(f.instance.erro(), '', 'Troca de contexto descarta os dois tipos de erro.');
  }
}

async function comandaAtrasadaNaoSubstituiSelecaoMaisRecente() {
  let concluirA;
  const f = componente('mesas/mesas.component.ts', 'MesasComponent', async (rota) => {
    if (rota.endsWith('/comandas/a'))
      return new Promise((resolve) => {
        concluirA = resolve;
      });
    if (rota.endsWith('/comandas/b')) return { id: 'b', versao: 2 };
    return [];
  });
  f.instance.comanda.set({ id: 'a', versao: 1 });
  const anterior = f.instance.carregar(true);
  await tick();
  const nova = f.instance.abrirComanda({ comandaId: 'b' });
  await tick();
  assert.equal(f.instance.comanda().id, 'b');
  concluirA({ id: 'a', versao: 1 });
  await Promise.all([anterior, nova]);
  assert.equal(
    f.instance.comanda().id,
    'b',
    'Resposta antiga de A não pode trocar o alvo dos comandos para A.',
  );
}

async function erroDeComandaAnteriorNaoApagaSelecaoAtual() {
  let recusarA;
  const f = componente('mesas/mesas.component.ts', 'MesasComponent', async (rota) => {
    if (rota.endsWith('/comandas/a'))
      return new Promise((_resolve, reject) => {
        recusarA = reject;
      });
    if (rota.endsWith('/comandas/b')) return { id: 'b', versao: 2 };
    return [];
  });
  f.instance.comanda.set({ id: 'a', versao: 1 });
  const anterior = f.instance.carregar(true);
  await tick();
  const nova = f.instance.abrirComanda({ comandaId: 'b' });
  await tick();
  recusarA(new ApiFailure(404, 'Comanda A indisponível'));
  await Promise.all([anterior, nova]);
  assert.equal(f.instance.comanda().id, 'b');
  assert.equal(f.instance.erro(), '');
}

async function sucessoAntigoNaoApagaErroDaSelecaoNova() {
  let concluirA;
  const f = componente('mesas/mesas.component.ts', 'MesasComponent', async (rota) => {
    if (rota.endsWith('/comandas/a'))
      return new Promise((resolve) => {
        concluirA = resolve;
      });
    if (rota.endsWith('/comandas/b')) throw new Error('Falha ao consultar B');
    return [];
  });
  f.instance.comanda.set({ id: 'a', versao: 1 });
  const anterior = f.instance.carregar(true);
  await tick();
  await f.instance.abrirComanda({ comandaId: 'b' });
  assert.match(f.instance.erro(), /Falha ao consultar B/);
  concluirA({ id: 'a', versao: 1 });
  await anterior;
  assert.match(
    f.instance.erro(),
    /Falha ao consultar B/,
    'Sucesso de A não confirma a consulta de B que falhou.',
  );
}

async function eventoAguardaPaginaManualEReconsultaAntesDeConfirmar() {
  let liberar;
  let consultas = 0;
  const f = componente('mesas/mesas.component.ts', 'MesasComponent', async (rota) => {
    if (rota.includes('/solicitacoes')) return [];
    consultas++;
    return new Promise((resolve) => {
      liberar = resolve;
    });
  });
  const manual = f.instance.carregar(false, 1, 0);
  let confirmouEvento = false;
  const evento = f.instance.carregar(true).then(() => {
    confirmouEvento = true;
  });
  assert.equal(consultas, 1);
  liberar([mesa(50)]);
  await manual;
  await tick();
  assert.equal(consultas, 2);
  assert.equal(confirmouEvento, false);
  liberar([mesa(50, true)]);
  await evento;
  assert.equal(f.instance.paginaMesas(), 1);
  assert.equal(f.instance.mesas()[0].estadoComanda, 'ABERTA');
}

async function navegarDuranteSnapshot(tipo) {
  let liberar;
  const chamadas = [];
  const f = componente('mesas/mesas.component.ts', 'MesasComponent', async (rota) => {
    const url = new URL(rota, 'https://empresa.invalid');
    chamadas.push({
      tipo: url.pathname.endsWith('/solicitacoes') ? 'solicitacoes' : 'mesas',
      pagina: Number(url.searchParams.get('pagina')),
    });
    if (chamadas.length === 1)
      return new Promise((resolve) => {
        liberar = resolve;
      });
    return [];
  });
  const snapshot = f.instance.carregar();
  let navegacaoTerminou = false;
  const navegacao = (
    tipo === 'mesas' ? f.instance.mudarPaginaMesas(1) : f.instance.mudarPaginaSolicitacoes(1)
  ).then(() => {
    navegacaoTerminou = true;
  });
  const evento = f.instance.carregar(true);
  await tick();
  assert.equal(
    navegacaoTerminou,
    false,
    'Navegação recebida durante carregamento precisa aguardar, não retornar sem executá-la.',
  );
  assert.equal(chamadas.length, 1, 'Navegação e evento não abrem consultas paralelas.');
  liberar([]);
  await Promise.all([snapshot, navegacao, evento]);
  assert.equal(tipo === 'mesas' ? f.instance.paginaMesas() : f.instance.paginaSolicitacoes(), 1);
  assert.deepEqual(
    chamadas.filter((item) => item.tipo === tipo).map((item) => item.pagina),
    [0, 1, 1],
    'Evento posterior à navegação consulta a página escolhida, sem regressão para zero.',
  );
}

async function navegacaoDeMesasDuranteReplayAguardaSnapshot() {
  await navegarDuranteSnapshot('mesas');
}

async function navegacaoDeSolicitacoesDuranteReplayAguardaSnapshot() {
  await navegarDuranteSnapshot('solicitacoes');
}

async function navegacaoEnfileiradaNaoCruzaTrocaDeUnidade() {
  let liberar;
  let chamadas = 0;
  const f = componente('mesas/mesas.component.ts', 'MesasComponent', () => {
    chamadas++;
    return new Promise((resolve) => {
      liberar = resolve;
    });
  });
  const snapshot = f.instance.carregar();
  const navegacao = f.instance.mudarPaginaMesas(1);
  f.instance.unidadeId.set('unidade-b');
  f.efeitos.forEach((fn) => fn());
  liberar([]);
  await Promise.all([snapshot, navegacao]);
  assert.equal(chamadas, 1, 'A navegação antiga não pode consultar a página1 de outra unidade.');
  assert.equal(f.instance.paginaMesas(), 0);
  assert.equal(f.instance.mesas().length, 0);
}

async function navegarDuasListas(primeira) {
  let liberar;
  const chamadas = [];
  const f = componente('mesas/mesas.component.ts', 'MesasComponent', async (rota) => {
    const url = new URL(rota, 'https://empresa.invalid');
    chamadas.push({
      lista: url.pathname.endsWith('/solicitacoes') ? 'solicitacoes' : 'mesas',
      pagina: Number(url.searchParams.get('pagina')),
    });
    if (chamadas.length === 1)
      return new Promise((resolve) => {
        liberar = resolve;
      });
    return [];
  });
  const snapshot = f.instance.carregar();
  const a =
    primeira === 'mesas' ? f.instance.mudarPaginaMesas(1) : f.instance.mudarPaginaSolicitacoes(1);
  const b =
    primeira === 'mesas' ? f.instance.mudarPaginaSolicitacoes(1) : f.instance.mudarPaginaMesas(1);
  await tick();
  assert.equal(
    chamadas.length,
    1,
    'As duas navegações aguardam o snapshot sem consultas paralelas.',
  );
  liberar([]);
  await Promise.all([snapshot, a, b]);
  assert.equal(
    f.instance.paginaMesas(),
    1,
    'Navegar solicitações não pode restaurar uma página antiga de mesas.',
  );
  assert.equal(
    f.instance.paginaSolicitacoes(),
    1,
    'Navegar mesas não pode restaurar uma página antiga de solicitações.',
  );
  assert.deepEqual(chamadas.slice(-2), [
    { lista: 'mesas', pagina: 1 },
    { lista: 'solicitacoes', pagina: 1 },
  ]);
}

async function mesasDepoisSolicitacoesPreservamAmbasAsPaginas() {
  await navegarDuasListas('mesas');
}

async function solicitacoesDepoisMesasPreservamAmbasAsPaginas() {
  await navegarDuasListas('solicitacoes');
}

async function paginaAntigaNaoVoltaDepoisDeTrocarContextoOuDestruir() {
  let liberar;
  const f = componente(
    'mesas/mesas.component.ts',
    'MesasComponent',
    () =>
      new Promise((resolve) => {
        liberar = resolve;
      }),
  );
  const antiga = f.instance.carregar(false, 2, 2);
  f.instance.unidadeId.set('unidade-b');
  f.efeitos.forEach((fn) => fn());
  liberar([mesa(100)]);
  await antiga;
  assert.equal(f.instance.paginaMesas(), 0);
  assert.equal(f.instance.mesas().length, 0);
  const final = f.instance.carregar();
  f.destruidores.forEach((fn) => fn());
  liberar([mesa(1)]);
  await final;
  assert.equal(f.instance.mesas().length, 0);
}

async function paginaAssistidaAntigaNaoVoltaEmOutraUnidade() {
  let liberar;
  const f = componente(
    'pedidos/confirmar-pedido.component.ts',
    'ConfirmarPedidoComponent',
    async (rota) => {
      if (rota.endsWith('/efetivos')) return { acoes: ['pedido.criar_assistido'] };
      return new Promise((resolve) => {
        liberar = resolve;
      });
    },
  );
  await tick();
  const anterior = liberar;
  f.carrinho.contexto.set({ unidadeId: 'unidade-b', canal: 'MESA' });
  f.efeitos.forEach((fn) => fn());
  anterior([mesa(50, true)]);
  await tick();
  assert.equal(f.instance.mesas().length, 0);
  f.destruidores.forEach((fn) => fn());
  liberar([mesa(1, true)]);
  await tick();
  assert.equal(f.instance.mesas().length, 0);
}

async function assistidoEnfileiraNavegacaoDuranteConsulta() {
  let liberar;
  const paginas = [];
  const f = componente(
    'pedidos/confirmar-pedido.component.ts',
    'ConfirmarPedidoComponent',
    async (rota) => {
      if (rota.endsWith('/efetivos')) return { acoes: ['pedido.criar_assistido'] };
      const pagina = Number(new URL(rota, 'https://empresa.invalid').searchParams.get('pagina'));
      paginas.push(pagina);
      if (paginas.length === 1)
        return new Promise((resolve) => {
          liberar = resolve;
        });
      return [mesa(50, true)];
    },
  );
  await tick();
  let terminou = false;
  const navegacao = f.instance.carregarMesas(1).then(() => {
    terminou = true;
  });
  await tick();
  assert.equal(
    terminou,
    false,
    'Consulta assistida não pode descartar a navegação recebida enquanto carrega.',
  );
  assert.deepEqual(paginas, [0]);
  liberar(Array.from({ length: 50 }, (_, i) => mesa(i)));
  await navegacao;
  assert.deepEqual(paginas, [0, 1]);
  assert.equal(f.instance.paginaMesas(), 1);
  assert.equal(f.instance.mesas()[0].comandaId, 'comanda-50');
}

async function filaAssistidaNaoCruzaContextoOuDestruicao() {
  const liberar = [];
  const chamadas = [];
  const f = componente(
    'pedidos/confirmar-pedido.component.ts',
    'ConfirmarPedidoComponent',
    async (rota) => {
      if (rota.endsWith('/efetivos')) return { acoes: ['pedido.criar_assistido'] };
      chamadas.push(rota);
      return new Promise((resolve) => {
        liberar.push(resolve);
      });
    },
  );
  await tick();
  const antiga = f.instance.carregarMesas(1);
  f.carrinho.contexto.set({ unidadeId: 'unidade-b', canal: 'MESA' });
  f.efeitos.forEach((fn) => fn());
  await tick();
  liberar[0]([mesa(0, true)]);
  await antiga;
  assert.equal(chamadas.length, 2);
  assert(
    chamadas.every((rota) => rota.endsWith('pagina=0')),
    'Fila antiga não consulta a página1 no contexto novo.',
  );
  const aposDestruir = f.instance.carregarMesas(1);
  f.destruidores.forEach((fn) => fn());
  liberar[1]([mesa(1, true)]);
  await aposDestruir;
  assert.equal(chamadas.length, 2);
  assert.equal(f.instance.mesas().length, 0);
}

(async () => {
  let falhas = 0;
  for (const test of [
    mesasESolicitacoesAlemDaPrimeiraPagina,
    assistidoEncontraComandaDepoisDeCinquentaMesasFechadas,
    rejeicaoDefinitivaPermiteCorrigirNome,
    respostaPerdidaPreservaUuidMesmoDepoisDeRecusaDoReplay,
    rejeicaoDeCadastroSobreviveConsultasAutomaticasEManuais,
    comandaAtrasadaNaoSubstituiSelecaoMaisRecente,
    erroDeComandaAnteriorNaoApagaSelecaoAtual,
    sucessoAntigoNaoApagaErroDaSelecaoNova,
    eventoAguardaPaginaManualEReconsultaAntesDeConfirmar,
    navegacaoDeMesasDuranteReplayAguardaSnapshot,
    navegacaoDeSolicitacoesDuranteReplayAguardaSnapshot,
    navegacaoEnfileiradaNaoCruzaTrocaDeUnidade,
    mesasDepoisSolicitacoesPreservamAmbasAsPaginas,
    solicitacoesDepoisMesasPreservamAmbasAsPaginas,
    paginaAntigaNaoVoltaDepoisDeTrocarContextoOuDestruir,
    paginaAssistidaAntigaNaoVoltaEmOutraUnidade,
    assistidoEnfileiraNavegacaoDuranteConsulta,
    filaAssistidaNaoCruzaContextoOuDestruicao,
  ]) {
    try {
      await test();
      console.log(test.name + ': aprovado');
    } catch (error) {
      falhas++;
      console.error(test.name + ': ' + error.message);
    }
  }
  if (falhas) process.exitCode = 1;
})();

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

function fixture() {
  const identity = signal({ usuarioId: 'conta-a', perfil: 'ADMINISTRADOR' });
  const events = [];
  const destroys = [];
  const uploads = [];
  let upload = async () => {
    throw new Error('Resposta perdida.');
  };
  let consulta = async (path) => ({ id: path.split('/').at(-1) });
  const sessao = {
    identidade: identity,
    upload: async (path, body) => {
      uploads.push({ path, body });
      return upload(path, body);
    },
    api: async (path) => consulta(path),
  };
  class DestroyRef {}
  class SessaoService {}
  class ApiFailure extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  class EventEmitter {
    values = [];
    emit(value) {
      this.values.push(value);
    }
  }
  const core = {
    Injectable: () => (value) => value,
    Component: () => (value) => value,
    Input: () => () => undefined,
    Output: () => () => undefined,
    signal,
    DestroyRef,
    EventEmitter,
    inject: (token) =>
      token === DestroyRef
        ? { onDestroy: (fn) => destroys.push(fn) }
        : token === SessaoService
          ? sessao
          : pendencias,
  };
  function carregar(file, requireFn) {
    const context = {
      exports: {},
      require: requireFn,
      structuredClone,
      crypto,
      File,
      FormData,
      window: {
        addEventListener: (name, fn) => {
          if (name === 'beforeunload') events.push(fn);
        },
      },
    };
    vm.runInNewContext(
      ts.transpileModule(fs.readFileSync(repo + '/frontend/src/app/catalogo/' + file, 'utf8'), {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
          experimentalDecorators: true,
        },
      }).outputText,
      context,
    );
    return context.exports;
  }
  const { MidiaPendenteService } = carregar('midia-pendente.service.ts', () => core);
  const pendencias = new MidiaPendenteService();
  const { MidiaEditorComponent } = carregar('midia-editor.component.ts', (name) => {
    if (name === '@angular/core') return core;
    if (name.includes('sessao')) return { SessaoService, ApiFailure };
    if (name.includes('midia-pendente')) return { MidiaPendenteService };
    return { mensagemErro: (error) => error.message };
  });
  const criar = (produto) => {
    const component = new MidiaEditorComponent();
    component.produto = produto;
    component.novo = true;
    component.ngOnChanges({ produto: { currentValue: produto } });
    return { component, destroy: destroys.at(-1) };
  };
  return {
    criar,
    identity,
    pendencias,
    uploads,
    ApiFailure,
    responderUpload: (fn) => {
      upload = fn;
    },
    responderConsulta: (fn) => {
      consulta = fn;
    },
    bloqueiaSaida: () => {
      let bloqueada = false;
      events.forEach((fn) =>
        fn({
          preventDefault: () => {
            bloqueada = true;
          },
        }),
      );
      return bloqueada;
    },
  };
}

const produto = { id: 'produto-a', nome: 'Produto fictício', grupos: [], adicionais: [] };
const arquivo = new File(['imagem fictícia'], 'imagem.png', { type: 'image/png' });

async function logoutPreservaIntencaoEOutraContaNaoRecebeArquivo() {
  const f = fixture();
  const primeiro = f.criar(produto);
  primeiro.component.selecionar({ files: [arquivo] });
  await primeiro.component.enviar();
  assert.equal(
    primeiro.component.salvo.values.length,
    0,
    'Resposta perdida mantém rascunho do upload.',
  );
  const pendente = f.pendencias.daConta('conta-a')();
  assert.ok(pendente.id);
  assert.equal(pendente.arquivo, arquivo);
  assert.equal(f.bloqueiaSaida(), true);
  primeiro.destroy();

  f.identity.set({ usuarioId: 'conta-b' });
  const outra = f.criar({ ...produto, id: 'produto-b' });
  assert.equal(outra.component.selecionado, null);
  assert.equal(outra.component.incerto(), false);
  assert.equal(f.pendencias.daConta('conta-b')(), null);
  outra.destroy();

  f.identity.set({ usuarioId: 'conta-a' });
  const retomada = f.criar(pendente.produto);
  assert.equal(retomada.component.incerto(), true);
  assert.equal(retomada.component.selecionado, arquivo);
  await retomada.component.consultar();
  assert.equal(retomada.component.midiaIdChange.values[0], pendente.id);
  assert.equal(
    retomada.component.salvo.values[0],
    'midia-produto-a',
    'Reconciliação confirma apenas o grupo do upload.',
  );
  assert.equal(f.pendencias.daConta('conta-a')(), null);
  assert.equal(f.uploads.length, 1);
  assert.equal(f.bloqueiaSaida(), false);
}

async function respostaPosteriorADestruicaoNaoApagaIntencao() {
  const f = fixture();
  let concluir;
  f.responderUpload(
    () =>
      new Promise((resolve) => {
        concluir = resolve;
      }),
  );
  const primeiro = f.criar(produto);
  primeiro.component.selecionar({ files: [arquivo] });
  const envio = primeiro.component.enviar();
  const id = f.pendencias.daConta('conta-a')().id;
  primeiro.destroy();
  concluir({ id });
  await envio;
  assert.equal(primeiro.component.midiaIdChange.values.length, 0);
  assert.equal(
    primeiro.component.salvo.values.length,
    0,
    'Resposta após destruir não limpa rascunho de outra tela.',
  );
  assert.equal(f.pendencias.daConta('conta-a')().id, id);
  const retomada = f.criar(produto);
  await retomada.component.consultar();
  assert.equal(retomada.component.midiaIdChange.values[0], id);
  assert.equal(f.uploads.length, 1);
}

async function consultaNaoEncontradaMantemMesmoArquivoEIdentificadorNoReenvio() {
  const f = fixture();
  const { component } = f.criar(produto);
  component.selecionar({ files: [arquivo] });
  await component.enviar();
  const id = f.pendencias.daConta('conta-a')().id;
  f.responderConsulta(async () => {
    throw new f.ApiFailure(404, 'Envio não encontrado.');
  });
  await component.consultar();
  assert.equal(component.incerto(), false);
  assert.equal(component.temPendencia(), true);
  assert.equal(component.salvo.values.length, 0, 'Consulta sem resultado não confirma o upload.');
  component.selecionar({ files: [new File(['outro'], 'outro.png')] });
  assert.equal(component.selecionado, arquivo);
  f.responderUpload(async () => ({ id }));
  await component.enviar();
  assert.equal(f.uploads[1].path, f.uploads[0].path);
  assert.equal(
    component.salvo.values[0],
    'midia-produto-a',
    'Resposta confirmada limpa somente o upload.',
  );
  assert.equal(f.pendencias.daConta('conta-a')(), null);
}

(async () => {
  for (const test of [
    logoutPreservaIntencaoEOutraContaNaoRecebeArquivo,
    respostaPosteriorADestruicaoNaoApagaIntencao,
    consultaNaoEncontradaMantemMesmoArquivoEIdentificadorNoReenvio,
  ]) {
    await test();
    console.log(test.name + ': aprovado');
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

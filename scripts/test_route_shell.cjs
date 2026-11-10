// Regressão de ativação: ActivatedRoute filho ainda sem snapshot no construtor do layout.
// A condição foi observada no Router Angular real; este probe usa injeções fictícias.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const repo = path.resolve(__dirname, '..');
const ts = require(repo + '/frontend/node_modules/typescript');
const signal = (initial) => {
  let value = initial;
  return Object.assign(() => value, { set: (next) => (value = next) });
};
function fixture(cozinha = false) {
  const identity = signal({ usuarioId: 'ficticio', perfil: cozinha ? 'COZINHA' : 'ADMINISTRADOR' });
  const permissions = signal(['pedido.consultar', 'cozinha.iniciar']);
  const route = {
    snapshot: {
      data: { cozinha },
      firstChild: {
        data: { titulo: cozinha ? 'Cozinha' : 'Pedidos', acao: 'pedido.consultar' },
        firstChild: null,
      },
    },
    firstChild: { snapshot: undefined },
  };
  let observar;
  const destroys = [];
  let ativacoes = 0;
  class ActivatedRoute {}
  class Router {}
  class NavigationEnd {}
  class DestroyRef {}
  class ElementRef {}
  class ContextoOperacaoService {}
  class SessaoNavegacaoService {}
  class MarcaService {}
  class NavegacaoProtegidaService {}
  const contexto = {
    administrador: () => identity()?.perfil === 'ADMINISTRADOR',
    tem: (acao) => permissions().includes(acao),
    podeCozinha: () => permissions().includes('cozinha.iniciar'),
    podeExpedicao: () => permissions().includes('pedido.despachar'),
    ativar: () => ativacoes++,
    desativar: () => ativacoes--,
  };
  const instancias = new Map([
    [ActivatedRoute, route],
    [
      Router,
      {
        events: {
          subscribe: (callback) => {
            observar = callback;
            return { unsubscribe() {} };
          },
        },
        navigate: () => {
          throw new Error('Sessão válida não deve redirecionar');
        },
      },
    ],
    [DestroyRef, { onDestroy: (fn) => destroys.push(fn) }],
    [ElementRef, { nativeElement: {} }],
    [ContextoOperacaoService, contexto],
    [SessaoNavegacaoService, { pronta: () => true, sessao: { identidade: identity } }],
    [MarcaService, {}],
    [NavegacaoProtegidaService, {}],
  ]);
  const core = {
    Component: () => (tipo) => tipo,
    ViewChild: () => () => {},
    HostListener: () => () => {},
    computed: (fn) => fn,
    effect: (fn) => fn(),
    signal,
    DestroyRef,
    ElementRef,
    inject: (token) => {
      assert(instancias.has(token), 'Dependência conhecida');
      return instancias.get(token);
    },
  };
  const context = {
    exports: {},
    setTimeout,
    require: (nome) =>
      nome === '@angular/core'
        ? core
        : nome === '@angular/router'
          ? { ActivatedRoute, Router, NavigationEnd }
          : {
              ContextoOperacaoService,
              SessaoNavegacaoService,
              MarcaService,
              NavegacaoProtegidaService,
            },
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(repo + '/frontend/src/app/rotas/equipe-layout.component.ts', 'utf8'),
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
  const layout = new context.exports.EquipeLayoutComponent();
  return {
    layout,
    route,
    permissions,
    identity,
    terminar: () => destroys.forEach((fn) => fn()),
    ativacoes: () => ativacoes,
    navegou: () => observar(new NavigationEnd()),
  };
}
for (const cozinha of [false, true]) {
  const f = fixture(cozinha);
  assert.equal(f.layout.titulo(), cozinha ? 'Cozinha' : 'Pedidos');
  assert.equal(f.layout.autorizado(), true);
  assert.equal(f.ativacoes(), 1);
  f.route.snapshot.firstChild = {
    data: { titulo: 'Prazos de aceite', administrador: true },
    firstChild: null,
  };
  f.navegou();
  assert.equal(f.layout.titulo(), 'Prazos de aceite');
  assert.equal(f.layout.autorizado(), !cozinha);
  f.permissions.set([]);
  if (cozinha) assert.equal(f.layout.autorizado(), false);
  f.identity.set(null);
  assert.equal(f.layout.autorizado(), false);
  f.terminar();
  assert.equal(f.ativacoes(), 0);
}
const expedicao = fixture();
expedicao.identity.set({ usuarioId: 'ficticio', perfil: 'EXPEDICAO' });
expedicao.permissions.set(['pedido.consultar', 'pedido.despachar']);
expedicao.route.snapshot.firstChild = {
  data: { titulo: 'Expedição', expedicao: true, unidade: true },
  firstChild: null,
};
expedicao.navegou();
assert.equal(expedicao.layout.autorizado(), true);
expedicao.permissions.set(['pedido.consultar']);
assert.equal(expedicao.layout.autorizado(), false, 'Revogação remove a página já aberta.');
expedicao.terminar();
console.log(
  'Layout: ativação antes do snapshot do filho, navegação, permissão, logout e limpeza aprovados; injeções fictícias.',
);

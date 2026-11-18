import { CanMatchFn, Routes } from '@angular/router';
import {
  clienteObrigatorio,
  contaObrigatoria,
  contaDaEquipe,
  equipeObrigatoria,
  protegerSaida,
} from './guardas';

const identidade = () =>
  import('../identidade/identidade.component').then((m) => m.IdentidadeComponent);
const identificadorUuid: CanMatchFn = (_, segmentos) =>
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(segmentos[1]?.path ?? '');

export const APP_ROUTES: Routes = [
  {
    path: 'gestao/entrar',
    data: { diagnosticoConexao: true },
    loadComponent: () => import('./cliente-layout.component').then((m) => m.ClienteLayoutComponent),
    children: [
      {
        path: '',
        title: 'Entrar · Equipe',
        data: { formulario: 'login', equipe: true },
        loadComponent: identidade,
      },
    ],
  },
  {
    path: 'gestao',
    canActivate: [equipeObrigatoria],
    loadComponent: () => import('./equipe-layout.component').then((m) => m.EquipeLayoutComponent),
    loadChildren: () => import('./gestao.routes').then((m) => m.GESTAO_ROUTES),
  },
  {
    path: 'conta',
    canMatch: [contaDaEquipe],
    loadComponent: () => import('./equipe-layout.component').then((m) => m.EquipeLayoutComponent),
    children: [
      {
        path: '',
        title: 'Minha conta',
        data: { formulario: 'conta', titulo: 'Minha conta', equipe: true, compacta: true },
        canDeactivate: [protegerSaida],
        loadComponent: identidade,
      },
    ],
  },
  {
    path: 'cozinha',
    title: 'Cozinha',
    canActivate: [equipeObrigatoria],
    data: { cozinha: true, titulo: 'Cozinha' },
    loadComponent: () => import('./equipe-layout.component').then((m) => m.EquipeLayoutComponent),
    children: [
      {
        path: '',
        data: { cozinha: true, titulo: 'Cozinha' },
        canDeactivate: [protegerSaida],
        loadComponent: () => import('./paginas-gestao').then((m) => m.PaginaCozinhaComponent),
      },
    ],
  },
  {
    path: 'plataforma',
    title: 'Administração da plataforma',
    data: { diagnosticoConexao: true },
    loadComponent: () =>
      import('./plataforma-layout.component').then((m) => m.PlataformaLayoutComponent),
    canDeactivate: [protegerSaida],
  },
  {
    path: 'design-system',
    title: 'Componentes · Restaurant Manager',
    data: { diagnosticoConexao: true },
    loadComponent: () => import('../ui/catalogo.component').then((m) => m.CatalogoUiComponent),
  },
  {
    path: '',
    loadComponent: () => import('./cliente-layout.component').then((m) => m.ClienteLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: ({ queryParams }) =>
          queryParams['area'] === 'plataforma'
            ? '/plataforma'
            : queryParams['mesa']
              ? '/mesa/' + encodeURIComponent(String(queryParams['mesa']))
              : '/cardapio',
      },
      {
        path: 'cardapio',
        title: 'Cardápio',
        data: { visualCliente: true },
        canDeactivate: [protegerSaida],
        loadComponent: () => import('./paginas-cliente').then((m) => m.PaginaCardapioComponent),
      },
      {
        path: 'carrinho',
        title: 'Seu carrinho',
        data: { visualCliente: true },
        canDeactivate: [protegerSaida],
        loadComponent: () => import('./paginas-cliente').then((m) => m.PaginaCarrinhoComponent),
      },
      {
        path: 'mesa',
        title: 'Seu atendimento',
        data: { visualCliente: true },
        canDeactivate: [protegerSaida],
        loadComponent: () => import('./paginas-cliente').then((m) => m.PaginaMesaComponent),
      },
      {
        path: 'mesa/:mesaId',
        title: 'Seu atendimento',
        data: { visualCliente: true },
        canMatch: [identificadorUuid],
        canDeactivate: [protegerSaida],
        loadComponent: () => import('./paginas-cliente').then((m) => m.PaginaMesaComponent),
      },
      {
        path: 'pedidos',
        title: 'Meus pedidos',
        data: { visualCliente: true },
        canActivate: [clienteObrigatorio],
        canDeactivate: [protegerSaida],
        loadComponent: () =>
          import('../pedidos/meus-pedidos.component').then((m) => m.MeusPedidosComponent),
      },
      {
        path: 'pedidos/:id',
        title: 'Acompanhar pedido',
        data: { visualCliente: true },
        canMatch: [identificadorUuid],
        canActivate: [clienteObrigatorio],
        canDeactivate: [protegerSaida],
        loadComponent: () =>
          import('./pagina-pedido.component').then((m) => m.PaginaPedidoComponent),
      },
      {
        path: 'conta',
        title: 'Minha conta',
        data: { formulario: 'conta', visualCliente: true },
        canActivate: [contaObrigatoria],
        canDeactivate: [protegerSaida],
        loadComponent: identidade,
      },
      {
        path: 'entrar',
        title: 'Entrar',
        data: { formulario: 'login', visualCliente: true },
        loadComponent: identidade,
      },
      {
        path: 'cadastro',
        title: 'Criar conta',
        data: { formulario: 'cadastro', visualCliente: true },
        loadComponent: identidade,
      },
      {
        path: 'recuperar-senha',
        title: 'Recuperar senha',
        data: { formulario: 'recuperacao', visualCliente: true },
        loadComponent: identidade,
      },
      {
        path: 'aceitar-convite',
        title: 'Aceitar convite',
        data: { formulario: 'convite' },
        loadComponent: identidade,
      },
      {
        path: 'verificar-email',
        title: 'Verificar e-mail',
        data: { formulario: 'verificacao', visualCliente: true },
        loadComponent: identidade,
      },
      {
        path: 'sem-acesso',
        title: 'Área indisponível',
        data: { semAcesso: true, visualCliente: true },
        loadComponent: () =>
          import('./pagina-informativa.component').then((m) => m.PaginaInformativaComponent),
      },
      {
        path: '**',
        title: 'Página não encontrada',
        data: { visualCliente: true },
        loadComponent: () =>
          import('./pagina-informativa.component').then((m) => m.PaginaInformativaComponent),
      },
    ],
  },
];

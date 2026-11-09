import { Routes } from '@angular/router';
import { clienteObrigatorio, contaObrigatoria, equipeObrigatoria, protegerSaida } from './guardas';

const identidade = () =>
  import('../identidade/identidade.component').then((m) => m.IdentidadeComponent);
export const APP_ROUTES: Routes = [
  {
    path: 'gestao/entrar',
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
    loadComponent: () =>
      import('./plataforma-layout.component').then((m) => m.PlataformaLayoutComponent),
    canDeactivate: [protegerSaida],
  },
  {
    path: 'design-system',
    title: 'Componentes · Restaurant Manager',
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
        canDeactivate: [protegerSaida],
        loadComponent: () => import('./paginas-cliente').then((m) => m.PaginaCardapioComponent),
      },
      {
        path: 'carrinho',
        title: 'Seu carrinho',
        canDeactivate: [protegerSaida],
        loadComponent: () => import('./paginas-cliente').then((m) => m.PaginaCarrinhoComponent),
      },
      {
        path: 'mesa',
        title: 'Seu atendimento',
        canDeactivate: [protegerSaida],
        loadComponent: () => import('./paginas-cliente').then((m) => m.PaginaMesaComponent),
      },
      {
        path: 'mesa/:mesaId',
        title: 'Seu atendimento',
        canDeactivate: [protegerSaida],
        loadComponent: () => import('./paginas-cliente').then((m) => m.PaginaMesaComponent),
      },
      {
        path: 'pedidos',
        title: 'Meus pedidos',
        canActivate: [clienteObrigatorio],
        canDeactivate: [protegerSaida],
        loadComponent: () =>
          import('../pedidos/meus-pedidos.component').then((m) => m.MeusPedidosComponent),
      },
      {
        path: 'pedidos/:id',
        title: 'Acompanhar pedido',
        canActivate: [clienteObrigatorio],
        canDeactivate: [protegerSaida],
        loadComponent: () =>
          import('./pagina-pedido.component').then((m) => m.PaginaPedidoComponent),
      },
      {
        path: 'conta',
        title: 'Minha conta',
        data: { formulario: 'conta' },
        canActivate: [contaObrigatoria],
        loadComponent: identidade,
      },
      { path: 'entrar', title: 'Entrar', data: { formulario: 'login' }, loadComponent: identidade },
      {
        path: 'cadastro',
        title: 'Criar conta',
        data: { formulario: 'cadastro' },
        loadComponent: identidade,
      },
      {
        path: 'recuperar-senha',
        title: 'Recuperar senha',
        data: { formulario: 'recuperacao' },
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
        data: { formulario: 'verificacao' },
        loadComponent: identidade,
      },
      {
        path: 'sem-acesso',
        title: 'Área indisponível',
        data: { semAcesso: true },
        loadComponent: () =>
          import('./pagina-informativa.component').then((m) => m.PaginaInformativaComponent),
      },
      {
        path: '**',
        title: 'Página não encontrada',
        loadComponent: () =>
          import('./pagina-informativa.component').then((m) => m.PaginaInformativaComponent),
      },
    ],
  },
];

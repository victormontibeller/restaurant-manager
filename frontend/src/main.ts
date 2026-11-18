import { Component, DestroyRef, inject, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  NavigationEnd,
  Router,
  RouterOutlet,
  provideRouter,
  withInMemoryScrolling,
} from '@angular/router';
import { APP_ROUTES } from './app/rotas/app.routes';
import { NavegacaoProtegidaService } from './app/rotas/navegacao-protegida.service';
import { SessaoNavegacaoService } from './app/identidade/sessao-navegacao.service';
import { SessaoMesaService } from './app/mesas/sessao-mesa.service';
import { TemaService } from './app/ui/tema.service';
import { PwaComponent } from './app/pwa/pwa.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaComponent],
  template: `
    <a class="skip" href="#conteudo" (click)="pularConteudo($event)">Pular para o conteúdo</a>
    <div class="demo-banner">Ambiente de testes <span aria-hidden="true">·</span> Dados fictícios</div>
    @if(navegacao.aviso()){<div class="navigation-notice" role="alert">{{navegacao.aviso()}}<button type="button" aria-label="Fechar aviso" (click)="navegacao.aviso.set('')">×</button></div>}
    <router-outlet/>
    <div class="app-utilities" [class.app-utilities-internas]="diagnosticoConexao()">
      @if (diagnosticoConexao()) {
        <details>
          <summary><span class="connection-dot" [class.unavailable]="!conectado()"></span>{{ conectado() ? 'Sistema conectado' : 'Verificar conexão' }}</summary>
          <p role="status">{{ mensagem() }}</p>
          <button type="button" (click)="verificar()" [disabled]="carregando()">Verificar conexão</button>
        </details>
      }
      <app-pwa [diagnostico]="diagnosticoConexao()" />
    </div>
  `,
  styles: `
    :host:has(> app-equipe-layout) {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      position: relative;
      overflow: clip;
    }
    :host:has(> app-equipe-layout) > .app-utilities:has(> app-pwa.pwa-com-acoes) {
      max-height: 30dvh;
      overflow: auto;
      overscroll-behavior: contain;
      padding: 4px 12px;
    }
    .demo-banner{padding:.45rem 1rem;text-align:center;background:var(--gestao-alerta-bg, #efe9d8);color:var(--gestao-alerta-fg, #6c5f36);font-size:.66rem;letter-spacing:.04em}
    .demo-banner span{padding:0 .4rem}
    .navigation-notice{position:fixed;top:45px;left:50%;transform:translateX(-50%);width:min(600px,calc(100% - 2rem));padding:1rem 3rem 1rem 1rem;background:var(--gestao-alerta-bg, #fff1d7);color:var(--gestao-alerta-fg, #694d1a);border:1px solid var(--gestao-alerta-borda, #dcc48c);border-radius:12px;z-index:100;box-shadow:0 8px 32px #0002}
    .navigation-notice button{position:absolute;right:.6rem;top:.5rem;background:none;border:none;font-size:1.5rem;color:inherit;min-height:40px;min-width:40px}
    .app-utilities:not(.app-utilities-internas):has(> app-pwa.pwa-com-acoes) {
      max-width: 1400px;
      margin-inline: auto;
      padding: 0 clamp(16px, 4vw, 48px) 12px;
    }
    .app-utilities.app-utilities-internas {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: center;
      gap: 16px 32px;
      max-width: none;
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }
    .app-utilities details{max-width:480px}
    .app-utilities summary{cursor:pointer;min-height:48px;align-content:center;list-style:none}
    .connection-dot{display:inline-block;width:6px;height:6px;margin-right:.45rem;border-radius:50%;background:#50834e}
    .connection-dot.unavailable{background:#b77c23}
  `,
})
class App {
  readonly navegacao = inject(NavegacaoProtegidaService);
  readonly diagnosticoConexao = signal(false);
  readonly carregando = signal(false);
  readonly conectado = signal(false);
  readonly mensagem = signal('Verificando conexão…');
  constructor() {
    inject(TemaService);
    const router = inject(Router);
    const coordenacao = inject(SessaoNavegacaoService);
    const mesa = inject(SessaoMesaService);
    const plataforma =
      location.pathname === '/plataforma' ||
      new URLSearchParams(location.search).get('area') === 'plataforma';
    if (!plataforma) {
      void coordenacao.inicializar();
      void mesa.inicializar().catch(() => undefined);
    }
    const eventos = router.events.subscribe((evento) => {
      if (evento instanceof NavigationEnd) {
        const diagnostico =
          router.routerState.snapshot.root.firstChild?.data['diagnosticoConexao'] === true;
        const abriuDiagnostico = diagnostico && !this.diagnosticoConexao();
        this.diagnosticoConexao.set(diagnostico);
        if (abriuDiagnostico) void this.verificar();
        this.navegacao.concluirNavegacao();
        setTimeout(() =>
          document.querySelector<HTMLElement>('main#conteudo')?.focus({ preventScroll: true }),
        );
      }
    });
    inject(DestroyRef).onDestroy(() => eventos.unsubscribe());
  }
  pularConteudo(evento: Event): void {
    evento.preventDefault();
    const conteudo = document.querySelector<HTMLElement>('main#conteudo');
    conteudo?.focus({ preventScroll: true });
    conteudo?.scrollIntoView({ block: 'start' });
  }

  async verificar(): Promise<void> {
    if (this.carregando()) return;
    this.carregando.set(true);
    this.mensagem.set('Verificando conexão…');
    try {
      const resposta = await fetch('/actuator/health', {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      const dados: { status?: string } = await resposta.json();
      if (!resposta.ok || dados.status !== 'UP') throw new Error('indisponivel');
      this.conectado.set(true);
      this.mensagem.set('Sistema conectado. Banco de dados disponível.');
    } catch {
      this.conectado.set(false);
      this.mensagem.set(
        'Sem conexão com o sistema. Tente novamente; nenhuma operação foi confirmada.',
      );
    } finally {
      this.carregando.set(false);
    }
  }
}

bootstrapApplication(App, {
  providers: [
    provideRouter(APP_ROUTES, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
  ],
}).catch(() => {
  const modelo = document.querySelector<HTMLTemplateElement>('#falha-abertura');
  if (!modelo) return;
  const painel = modelo.content.cloneNode(true) as DocumentFragment;
  const titulo = painel.querySelector('h1');
  painel.querySelector('button')?.addEventListener('click', () => location.reload());
  document.title = 'Não foi possível abrir o aplicativo';
  document.body.replaceChildren(painel);
  titulo?.focus();
});

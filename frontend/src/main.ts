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
import { PwaComponent } from './app/pwa/pwa.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaComponent],
  template: `
    <a class="skip" href="#conteudo">Pular para o conteúdo</a>
    <div class="demo-banner">Ambiente de testes <span aria-hidden="true">·</span> Dados fictícios</div>
    @if(navegacao.aviso()){<div class="navigation-notice" role="alert">{{navegacao.aviso()}}<button type="button" aria-label="Fechar aviso" (click)="navegacao.aviso.set('')">×</button></div>}
    <router-outlet/>
    <footer class="app-utilities"><details><summary><span class="connection-dot" [class.unavailable]="!conectado()"></span>{{conectado()?'Sistema conectado':'Verificar conexão'}}</summary><p role="status">{{mensagem()}}</p><button type="button" (click)="verificar()" [disabled]="carregando()">Verificar conexão</button></details><app-pwa/></footer>
  `,
  styles: `.demo-banner{padding:.45rem 1rem;text-align:center;background:#efe9d8;color:#6c5f36;font-size:.66rem;letter-spacing:.04em}.demo-banner span{padding:0 .4rem}.navigation-notice{position:fixed;top:45px;left:50%;transform:translateX(-50%);width:min(600px,calc(100% - 2rem));padding:1rem 3rem 1rem 1rem;background:#fff1d7;color:#694d1a;border:1px solid #dcc48c;border-radius:12px;z-index:100;box-shadow:0 8px 32px #0002}.navigation-notice button{position:absolute;right:.6rem;top:.5rem;background:none;border:none;font-size:1.5rem;color:inherit;min-height:40px;min-width:40px}.app-utilities{display:flex;align-items:flex-start;justify-content:center;gap:2rem;flex-wrap:wrap;padding:1rem 1.5rem 1.5rem;background:var(--rm-bg,#f8f8f3);border-top:1px solid var(--rm-border,#e2e7df);color:var(--rm-muted,#6b746c);font-size:.72rem}.app-utilities details{max-width:480px}.app-utilities summary{cursor:pointer;min-height:44px;align-content:center;list-style:none}.connection-dot{display:inline-block;width:6px;height:6px;margin-right:.45rem;border-radius:50%;background:#50834e}.connection-dot.unavailable{background:#b77c23}@media(max-width:800px){.app-utilities{padding-bottom:90px;gap:.2rem 1.5rem}}`,
})
class App {
  readonly navegacao = inject(NavegacaoProtegidaService);
  readonly carregando = signal(false);
  readonly conectado = signal(false);
  readonly mensagem = signal('Verificando conexão…');
  constructor() {
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
        this.navegacao.concluirNavegacao();
        setTimeout(() => document.querySelector<HTMLElement>('main#conteudo')?.focus());
      }
    });
    inject(DestroyRef).onDestroy(() => eventos.unsubscribe());
    void this.verificar();
  }
  async verificar(): Promise<void> {
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
  document.body.textContent = 'Não foi possível abrir a aplicação. Recarregue a página.';
});

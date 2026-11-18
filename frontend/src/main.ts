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
import { HlmButton } from './app/ui/button';
import { inicializarTema } from './app/ui/tema';

inicializarTema();

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaComponent, HlmButton],
  template: `
    <a class="skip" href="#conteudo" (click)="pularConteudo($event)">Pular para o conteúdo</a>
    <div class="demo-banner">
      Ambiente de testes <span aria-hidden="true">·</span> Dados fictícios
    </div>
    @if (navegacao.aviso()) {
      <div class="navigation-notice" role="alert">
        {{ navegacao.aviso()
        }}<button type="button" aria-label="Fechar aviso" (click)="navegacao.aviso.set('')">×</button>
      </div>
    }
    <router-outlet />
    <footer class="app-utilities">
      <details>
        <summary>
          <span class="connection-dot" [class.unavailable]="!conectado()"></span
          >{{ conectado() ? 'Sistema conectado' : 'Verificar conexão' }}
        </summary>
        <p role="status">{{ mensagem() }}</p>
        <button
          type="button"
          hlmBtn
          variant="outline"
          (click)="verificar()"
          [disabled]="carregando()"
        >
          Verificar conexão
        </button>
      </details>
      <app-pwa />
    </footer>
  `,
  styles: `
    .demo-banner {
      padding: 0.42rem 1rem;
      text-align: center;
      background: var(--secondary, #f0ebe3);
      color: var(--secondary-foreground, #44372e);
      border-bottom: 1px solid var(--border, #e5ded3);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .demo-banner span {
      padding: 0 0.4rem;
    }
    .navigation-notice {
      position: fixed;
      top: 45px;
      left: 50%;
      transform: translateX(-50%);
      width: min(600px, calc(100% - 2rem));
      padding: 1rem 3.5rem 1rem 1.1rem;
      background: #fff8e8;
      color: #684614;
      border: 1px solid #e6cf9e;
      border-radius: var(--radius-lg, 1.05rem);
      z-index: 100;
      box-shadow: 0 10px 28px rgba(41, 37, 33, 0.14);
    }
    .navigation-notice button {
      position: absolute;
      right: 0.4rem;
      top: 0.35rem;
      background: transparent;
      border: none;
      border-radius: var(--radius-md, 0.75rem);
      font-size: 1.4rem;
      color: inherit;
      cursor: pointer;
      min-height: 48px;
      min-width: 48px;
    }
    .app-utilities {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 1.25rem 2rem;
      flex-wrap: wrap;
      padding: 1.25rem 1.5rem 1.75rem;
      background: var(--background, #faf7f2);
      border-top: 1px solid var(--border, #e5ded3);
      color: var(--muted-foreground, #6e6259);
      font-size: 0.8125rem;
    }
    .app-utilities details {
      max-width: 480px;
      border: 1px solid var(--border, #e5ded3);
      border-radius: var(--radius-lg, 1.05rem);
      background: var(--card, #ffffff);
      padding: 0.2rem 1rem;
      box-shadow: var(--shadow-soft, 0 1px 2px rgba(41, 37, 33, 0.05));
    }
    .app-utilities summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      min-height: 48px;
      font-weight: 600;
      color: var(--foreground, #292521);
      list-style: none;
    }
    .app-utilities summary::-webkit-details-marker {
      display: none;
    }
    .app-utilities summary::after {
      content: '▾';
      margin-left: auto;
      padding-left: 0.75rem;
      font-size: 0.85rem;
      color: var(--muted-foreground, #6e6259);
      transition: transform 0.16s ease;
    }
    .app-utilities details[open] > summary::after {
      transform: rotate(180deg);
    }
    .app-utilities details[open] > p {
      margin: 0.2rem 0 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--border, #e5ded3);
      color: var(--muted-foreground, #6e6259);
      line-height: 1.55;
    }
    .app-utilities button[hlmBtn] {
      min-height: 48px;
      margin-bottom: 0.75rem;
    }
    .connection-dot {
      display: inline-block;
      width: 0.5rem;
      height: 0.5rem;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--accent-foreground, #30523b);
      box-shadow: 0 0 0 3px var(--accent, #e8efe7);
    }
    .connection-dot.unavailable {
      background: #9a5b13;
      box-shadow: 0 0 0 3px #fff8e8;
    }
    @media (max-width: 800px) {
      .app-utilities {
        padding: 0.9rem 0.75rem calc(88px + env(safe-area-inset-bottom));
        gap: 0.75rem;
      }
      .app-utilities details {
        width: 100%;
        max-width: none;
      }
    }
  `,
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
        setTimeout(() =>
          document.querySelector<HTMLElement>('main#conteudo')?.focus({ preventScroll: true }),
        );
      }
    });
    inject(DestroyRef).onDestroy(() => eventos.unsubscribe());
    void this.verificar();
  }
  pularConteudo(evento: Event): void {
    evento.preventDefault();
    const conteudo = document.querySelector<HTMLElement>('main#conteudo');
    conteudo?.focus({ preventScroll: true });
    conteudo?.scrollIntoView({ block: 'start' });
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

import { Component, OnDestroy, signal } from '@angular/core';
import { HlmButton } from '../ui/button';
import { IconeComponent } from '../rotas/icone.component';

interface PedidoInstalacao extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-pwa',
  imports: [HlmButton, IconeComponent],
  template: `
    @if (!online()) {
      <p class="offline-notice" role="status">
        Você está offline. Reconecte para consultar o cardápio e enviar pedidos. Nenhuma operação
        foi confirmada.
      </p>
    }
    <details class="pwa-card" [class.has-update]="atualizacao()" [open]="atualizacao()">
      <summary id="aplicativo">
        <app-icone class="pwa-icone" [class.update]="atualizacao()" nome="atualizacoes" />
        <span>{{ atualizacao() ? 'Nova versão disponível' : 'Aplicativo e conexão' }}</span>
      </summary>
      <div class="pwa-body">
        <p role="status" aria-live="polite">
          @if (online()) {
            Rede disponível. Consultas e cálculos dependem da conexão com o restaurante.
          } @else {
            Você está offline. Somente a estrutura do aplicativo está disponível. Reconecte para
            consultar o catálogo ou recalcular o carrinho; nenhuma operação foi confirmada.
          }
        </p>
        @if (instalado()) {
          <p class="pwa-nota">Aplicativo aberto em modo instalado.</p>
        } @else if (instalavel()) {
          <div class="pwa-acoes">
            <button type="button" hlmBtn variant="outline" (click)="instalar()" [disabled]="ocupado()">
              Instalar aplicativo
            </button>
          </div>
        } @else {
          <p class="pwa-nota">
            Para instalar, use “Instalar aplicativo” ou “Adicionar à Tela de Início” no menu do
            navegador, quando disponível.
          </p>
        }
        @if (atualizacao()) {
          <div class="pwa-atualizacao">
            <p>
              Uma nova versão está pronta. Atualizar recarrega esta aba e descarta o carrinho e
              formulários ainda não salvos. As outras abas mantêm seus dados em memória.
            </p>
            <div class="pwa-acoes">
              <button type="button" hlmBtn (click)="atualizar()" [disabled]="ocupado()">
                Atualizar aplicativo
              </button>
            </div>
          </div>
        }
        <p class="pwa-feedback" role="status" aria-live="polite">{{ mensagem() }}</p>
      </div>
    </details>
  `,
  styles: `
    :host {
      display: block;
      max-width: 480px;
    }
    .pwa-card {
      border: 1px solid var(--border, #e5ded3);
      border-radius: var(--radius-lg, 1.05rem);
      background: var(--card, #ffffff);
      padding: 0.2rem 1rem;
      box-shadow: var(--shadow-soft, 0 1px 2px rgba(41, 37, 33, 0.05));
    }
    .pwa-card.has-update {
      border-color: var(--primary-soft-border, #d8a99f);
    }
    summary {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-height: 48px;
      cursor: pointer;
      list-style: none;
      font-weight: 600;
      color: var(--foreground, #292521);
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary::after {
      content: '▾';
      margin-left: auto;
      padding-left: 0.75rem;
      font-size: 0.85rem;
      color: var(--muted-foreground, #6e6259);
      transition: transform 0.16s ease;
    }
    .pwa-card[open] > summary::after {
      transform: rotate(180deg);
    }
    .pwa-icone {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      color: var(--muted-foreground, #6e6259);
    }
    .pwa-icone.update {
      color: var(--primary-ink, #a53e2b);
    }
    .pwa-body {
      border-top: 1px dashed var(--border, #e5ded3);
      padding: 0.75rem 0 0.85rem;
      display: grid;
      gap: 0.65rem;
    }
    .pwa-body p {
      margin: 0;
      color: var(--muted-foreground, #6e6259);
      line-height: 1.55;
      font-size: 0.8125rem;
    }
    .pwa-nota {
      padding: 0.65rem 0.8rem;
      border-radius: var(--radius-md, 0.75rem);
      background: var(--background, #faf7f2);
      border: 1px solid var(--border, #e5ded3);
      color: var(--secondary-foreground, #44372e) !important;
    }
    .pwa-atualizacao {
      display: grid;
      gap: 0.65rem;
      padding-top: 0.65rem;
      border-top: 1px dashed var(--border, #e5ded3);
    }
    .pwa-acoes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .pwa-acoes button[hlmBtn] {
      min-height: 48px;
    }
    .pwa-feedback:empty {
      display: none;
    }
    .pwa-feedback {
      color: var(--accent-foreground, #30523b) !important;
      font-weight: 600;
    }
    .offline-notice {
      max-width: 480px;
      margin: 0 0 0.85rem;
      padding: 0.9rem 1rem;
      border: 1px solid var(--amber-border, #e6cf9e);
      border-radius: var(--radius-lg, 1.05rem);
      background: var(--amber-bg, #fff8e8);
      color: var(--amber-fg, #684614);
      box-shadow: var(--shadow-soft, 0 1px 2px rgba(41, 37, 33, 0.05));
      font-size: 0.85rem;
      line-height: 1.5;
    }
    @media (max-width: 800px) {
      :host {
        width: 100%;
        max-width: none;
      }
      .offline-notice {
        max-width: none;
      }
    }
    @media (max-width: 520px) {
      .pwa-acoes {
        width: 100%;
      }
      .pwa-acoes button[hlmBtn] {
        width: 100%;
      }
    }
  `,
})
export class PwaComponent implements OnDestroy {
  readonly online = signal(navigator.onLine);
  readonly instalado = signal(matchMedia('(display-mode: standalone)').matches);
  readonly instalavel = signal(false);
  readonly atualizacao = signal(false);
  readonly ocupado = signal(false);
  readonly mensagem = signal('');
  private pedido?: PedidoInstalacao;
  private registro?: ServiceWorkerRegistration;
  private recarregar = false;
  private readonly rede = () => this.online.set(navigator.onLine);
  private readonly oferecerInstalacao = (event: Event) => {
    event.preventDefault();
    this.pedido = event as PedidoInstalacao;
    this.instalavel.set(true);
  };
  private readonly concluiuInstalacao = () => {
    this.instalado.set(true);
    this.instalavel.set(false);
    this.pedido = undefined;
  };
  private readonly controlador = () => {
    // Uma atualização em outra aba nunca apaga o carrinho desta aba automaticamente.
    if (this.recarregar) location.reload();
    this.atualizacao.set(Boolean(this.registro?.waiting));
  };

  constructor() {
    window.addEventListener('online', this.rede);
    window.addEventListener('offline', this.rede);
    window.addEventListener('beforeinstallprompt', this.oferecerInstalacao);
    window.addEventListener('appinstalled', this.concluiuInstalacao);
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.addEventListener('controllerchange', this.controlador);
      void this.preparar();
    } else {
      this.mensagem.set('Instalação e estrutura offline indisponíveis neste navegador.');
    }
  }

  async instalar(): Promise<void> {
    const pedido = this.pedido;
    if (!pedido || this.ocupado()) return;
    this.ocupado.set(true);
    try {
      await pedido.prompt();
      const escolha = await pedido.userChoice;
      this.mensagem.set(
        escolha.outcome === 'accepted'
          ? 'Instalação solicitada ao navegador.'
          : 'Instalação cancelada.',
      );
    } catch {
      this.mensagem.set(
        'Não foi possível instalar. Use o menu do navegador para tentar novamente.',
      );
    } finally {
      this.pedido = undefined;
      this.instalavel.set(false);
      this.ocupado.set(false);
    }
  }

  atualizar(): void {
    if (!this.registro?.waiting || this.ocupado()) return;
    if (
      !window.confirm(
        'Atualizar agora? O carrinho e formulários não salvos desta aba serão descartados.',
      )
    )
      return;
    this.ocupado.set(true);
    this.recarregar = true;
    this.mensagem.set('Atualizando aplicativo…');
    this.registro.waiting.postMessage('ATUALIZAR_SHELL');
  }

  private async preparar(): Promise<void> {
    try {
      const registro = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      this.registro = registro;
      this.atualizacao.set(Boolean(registro.waiting));
      registro.addEventListener('updatefound', () => {
        const instalando = registro.installing;
        instalando?.addEventListener('statechange', () => {
          if (instalando.state === 'installed') this.atualizacao.set(Boolean(registro.waiting));
        });
      });
    } catch {
      this.mensagem.set(
        'A estrutura offline não pôde ser preparada. O aplicativo continua disponível com conexão.',
      );
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.rede);
    window.removeEventListener('offline', this.rede);
    window.removeEventListener('beforeinstallprompt', this.oferecerInstalacao);
    window.removeEventListener('appinstalled', this.concluiuInstalacao);
    navigator.serviceWorker?.removeEventListener('controllerchange', this.controlador);
  }
}

import { Component, OnDestroy, signal } from '@angular/core';

interface PedidoInstalacao extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-pwa',
  template: `
    @if (!online()) { <p class="offline-notice" role="status">Você está offline. Reconecte para consultar o cardápio e enviar pedidos. Nenhuma operação foi confirmada.</p> }
    <details [open]="atualizacao()">
      <summary id="aplicativo">{{ atualizacao() ? 'Nova versão disponível' : 'Aplicativo e conexão' }}</summary>
      <p role="status" aria-live="polite">
        @if (online()) {
          Rede disponível. Consultas e cálculos dependem da conexão com o restaurante.
        } @else {
          Você está offline. Somente a estrutura do aplicativo está disponível. Reconecte para
          consultar o catálogo ou recalcular o carrinho; nenhuma operação foi confirmada.
        }
      </p>
      @if (instalado()) {
        <p>Aplicativo aberto em modo instalado.</p>
      } @else if (instalavel()) {
        <button (click)="instalar()" [disabled]="ocupado()">Instalar aplicativo</button>
      } @else {
        <p>Para instalar, use “Instalar aplicativo” ou “Adicionar à Tela de Início” no menu do
          navegador, quando disponível.</p>
      }
      @if (atualizacao()) {
        <p>Uma nova versão está pronta. Atualizar recarrega esta aba e descarta o carrinho e
          formulários ainda não salvos. As outras abas mantêm seus dados em memória.</p>
        <button (click)="atualizar()" [disabled]="ocupado()">Atualizar aplicativo</button>
      }
      <p role="status" aria-live="polite">{{ mensagem() }}</p>
    </details>
  `,
  styles: `:host{display:block;max-width:520px}summary{min-height:44px;align-content:center;cursor:pointer;list-style:none}details p{line-height:1.6}button{margin:.5rem .5rem .5rem 0}.offline-notice{position:fixed;left:1rem;right:1rem;bottom:90px;max-width:640px;margin:auto;z-index:40;padding:1rem;border-radius:12px;background:#fff1d7;color:#694d1a;box-shadow:0 8px 32px #0002;font-size:.85rem}`,
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

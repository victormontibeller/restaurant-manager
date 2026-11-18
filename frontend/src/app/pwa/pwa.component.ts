import { Component, OnDestroy, computed, input, signal } from '@angular/core';

interface PedidoInstalacao extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-pwa',
  host: { '[class.pwa-com-acoes]': 'visivel()' },
  template: `
    <p class="offline-notice" role="status">@if (!online()) { Você está offline. Reconecte para consultar o cardápio e enviar pedidos. Nenhuma operação foi confirmada. }</p>
    @if (atualizacao()) {
      <div class="pwa-atualizacao">
        <p><strong>Nova versão disponível.</strong> Atualizar recarrega esta aba e descarta o carrinho e formulários ainda não salvos.</p>
        <button type="button" (click)="atualizar()" [disabled]="ocupado()">Atualizar aplicativo</button>
      </div>
    }
    @if (podeInstalar()) {
      <div class="pwa-instalacao">
        <button type="button" (click)="instalar()" [disabled]="ocupado()">Instalar aplicativo</button>
      </div>
    }
    <p class="pwa-retorno" role="status">{{ mensagem() }}</p>
    @if (diagnostico() && mensagemTecnica()) {
      <p class="pwa-retorno" role="status">{{ mensagemTecnica() }}</p>
    }
  `,
  styles: `
    :host { display: block; font-size: 0.875rem; }
    :host(:not(.pwa-com-acoes)) { height: 0; }
    :is(.offline-notice, .pwa-retorno):empty {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: 0;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
    }
    .offline-notice {
      margin: 0 0 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--gestao-alerta-bg, #fff1d7);
      color: var(--gestao-alerta-fg, #694d1a);
    }
    .pwa-atualizacao {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      align-items: center;
      padding-block: 8px;
    }
    .pwa-atualizacao p { flex: 1 1 18rem; margin: 0; }
    .pwa-instalacao { display: flex; justify-content: flex-end; }
    .pwa-instalacao button {
      padding: 0 8px;
      background: transparent;
      color: var(--primary);
      font-size: inherit;
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
    .pwa-retorno { margin: 0; color: var(--muted-foreground); }
  `,
})
export class PwaComponent implements OnDestroy {
  readonly diagnostico = input(false);
  readonly online = signal(navigator.onLine);
  readonly instalado = signal(matchMedia('(display-mode: standalone)').matches);
  readonly instalavel = signal(false);
  readonly atualizacao = signal(false);
  readonly ocupado = signal(false);
  readonly mensagem = signal('');
  readonly mensagemTecnica = signal('');
  readonly podeInstalar = computed(() => this.online() && !this.instalado() && this.instalavel());
  readonly visivel = computed(
    () =>
      !this.online() ||
      this.atualizacao() ||
      this.podeInstalar() ||
      !!this.mensagem() ||
      (this.diagnostico() && !!this.mensagemTecnica()),
  );
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
      this.mensagemTecnica.set('Instalação e estrutura offline indisponíveis neste navegador.');
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
      this.mensagemTecnica.set(
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

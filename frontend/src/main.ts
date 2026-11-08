import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { IdentidadeComponent } from './app/identidade/identidade.component';
import { PlataformaComponent } from './app/plataforma/plataforma.component';
import { VitrineComponent } from './app/catalogo/vitrine.component';
import { PwaComponent } from './app/pwa/pwa.component';
import { DisponibilidadeComponent } from './app/unidades/disponibilidade.component';
import { ParticipanteMesaComponent } from './app/mesas/participante-mesa.component';

@Component({
  selector: 'app-root',
  imports: [
    IdentidadeComponent,
    PlataformaComponent,
    DisponibilidadeComponent,
    PwaComponent,
    VitrineComponent,
    ParticipanteMesaComponent,
  ],
  template: `
    <a class="skip" href="#conteudo">Pular para o conteúdo</a>
    <header>
      <span class="marca">Restaurant Manager</span>
      <span class="selo">Ambiente de testes · dados fictícios</span>
    </header>
    <main id="conteudo">
      <p class="eyebrow">AMBIENTE EM CONSTRUÇÃO</p>
      <h1>O cardápio do seu restaurante, na sua unidade.</h1>
      <p>Escolha a unidade, configure seu carrinho e acompanhe o pedido. Na mesa, autorize sua participação com o código do atendimento.</p>
      <section aria-labelledby="saude">
        <h2 id="saude">Conexão com o sistema</h2>
        <p role="status" aria-live="polite">{{ mensagem() }}</p>
        <button (click)="verificar()" [disabled]="carregando()">Verificar conexão</button>
      </section>
      @if (plataforma) {
        <app-plataforma/>
      } @else {
        <app-disponibilidade/>
        <app-participante-mesa/>
        <app-vitrine/>
        <app-identidade/>
      }
      <app-pwa/>
      <section aria-labelledby="escopo">
        <h2 id="escopo">O que você pode testar agora</h2>
        <p>Catálogo, pedidos, mesas e cozinha com dados fictícios. Delivery disponível somente em cenário controlado.</p>
        <p>Pagamentos e entrega real ainda não estão disponíveis. Não utilize dados pessoais reais.</p>
      </section>
    </main>
    <footer>Ambiente restrito de testes · Sem operação comercial</footer>
  `,
})
class App {
  readonly plataforma = new URLSearchParams(location.search).get('area') === 'plataforma';
  readonly carregando = signal(false);
  readonly mensagem = signal('Verificando conexão…');

  constructor() {
    void this.verificar();
  }

  async verificar(): Promise<void> {
    this.carregando.set(true);
    this.mensagem.set('Verificando conexão…');
    try {
      const response = await fetch('/actuator/health', {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      const data: { status?: string } = await response.json();
      if (!response.ok || data.status !== 'UP') throw new Error('indisponivel');
      this.mensagem.set('Sistema conectado. Banco de dados disponível.');
    } catch {
      this.mensagem.set(
        'Sem conexão com o sistema. Tente novamente; nenhuma operação foi confirmada.',
      );
    } finally {
      this.carregando.set(false);
    }
  }
}

bootstrapApplication(App).catch(() => {
  document.body.textContent = 'Não foi possível abrir a aplicação. Recarregue a página.';
});

import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  template: `
    <a class="skip" href="#conteudo">Pular para o conteúdo</a>
    <header><span class="marca">Restaurant Manager</span><span class="selo">Homologação · dados fictícios</span></header>
    <main id="conteudo">
      <p class="eyebrow">AMBIENTE EM CONSTRUÇÃO</p>
      <h1>Uma base segura para a operação do restaurante.</h1>
      <p>Fundação técnica em desenvolvimento. Catálogo, contas e pedidos ainda não estão disponíveis.</p>
      <section aria-labelledby="saude">
        <h2 id="saude">Conexão com o sistema</h2>
        <p role="status" aria-live="polite">{{ mensagem() }}</p>
        <button (click)="verificar()" [disabled]="carregando()">Verificar conexão</button>
      </section>
      <section aria-labelledby="escopo"><h2 id="escopo">O que você pode testar agora</h2>
        <p>Abertura da interface, navegação por teclado e conexão real com a API e o PostgreSQL.</p>
        <p>Nenhum pedido ou pagamento é aceito nesta versão. Não utilize dados pessoais reais.</p>
      </section>
    </main>
    <footer>Ambiente restrito de testes · Sem operação comercial</footer>
  `,
})
class App {
  readonly carregando = signal(false);
  readonly mensagem = signal('Verificando conexão…');
  constructor() { void this.verificar(); }
  async verificar(): Promise<void> {
    this.carregando.set(true);
    this.mensagem.set('Verificando conexão…');
    try {
      const response = await fetch('/actuator/health', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      const data: {status?: string} = await response.json();
      if (!response.ok || data.status !== 'UP') throw new Error('indisponivel');
      this.mensagem.set('Sistema conectado. Banco de dados disponível.');
    } catch {
      this.mensagem.set('Sem conexão com o sistema. Tente novamente; nenhuma operação foi confirmada.');
    } finally { this.carregando.set(false); }
  }
}

bootstrapApplication(App).catch(() => {
  document.body.textContent = 'Não foi possível abrir a aplicação. Recarregue a página.';
});

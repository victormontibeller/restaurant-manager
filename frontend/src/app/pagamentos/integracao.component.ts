import { Component, DestroyRef, inject, signal } from '@angular/core';
import { mensagemErro } from '../catalogo/modelos';
import { SessaoService } from '../identidade/sessao.service';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
interface Conexao {
  id: string;
  vendedor: string;
  reautorizar: boolean;
  expiraEm: string;
}
@Component({
  selector: 'app-integracao-pagamento',
  styleUrl: '../operacao.css',
  templateUrl: './integracao.component.html',
})
export class IntegracaoPagamentoComponent {
  private readonly sessao = inject(SessaoService);
  private readonly nav = inject(NavegacaoProtegidaService);
  private readonly chave = 'integracao:' + crypto.randomUUID();
  readonly dados = signal<Conexao | null>(null);
  readonly erro = signal('');
  readonly ocupado = signal(false);
  private destruido = false;
  constructor() {
    void this.carregar();
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.nav.liberar(this.chave);
    });
  }
  async carregar(): Promise<void> {
    this.ocupado.set(true);
    try {
      const d = await this.sessao.api<Conexao | null>('/api/v1/integracoes/mercadopago');
      if (!this.destruido) this.dados.set(d ?? null);
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemErro(e));
    } finally {
      if (!this.destruido) this.ocupado.set(false);
    }
  }
  async autorizar(event: Event, senha: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    const valor = senha.value;
    senha.value = '';
    this.ocupado.set(true);
    this.nav.bloquear(this.chave, true);
    this.erro.set('');
    try {
      await this.sessao.api('/api/v1/auth/reautenticar', 'POST', { senha: valor });
      const r = await this.sessao.api<{ url: string }>(
        '/api/v1/integracoes/mercadopago/autorizar',
        'POST',
      );
      if (!this.destruido) window.location.assign(r.url);
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemErro(e));
    } finally {
      this.ocupado.set(false);
      this.nav.liberar(this.chave);
    }
  }
}

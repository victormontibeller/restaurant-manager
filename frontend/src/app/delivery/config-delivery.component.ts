import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro, moeda } from '../catalogo/modelos';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
import { HlmButton } from '../ui/button';
import { ConfigDelivery, RegiaoDelivery } from './modelos';

@Component({
  selector: 'app-config-delivery',
  imports: [FormsModule, HlmButton],
  templateUrl: './config-delivery.component.html',
  styleUrl: '../operacao.css',
})
export class ConfigDeliveryComponent {
  readonly unidadeId = input.required<string>();
  private readonly sessao = inject(SessaoService);
  private readonly nav = inject(NavegacaoProtegidaService);
  private readonly chave = 'delivery-config:' + crypto.randomUUID();
  readonly ocupado = signal(false);
  readonly incerto = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly servidor = signal<ConfigDelivery | null>(null);
  regioes: RegiaoDelivery[] = [];
  minutos = 15;
  versao = 0;
  private enviado: ConfigDelivery | null = null;
  private geracao = 0;
  constructor() {
    effect(() => {
      this.unidadeId();
      this.geracao++;
      this.incerto.set(false);
      this.servidor.set(null);
      untracked(() => void this.carregar());
    });
    effect(() => this.nav.bloquear(this.chave, this.ocupado() || this.incerto()));
    this.nav.registrarRascunho(
      this.chave,
      () => !!this.servidor() && this.conteudo(this.corpo()) !== this.conteudo(this.servidor()!),
    );
    inject(DestroyRef).onDestroy(() => {
      this.geracao++;
      this.nav.liberar(this.chave);
      this.nav.retirarRascunho(this.chave);
    });
  }
  private rota(): string {
    return '/api/v1/configuracoes/unidades/' + this.unidadeId() + '/delivery';
  }
  private corpo(): ConfigDelivery {
    return {
      versao: this.versao,
      checkoutSegundos: this.minutos * 60,
      regioes: this.regioes.map((r) => ({
        ...r,
        cepInicial: r.cepInicial.replace(/\D/g, ''),
        cepFinal: r.cepFinal.replace(/\D/g, ''),
        taxa: r.taxa.replace(',', '.'),
        minimo: r.minimo.replace(',', '.'),
      })),
    };
  }
  private conteudo(c: ConfigDelivery): string {
    return JSON.stringify({
      checkoutSegundos: c.checkoutSegundos,
      regioes: [...c.regioes].sort((a, b) => a.id.localeCompare(b.id)),
    });
  }
  private preencher(c: ConfigDelivery): void {
    this.servidor.set(c);
    this.versao = c.versao;
    this.minutos = c.checkoutSegundos / 60;
    this.regioes = structuredClone(c.regioes);
  }
  adicionar(): void {
    this.regioes = [
      ...this.regioes,
      {
        id: crypto.randomUUID(),
        nome: '',
        cepInicial: '',
        cepFinal: '',
        taxa: '0.00',
        minimo: '0.00',
        ativa: true,
      },
    ];
  }
  remover(id: string): void {
    this.regioes = this.regioes.filter((r) => r.id !== id);
  }
  async carregar(): Promise<void> {
    if (this.ocupado()) return;
    const geracao = this.geracao;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const dados = await this.sessao.api<ConfigDelivery>(this.rota());
      if (geracao !== this.geracao) return;
      if (this.incerto() && this.enviado && this.conteudo(dados) !== this.conteudo(this.enviado)) {
        this.servidor.set(dados);
        this.erro.set(
          'A configuração salva difere do rascunho. Confira ou use explicitamente a versão do servidor.',
        );
      } else {
        this.preencher(dados);
        this.incerto.set(false);
        this.enviado = null;
        this.aviso.set('Configuração consultada no servidor.');
      }
    } catch (erro) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(erro));
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }
  usarServidor(): void {
    const s = this.servidor();
    if (s && window.confirm('Descartar o rascunho e usar a configuração consultada no servidor?')) {
      this.preencher(s);
      this.incerto.set(false);
      this.enviado = null;
    }
  }
  async salvar(senha: HTMLInputElement): Promise<void> {
    if (this.ocupado() || this.incerto()) return;
    const geracao = this.geracao;
    const body = this.corpo();
    const valor = senha.value;
    senha.value = '';
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    try {
      await this.sessao.api('/api/v1/auth/reautenticar', 'POST', { senha: valor });
      this.enviado = structuredClone(body);
      this.incerto.set(true);
      const dados = await this.sessao.api<ConfigDelivery>(this.rota(), 'PUT', body);
      if (geracao === this.geracao) {
        this.preencher(dados);
        this.incerto.set(false);
        this.enviado = null;
        this.aviso.set('Regiões e prazo de checkout salvos.');
      }
    } catch (erro) {
      if (geracao === this.geracao) {
        if (erro instanceof ApiFailure && erro.status >= 400 && erro.status < 500) {
          this.incerto.set(false);
          this.enviado = null;
        }
        this.erro.set(mensagemErro(erro));
      }
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }

  regioesAtivasCount(): number {
    return this.regioes.filter((r) => r.ativa).length;
  }

  checkoutSegundosResumo(): number {
    return Math.max(0, Math.round((Number(this.minutos) || 0) * 60));
  }

  faixaTaxas(): string {
    const ativas = this.regioes.filter((r) => r.ativa);
    if (!ativas.length) return 'Nenhuma ativa';
    const valores = ativas
      .map((r) => Number(String(r.taxa).replace(',', '.')))
      .filter((v) => Number.isFinite(v) && v >= 0);
    if (!valores.length) return '—';
    const min = Math.min(...valores).toFixed(2);
    const max = Math.max(...valores).toFixed(2);
    return min === max ? moeda(min) : `${moeda(min)} – ${moeda(max)}`;
  }

  sobreposicoesCep(): string[] {
    const ativas = this.regioes
      .map((r, i) => ({
        nome: r.nome.trim() || `Região ${i + 1}`,
        ativa: r.ativa,
        ini: r.cepInicial.replace(/\D/g, ''),
        fim: r.cepFinal.replace(/\D/g, ''),
      }))
      .filter((r) => r.ativa && r.ini.length === 8 && r.fim.length === 8);
    const pares: string[] = [];
    for (let i = 0; i < ativas.length; i++) {
      for (let j = i + 1; j < ativas.length; j++) {
        const a1 = ativas[i].ini <= ativas[i].fim ? ativas[i].ini : ativas[i].fim;
        const a2 = ativas[i].ini <= ativas[i].fim ? ativas[i].fim : ativas[i].ini;
        const b1 = ativas[j].ini <= ativas[j].fim ? ativas[j].ini : ativas[j].fim;
        const b2 = ativas[j].ini <= ativas[j].fim ? ativas[j].fim : ativas[j].ini;
        if (a1 <= b2 && b1 <= a2) pares.push(`${ativas[i].nome} × ${ativas[j].nome}`);
      }
    }
    return pares;
  }
}

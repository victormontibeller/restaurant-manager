import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro, moeda } from '../catalogo/modelos';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
import { focarEditor, restaurarFoco } from '../ui/foco-gestao';
import { ConfigDelivery, RegiaoDelivery } from './modelos';

@Component({
  selector: 'app-config-delivery',
  imports: [FormsModule],
  templateUrl: './config-delivery.component.html',
  styleUrl: '../ui/administracao.css',
  styles: `
    .lista-regioes { margin-top: 16px; }
    .gestao-editor { display: grid; gap: 12px; }
    .gestao-editor h3 { margin: 0; }
    .gestao-editor label, .admin-filtros label { display: grid; gap: 4px; }
    .gestao-editor .gestao-opcao { display: flex; }
  `,
})
export class ConfigDeliveryComponent {
  readonly unidadeId = input.required<string>();
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  @ViewChild('nova') nova?: ElementRef<HTMLButtonElement>;
  private origem: HTMLElement | null = null;
  readonly moeda = moeda;
  readonly editor = signal<RegiaoDelivery | null>(null);
  original: RegiaoDelivery | null = null;
  private inicialEditor = '';
  readonly divergente = signal(false);
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
      this.divergente.set(false);
      this.fecharEditor(false);
      this.enviado = null;
      this.aviso.set('');
      this.ocupado.set(false);
      untracked(() => void this.carregar());
    });
    effect(() => this.nav.bloquear(this.chave, this.ocupado() || this.incerto()));
    this.nav.registrarRascunho(this.chave, () => this.temAlteracao());
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
      checkoutSegundos: Math.round(this.minutos * 60),
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
  private editorAlterado(): boolean {
    return !!this.editor() && JSON.stringify(this.editor()) !== this.inicialEditor;
  }

  private temAlteracao(): boolean {
    const salvo = this.servidor();
    return (
      this.editorAlterado() || (!!salvo && this.conteudo(this.corpo()) !== this.conteudo(salvo))
    );
  }

  adicionar(origem: HTMLElement): void {
    this.abrirEditor(null, origem);
  }

  editarRegiao(regiao: RegiaoDelivery, origem: HTMLElement): void {
    this.abrirEditor(regiao, origem);
  }

  private abrirEditor(regiao: RegiaoDelivery | null, origem: HTMLElement): void {
    if (this.ocupado() || this.incerto() || !this.servidor() || !this.podeDescartarEditor()) return;
    const rascunho = regiao
      ? structuredClone(regiao)
      : {
          id: crypto.randomUUID(),
          nome: '',
          cepInicial: '',
          cepFinal: '',
          taxa: '0.00',
          minimo: '0.00',
          ativa: true,
        };
    this.original = regiao;
    this.origem = origem;
    this.inicialEditor = JSON.stringify(rascunho);
    this.editor.set(rascunho);
    focarEditor(this.host);
  }

  aplicarRegiao(): void {
    const r = this.editor();
    if (!r?.nome.trim() || this.ocupado() || this.incerto()) return;
    const regiao = {
      ...r,
      nome: r.nome.trim(),
      cepInicial: r.cepInicial.replace(/\D/g, ''),
      cepFinal: r.cepFinal.replace(/\D/g, ''),
      taxa: r.taxa.replace(',', '.'),
      minimo: r.minimo.replace(',', '.'),
    };
    this.regioes = this.original
      ? this.regioes.map((atual) => (atual.id === r.id ? regiao : atual))
      : [...this.regioes, regiao];
    this.aviso.set('Lista alterada. Salve as regiões e o prazo para confirmar.');
    this.fecharEditor();
  }

  private podeDescartarEditor(): boolean {
    return !this.editorAlterado() || window.confirm('Descartar as alterações desta região?');
  }

  cancelarEditor(): void {
    if (this.podeDescartarEditor()) this.fecharEditor();
  }

  private fecharEditor(restaurar = true): void {
    this.editor.set(null);
    this.original = null;
    if (restaurar) restaurarFoco(this.origem, this.nova?.nativeElement);
    this.origem = null;
  }

  remover(id: string): void {
    if (this.ocupado() || this.incerto()) return;
    if (this.editor()?.id === id) {
      if (!this.podeDescartarEditor()) return;
      this.fecharEditor(false);
    }
    this.regioes = this.regioes.filter((r) => r.id !== id);
    this.aviso.set('Região removida da lista. Salve as regiões e o prazo para confirmar.');
    restaurarFoco(this.nova?.nativeElement);
  }

  reconsultar(): void {
    if (
      !this.incerto() &&
      this.temAlteracao() &&
      !window.confirm('Descartar as alterações e consultar a configuração salva?')
    )
      return;
    void this.carregar();
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
        this.divergente.set(true);
        this.erro.set(
          'A configuração salva difere do rascunho. Confira ou use explicitamente a versão do servidor.',
        );
      } else {
        this.preencher(dados);
        this.fecharEditor(false);
        this.divergente.set(false);
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
    if (
      this.divergente() &&
      s &&
      window.confirm('Descartar o rascunho e usar a configuração consultada no servidor?')
    ) {
      this.preencher(s);
      this.divergente.set(false);
      this.erro.set('');
      this.aviso.set('Configuração consultada no servidor.');
      this.incerto.set(false);
      this.enviado = null;
    }
  }
  async salvar(senha: HTMLInputElement): Promise<void> {
    if (!this.servidor() || this.editor() || this.ocupado() || this.incerto()) return;
    const geracao = this.geracao;
    const body = this.corpo();
    const valor = senha.value;
    senha.value = '';
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    try {
      await this.sessao.api('/api/v1/auth/reautenticar', 'POST', { senha: valor });
      if (geracao !== this.geracao) return;
      this.enviado = structuredClone(body);
      this.incerto.set(true);
      const dados = await this.sessao.api<ConfigDelivery>(this.rota(), 'PUT', body);
      if (geracao === this.geracao) {
        this.preencher(dados);
        this.fecharEditor(false);
        this.divergente.set(false);
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
}

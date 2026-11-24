import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Unidade, mensagemErro } from '../catalogo/modelos';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
import { MarcaService } from '../rotas/marca.service';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from '../ui/button';
import { ApiFailure, SessaoService } from './sessao.service';

interface MinhaConta {
  nome: string | null;
  telefone: string | null;
  email: string;
  emailVerificado: boolean;
  perfil: string;
  criadoEm: string;
  versao: number;
  unidades: Unidade[];
}

const PERFIL = '/api/v1/me/perfil';
const dataPtBr = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' });

@Component({
  selector: 'app-dados-conta',
  imports: [HlmButton, IconeComponent],
  templateUrl: './dados-conta.component.html',
  styleUrl: './dados-conta.component.css',
  host: { '[attr.data-equipe]': 'tituloDaGestao() ? "" : null' },
})
export class DadosContaComponent {
  readonly nomePerfil = input.required<string>();
  readonly tituloDaGestao = input(false);
  readonly marca = inject(MarcaService);
  private readonly sessao = inject(SessaoService);
  readonly identidade = this.sessao.identidade;
  private readonly navegacao = inject(NavegacaoProtegidaService);
  private readonly editarBotao = viewChild<ElementRef<HTMLButtonElement>>('editarBotao');
  private readonly campoNome = viewChild<ElementRef<HTMLInputElement>>('campoNome');
  readonly dados = signal<MinhaConta | null>(null);
  readonly editando = signal(false);
  readonly ocupado = signal(false);
  readonly consultarAntesDeSalvar = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly nome = signal('');
  readonly telefone = signal('');
  private conta = '';
  private geracao = 0;

  constructor() {
    effect(() => {
      const conta = this.sessao.identidade()?.usuarioId ?? '';
      if (this.conta === conta) return;
      this.conta = conta;
      this.geracao++;
      this.dados.set(null);
      this.editando.set(false);
      this.nome.set('');
      this.telefone.set('');
      this.erro.set('');
      this.aviso.set('');
      this.consultarAntesDeSalvar.set(false);
      this.navegacao.liberar('perfil-proprio');
      if (conta) untracked(() => void this.consultar());
    });
    this.navegacao.registrarRascunho('perfil-proprio', () => this.alterado());
    inject(DestroyRef).onDestroy(() => {
      this.geracao++;
      this.navegacao.retirarRascunho('perfil-proprio');
      this.navegacao.liberar('perfil-proprio');
    });
  }

  iniciais(dados: MinhaConta): string {
    const partes = (dados.nome || dados.email.split('@')[0]).trim().split(/\s+/);
    const monograma =
      partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : partes[0].slice(0, 2);
    return monograma.toUpperCase();
  }

  dataCadastro(valor: string): string {
    return dataPtBr.format(new Date(valor));
  }

  alterado(): boolean {
    const dados = this.dados();
    return (
      !!dados &&
      this.editando() &&
      (this.nome() !== (dados.nome ?? '') || this.telefone() !== (dados.telefone ?? ''))
    );
  }

  editar(): void {
    const dados = this.dados();
    if (!dados) return;
    this.nome.set(dados.nome ?? '');
    this.telefone.set(dados.telefone ?? '');
    this.editando.set(true);
    this.aviso.set('');
    setTimeout(() => this.campoNome()?.nativeElement.focus());
  }

  fechar(): void {
    if (this.alterado() && !window.confirm('Descartar as alterações nos dados pessoais?')) return;
    if (this.consultarAntesDeSalvar()) {
      void this.consultar();
      return;
    }
    this.fecharEditor();
    this.erro.set('');
  }

  recarregar(): void {
    if (
      this.alterado() &&
      !this.consultarAntesDeSalvar() &&
      !window.confirm('Descartar as alterações nos dados pessoais?')
    )
      return;
    void this.consultar();
  }

  async consultar(): Promise<void> {
    const geracao = this.geracao;
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    try {
      const atual = await this.sessao.api<MinhaConta>(PERFIL);
      if (geracao !== this.geracao) return;
      this.dados.set(atual);
      this.consultarAntesDeSalvar.set(false);
      if (this.editando()) this.fecharEditor();
    } catch (erro) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(erro));
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }

  async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const conta = this.dados();
    if (!conta || !this.alterado() || this.ocupado() || this.consultarAntesDeSalvar()) return;
    const geracao = this.geracao;
    this.navegacao.bloquear('perfil-proprio', true);
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const atual = await this.sessao.api<MinhaConta>(PERFIL, 'PUT', {
        versao: conta.versao,
        nome: this.nome().trim(),
        telefone: this.telefone().trim(),
      });
      if (geracao !== this.geracao) return;
      this.dados.set(atual);
      this.fecharEditor();
      this.aviso.set('Dados pessoais salvos.');
    } catch (erro) {
      if (geracao !== this.geracao) return;
      const consultar = !(erro instanceof ApiFailure) || erro.status === 409 || erro.status >= 500;
      this.consultarAntesDeSalvar.set(consultar);
      this.erro.set(
        consultar ? 'Consulte os dados atuais antes de editar novamente.' : mensagemErro(erro),
      );
    } finally {
      if (geracao === this.geracao) {
        this.ocupado.set(false);
        this.navegacao.liberar('perfil-proprio');
      }
    }
  }

  private fecharEditor(): void {
    this.editando.set(false);
    setTimeout(() => this.editarBotao()?.nativeElement.focus());
  }
}

import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';

interface Unidade {
  id: string;
  nome: string;
  fuso: string;
}

interface Atual extends Unidade {
  versao: string;
}

interface Evento {
  versao: string;
  tipo: string;
  nome: string;
  fuso: string;
  ativa: boolean;
  ocorridoEm: string;
}

interface Pagina {
  unidade: Atual;
  eventos: Evento[];
  proximo: string;
  temMais: boolean;
}

@Component({
  selector: 'app-eventos-unidade',
  imports: [DatePipe],
  templateUrl: './eventos-unidade.component.html',
  styleUrl: '../ui/administracao.css',
  styles: `ol { list-style: none; margin: 16px 0 0; } .gestao-linha time { font-variant-numeric: tabular-nums; }`,
})
export class EventosUnidadeComponent {
  private readonly sessao = inject(SessaoService);
  private readonly conta = this.sessao.identidade()?.usuarioId;
  private geracao = 0;
  private destruido = false;
  private timer?: ReturnType<typeof setTimeout>;
  private cursor = '-1';
  readonly unidades = signal<Unidade[]>([]);
  readonly selecionada = signal('');
  readonly atual = signal<Atual | null>(null);
  readonly eventos = signal<Evento[]>([]);
  readonly estado = signal('Carregando unidades permitidas…');
  readonly erro = signal('');
  readonly ocupado = signal(false);
  readonly exportando = signal(false);
  readonly confirmado = signal('');
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.geracao++;
      clearTimeout(this.timer);
    });
    void this.carregar();
  }

  private vigente(geracao: number): boolean {
    return (
      !this.destruido &&
      geracao === this.geracao &&
      this.conta === this.sessao.identidade()?.usuarioId
    );
  }

  private limpar(): number {
    clearTimeout(this.timer);
    this.geracao++;
    this.cursor = '-1';
    this.atual.set(null);
    this.eventos.set([]);
    this.confirmado.set('');
    this.erro.set('');
    this.ocupado.set(false);
    this.exportando.set(false);
    return this.geracao;
  }

  async carregar(): Promise<void> {
    const geracao = this.limpar();
    this.unidades.set([]);
    this.selecionada.set('');
    this.ocupado.set(true);
    this.estado.set('Carregando unidades permitidas…');
    try {
      const dados = await this.sessao.api<{ acoes: string[]; unidades: Unidade[] }>(
        '/api/v1/acessos/efetivos',
      );
      if (!this.vigente(geracao)) return;
      if (!dados.acoes.includes('unidade.acompanhar')) {
        this.estado.set('Sua política não permite acompanhar atualizações.');
        return;
      }
      this.unidades.set(dados.unidades);
      this.estado.set(
        dados.unidades.length
          ? 'Selecione uma unidade para acompanhar.'
          : 'Nenhuma unidade ativa permitida.',
      );
    } catch {
      if (this.vigente(geracao)) {
        this.erro.set('Não foi possível consultar o acesso atual. Tente recarregar as unidades.');
        this.estado.set('Acompanhamento indisponível.');
        this.foco();
      }
    } finally {
      if (this.vigente(geracao)) this.ocupado.set(false);
    }
  }

  selecionar(id: string): void {
    const geracao = this.limpar();
    this.selecionada.set(id);
    if (!id) {
      this.estado.set('Selecione uma unidade para acompanhar.');
      return;
    }
    this.estado.set('Consultando atualizações…');
    void this.consultar(geracao, id);
  }

  async exportar(): Promise<void> {
    const id = this.selecionada();
    const geracao = this.geracao;
    if (!id || !this.atual() || this.ocupado() || this.exportando() || !this.vigente(geracao))
      return;
    clearTimeout(this.timer);
    this.exportando.set(true);
    this.erro.set('');
    this.estado.set('Consultando para exportar…');
    try {
      // Nunca exportar o cache da tela: ação, sessão e vínculo são revalidados.
      const pagina = await this.sessao.api<Pagina>(
        '/api/v1/operacao/unidades/' + encodeURIComponent(id) + '/eventos?depois=-1',
      );
      if (!this.vigente(geracao) || this.selecionada() !== id) return;
      if (pagina.unidade.id !== id) throw new Error('Unidade divergente.');
      this.baixar(id, pagina.unidade);
      this.estado.set('Arquivo cadastral solicitado ao navegador.');
    } catch (error) {
      if (!this.vigente(geracao)) return;
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status))
        this.encerrarAcompanhamento();
      else {
        this.estado.set('Exportação não concluída.');
        this.erro.set(
          'Não foi possível exportar o cadastro. Nenhum arquivo foi gerado com dados antigos. Tente novamente com conexão.',
        );
        this.foco();
      }
    } finally {
      if (this.vigente(geracao)) {
        this.exportando.set(false);
        this.timer = setTimeout(() => void this.consultar(geracao, id), 5000);
      }
    }
  }

  private baixar(id: string, unidade: Atual): void {
    const arquivo = new Blob(
      [
        JSON.stringify(
          {
            unidade: {
              id: unidade.id,
              nome: unidade.nome,
              fuso: unidade.fuso,
              versao: unidade.versao,
            },
          },
          null,
          2,
        ) + '\n',
      ],
      { type: 'application/json;charset=utf-8' },
    );
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement('a');
    try {
      link.href = url;
      link.download = 'unidade-' + id + '.json';
      document.body.append(link);
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  private encerrarAcompanhamento(): void {
    this.limpar();
    this.unidades.set([]);
    this.selecionada.set('');
    this.estado.set('Acompanhamento encerrado.');
    this.erro.set(
      'Acesso à unidade removido ou sessão encerrada. Recarregue as unidades permitidas.',
    );
    this.foco();
  }

  private async consultar(geracao: number, id: string): Promise<void> {
    if (!this.vigente(geracao)) return;
    this.ocupado.set(true);
    let intervalo = 5000;
    let continuar = true;
    try {
      const pagina = await this.sessao.api<Pagina>(
        '/api/v1/operacao/unidades/' +
          encodeURIComponent(id) +
          '/eventos?depois=' +
          encodeURIComponent(this.cursor),
      );
      if (!this.vigente(geracao)) return;
      this.cursor = pagina.proximo;
      this.atual.set(pagina.unidade);
      this.eventos.set([...this.eventos(), ...pagina.eventos].slice(-50));
      this.erro.set('');
      this.confirmado.set(new Date().toLocaleTimeString('pt-BR'));
      this.estado.set(
        pagina.temMais ? 'Recuperando alterações pendentes…' : 'Acompanhamento conectado.',
      );
      if (pagina.temMais) intervalo = 100;
    } catch (error) {
      if (!this.vigente(geracao)) return;
      this.atual.set(null);
      this.eventos.set([]);
      this.confirmado.set('');
      this.cursor = '-1';
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status)) {
        continuar = false;
        this.encerrarAcompanhamento();
      } else {
        this.estado.set('Sem conexão confirmada. Tentando recuperar o acompanhamento…');
      }
    } finally {
      if (this.vigente(geracao)) {
        this.ocupado.set(false);
        if (continuar) this.timer = setTimeout(() => void this.consultar(geracao, id), intervalo);
      }
    }
  }

  private foco(): void {
    setTimeout(() => {
      if (!this.destruido) this.alerta?.nativeElement.focus();
    });
  }
}

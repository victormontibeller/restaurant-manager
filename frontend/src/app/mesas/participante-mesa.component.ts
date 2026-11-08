import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { mensagemErro, moeda } from '../catalogo/modelos';
import { AcompanhamentoEventos } from '../eventos/acompanhamento';
import { MeusPedidosComponent } from '../pedidos/meus-pedidos.component';
import { nomeEstado } from '../pedidos/modelos';
import { Comanda, SolicitacaoMesa } from './modelos';
import { SessaoMesaService } from './sessao-mesa.service';

interface IntencaoSolicitacao {
  intencaoId: string;
  tipo: 'AJUDA' | 'CONTA';
  participante: string;
}

@Component({
  selector: 'app-participante-mesa',
  imports: [MeusPedidosComponent],
  templateUrl: './participante-mesa.component.html',
  styleUrl: '../operacao.css',
})
export class ParticipanteMesaComponent {
  readonly sessao = inject(SessaoMesaService);
  readonly comanda = signal<Comanda | null>(null);
  readonly ocupado = signal(false);
  private readonly erroAcao = signal('');
  private readonly erroConsulta = signal('');
  readonly erro = computed(() =>
    [this.erroAcao(), this.erroConsulta() ? 'Atualização dos dados: ' + this.erroConsulta() : '']
      .filter(Boolean)
      .join(' '),
  );
  readonly aviso = signal('');
  readonly encerramentoPendente = signal(false);
  readonly intencao = signal<IntencaoSolicitacao | null>(null);
  private readonly pendentes = new Map<string, IntencaoSolicitacao>();
  readonly acompanhamento = new AcompanhamentoEventos();
  readonly nomeEstado = nomeEstado;
  readonly moeda = moeda;
  mesaId = new URLSearchParams(location.search).get('mesa') ?? '';
  private geracao = 0;

  constructor() {
    effect(() => {
      const participante = this.sessao.participante();
      this.geracao++;
      this.comanda.set(null);
      this.intencao.set(
        participante ? (this.pendentes.get(participante.participanteId) ?? null) : null,
      );
      this.ocupado.set(false);
      this.aviso.set('');
      this.erroAcao.set('');
      this.erroConsulta.set('');
      this.acompanhamento.encerrar();
      if (participante)
        untracked(() => {
          this.acompanhamento.iniciar(
            this.sessao,
            '/api/v1/mesa/eventos',
            {},
            () => this.consultar(true),
            () => this.comanda.set(null),
          );
        });
    });
    inject(DestroyRef).onDestroy(() => {
      this.geracao++;
      this.acompanhamento.encerrar();
    });
    void this.sessao
      .restaurar()
      .catch(() =>
        this.erroConsulta.set('Não foi possível restaurar a participação. Confira a conexão.'),
      );
  }

  async entrar(event: Event, codigo: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado() || this.encerramentoPendente()) return;
    this.ocupado.set(true);
    this.erroAcao.set('');
    try {
      await this.sessao.autorizar(this.mesaId.trim(), codigo.value);
      codigo.value = '';
      this.aviso.set('Participação autorizada pelo servidor.');
    } catch (error) {
      this.erroAcao.set(mensagemErro(error));
    } finally {
      this.ocupado.set(false);
    }
  }

  async consultar(automatica = false): Promise<void> {
    const geracao = this.geracao;
    try {
      const conta = await this.sessao.api<Comanda>('/api/v1/mesa/comanda');
      if (geracao === this.geracao) {
        this.comanda.set(conta);
        this.erroConsulta.set('');
      }
    } catch (error) {
      if (geracao === this.geracao) this.erroConsulta.set(mensagemErro(error));
      if (automatica) throw error;
    }
  }

  async solicitar(tipo: 'AJUDA' | 'CONTA'): Promise<void> {
    const participante = this.sessao.participante();
    if (!participante || this.ocupado() || this.intencao()) return;
    const intencao: IntencaoSolicitacao = {
      intencaoId: crypto.randomUUID(),
      tipo,
      participante: participante.participanteId,
    };
    this.pendentes.set(participante.participanteId, intencao);
    this.intencao.set(intencao);
    await this.repetirSolicitacao();
  }

  async repetirSolicitacao(): Promise<void> {
    const intencao = this.intencao();
    if (
      !intencao ||
      this.ocupado() ||
      intencao.participante !== this.sessao.participante()?.participanteId
    )
      return;
    this.ocupado.set(true);
    this.erroAcao.set('');
    const geracao = this.geracao;
    const vigente = () =>
      geracao === this.geracao &&
      intencao.participante === this.sessao.participante()?.participanteId;
    try {
      await this.sessao.api<SolicitacaoMesa>('/api/v1/mesa/solicitacoes', 'POST', {
        intencaoId: intencao.intencaoId,
        tipo: intencao.tipo,
      });
      this.pendentes.delete(intencao.participante);
      if (!vigente()) return;
      this.intencao.set(null);
      this.aviso.set(
        intencao.tipo === 'AJUDA'
          ? 'Pedido de ajuda registrado. Aguarde a equipe.'
          : 'Pedido de conta registrado. A comanda só bloqueia novas rodadas quando a equipe iniciar o fechamento.',
      );
    } catch (error) {
      if (vigente()) this.erroAcao.set(mensagemErro(error));
    } finally {
      if (vigente()) this.ocupado.set(false);
    }
  }

  async sair(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erroAcao.set('');
    try {
      await this.sessao.sair();
      this.encerramentoPendente.set(false);
      this.aviso.set('Participação encerrada.');
    } catch {
      this.encerramentoPendente.set(true);
      this.erroAcao.set(
        'Acesso local removido; o encerramento no servidor ainda não foi confirmado. Reconecte para encerrar.',
      );
    } finally {
      this.ocupado.set(false);
    }
  }
}

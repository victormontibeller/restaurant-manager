import { EnderecosComponent } from '../delivery/enderecos.component';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, ROUTES, Router, RouterLink } from '@angular/router';
import { CriacaoPendenteService } from '../unidades/criacao-pendente.service';
import { ConvitePendenteService } from '../acessos/convite-pendente.service';
import { CatalogoPendenteService } from '../catalogo/catalogo-pendente.service';
import { MidiaPendenteService } from '../catalogo/midia-pendente.service';
import { ContextoOperacaoService } from '../rotas/contexto-operacao.service';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
import { retornoSeguro } from '../rotas/guardas';
import { HlmButton } from '../ui/button';
import { RecuperacaoComponent } from './recuperacao.component';
import { DadosContaComponent } from './dados-conta.component';
import { CadastroComponent } from './cadastro.component';
import { AceitarConviteComponent } from './aceitar-convite.component';
import { VerificacaoComponent } from './verificacao.component';
import { SessaoService } from './sessao.service';
import { SessaoNavegacaoService } from './sessao-navegacao.service';

type Formulario = 'login' | 'conta' | 'recuperacao' | 'cadastro' | 'convite' | 'verificacao';

@Component({
  selector: 'app-identidade',
  imports: [
    EnderecosComponent,
    DadosContaComponent,
    RouterLink,
    HlmButton,
    RecuperacaoComponent,
    CadastroComponent,
    AceitarConviteComponent,
    VerificacaoComponent,
  ],
  host: { '[class.identidade-cliente]': 'apresentacaoCliente()' },
  template: `
    <section
      class="auth-card"
      [class.auth-cliente]="apresentacaoCliente()"
      [class.conta-cliente]="pagina() === 'conta'"
      [class.conta-equipe]="pagina() === 'conta' && equipe"
      [attr.aria-labelledby]="tituloFormulario()"
      [attr.aria-busy]="ocupado()"
    >
      @if (sessao.identidade(); as pessoa) {
        <div class="account-profile">
          @if (pagina() === 'conta') {
            @if (!equipe) { <h1 id="conta-titulo">Minha conta</h1> }
            <app-dados-conta [nomePerfil]="nomePerfil(pessoa.perfil)" />
          } @else {
            <span class="auth-symbol" aria-hidden="true">✓</span>
            <p class="eyebrow">MINHA CONTA</p>
            <h1 id="conta-titulo">Que bom ter você por aqui.</h1>
            <p class="perfil">{{ nomePerfil(pessoa.perfil) }}</p>
            <p>{{ pessoa.emailVerificado ? 'E-mail verificado.' : 'E-mail ainda não verificado.' }}</p>
          }
          @if (!pessoa.emailVerificado) {
            <p>Para verificar, saia da conta e escolha Verificar e-mail existente na tela de acesso.</p>
          }
          <div class="account-actions">
            @if (router) {
              @if (pessoa.perfil === 'CLIENTE') {
                <a hlmBtn class="account-primary" routerLink="/pedidos">Acompanhar meus pedidos</a>
              } @else {
                <a hlmBtn routerLink="/gestao">Abrir área da equipe</a>
              }
              <a hlmBtn variant="outline" routerLink="/cardapio">Explorar cardápio</a>
            }
            @if (apresentacaoCliente()) {
              <button hlmBtn variant="ghost" type="button" (click)="sair()" [disabled]="ocupado()">
                Sair da conta
              </button>
            }
          </div>
        </div>
        @if (pessoa.perfil === 'CLIENTE') {
          <app-enderecos [apresentacaoCliente]="apresentacaoCliente()" />
        }
        @if (!apresentacaoCliente() && !(equipe && pagina() === 'conta')) {
          <button hlmBtn variant="ghost" type="button" (click)="sair()" [disabled]="ocupado()">
            Sair da conta
          </button>
        }
      } @else if (pagina() === 'verificacao') {
        <app-verificacao [apresentacaoCliente]="apresentacaoCliente()" (voltar)="voltarAoLogin()"/>
      } @else if (pagina() === 'convite') {
        <app-aceitar-convite (voltar)="voltarAoLogin()"/>
      } @else if (pagina() === 'cadastro') {
        <app-cadastro [apresentacaoCliente]="apresentacaoCliente()" (voltar)="voltarAoLogin()"/>
      } @else if (pagina() === 'recuperacao') {
        <app-recuperacao [apresentacaoCliente]="apresentacaoCliente()" (voltar)="voltarAoLogin()"/>
      } @else {
        @if (!apresentacaoCliente()) {
          <span class="auth-symbol" aria-hidden="true">↗</span>
          <p class="eyebrow">{{ equipe ? 'ÁREA DA EQUIPE' : 'BEM-VINDO DE VOLTA' }}</p>
        }
        <h1 id="conta-titulo">Entre na sua conta.</h1>
        @if (!apresentacaoCliente()) {
          <p class="auth-intro">{{ equipe ? 'Entre para cuidar dos pedidos, da cozinha e da rotina do restaurante.' : 'Seu próximo pedido e bons momentos à mesa começam aqui.' }}</p>
        }
        <form (submit)="entrar($event, email.value, senha)">
          <label for="email-conta">E-mail</label>
          <input #email id="email-conta" name="email" type="email" autocomplete="username" required maxlength="254" placeholder="seu@email.com" [disabled]="ocupado()" [attr.aria-describedby]="erro() ? 'erro-identidade' : null">
          <div class="password-label"><label for="senha-conta">Senha</label><button type="button" class="text-action" (click)="abrirFormulario('recuperacao')" [disabled]="ocupado() || encerramentoPendente()">Recuperar senha</button></div>
          <input #senha id="senha-conta" name="senha" type="password" autocomplete="current-password" required maxlength="72" placeholder="Sua senha" [disabled]="ocupado()" [attr.aria-describedby]="erro() ? 'erro-identidade' : null">
          <button hlmBtn type="submit" [disabled]="ocupado() || encerramentoPendente()">{{ ocupado() ? 'Aguarde…' : 'Entrar' }}</button>
        </form>
        @if(equipe && router) { <p class="signup">Veio escolher seu pedido? <a routerLink="/entrar">Acessar conta de cliente</a></p> }
        @else { <p class="signup">Ainda não tem conta? <button type="button" class="text-action" (click)="abrirFormulario('cadastro')" [disabled]="ocupado() || encerramentoPendente()">Criar conta de cliente</button></p> }
        <details class="other-access"><summary>Convites e verificação de e-mail</summary><nav aria-label="Outras formas de acesso">
          <button hlmBtn variant="ghost" type="button" (click)="abrirFormulario('convite')" [disabled]="ocupado() || encerramentoPendente()">Aceitar convite de funcionário</button>
          <button hlmBtn variant="ghost" type="button" (click)="abrirFormulario('verificacao')" [disabled]="ocupado() || encerramentoPendente()">Verificar e-mail existente</button>
        </nav></details>
      }
      @if (erro()) { <p #alerta id="erro-identidade" class="erro" role="alert" tabindex="-1">{{ erro() }}</p> }
      @if (encerramentoPendente()) { <button hlmBtn type="button" (click)="sair()" [disabled]="ocupado()">Tentar encerrar novamente</button> }
      @if (aviso() || coordenacao.aviso()) { <p role="status">{{ aviso() || coordenacao.aviso() }}</p> }
    </section>
  `,
  styles: `
    :host{display:block;padding:clamp(1rem,5vw,4rem) 0}.auth-card{width:min(100%,35rem);margin:auto;background:var(--rm-surface,#fff);padding:clamp(1.25rem,5vw,3rem);border:1px solid var(--rm-border,#e4e8e2);border-radius:24px;box-shadow:0 16px 60px #163d2810}.auth-symbol{display:grid;place-items:center;width:48px;height:48px;border-radius:16px;background:var(--primary-soft);color:var(--primary-ink);font-size:1.65rem;margin-bottom:1.75rem}.eyebrow{font-size:.73rem;font-weight:750;letter-spacing:.13em;color:var(--rm-primary,#285139)}h1{font-size:clamp(1.8rem,4vw,2.5rem);line-height:1.15;letter-spacing:-.045em;margin:.6rem 0 1rem}h1{font-family:var(--font-serif);font-weight:500}.auth-intro{color:var(--rm-muted,#6b746c);margin-bottom:2rem}form{display:grid;gap:.65rem}input{width:100%;min-height:50px;border:1px solid var(--rm-border,#dce2d9);border-radius:11px;padding:.8rem 1rem;font:inherit;background:var(--card)}label{font-size:.88rem;font-weight:650}.password-label{display:flex;justify-content:space-between;align-items:center;margin-top:.65rem;gap:.5rem}.text-action{background:none;border:0;padding:0;color:var(--rm-primary,#285139);font:inherit;font-size:.85rem;text-decoration:underline;text-underline-offset:4px;min-height:44px}form button[type=submit]{margin-top:.75rem;width:100%}.signup{margin:1.2rem 0;text-align:center;font-size:.88rem;color:var(--rm-muted,#6b746c)}.other-access{border-top:1px solid var(--rm-border,#dce2d9);padding-top:1rem;font-size:.85rem}.other-access summary{min-height:44px;cursor:pointer;align-content:center}.other-access nav,.account-actions{display:flex;gap:.6rem;flex-wrap:wrap}.account-actions{margin:1.5rem 0}.erro{color:var(--danger-fg);font-weight:600}.perfil{font-weight:650}

    :host:has(.conta-equipe) { padding: 0; }
    :host(.identidade-cliente) {
      padding-block: 0 16px;
    }
    .auth-cliente {
      width: min(100%, 36rem);
      padding: clamp(16px, 4vw, 32px);
      border: 1px solid var(--border);
      border-radius: var(--raio-painel-cliente);
      background: var(--card);
      box-shadow: none;
      overflow-wrap: anywhere;
    }
    .auth-cliente h1 {
      margin: 0 0 16px;
      font: 400 clamp(1.9rem, 4vw, 2.5rem) / 1.12 var(--fonte-editorial);
      letter-spacing: -0.035em;
    }
    .auth-cliente :is(input, button, .other-access summary) {
      min-height: 48px;
    }
    .auth-cliente :is(input, button, .other-access) {
      border-radius: 8px;
    }
    .auth-cliente input {
      min-width: 0;
      padding: 8px 12px;
      border-color: var(--input);
      background: var(--card);
    }
    .auth-cliente .password-label {
      flex-wrap: wrap;
      gap: 0 12px;
      margin: 0;
    }
    .auth-cliente .signup {
      margin: 8px 0;
      text-align: start;
    }
    .auth-cliente .other-access {
      padding: 0 12px;
      border: 1px solid var(--border);
      background: var(--superficie-cliente);
    }
    .auth-cliente .other-access nav {
      padding-bottom: 8px;
    }
    .auth-cliente .erro {
      padding: 12px;
      border-radius: 8px;
      background: #fff1ed;
    }
    .conta-cliente {
      width: min(100%, 1000px);
      padding: 0;
      border: 0;
      background: transparent;
    }
    .conta-cliente .account-profile {
      padding: clamp(16px, 3vw, 24px);
      border: 1px solid var(--border);
      border-radius: var(--raio-painel-cliente);
      background: var(--superficie-cliente);
    }
    .conta-equipe { margin-inline: 0; box-shadow: none; }
    .conta-equipe .account-profile { background: var(--card); border-radius: var(--gestao-raio); }
    .conta-cliente .account-actions {
      gap: var(--espaco-acao-cliente);
      margin: 16px 0 0;
    }
    .conta-cliente .account-actions :is(a, button) {
      min-height: 48px;
      border-radius: 8px;
    }
    @media (max-width: 600px) {
      .conta-cliente .account-actions :is(a, button) {
        flex: 1 1 auto;
        padding-inline: 12px;
        font-size: 0.875rem;
      }
      .conta-cliente .account-actions .account-primary {
        flex-basis: 100%;
      }
    }
  `,
})
export class IdentidadeComponent {
  readonly sessao = inject(SessaoService);
  readonly coordenacao = inject(SessaoNavegacaoService);
  private readonly rotasConfiguradas = inject(ROUTES, { optional: true });
  readonly router = this.rotasConfiguradas ? inject(Router) : null;
  private readonly rota = inject(ActivatedRoute, { optional: true });
  private readonly elemento: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly pendencias = inject(CriacaoPendenteService);
  private readonly convitesPendentes = inject(ConvitePendenteService);
  private readonly catalogoPendente = inject(CatalogoPendenteService);
  private readonly midiaPendente = inject(MidiaPendenteService);
  private readonly contexto = inject(ContextoOperacaoService);
  private readonly navegacao = inject(NavegacaoProtegidaService);
  readonly ocupado = signal(true);
  readonly erro = signal('');
  readonly aviso = signal('');
  private readonly rotaCliente = this.rota?.snapshot.data['visualCliente'] === true;
  readonly apresentacaoCliente = computed(() => {
    const pessoa = this.sessao.identidade();
    return this.rotaCliente && (!pessoa || pessoa.perfil === 'CLIENTE');
  });
  readonly encerramentoPendente = this.coordenacao.encerramentoPendente;
  readonly equipe = this.rota?.snapshot.data['equipe'] === true;
  readonly pagina = signal<Formulario>(
    (this.rota?.snapshot.data['formulario'] as Formulario) ?? 'login',
  );
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  constructor() {
    void this.coordenacao.inicializar().finally(() => this.ocupado.set(false));
  }

  tituloFormulario(): string {
    if (this.sessao.identidade())
      return this.equipe && this.pagina() === 'conta' ? 'gestao-titulo' : 'conta-titulo';
    const pagina = this.pagina();
    return pagina === 'convite'
      ? 'aceitar-convite-titulo'
      : ['cadastro', 'recuperacao', 'verificacao'].includes(pagina)
        ? pagina + '-titulo'
        : 'conta-titulo';
  }

  nomePerfil(perfil: string): string {
    return (
      (
        {
          CLIENTE: 'Cliente',
          ADMINISTRADOR: 'Administrador',
          GERENTE: 'Gerente',
          ATENDIMENTO: 'Atendimento',
          CAIXA: 'Caixa',
          EXPEDICAO: 'Expedição',
          COZINHA: 'Equipe da cozinha',
        } as Record<string, string>
      )[perfil] ?? 'Equipe do restaurante'
    );
  }

  async entrar(event: Event, email: string, password: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado() || this.encerramentoPendente()) return;
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.coordenacao.aviso.set('');
    const senha = password.value;
    password.value = '';
    try {
      await this.sessao.entrar(email, senha);
      if (this.router) await this.router.navigateByUrl(await this.destino());
    } catch (error) {
      this.falha(error);
    } finally {
      this.ocupado.set(false);
    }
  }

  async sair(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.navegacao.permitirLogout();
    try {
      await this.coordenacao.sair();
    } catch (error) {
      this.falha(error);
    } finally {
      this.ocupado.set(false);
      if (this.router) await this.router.navigateByUrl('/entrar');
    }
  }

  abrirFormulario(area: 'recuperacao' | 'cadastro' | 'convite' | 'verificacao'): void {
    if (this.ocupado() || this.encerramentoPendente()) return;
    this.erro.set('');
    this.aviso.set('');
    const caminhos = {
      recuperacao: '/recuperar-senha',
      cadastro: '/cadastro',
      convite: '/aceitar-convite',
      verificacao: '/verificar-email',
    };
    if (this.router) {
      void this.router.navigate([caminhos[area]], { queryParamsHandling: 'preserve' }).then(() => {
        const titulo = area === 'convite' ? 'aceitar-convite-titulo' : area + '-titulo';
        setTimeout(() => document.getElementById(titulo)?.focus());
      });
      return;
    }
    this.pagina.set(area);
    setTimeout(() =>
      this.elemento.nativeElement
        .querySelector<HTMLElement>('#' + this.tituloFormulario())
        ?.focus(),
    );
  }

  voltarAoLogin(): void {
    if (this.router) {
      void this.router
        .navigate(['/entrar'], { queryParamsHandling: 'preserve' })
        .then(() => setTimeout(() => document.getElementById('email-conta')?.focus()));
      return;
    }
    this.pagina.set('login');
    setTimeout(() => document.getElementById('email-conta')?.focus());
  }

  private async destino(): Promise<string> {
    const pessoa = this.sessao.identidade();
    if (pessoa && this.pendencias.daConta(pessoa.usuarioId)()) return '/gestao/unidades';
    if (pessoa && this.convitesPendentes.daConta(pessoa.usuarioId)())
      return '/gestao/equipe/convites';
    if (
      pessoa &&
      (this.catalogoPendente.daConta(pessoa.usuarioId)() ||
        this.midiaPendente.daConta(pessoa.usuarioId)())
    )
      return '/gestao/catalogo';
    const retorno = retornoSeguro(this.rota?.snapshot.queryParamMap.get('retorno') ?? null);
    if (retorno) return retorno;
    if (pessoa?.perfil === 'CLIENTE') return '/cardapio';
    await this.contexto.carregar();
    return this.contexto.destino();
  }

  private falha(error: unknown): void {
    this.erro.set(
      error instanceof Error && error.name !== 'TypeError' && error.name !== 'TimeoutError'
        ? error.message
        : 'Sem conexão com o sistema. Nenhuma operação foi confirmada.',
    );
    setTimeout(() => this.alerta?.nativeElement.focus());
  }
}

import { Component, ElementRef, ViewChild, inject, input, output, signal } from '@angular/core';
import { estilosFormularioAcesso } from './formularios-acesso.estilos';
import { ApiFailure, SessaoService } from './sessao.service';
import { MarcaService } from '../rotas/marca.service';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from '../ui/button';

@Component({
  selector: 'app-verificacao',
  imports: [HlmButton, IconeComponent],
  template: `
    <section class="subauth" aria-labelledby="verificacao-titulo" [attr.aria-busy]="ocupado()">
      <div class="dossie-layout">
        <aside class="dossie-cartela" aria-label="Sobre a verificação de e-mail">
          <div class="auth-marca-topo">
            <span class="auth-symbol" aria-hidden="true">
              @if (marca.logoUrl() && !marca.erroLogo()) {
                <img
                  class="conta-marca-logo"
                  [src]="marca.logoUrl()!"
                  [alt]="'Logo de ' + marca.nome()"
                  width="48"
                  height="48"
                  decoding="async"
                  (error)="marca.marcarErroLogo()"
                />
              } @else {
                <app-icone nome="marca" />
              }
            </span>
            <div class="auth-marca-meta">
              <span class="auth-casa-kicker">VERIFICAÇÃO DE CONTA</span>
              <span class="auth-casa-nome">{{ marca.nome() }}</span>
            </div>
          </div>

          <div class="talao-cartao">
            <p class="talao-titulo">POR QUE CONFIRMAR SEU E-MAIL?</p>
            <ul class="ficha-lista">
              <li class="ficha-item">
                <span>Identidade</span>
                <span class="ficha-pontos" aria-hidden="true"></span>
                <strong>E-mail validado</strong>
              </li>
              <li class="ficha-item">
                <span>Senha e perfil</span>
                <span class="ficha-pontos" aria-hidden="true"></span>
                <strong>Preservados</strong>
              </li>
              <li class="ficha-item">
                <span>Comprovantes</span>
                <span class="ficha-pontos" aria-hidden="true"></span>
                <strong>Sem bloqueios</strong>
              </li>
              <li class="ficha-item">
                <span>Código</span>
                <span class="ficha-pontos" aria-hidden="true"></span>
                <strong>Uso único · 15 min</strong>
              </li>
            </ul>
          </div>

          <p class="dossie-nota">
            O código é exclusivo para {{ marca.nome() }}. Se o prazo expirar, basta pedir um novo
            código na primeira etapa.
          </p>
        </aside>

        <div class="dossie-painel">
          <div class="mob-marca-topo">
            <span class="auth-symbol auth-symbol--compacto" aria-hidden="true">
              @if (marca.logoUrl() && !marca.erroLogo()) {
                <img
                  class="conta-marca-logo"
                  [src]="marca.logoUrl()!"
                  [alt]="'Logo de ' + marca.nome()"
                  width="40"
                  height="40"
                  decoding="async"
                  (error)="marca.marcarErroLogo()"
                />
              } @else {
                <app-icone nome="marca" />
              }
            </span>
            <div class="auth-marca-meta">
              <span class="auth-casa-kicker">VERIFICAÇÃO DE CONTA</span>
              <span class="auth-casa-nome">{{ marca.nome() }}</span>
            </div>
          </div>

          <header class="painel-topo">
            <div class="painel-titulo-bloco">
              <p class="eyebrow">CONFIRMAÇÃO DE E-MAIL</p>
              <h2 id="verificacao-titulo" tabindex="-1">Verificar e-mail existente</h2>
            </div>
            <div class="etapa-pilulas" aria-label="Etapas da verificação">
              <span class="etapa-pilula">01 · E-mail</span>
              <span class="etapa-pilula">02 · Código</span>
            </div>
          </header>

          <p class="auth-intro">
            Confirme o e-mail de uma conta já cadastrada em {{ marca.nome() }}. Sua senha, seu
            perfil e suas unidades não serão alterados.
          </p>

          <details class="mob-resumo">
            <summary>Por que confirmar seu e-mail?</summary>
            <ul class="ficha-lista ficha-lista--compacta">
              <li class="ficha-item">
                <span>Identidade</span>
                <span class="ficha-pontos" aria-hidden="true"></span>
                <strong>E-mail validado</strong>
              </li>
              <li class="ficha-item">
                <span>Senha e perfil</span>
                <span class="ficha-pontos" aria-hidden="true"></span>
                <strong>Preservados</strong>
              </li>
              <li class="ficha-item">
                <span>Comprovantes</span>
                <span class="ficha-pontos" aria-hidden="true"></span>
                <strong>Sem bloqueios</strong>
              </li>
            </ul>
          </details>

          <div class="etapa-bloco">
            <div class="etapa-cabeca">
              <p class="etapa-selo">01 · SOLICITAR CÓDIGO</p>
              <span class="etapa-meta">Uso único · 15 min</span>
            </div>
            <form (submit)="solicitar($event, email.value)">
              <div class="campo-grupo">
                <label for="email-verificacao">E-mail da conta existente</label>
                <input
                  #email
                  id="email-verificacao"
                  type="email"
                  autocomplete="email"
                  placeholder="seu@email.com"
                  required
                  maxlength="254"
                  [disabled]="ocupado()"
                />
              </div>
              <button hlmBtn type="submit" [disabled]="ocupado()">
                Solicitar código de verificação
              </button>
            </form>
          </div>

          <hr class="etapa-divisor" aria-hidden="true" />

          <div class="etapa-bloco">
            <div class="etapa-cabeca">
              <p class="etapa-selo">02 · CONFIRMAR E-MAIL</p>
              <span class="etapa-meta">Válido apenas nesta casa</span>
            </div>
            <p class="etapa-texto">
              Cole o código de verificação recebido após a primeira etapa para liberar seu acesso
              sem perder dados.
            </p>
            <form (submit)="confirmar($event, codigo)">
              <div class="campo-grupo">
                <label for="codigo-verificacao">Código de verificação</label>
                <input
                  #codigo
                  id="codigo-verificacao"
                  type="password"
                  autocomplete="off"
                  placeholder="Cole o código de 43 caracteres"
                  required
                  minlength="43"
                  maxlength="43"
                  pattern="[A-Za-z0-9_\\-]{43}"
                  [attr.aria-describedby]="codigoInvalido() ? 'erro-verificacao' : null"
                  [attr.aria-invalid]="codigoInvalido() ? true : null"
                  [disabled]="ocupado()"
                />
              </div>
              <button hlmBtn type="submit" [disabled]="ocupado()">Confirmar verificação</button>
            </form>
          </div>

          @if (erro()) {
            <p #alerta id="erro-verificacao" role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
          }
          @if (aviso()) {
            <p #resultado class="sucesso-aviso" role="status" tabindex="-1">{{ aviso() }}</p>
          }

          <div class="auth-rodape">
            <button
              hlmBtn
              variant="outline"
              type="button"
              (click)="voltar.emit()"
              [disabled]="ocupado()"
            >
              Voltar ao login
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .subauth {
      display: block;
    }
    .dossie-layout {
      display: grid;
      gap: 1rem;
    }
    .dossie-cartela {
      display: none;
    }
    .dossie-painel {
      display: grid;
      gap: 0.78rem;
      min-width: 0;
      padding: 1.05rem;
      border-radius: 18px;
      border: 1px solid var(--border, #e5ded3);
      background: var(--card, #ffffff);
      box-shadow: 0 12px 28px -24px rgba(41, 37, 33, 0.25);
    }
    .auth-marca-topo,
    .mob-marca-topo {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      min-width: 0;
    }
    .auth-symbol {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      flex: none;
      border-radius: 50%;
      background: var(--primary, #a53e2b);
      color: #ffffff;
      overflow: hidden;
      box-shadow:
        inset 0 0 0 3px var(--primary, #a53e2b),
        inset 0 0 0 4px #f3d9d2;
    }
    .auth-symbol--compacto {
      width: 40px;
      height: 40px;
    }
    .conta-marca-logo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      border-radius: inherit;
    }
    .auth-marca-meta {
      display: grid;
      gap: 0.12rem;
      min-width: 0;
    }
    .auth-casa-kicker {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--primary-ink, #a53e2b);
    }
    .auth-casa-nome {
      font-family: var(--font-serif, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif);
      font-size: 1.04rem;
      font-weight: 600;
      color: var(--foreground, #292521);
      overflow-wrap: anywhere;
    }
    .painel-topo {
      display: grid;
      gap: 0.6rem;
    }
    .painel-titulo-bloco {
      display: grid;
      gap: 0.2rem;
    }
    .eyebrow {
      margin: 0;
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.13em;
      text-transform: uppercase;
      color: var(--primary-ink, #a53e2b);
    }
    h2 {
      font-family: var(--font-serif, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif);
      font-size: clamp(1.48rem, 3.2vw, 2rem);
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -0.025em;
      margin: 0;
      color: var(--foreground, #292521);
    }
    .etapa-pilulas {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .etapa-pilula {
      display: inline-flex;
      align-items: center;
      padding: 0.3rem 0.68rem;
      border-radius: 999px;
      border: 1px solid var(--border, #dfd3c3);
      background: var(--secondary, #f0ebe3);
      color: var(--foreground, #292521);
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .auth-intro {
      margin: 0;
      color: var(--muted-foreground, #6e6259);
      font-size: 0.92rem;
      line-height: 1.5;
    }
    .talao-cartao {
      padding: 1rem;
      border-radius: 16px;
      border: 1px dashed var(--input, #d5cbbd);
      background: var(--card, #ffffff);
    }
    .talao-titulo {
      margin: 0 0 0.7rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.13em;
      text-transform: uppercase;
      color: var(--primary-ink, #a53e2b);
    }
    .ficha-lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.58rem;
    }
    .ficha-lista--compacta {
      margin-top: 0.65rem;
      gap: 0.45rem;
    }
    .ficha-item {
      display: grid;
      grid-template-columns: auto minmax(12px, 1fr) auto;
      align-items: baseline;
      gap: 0.45rem;
      font-size: 0.85rem;
      color: var(--muted-foreground, #6e6259);
    }
    .ficha-item strong {
      color: var(--foreground, #292521);
      font-weight: 700;
      text-align: right;
    }
    .ficha-pontos {
      border-bottom: 1px dotted #cfc3b3;
      transform: translateY(-2px);
    }
    .dossie-nota {
      margin: 0;
      padding: 0.8rem 0.95rem;
      border-radius: 14px;
      border: 1px solid var(--border, #e5ded3);
      background: var(--secondary, #f0ebe3);
      color: var(--foreground, #292521);
      font-size: 0.84rem;
      line-height: 1.48;
    }
    .mob-resumo {
      border: 1px dashed var(--input, #d5cbbd);
      border-radius: 14px;
      background: var(--background, #faf7f2);
      padding: 0.15rem 0.85rem;
    }
    .mob-resumo summary {
      cursor: pointer;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--foreground, #292521);
      list-style: none;
    }
    .mob-resumo summary::-webkit-details-marker {
      display: none;
    }
    .mob-resumo summary::after {
      content: '+';
      font-size: 1rem;
      font-weight: 800;
      color: var(--primary-ink, #a53e2b);
    }
    .mob-resumo[open] summary::after {
      content: '−';
    }
    .etapa-bloco {
      min-width: 0;
      padding: 0.95rem;
      border-radius: 16px;
      border: 1px solid var(--border, #e5ded3);
      background: var(--background, #faf7f2);
    }
    .etapa-cabeca {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.55rem;
    }
    .etapa-selo {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: var(--primary-ink, #a53e2b);
    }
    .etapa-meta {
      padding: 0.22rem 0.55rem;
      border-radius: 999px;
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      color: var(--muted-foreground, #6e6259);
      font-size: 0.74rem;
      font-weight: 600;
    }
    .etapa-texto {
      margin: 0 0 0.75rem;
      color: var(--muted-foreground, #6e6259);
      font-size: 0.86rem;
      line-height: 1.48;
    }
    .etapa-divisor {
      border: 0;
      border-top: 1px dashed var(--border, #e5ded3);
      margin: 0.05rem 0;
    }
    form {
      display: grid;
      gap: 0.65rem;
      min-width: 0;
    }
    .campo-grupo {
      display: grid;
      gap: 0.35rem;
      min-width: 0;
    }
    label {
      display: block;
      margin: 0;
      font-size: 0.88rem;
      font-weight: 650;
      color: var(--foreground, #292521);
    }
    input {
      width: 100%;
      min-width: 0;
      min-height: 48px;
      border: 1px solid var(--input, #d5cbbd);
      border-radius: 12px;
      padding: 0.72rem 0.95rem;
      font: inherit;
      background: var(--card, #ffffff);
      color: var(--foreground, #292521);
    }
    input::placeholder {
      color: var(--muted-foreground, #6e6259);
      opacity: 1;
    }
    input:focus-visible {
      outline: 3px solid var(--ring, #a53e2b);
      outline-offset: 2px;
      border-color: var(--primary-ink, #a53e2b);
    }
    input[aria-invalid='true'] {
      border-color: var(--danger-fg, #972626);
      background: var(--danger-bg, #fffbfa);
    }
    form button[hlmBtn] {
      margin-top: 0.25rem;
      width: 100%;
      min-height: 48px;
    }
    button[hlmBtn]:not([data-variant]),
    button[hlmBtn][data-variant='default'] {
      background: var(--primary, #a53e2b);
      border: 1px solid var(--primary-deep, #7f2f20);
      color: #ffffff;
      border-radius: 14px;
      box-shadow: 0 3px 0 var(--primary-deep, #7f2f20);
    }
    button[hlmBtn]:not([data-variant]):hover:not(:disabled),
    button[hlmBtn][data-variant='default']:hover:not(:disabled) {
      background: var(--primary-hover, #933524);
      filter: none;
    }
    button[hlmBtn][data-variant='outline'] {
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      color: var(--foreground, #292521);
      border-radius: 14px;
      box-shadow: 0 2px 0 var(--border, #ddd4c7);
    }
    button[hlmBtn][data-variant='outline']:hover:not(:disabled) {
      background: var(--muted, #f3eee7);
      filter: none;
    }
    button[hlmBtn]:disabled {
      opacity: 1;
      background: var(--disabled-bg, #efe9e0);
      border-color: var(--disabled-border, #d8cfc3);
      color: var(--disabled-fg, #594e46);
      box-shadow: none;
      cursor: not-allowed;
    }
    .erro {
      margin: 0;
      padding: 0.85rem 1rem;
      border: 1px solid var(--danger-border, #e8c7c1);
      border-radius: 12px;
      background: var(--danger-bg, #fff2f0);
      color: var(--danger-fg, #972626);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .sucesso-aviso {
      margin: 0;
      padding: 0.85rem 1rem;
      border: 1px solid var(--accent-border, #c8d8c5);
      border-radius: 12px;
      background: var(--accent, #e8efe7);
      color: var(--accent-foreground, #30523b);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .auth-rodape {
      padding-top: 0.45rem;
      border-top: 1px dashed var(--border, #e5ded3);
    }
    .auth-rodape button[hlmBtn] {
      width: 100%;
      min-height: 48px;
    }
    @media (min-width: 860px) {
      .dossie-layout {
        grid-template-columns: 315px minmax(0, 1fr);
        align-items: start;
        gap: 1.25rem;
      }
      .dossie-cartela {
        display: grid;
        gap: 0.9rem;
        padding: 1.15rem;
        border-radius: 18px;
        border: 1px solid var(--border, #e5ded3);
        background: var(--background, #faf7f2);
      }
      .dossie-painel {
        padding: 1.35rem 1.45rem;
      }
      .mob-marca-topo,
      .mob-resumo {
        display: none;
      }
      .painel-topo {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
      }
    }
    @media (max-width: 640px) {
      .dossie-painel {
        padding: 0.9rem;
        border-radius: 16px;
      }
      .etapa-bloco {
        padding: 0.85rem;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      button[hlmBtn] {
        transition: none;
        transform: none;
      }
    }
  `,
})
export class VerificacaoComponent {
  readonly apresentacaoCliente = input(false);
  readonly marca = inject(MarcaService);
  private readonly sessao = inject(SessaoService);
  readonly voltar = output<void>();
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly codigoInvalido = signal(false);
  readonly aviso = signal('');
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  @ViewChild('resultado') resultado?: ElementRef<HTMLElement>;

  async solicitar(event: Event, email: string): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.iniciar();
    try {
      await this.sessao.verificarEmail('verificacao', { email });
      this.sucesso('Se a conta estiver elegível, enviaremos instruções para verificar o e-mail.');
    } catch (error) {
      this.falha(error, false);
    } finally {
      this.ocupado.set(false);
    }
  }

  async confirmar(event: Event, codigo: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.iniciar();
    try {
      await this.sessao.verificarEmail('verificacao/confirmar', { codigo: codigo.value });
      codigo.value = '';
      this.sucesso('E-mail verificado. Sua senha e seu perfil foram preservados.');
    } catch (error) {
      this.falha(error, true);
    } finally {
      this.ocupado.set(false);
    }
  }

  private iniciar(): void {
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.codigoInvalido.set(false);
  }

  private sucesso(texto: string): void {
    this.aviso.set(texto);
    setTimeout(() => this.resultado?.nativeElement.focus());
  }

  private falha(error: unknown, confirmacao: boolean): void {
    this.codigoInvalido.set(
      confirmacao &&
        error instanceof ApiFailure &&
        error.status === 422 &&
        error.codigo === 'VERIFICACAO_INVALIDA',
    );
    const rede =
      error instanceof TypeError ||
      (error instanceof ApiFailure && error.status >= 500) ||
      (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name));
    this.erro.set(
      rede
        ? confirmacao
          ? 'A resposta não chegou. O e-mail pode ter sido verificado. Volte ao login e confira na conta antes de solicitar outro código.'
          : 'Sem conexão. A solicitação não foi confirmada; confira a captura antes de repetir.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível concluir a operação.',
    );
    setTimeout(() => this.alerta?.nativeElement.focus());
  }
}

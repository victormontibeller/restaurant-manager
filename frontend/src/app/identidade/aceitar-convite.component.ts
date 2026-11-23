import { Component, ElementRef, ViewChild, inject, output, signal } from '@angular/core';
import { ApiFailure, SessaoService } from './sessao.service';
import { senhaEmBranco } from './senha';
import { MarcaService } from '../rotas/marca.service';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from '../ui/button';

@Component({
  selector: 'app-aceitar-convite',
  imports: [HlmButton, IconeComponent],
  template: `
    <section class="subauth" aria-labelledby="aceitar-convite-titulo" [attr.aria-busy]="ocupado()">
      <div class="dossie-layout">
        <aside class="dossie-cartela" aria-label="Crachá da equipe e passos pós-aceite">
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
              <span class="auth-casa-kicker">EQUIPE DA CASA</span>
              <span class="auth-casa-nome">{{ marca.nome() }}</span>
            </div>
          </div>

          <div class="cracha-picotado">
            <p class="cracha-kicker">CRACHÁ DA EQUIPE · {{ marca.nome() }}</p>
            <ul class="ficha-lista">
              <li class="ficha-item">
                <span>Casa</span>
                <span class="ficha-pontos" aria-hidden="true"></span>
                <strong>{{ marca.nome() }}</strong>
              </li>
              <li class="ficha-item">
                <span>Cargo / Perfil</span>
                <span class="ficha-pontos" aria-hidden="true"></span>
                <strong>Definido no convite</strong>
              </li>
              <li class="ficha-item">
                <span>Unidades</span>
                <span class="ficha-pontos" aria-hidden="true"></span>
                <strong>Definidas pelo Admin</strong>
              </li>
            </ul>
          </div>

          <div class="passos-bloco">
            <p class="passos-titulo">DEPOIS DE ACEITAR</p>
            <ol class="passos-lista">
              <li>
                <span class="passo-num">01</span>
                <span>Crie sua senha ao lado usando o código recebido.</span>
              </li>
              <li>
                <span class="passo-num">02</span>
                <span>Entre pelo acesso da equipe em <code>/gestao/entrar</code>.</span>
              </li>
            </ol>
          </div>
        </aside>

        <div class="dossie-painel">
          <div class="mob-cracha" aria-label="Resumo do convite da equipe">
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
            <div class="mob-cracha-texto">
              <strong>CRACHÁ DA EQUIPE · {{ marca.nome() }}</strong>
              <span>Cargo e unidades definidos pelo Admin</span>
            </div>
          </div>

          <header class="painel-topo">
            <div class="painel-titulo-bloco">
              <p class="eyebrow">BOAS-VINDAS À EQUIPE</p>
              <h2 id="aceitar-convite-titulo" tabindex="-1">Aceitar convite de funcionário</h2>
            </div>
            <span class="convite-selo">Uso único · 15 min</span>
          </header>

          <p class="auth-intro">
            Valide seu código para ativar seu acesso em {{ marca.nome() }}. Depois do aceite, o
            painel operacional abre em <strong>/gestao/entrar</strong>.
          </p>

          <div class="etapa-bloco">
            <div class="etapa-cabeca">
              <p class="etapa-selo">01 · ATIVAR ACESSO DA EQUIPE</p>
              <span class="etapa-meta">Convite pessoal</span>
            </div>
            <form (submit)="aceitar($event, codigo, senha, confirmacao)">
              <div class="campo-grupo">
                <label for="codigo-convite">Código do convite</label>
                <input
                  #codigo
                  id="codigo-convite"
                  type="password"
                  placeholder="Cole o código de 43 caracteres"
                  required
                  autocomplete="off"
                  minlength="43"
                  maxlength="43"
                  pattern="[A-Za-z0-9_\\-]{43}"
                  [attr.aria-describedby]="campoErro() === 'codigo' ? 'erro-convite' : null"
                  [attr.aria-invalid]="campoErro() === 'codigo' ? true : null"
                  [disabled]="ocupado()"
                />
              </div>

              <div class="pw-grid-2">
                <div class="campo-grupo">
                  <label for="senha-convite">Senha da conta de funcionário</label>
                  <div class="pw-wrap">
                    <input
                      #senha
                      id="senha-convite"
                      [type]="mostrarSenha() ? 'text' : 'password'"
                      placeholder="12 ou mais caracteres"
                      required
                      autocomplete="new-password"
                      minlength="12"
                      maxlength="72"
                      (input)="aoDigitarSenha($any($event.target).value)"
                      [attr.aria-describedby]="
                        campoErro() === 'senha' ? 'regra-convite erro-convite' : 'regra-convite'
                      "
                      [attr.aria-invalid]="campoErro() === 'senha' ? true : null"
                      [disabled]="ocupado()"
                    />
                    <button
                      type="button"
                      class="pw-toggle"
                      [attr.aria-pressed]="mostrarSenha()"
                      (click)="alternarMostrarSenha()"
                      [disabled]="ocupado()"
                    >
                      {{ mostrarSenha() ? 'Ocultar' : 'Mostrar' }}
                    </button>
                  </div>
                  <div class="pw-medidor" aria-hidden="true">
                    <span
                      class="pw-barra"
                      [class.pronta]="tamanhoSenha() >= 12"
                      [style.width.%]="progressoForcaSenha()"
                    ></span>
                  </div>
                  <p class="pw-feedback" [class.pronta]="tamanhoSenha() >= 12">
                    {{ textoForcaSenha() }}
                  </p>
                </div>

                <div class="campo-grupo">
                  <label for="confirmacao-convite">Confirmar senha de funcionário</label>
                  <input
                    #confirmacao
                    id="confirmacao-convite"
                    [type]="mostrarSenha() ? 'text' : 'password'"
                    placeholder="Repita a senha"
                    required
                    autocomplete="new-password"
                    minlength="12"
                    maxlength="72"
                    [attr.aria-describedby]="campoErro() === 'confirmacao' ? 'erro-convite' : null"
                    [attr.aria-invalid]="campoErro() === 'confirmacao' ? true : null"
                    [disabled]="ocupado()"
                  />
                </div>
              </div>

              <p id="regra-convite" class="regra-callout">
                Escolha pelo menos 12 caracteres (uma frase longa fácil de lembrar funciona muito
                bem).
              </p>

              <button hlmBtn type="submit" [disabled]="ocupado()">
                Verificar e aceitar convite
              </button>
            </form>
          </div>

          @if (erro()) {
            <p #alerta id="erro-convite" role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
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
    .auth-marca-topo {
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
    .mob-cracha {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.72rem 0.85rem;
      border-radius: 14px;
      border: 1px dashed var(--input, #d5cbbd);
      background: var(--background, #faf7f2);
      min-width: 0;
    }
    .mob-cracha-texto {
      display: grid;
      gap: 0.12rem;
      min-width: 0;
    }
    .mob-cracha-texto strong {
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--primary-ink, #7f2f20);
      overflow-wrap: anywhere;
    }
    .mob-cracha-texto span {
      font-size: 0.82rem;
      color: var(--muted-foreground, #6e6259);
    }
    .painel-topo {
      display: grid;
      gap: 0.55rem;
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
    .convite-selo {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      padding: 0.3rem 0.68rem;
      border-radius: 999px;
      border: 1px solid var(--border, #dfd3c3);
      background: var(--secondary, #f0ebe3);
      color: var(--foreground, #292521);
      font-size: 0.76rem;
      font-weight: 700;
    }
    .auth-intro {
      margin: 0;
      color: var(--muted-foreground, #6e6259);
      font-size: 0.92rem;
      line-height: 1.5;
    }
    .auth-intro strong {
      color: var(--foreground, #292521);
    }
    .cracha-picotado {
      padding: 1rem;
      border-radius: 16px;
      border: 1px dashed var(--input, #d5cbbd);
      background: var(--card, #ffffff);
    }
    .cracha-kicker,
    .passos-titulo {
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
    .passos-bloco {
      padding: 0.9rem 1rem;
      border-radius: 14px;
      border: 1px solid var(--border, #e5ded3);
      background: var(--secondary, #f0ebe3);
    }
    .passos-lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.55rem;
    }
    .passos-lista li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: baseline;
      gap: 0.5rem;
      font-size: 0.84rem;
      line-height: 1.45;
      color: var(--foreground, #292521);
    }
    .passo-num {
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--primary-ink, #7f2f20);
    }
    .passos-lista code {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--primary-ink, #7f2f20);
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
      margin-bottom: 0.65rem;
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
    form {
      display: grid;
      gap: 0.7rem;
      min-width: 0;
    }
    .pw-grid-2 {
      display: grid;
      gap: 0.7rem;
      min-width: 0;
    }
    .campo-grupo {
      display: grid;
      gap: 0.35rem;
      align-content: start;
      min-width: 0;
    }
    label {
      display: block;
      margin: 0;
      font-size: 0.88rem;
      font-weight: 650;
      color: var(--foreground, #292521);
    }
    .pw-wrap {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.45rem;
      align-items: stretch;
    }
    button.pw-toggle {
      min-height: 48px;
      min-width: 68px;
      padding: 0 0.65rem;
      border-radius: 12px;
      border: 1px solid var(--input, #d5cbbd);
      background: var(--secondary, #f0ebe3);
      color: var(--foreground, #292521);
      font-size: 0.82rem;
      font-weight: 650;
      box-shadow: none;
      flex-shrink: 0;
    }
    button.pw-toggle:hover:not(:disabled) {
      background: var(--muted, #e6dfd4);
      border-color: var(--primary-ink, #a53e2b);
      color: var(--primary-ink, #7f2f20);
      filter: none;
    }
    button.pw-toggle:disabled {
      opacity: 1;
      background: var(--disabled-bg, #efe9e0);
      border-color: var(--disabled-border, #d8cfc3);
      color: var(--disabled-fg, #594e46);
      box-shadow: none;
      cursor: not-allowed;
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
    .pw-medidor {
      height: 6px;
      border-radius: 999px;
      background: var(--border, #e5ded3);
      overflow: hidden;
    }
    .pw-barra {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--primary, #a53e2b);
      transition: width 0.2s ease;
    }
    .pw-barra.pronta {
      background: var(--accent-foreground, #30523b);
    }
    .pw-feedback {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--muted-foreground, #6e6259);
    }
    .pw-feedback.pronta {
      color: var(--accent-foreground, #30523b);
    }
    .regra-callout {
      margin: 0;
      padding: 0.65rem 0.85rem;
      border: 1px solid var(--border, #e5ded3);
      border-left: 3px solid var(--primary, #a53e2b);
      border-radius: 10px;
      background: var(--card, #ffffff);
      color: var(--secondary-foreground, #44372e);
      font-size: 0.84rem;
      line-height: 1.45;
    }
    form button[hlmBtn] {
      margin-top: 0.2rem;
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
      background: #933524;
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
    .acoes {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      margin-top: 8px;
    }
    .acoes button {
      min-height: 48px;
      border-radius: 8px;
    }
    @media (max-width: 600px) {
      .acoes {
        grid-template-columns: minmax(0, 1fr);
      }
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
    @media (min-width: 680px) {
      .pw-grid-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: start;
      }
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
      .mob-cracha {
        display: none;
      }
      .painel-topo {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
      }
    }
    @media (max-width: 640px) {
      .dossie-painel {
        padding: 0.85rem 0.75rem;
        border-radius: 16px;
      }
      .etapa-bloco {
        padding: 0.8rem 0.75rem;
      }
      .pw-wrap input {
        padding: 0.72rem 0.75rem;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .pw-barra,
      button[hlmBtn] {
        transition: none;
        transform: none;
      }
    }
  `,
})
export class AceitarConviteComponent {
  readonly marca = inject(MarcaService);
  private readonly sessao = inject(SessaoService);
  readonly voltar = output<void>();
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly campoErro = signal<'codigo' | 'senha' | 'confirmacao' | null>(null);
  readonly mostrarSenha = signal(false);
  readonly tamanhoSenha = signal(0);
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  @ViewChild('resultado') resultado?: ElementRef<HTMLElement>;

  alternarMostrarSenha(): void {
    this.mostrarSenha.update((atual) => !atual);
  }

  aoDigitarSenha(valor: string): void {
    this.tamanhoSenha.set(valor.trim().length);
  }

  textoForcaSenha(): string {
    const t = this.tamanhoSenha();
    if (t === 0) return 'Use uma frase longa e segura para sua senha de equipe.';
    if (t < 12) return `Faltam ${12 - t} caracteres para atingir o mínimo de 12.`;
    return 'Tamanho bom para acesso da equipe.';
  }

  progressoForcaSenha(): number {
    const t = this.tamanhoSenha();
    if (t === 0) return 0;
    return Math.min(100, Math.round((t / 16) * 100));
  }

  async aceitar(
    event: Event,
    codigo: HTMLInputElement,
    senha: HTMLInputElement,
    confirmacao: HTMLInputElement,
  ): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.campoErro.set(null);
    try {
      if (senha.value !== confirmacao.value) {
        this.campoErro.set('confirmacao');
        throw new Error('As senhas devem ser iguais.');
      }
      if (senhaEmBranco(senha.value)) {
        this.campoErro.set('senha');
        throw new Error('A senha não pode conter somente espaços em branco.');
      }
      if (new TextEncoder().encode(senha.value).length > 72) {
        this.campoErro.set('senha');
        throw new Error('A senha deve ter no máximo 72 bytes.');
      }
      await this.sessao.aceitarConvite({ codigo: codigo.value, senha: senha.value });
      codigo.value = '';
      this.aviso.set('Convite aceito e e-mail verificado. Volte ao login para entrar.');
      setTimeout(() => this.resultado?.nativeElement.focus());
    } catch (error) {
      if (
        error instanceof ApiFailure &&
        error.status === 422 &&
        error.codigo === 'CONVITE_INVALIDO'
      )
        this.campoErro.set('codigo');
      const incerto =
        error instanceof TypeError ||
        (error instanceof ApiFailure && error.status >= 500) ||
        (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name));
      this.erro.set(
        incerto
          ? 'A resposta não chegou. O convite pode ter sido aceito. Confira o login antes de pedir outro convite.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível confirmar o aceite.',
      );
      setTimeout(() => this.alerta?.nativeElement.focus());
    } finally {
      senha.value = '';
      confirmacao.value = '';
      this.tamanhoSenha.set(0);
      this.ocupado.set(false);
    }
  }
}

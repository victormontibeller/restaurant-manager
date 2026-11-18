import { Component, ElementRef, ViewChild, inject, output, signal } from '@angular/core';
import { ApiFailure, SessaoService } from './sessao.service';
import { senhaEmBranco } from './senha';
import { MarcaService } from '../rotas/marca.service';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from '../ui/button';

@Component({
  selector: 'app-cadastro',
  imports: [HlmButton, IconeComponent],
  template: `
    <section class="subauth" aria-labelledby="cadastro-titulo" [attr.aria-busy]="ocupado()">
      <div class="dossie-grid">
        <aside class="dossie-cartela" aria-label="Cartela da casa">
          <div class="auth-marca-topo">
            <span class="auth-symbol">
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
            <div class="auth-marca-texto">
              <span class="auth-marca-tag">CONTA EXCLUSIVA DA CASA</span>
              <strong class="auth-casa-nome">{{ marca.nome() }}</strong>
            </div>
          </div>

          <div class="cartela-arco">
            <p class="cartela-arco-titulo">
              Sua mesa em <em>{{ marca.nome() }}.</em>
            </p>
            <p class="cartela-arco-slogan">{{ marca.slogan() }}</p>
          </div>

          <dl class="cartela-ficha" aria-label="Vantagens da conta de cliente">
            <div class="ficha-linha">
              <dt>Acompanhar pedidos</dt>
              <span class="ficha-guia" aria-hidden="true"></span>
              <dd>Ao vivo</dd>
            </div>
            <div class="ficha-linha">
              <dt>Caderno de endereços</dt>
              <span class="ficha-guia" aria-hidden="true"></span>
              <dd>Delivery ágil</dd>
            </div>
            <div class="ficha-linha">
              <dt>Pratos favoritos</dt>
              <span class="ficha-guia" aria-hidden="true"></span>
              <dd>Salvos na casa</dd>
            </div>
            <div class="ficha-linha">
              <dt>Acesso exclusivo</dt>
              <span class="ficha-guia" aria-hidden="true"></span>
              <dd>Somente cliente</dd>
            </div>
          </dl>

          <div class="cartela-box">
            <p class="cartela-box-titulo">Já pediu aqui antes?</p>
            <p class="cartela-box-texto">
              Se você já se cadastrou em {{ marca.nome() }}, volte ao login ou use a recuperação de
              senha com seu e-mail.
            </p>
          </div>

          <p class="cartela-nota">
            Nome completo, telefone e endereços de entrega são completados depois em
            <strong>Minha conta</strong>.
          </p>
        </aside>

        <div class="dossie-painel">
          <div class="mob-marca-topo">
            <span class="auth-symbol auth-symbol--sm">
              @if (marca.logoUrl() && !marca.erroLogo()) {
                <img
                  class="conta-marca-logo"
                  [src]="marca.logoUrl()!"
                  [alt]="'Logo de ' + marca.nome()"
                  width="36"
                  height="36"
                  decoding="async"
                  (error)="marca.marcarErroLogo()"
                />
              } @else {
                <app-icone nome="marca" />
              }
            </span>
            <div class="auth-marca-texto">
              <span class="auth-marca-tag">CONTA EXCLUSIVA DA CASA</span>
              <strong class="auth-casa-nome">{{ marca.nome() }}</strong>
            </div>
          </div>

          <header class="form-cabecalho">
            <p class="eyebrow">NOVA CONTA DE CLIENTE</p>
            <h2 id="cadastro-titulo" tabindex="-1">Criar conta de cliente</h2>
            <p class="auth-intro">
              Primeiro confirme seu e-mail e depois escolha sua senha para pedir em
              {{ marca.nome() }}.
            </p>
            <div class="etapas-pills" aria-hidden="true">
              <span class="etapa-pill etapa-pill--ativa">01 · E-mail</span>
              <span class="etapa-pill">02 · Senha</span>
            </div>
          </header>

          <details class="mob-beneficios">
            <summary>Benefícios da conta e ajuda da casa</summary>
            <div class="mob-beneficios-corpo">
              <p class="mob-beneficios-slogan">
                Sua mesa em <em>{{ marca.nome() }}</em> · {{ marca.slogan() }}
              </p>
              <dl class="cartela-ficha cartela-ficha--compacta">
                <div class="ficha-linha">
                  <dt>Acompanhar pedidos</dt>
                  <span class="ficha-guia" aria-hidden="true"></span>
                  <dd>Ao vivo</dd>
                </div>
                <div class="ficha-linha">
                  <dt>Caderno de endereços</dt>
                  <span class="ficha-guia" aria-hidden="true"></span>
                  <dd>Delivery ágil</dd>
                </div>
                <div class="ficha-linha">
                  <dt>Pratos favoritos</dt>
                  <span class="ficha-guia" aria-hidden="true"></span>
                  <dd>Salvos na casa</dd>
                </div>
                <div class="ficha-linha">
                  <dt>Acesso exclusivo</dt>
                  <span class="ficha-guia" aria-hidden="true"></span>
                  <dd>Somente cliente</dd>
                </div>
              </dl>
              <p class="cartela-nota">
                Já pediu aqui antes? Use o login para entrar ou recuperar sua senha. Nome completo e
                endereços de entrega são completados depois em <strong>Minha conta</strong>.
              </p>
            </div>
          </details>

          <div class="etapa-bloco">
            <div class="etapa-topo">
              <p class="etapa-selo">01 · SOLICITAR CÓDIGO</p>
              <span class="etapa-validade">Código de uso único · validade de 15 min</span>
            </div>
            <form (submit)="solicitar($event, email.value)">
              <label for="email-cadastro">E-mail do cadastro</label>
              <input
                #email
                id="email-cadastro"
                type="email"
                autocomplete="email"
                placeholder="seu@email.com"
                required
                maxlength="254"
                [disabled]="ocupado()"
              />
              <button hlmBtn type="submit" [disabled]="ocupado()">
                Solicitar código de cadastro
              </button>
            </form>
          </div>

          <hr class="etapa-divisor" aria-hidden="true" />

          <div class="etapa-bloco">
            <p class="etapa-selo">02 · VERIFICAR E CRIAR CONTA</p>
            <h3>Verificar e-mail e definir senha</h3>
            <p class="etapa-texto">
              O código recebido vale somente em {{ marca.nome() }} e pode ser usado uma vez. Se já
              possui conta, volte ao login ou recupere sua senha.
            </p>
            <form (submit)="confirmar($event, codigo, senha, confirmacao)">
              <label for="codigo-cadastro">Código de cadastro</label>
              <input
                #codigo
                id="codigo-cadastro"
                type="password"
                autocomplete="off"
                placeholder="Cole o código de 43 caracteres"
                required
                minlength="43"
                maxlength="43"
                pattern="[A-Za-z0-9_\\-]{43}"
                [attr.aria-describedby]="campoErro() === 'codigo' ? 'erro-cadastro' : null"
                [attr.aria-invalid]="campoErro() === 'codigo' ? true : null"
                [disabled]="ocupado()"
              />

              <label for="senha-cadastro">Senha da nova conta</label>
              <div class="pw-wrap">
                <input
                  #senha
                  id="senha-cadastro"
                  [type]="mostrarSenha() ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="12 ou mais caracteres"
                  required
                  minlength="12"
                  maxlength="72"
                  (input)="aoDigitarSenha($any($event.target).value)"
                  [attr.aria-describedby]="
                    campoErro() === 'senha' ? 'regra-cadastro erro-cadastro' : 'regra-cadastro'
                  "
                  [attr.aria-invalid]="campoErro() === 'senha' ? true : null"
                  [disabled]="ocupado()"
                />
                <button
                  type="button"
                  class="pw-toggle"
                  (click)="alternarMostrarSenha()"
                  [attr.aria-pressed]="mostrarSenha()"
                  [disabled]="ocupado()"
                >
                  {{ mostrarSenha() ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              <div class="pw-meter" aria-hidden="true">
                <div
                  class="pw-meter-bar"
                  [class.pw-meter-bar--ok]="tamanhoSenha() >= 12"
                  [style.width.%]="progressoForcaSenha()"
                ></div>
              </div>
              <p class="pw-feedback" [class.pw-feedback--ok]="tamanhoSenha() >= 12">
                {{ textoForcaSenha() }}
              </p>

              <p id="regra-cadastro" class="regra-callout">
                Dica: escolha pelo menos 12 caracteres (como uma frase fácil de lembrar). Não precisa
                de símbolo especial.
              </p>

              <label for="confirmacao-cadastro">Confirmar senha da nova conta</label>
              <input
                #confirmacao
                id="confirmacao-cadastro"
                [type]="mostrarSenha() ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Repita a senha"
                required
                minlength="12"
                maxlength="72"
                [attr.aria-describedby]="campoErro() === 'confirmacao' ? 'erro-cadastro' : null"
                [attr.aria-invalid]="campoErro() === 'confirmacao' ? true : null"
                [disabled]="ocupado()"
              />
              <button hlmBtn type="submit" [disabled]="ocupado()">Verificar e criar conta</button>
            </form>
          </div>

          @if (erro()) {
            <p #alerta id="erro-cadastro" role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
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
    .dossie-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }
    .dossie-cartela {
      display: none;
      gap: 1.05rem;
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      border-radius: 20px;
      padding: 1.3rem;
      box-shadow: 0 3px 0 var(--border, #e5ded3);
    }
    .dossie-painel {
      display: grid;
      gap: 0.85rem;
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      border-radius: 20px;
      padding: clamp(0.95rem, 2.5vw, 1.55rem);
      box-shadow: 0 3px 0 var(--border, #e5ded3);
      min-width: 0;
    }
    .auth-marca-topo,
    .mob-marca-topo {
      display: flex;
      align-items: center;
      gap: 0.7rem;
    }
    .auth-marca-topo {
      padding-bottom: 0.9rem;
      border-bottom: 1px dashed var(--border, #e5ded3);
    }
    .mob-marca-topo {
      padding-bottom: 0.65rem;
      border-bottom: 1px dashed var(--border, #e5ded3);
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
    .auth-symbol--sm {
      width: 36px;
      height: 36px;
    }
    .auth-symbol--sm app-icone {
      width: 17px;
      height: 17px;
    }
    .conta-marca-logo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      border-radius: inherit;
    }
    .auth-marca-texto {
      display: grid;
      gap: 0.1rem;
      min-width: 0;
    }
    .auth-marca-tag {
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--primary-ink, #a53e2b);
    }
    .auth-casa-nome {
      font-family: var(--font-serif, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif);
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--foreground, #292521);
      overflow-wrap: anywhere;
    }
    .cartela-arco {
      background: var(--secondary, #f0ebe3);
      border: 1px solid var(--border, #dfd3c3);
      border-radius: 130px 130px 16px 16px;
      padding: 1.5rem 1.05rem 1.1rem;
      text-align: center;
    }
    .cartela-arco-titulo {
      margin: 0 0 0.35rem;
      font-family: var(--font-serif, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif);
      font-size: 1.28rem;
      font-weight: 600;
      line-height: 1.2;
      color: var(--foreground, #292521);
    }
    .cartela-arco-titulo em,
    .mob-beneficios-slogan em {
      font-style: italic;
      font-weight: 500;
      color: var(--primary-ink, #a53e2b);
    }
    .cartela-arco-slogan {
      margin: 0;
      font-size: 0.85rem;
      color: var(--muted-foreground, #6e6259);
      line-height: 1.45;
    }
    .cartela-ficha {
      margin: 0;
      padding: 0.85rem 0;
      border-top: 1px dashed var(--border, #e5ded3);
      border-bottom: 1px dashed var(--border, #e5ded3);
      display: grid;
      gap: 0.58rem;
    }
    .cartela-ficha--compacta {
      padding: 0.65rem 0;
      gap: 0.45rem;
    }
    .ficha-linha {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
      min-width: 0;
      font-size: 0.85rem;
    }
    .ficha-linha dt {
      flex: none;
      color: var(--muted-foreground, #6e6259);
      font-weight: 600;
    }
    .ficha-guia {
      flex: 1 1 12px;
      min-width: 12px;
      border-bottom: 1.5px dotted #c7bcb0;
      transform: translateY(-3px);
    }
    .ficha-linha dd {
      margin: 0;
      text-align: right;
      color: var(--foreground, #292521);
      font-weight: 650;
      min-width: 0;
    }
    .cartela-box {
      padding: 0.8rem 0.9rem;
      border-radius: 12px;
      border: 1px solid var(--border, #e5ded3);
      border-left: 3px solid var(--primary, #a53e2b);
      background: var(--background, #faf7f2);
    }
    .cartela-box-titulo {
      margin: 0 0 0.2rem;
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--foreground, #292521);
    }
    .cartela-box-texto {
      margin: 0;
      font-size: 0.81rem;
      line-height: 1.45;
      color: var(--muted-foreground, #6e6259);
    }
    .cartela-nota {
      margin: 0;
      font-size: 0.81rem;
      line-height: 1.48;
      color: var(--muted-foreground, #6e6259);
    }
    .cartela-nota strong {
      color: var(--foreground, #292521);
    }
    .form-cabecalho {
      display: grid;
      gap: 0.4rem;
    }
    .eyebrow {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.13em;
      text-transform: uppercase;
      color: var(--primary-ink, #a53e2b);
    }
    h2 {
      font-family: var(--font-serif, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif);
      font-size: clamp(1.45rem, 3.2vw, 1.95rem);
      font-weight: 500;
      line-height: 1.14;
      letter-spacing: -0.025em;
      margin: 0;
      color: var(--foreground, #292521);
    }
    h3 {
      margin: 0 0 0.35rem;
      font-family: var(--font-serif, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif);
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--foreground, #292521);
    }
    .auth-intro {
      margin: 0;
      color: var(--muted-foreground, #6e6259);
      font-size: 0.92rem;
      line-height: 1.48;
    }
    .etapas-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-top: 0.2rem;
    }
    .etapa-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.28rem 0.7rem;
      border-radius: 999px;
      border: 1px solid var(--border, #e5ded3);
      background: var(--background, #faf7f2);
      color: var(--secondary-foreground, #44372e);
      font-size: 0.76rem;
      font-weight: 700;
    }
    .etapa-pill--ativa {
      background: var(--primary-soft, #fbefec);
      border-color: var(--primary-soft-border, #e3bfb7);
      color: var(--primary-ink, #7f2f20);
    }
    .mob-beneficios {
      border: 1px solid var(--border, #e5ded3);
      border-radius: 14px;
      background: var(--background, #faf7f2);
      padding: 0.15rem 0.85rem;
    }
    .mob-beneficios summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      min-height: 48px;
      cursor: pointer;
      list-style: none;
      font-size: 0.86rem;
      font-weight: 650;
      color: var(--foreground, #292521);
    }
    .mob-beneficios summary::-webkit-details-marker {
      display: none;
    }
    .mob-beneficios summary::after {
      content: '▾';
      font-size: 0.85rem;
      color: var(--muted-foreground, #6e6259);
      transition: transform 0.16s ease;
    }
    .mob-beneficios[open] summary::after {
      transform: rotate(180deg);
    }
    .mob-beneficios-corpo {
      display: grid;
      gap: 0.6rem;
      padding: 0.65rem 0 0.75rem;
      border-top: 1px dashed var(--border, #e5ded3);
    }
    .mob-beneficios-slogan {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--foreground, #292521);
    }
    .etapa-bloco {
      padding: 0.95rem;
      border-radius: 16px;
      border: 1px solid var(--border, #e5ded3);
      background: var(--background, #faf7f2);
    }
    .etapa-topo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem 0.65rem;
      margin-bottom: 0.5rem;
    }
    .etapa-selo {
      margin: 0 0 0.45rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: var(--primary-ink, #a53e2b);
    }
    .etapa-topo .etapa-selo {
      margin: 0;
    }
    .etapa-validade {
      display: inline-flex;
      align-items: center;
      padding: 0.22rem 0.62rem;
      border-radius: 999px;
      background: var(--secondary, #f0ebe3);
      border: 1px solid var(--border, #e5ded3);
      color: var(--secondary-foreground, #44372e);
      font-size: 0.74rem;
      font-weight: 650;
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
      margin: 0;
    }
    form {
      display: grid;
      gap: 0.55rem;
    }
    label {
      display: block;
      margin: 0.1rem 0 0;
      font-size: 0.88rem;
      font-weight: 650;
      color: var(--foreground, #292521);
    }
    input {
      width: 100%;
      min-height: 48px;
      min-width: 0;
      border: 1px solid var(--input, #d5cbbd);
      border-radius: 12px;
      padding: 0.7rem 0.9rem;
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
      border: 1px solid var(--input, #d5cbbd);
      border-radius: 12px;
      background: var(--secondary, #f0ebe3);
      color: var(--foreground, #292521);
      font-size: 0.82rem;
      font-weight: 650;
      box-shadow: none;
    }
    button.pw-toggle:hover:not(:disabled) {
      background: var(--muted, #e6dfd4);
      filter: none;
    }
    button.pw-toggle:disabled {
      background: var(--disabled-bg, #efe9e0);
      border-color: var(--disabled-border, #d8cfc3);
      color: var(--disabled-fg, #594e46);
      cursor: not-allowed;
    }
    .pw-meter {
      height: 6px;
      border-radius: 999px;
      background: var(--secondary, #f0ebe3);
      overflow: hidden;
    }
    .pw-meter-bar {
      height: 100%;
      border-radius: inherit;
      background: var(--primary, #a53e2b);
      transition: width 0.16s ease, background-color 0.16s ease;
    }
    .pw-meter-bar--ok {
      background: var(--accent-foreground, #30523b);
    }
    .pw-feedback {
      margin: 0;
      font-size: 0.81rem;
      font-weight: 600;
      color: var(--muted-foreground, #6e6259);
      line-height: 1.4;
    }
    .pw-feedback--ok {
      color: var(--accent-foreground, #30523b);
    }
    .regra-callout {
      margin: 0.1rem 0 0.25rem;
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
      margin-top: 0.3rem;
      width: 100%;
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
    button[hlmBtn]:not([data-variant]):active:not(:disabled),
    button[hlmBtn][data-variant='default']:active:not(:disabled) {
      transform: translateY(1px);
      box-shadow: 0 2px 0 var(--primary-deep, #7f2f20);
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
      padding: 0.8rem 0.95rem;
      border: 1px solid var(--danger-border, #e8c7c1);
      border-radius: 12px;
      background: var(--danger-bg, #fff2f0);
      color: var(--danger-fg, #972626);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .sucesso-aviso {
      margin: 0;
      padding: 0.8rem 0.95rem;
      border: 1px solid var(--accent-border, #c8d8c5);
      border-radius: 12px;
      background: var(--accent, #e8efe7);
      color: var(--accent-foreground, #30523b);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .auth-rodape {
      padding-top: 0.35rem;
      border-top: 1px dashed var(--border, #e5ded3);
    }
    .auth-rodape button[hlmBtn] {
      width: 100%;
    }
    @media (min-width: 860px) {
      .dossie-grid {
        grid-template-columns: 315px minmax(0, 1fr);
        gap: 1.35rem;
      }
      .dossie-cartela {
        display: grid;
      }
      .mob-marca-topo,
      .mob-beneficios {
        display: none;
      }
    }
    @media (max-width: 640px) {
      .dossie-painel {
        padding: 0.85rem 0.75rem;
        border-radius: 16px;
        gap: 0.7rem;
      }
      .etapa-bloco {
        padding: 0.8rem 0.75rem;
      }
      .auth-intro {
        font-size: 0.86rem;
      }
      .ficha-linha {
        flex-wrap: wrap;
        justify-content: space-between;
      }
      .ficha-guia {
        display: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .pw-meter-bar,
      .mob-beneficios summary::after,
      button[hlmBtn] {
        transition: none;
        transform: none;
      }
    }
  `,
})
export class CadastroComponent {
  readonly marca = inject(MarcaService);
  private readonly sessao = inject(SessaoService);
  readonly voltar = output<void>();
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly campoErro = signal<'codigo' | 'senha' | 'confirmacao' | null>(null);
  readonly aviso = signal('');
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
    if (t === 0) return 'Digite uma frase fácil de lembrar para proteger sua conta.';
    if (t < 12) return `Faltam ${12 - t} caracteres para atingir o mínimo de 12.`;
    return 'Tamanho bom para proteger sua conta.';
  }

  progressoForcaSenha(): number {
    const t = this.tamanhoSenha();
    if (t === 0) return 0;
    return Math.min(100, Math.round((t / 16) * 100));
  }

  async solicitar(event: Event, email: string): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.iniciar();
    try {
      await this.sessao.cadastrar('cadastro', { email });
      this.sucesso('Se o endereço estiver elegível, enviaremos instruções para criar a conta.');
    } catch (error) {
      this.falha(error, false);
    } finally {
      this.ocupado.set(false);
    }
  }

  async confirmar(
    event: Event,
    codigo: HTMLInputElement,
    senha: HTMLInputElement,
    confirmacao: HTMLInputElement,
  ): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.iniciar();
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
      await this.sessao.cadastrar('cadastro/confirmar', {
        codigo: codigo.value,
        senha: senha.value,
      });
      codigo.value = '';
      this.sucesso('Conta criada com e-mail verificado. Volte ao login para entrar.');
    } catch (error) {
      this.falha(error, true);
    } finally {
      senha.value = '';
      confirmacao.value = '';
      this.tamanhoSenha.set(0);
      this.ocupado.set(false);
    }
  }

  private iniciar(): void {
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.campoErro.set(null);
  }

  private sucesso(texto: string): void {
    this.aviso.set(texto);
    setTimeout(() => this.resultado?.nativeElement.focus());
  }

  private falha(error: unknown, confirmacao: boolean): void {
    if (
      confirmacao &&
      error instanceof ApiFailure &&
      error.status === 422 &&
      error.codigo === 'CADASTRO_INVALIDO'
    )
      this.campoErro.set('codigo');
    const rede =
      error instanceof TypeError ||
      (error instanceof ApiFailure && error.status >= 500) ||
      (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name));
    this.erro.set(
      rede
        ? confirmacao
          ? 'A resposta não chegou. A conta pode ter sido criada. Volte ao login e confira antes de solicitar outro código.'
          : 'Sem conexão. A solicitação não foi confirmada; confira a captura antes de repetir.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível concluir a operação.',
    );
    setTimeout(() => this.alerta?.nativeElement.focus());
  }
}

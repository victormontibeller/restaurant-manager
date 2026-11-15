import { Component, ElementRef, ViewChild, inject, output, signal } from '@angular/core';
import { ApiFailure, SessaoService } from './sessao.service';
import { senhaEmBranco } from './senha';
import { MarcaService } from '../rotas/marca.service';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from '../ui/button';

@Component({
  selector: 'app-recuperacao',
  imports: [HlmButton, IconeComponent],
  template: `
    <section class="subauth" aria-labelledby="recuperacao-titulo" [attr.aria-busy]="ocupado()">
      <div class="dossie-grid">
        <aside class="dossie-cartela" aria-label="Como funciona a recuperação">
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
              <span class="auth-marca-tag">REACESSO À CONTA</span>
              <strong class="auth-casa-nome">{{ marca.nome() }}</strong>
            </div>
          </div>

          <p class="cartela-titulo-talao">COMO FUNCIONA O REACESSO</p>

          <dl class="cartela-ficha" aria-label="Regras de redefinição de senha">
            <div class="ficha-linha">
              <dt>Código enviado</dt>
              <span class="ficha-guia" aria-hidden="true"></span>
              <dd>Uso único</dd>
            </div>
            <div class="ficha-linha">
              <dt>Validade</dt>
              <span class="ficha-guia" aria-hidden="true"></span>
              <dd>15 minutos</dd>
            </div>
            <div class="ficha-linha">
              <dt>Outros acessos</dt>
              <span class="ficha-guia" aria-hidden="true"></span>
              <dd>Desconectados</dd>
            </div>
            <div class="ficha-linha">
              <dt>Nova senha</dt>
              <span class="ficha-guia" aria-hidden="true"></span>
              <dd>Mín. 12 caracteres</dd>
            </div>
          </dl>

          <div class="cartela-box">
            <p class="cartela-box-titulo">Segurança da conta</p>
            <p class="cartela-box-texto">
              Ao confirmar a nova senha, qualquer sessão anterior aberta em outros celulares ou
              navegadores é encerrada automaticamente.
            </p>
          </div>
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
              <span class="auth-marca-tag">REACESSO À CONTA</span>
              <strong class="auth-casa-nome">{{ marca.nome() }}</strong>
            </div>
          </div>

          <header class="form-cabecalho">
            <p class="eyebrow">SEGURANÇA DA CONTA</p>
            <h2 id="recuperacao-titulo" tabindex="-1">Recuperar senha</h2>
            <p class="auth-intro">
              Solicite um código de uso único para redefinir a senha da sua conta em
              {{ marca.nome() }}.
            </p>
            <div class="etapas-pills" aria-hidden="true">
              <span class="etapa-pill etapa-pill--ativa">01 · E-mail</span>
              <span class="etapa-pill">02 · Nova senha</span>
            </div>
          </header>

          <details class="mob-resumo">
            <summary>Como funciona o reacesso e regras do código</summary>
            <div class="mob-resumo-corpo">
              <dl class="cartela-ficha cartela-ficha--compacta">
                <div class="ficha-linha">
                  <dt>Código enviado</dt>
                  <span class="ficha-guia" aria-hidden="true"></span>
                  <dd>Uso único</dd>
                </div>
                <div class="ficha-linha">
                  <dt>Validade</dt>
                  <span class="ficha-guia" aria-hidden="true"></span>
                  <dd>15 minutos</dd>
                </div>
                <div class="ficha-linha">
                  <dt>Outros acessos</dt>
                  <span class="ficha-guia" aria-hidden="true"></span>
                  <dd>Desconectados</dd>
                </div>
                <div class="ficha-linha">
                  <dt>Nova senha</dt>
                  <span class="ficha-guia" aria-hidden="true"></span>
                  <dd>Mín. 12 caracteres</dd>
                </div>
              </dl>
            </div>
          </details>

          <div class="etapa-bloco">
            <div class="etapa-topo">
              <p class="etapa-selo">01 · SOLICITAR CÓDIGO</p>
              <span class="etapa-validade">Uso único · 15 minutos</span>
            </div>
            <form (submit)="solicitar($event, email.value)">
              <label for="email-recuperacao">E-mail da recuperação</label>
              <input
                #email
                id="email-recuperacao"
                type="email"
                autocomplete="username"
                placeholder="seu@email.com"
                required
                maxlength="254"
                [disabled]="ocupado()"
              />
              <button hlmBtn type="submit" [disabled]="ocupado()">Solicitar código</button>
            </form>
          </div>

          <hr class="etapa-divisor" aria-hidden="true" />

          <div class="etapa-bloco">
            <p class="etapa-selo">02 · DEFINIR NOVA SENHA</p>
            <h3>Já recebeu o código?</h3>
            <p class="etapa-texto">
              O código vale somente em {{ marca.nome() }} e a troca encerra sessões anteriores.
            </p>
            <form (submit)="confirmar($event, codigo, nova, confirmacao)">
              <label for="codigo-recuperacao">Código de recuperação</label>
              <input
                #codigo
                id="codigo-recuperacao"
                type="password"
                autocomplete="off"
                placeholder="Cole o código de 43 caracteres"
                required
                minlength="43"
                maxlength="43"
                pattern="[A-Za-z0-9_\\-]{43}"
                [attr.aria-describedby]="campoErro() === 'codigo' ? 'erro-recuperacao' : null"
                [attr.aria-invalid]="campoErro() === 'codigo' ? true : null"
                [disabled]="ocupado()"
              />

              <div class="pw-grid-2">
                <div class="campo-grupo">
                  <label for="nova-senha">Nova senha</label>
                  <div class="pw-wrap">
                    <input
                      #nova
                      id="nova-senha"
                      [type]="mostrarSenha() ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="12 ou mais caracteres"
                      required
                      minlength="12"
                      maxlength="72"
                      (input)="aoDigitarSenha($any($event.target).value)"
                      [attr.aria-describedby]="
                        campoErro() === 'senha' ? 'regra-senha erro-recuperacao' : 'regra-senha'
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
                </div>

                <div class="campo-grupo">
                  <label for="confirmar-senha">Confirmar nova senha</label>
                  <input
                    #confirmacao
                    id="confirmar-senha"
                    [type]="mostrarSenha() ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="Repita a nova senha"
                    required
                    minlength="12"
                    maxlength="72"
                    [attr.aria-describedby]="
                      campoErro() === 'confirmacao' ? 'erro-recuperacao' : null
                    "
                    [attr.aria-invalid]="campoErro() === 'confirmacao' ? true : null"
                    [disabled]="ocupado()"
                  />
                </div>
              </div>

              <p id="regra-senha" class="regra-callout">
                Escolha pelo menos 12 caracteres (pode ser uma frase simples de lembrar, sem precisar
                de símbolos obrigatórios).
              </p>

              <button hlmBtn type="submit" [disabled]="ocupado()">Alterar senha</button>
            </form>
          </div>

          @if (erro()) {
            <p #alerta id="erro-recuperacao" role="alert" tabindex="-1" class="erro">
              {{ erro() }}
            </p>
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
      gap: 1rem;
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      border-top: 3px solid var(--primary, #a53e2b);
      border-radius: 20px;
      padding: 1.3rem;
      box-shadow: 0 3px 0 #e5ded3;
    }
    .dossie-painel {
      display: grid;
      gap: 0.85rem;
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      border-radius: 20px;
      padding: clamp(0.95rem, 2.5vw, 1.55rem);
      box-shadow: 0 3px 0 #e5ded3;
      min-width: 0;
    }
    .auth-marca-topo,
    .mob-marca-topo {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding-bottom: 0.75rem;
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
      color: var(--primary, #a53e2b);
    }
    .auth-casa-nome {
      font-family: var(--font-serif, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif);
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--foreground, #292521);
      overflow-wrap: anywhere;
    }
    .cartela-titulo-talao {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.13em;
      color: var(--foreground, #292521);
    }
    .cartela-ficha {
      margin: 0;
      padding: 0.8rem 0;
      border-top: 1px dashed var(--border, #e5ded3);
      border-bottom: 1px dashed var(--border, #e5ded3);
      display: grid;
      gap: 0.58rem;
    }
    .cartela-ficha--compacta {
      padding: 0.5rem 0 0.2rem;
      border-bottom: 0;
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
      color: var(--primary, #a53e2b);
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
      background: #fbefec;
      border-color: #e3bfb7;
      color: var(--primary-deep, #7f2f20);
    }
    .mob-resumo {
      border: 1px solid var(--border, #e5ded3);
      border-radius: 14px;
      background: var(--background, #faf7f2);
      padding: 0.15rem 0.85rem;
    }
    .mob-resumo summary {
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
    .mob-resumo summary::-webkit-details-marker {
      display: none;
    }
    .mob-resumo summary::after {
      content: '▾';
      font-size: 0.85rem;
      color: var(--muted-foreground, #6e6259);
      transition: transform 0.16s ease;
    }
    .mob-resumo[open] summary::after {
      transform: rotate(180deg);
    }
    .mob-resumo-corpo {
      padding: 0.3rem 0 0.65rem;
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
      color: var(--primary, #a53e2b);
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
      gap: 0.6rem;
    }
    .pw-grid-2 {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.65rem 0.85rem;
      align-items: start;
    }
    .campo-grupo {
      display: grid;
      gap: 0.4rem;
      min-width: 0;
      align-content: start;
    }
    label {
      display: block;
      margin: 0.1rem 0 0;
      font-size: 0.88rem;
      font-weight: 650;
      color: var(--foreground, #292521);
    }
    .campo-grupo label {
      margin: 0;
    }
    input {
      width: 100%;
      min-height: 48px;
      min-width: 0;
      border: 1px solid #d5cbbd;
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
      border-color: var(--primary, #a53e2b);
    }
    input[aria-invalid='true'] {
      border-color: #972626;
      background: #fffbfa;
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
      border: 1px solid #d5cbbd;
      border-radius: 12px;
      background: var(--secondary, #f0ebe3);
      color: var(--foreground, #292521);
      font-size: 0.82rem;
      font-weight: 650;
      box-shadow: none;
    }
    button.pw-toggle:hover:not(:disabled) {
      background: #e6dfd4;
      filter: none;
    }
    button.pw-toggle:disabled {
      background: #efe9e0;
      border-color: #d8cfc3;
      color: #594e46;
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
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--muted-foreground, #6e6259);
      line-height: 1.38;
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
      box-shadow: 0 2px 0 #ddd4c7;
    }
    button[hlmBtn][data-variant='outline']:hover:not(:disabled) {
      background: var(--muted, #f3eee7);
      filter: none;
    }
    button[hlmBtn]:disabled {
      opacity: 1;
      background: #efe9e0;
      border-color: #d8cfc3;
      color: #594e46;
      box-shadow: none;
      cursor: not-allowed;
    }
    .erro {
      margin: 0;
      padding: 0.8rem 0.95rem;
      border: 1px solid #e8c7c1;
      border-radius: 12px;
      background: #fff2f0;
      color: #972626;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .sucesso-aviso {
      margin: 0;
      padding: 0.8rem 0.95rem;
      border: 1px solid #c8d8c5;
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
    @media (min-width: 680px) {
      .pw-grid-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
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
      .mob-resumo {
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
      .mob-resumo summary::after,
      button[hlmBtn] {
        transition: none;
        transform: none;
      }
    }
  `,
})
export class RecuperacaoComponent {
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
    if (t === 0) return 'Escolha uma nova senha com pelo menos 12 caracteres.';
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
      await this.sessao.recuperar('recuperacao', { email });
      this.sucesso('Se a conta estiver elegível, enviaremos instruções de recuperação.');
    } catch (error) {
      this.falha(error, false);
    } finally {
      this.ocupado.set(false);
    }
  }

  async confirmar(
    event: Event,
    codigo: HTMLInputElement,
    nova: HTMLInputElement,
    confirmacao: HTMLInputElement,
  ): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.iniciar();
    try {
      if (nova.value !== confirmacao.value) {
        this.campoErro.set('confirmacao');
        throw new Error('As senhas devem ser iguais.');
      }
      if (senhaEmBranco(nova.value)) {
        this.campoErro.set('senha');
        throw new Error('A senha não pode conter somente espaços em branco.');
      }
      if (new TextEncoder().encode(nova.value).length > 72) {
        this.campoErro.set('senha');
        throw new Error('A senha deve ter no máximo 72 bytes.');
      }
      await this.sessao.recuperar('recuperacao/confirmar', {
        codigo: codigo.value,
        senha: nova.value,
      });
      codigo.value = '';
      this.sucesso(
        'Senha alterada e sessões anteriores encerradas. Volte ao login para entrar com a nova senha.',
      );
    } catch (error) {
      this.falha(error, true);
    } finally {
      nova.value = '';
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
      error.codigo === 'RECUPERACAO_INVALIDA'
    )
      this.campoErro.set('codigo');
    const rede =
      error instanceof TypeError ||
      (error instanceof ApiFailure && error.status >= 500) ||
      (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name));
    this.erro.set(
      rede
        ? confirmacao
          ? 'A resposta não chegou. A senha pode ter sido alterada. Volte ao login e confira antes de solicitar outro código.'
          : 'Sem conexão. A solicitação não foi confirmada; confira a captura antes de repetir.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível concluir a operação.',
    );
    setTimeout(() => this.alerta?.nativeElement.focus());
  }
}

import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { ApiFailure } from '../identidade/sessao.service';
import { HlmButton } from '../ui/button';

import { EmpresaSaas, PlataformaSessaoService } from './plataforma-sessao.service';
import { ProvisionamentoComponent } from './provisionamento.component';

@Component({
  selector: 'app-plataforma',
  imports: [ProvisionamentoComponent, HlmButton],
  styles: [
    `
      :host {
        display: block;
      }
      .plat-btn-block {
        width: 100%;
      }
      .plat-btn-primary {
        box-shadow: 0 3px 0 var(--primary-deep, #7f2f20);
      }
      .plat-btn-primary:active:not(:disabled) {
        transform: translateY(1px);
      }
      .bistro-card {
        background: var(--card, #ffffff);
        border: 1px solid var(--border, #e5ded3);
        border-radius: 1rem;
        padding: 1.15rem;
        box-shadow: var(--shadow-soft, 0 1px 2px rgba(41, 37, 33, 0.06));
        min-width: 0;
      }
      .bistro-talao {
        background: var(--card, #ffffff);
        border: 1px solid var(--border, #e5ded3);
        border-top: 3px solid var(--primary, #a53e2b);
        border-radius: 1rem;
        padding: 1.15rem;
        box-shadow: var(--shadow-soft, 0 1px 2px rgba(41, 37, 33, 0.06));
        min-width: 0;
      }
      .sec-line {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 0.75rem;
        flex-wrap: wrap;
      }
      .sec-num {
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--primary-ink, #a53e2b);
      }
      .sec-dotted {
        flex: 1;
        min-width: 1.25rem;
        border-bottom: 1px dotted var(--border, #e5ded3);
      }
      .card-title {
        margin: 0 0 0.3rem;
        font-size: 1.08rem;
        font-weight: 750;
        color: var(--foreground, #292521);
      }
      .eyebrow {
        margin: 0 0 0.25rem;
        color: var(--primary-ink, #a53e2b);
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        font-weight: 750;
        text-transform: uppercase;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.24rem 0.62rem;
        border-radius: 999px;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .badge-ok {
        background: var(--accent, #e8efe7);
        color: var(--accent-foreground, #30523b);
        border-color: var(--accent-border, #b7d2be);
      }
      .badge-warn {
        background: var(--amber-bg, #fff8e8);
        color: var(--amber-fg, #684614);
        border-color: var(--amber-border, #e6cf9e);
      }
      .badge-danger {
        background: var(--danger-bg, #fff2f0);
        color: var(--danger-fg, #972626);
        border-color: var(--danger-border, #e8c7c1);
      }
      .badge-info {
        background: var(--info-bg, #edf0f8);
        color: var(--info-fg, #36457d);
        border-color: var(--info-border, #c5cee6);
      }
      .domain-chips .badge {
        min-width: 0;
        max-width: 100%;
        white-space: normal;
        overflow-wrap: anywhere;
      }
      .badge-neutral {
        background: var(--secondary, #f0ebe3);
        color: var(--secondary-foreground, #44372e);
        border-color: var(--border, #e5ded3);
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 0.85rem;
        min-width: 0;
      }
      .field label {
        display: block;
        margin: 0;
        font-size: 0.86rem;
        font-weight: 650;
        color: var(--foreground, #292521);
      }
      .field input {
        width: 100%;
        max-width: 100%;
        min-height: 48px;
        padding: 0.65rem 0.85rem;
        border-radius: 0.65rem;
        border: 1px solid var(--input, #c6b9aa);
        background: var(--card, #ffffff);
        color: var(--foreground, #292521);
        font: inherit;
        font-size: 0.94rem;
      }
      .field input:disabled {
        background: var(--disabled-bg, #efe9e0);
        color: var(--disabled-fg, #594e46);
        border-color: var(--disabled-border, #d8cfc3);
      }
      .hint {
        margin: 0;
        font-size: 0.84rem;
        color: var(--muted-foreground, #6e6259);
        overflow-wrap: anywhere;
      }
      [role='alert'] {
        border-left: 4px solid var(--destructive, #ad2929);
        background: var(--danger-bg, #fff2f0);
        color: var(--danger-fg, #972626);
        border-radius: 0.6rem;
        padding: 0.8rem 0.95rem;
        margin: 0 0 0.95rem;
        font-size: 0.88rem;
        font-weight: 600;
        overflow-wrap: anywhere;
      }
      .warn-box {
        border-left: 4px solid var(--amber-fg, #684614);
        background: var(--amber-bg, #fff8e8);
        color: var(--amber-fg, #684614);
        border-radius: 0.6rem;
        padding: 0.8rem 0.95rem;
        margin: 0.75rem 0 0;
        font-size: 0.86rem;
        font-weight: 600;
        overflow-wrap: anywhere;
      }
      .status-box {
        border: 1px solid var(--border, #e5ded3);
        background: var(--muted, #f3eee7);
        color: var(--foreground, #292521);
        border-radius: 0.65rem;
        padding: 0.65rem 0.85rem;
        margin: 0.65rem 0 1rem;
        font-size: 0.85rem;
      }
      .status-box:empty {
        display: none;
      }
      .login-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
        gap: 1.25rem;
        align-items: stretch;
      }
      .login-aside {
        background: var(--secondary, #f0ebe3);
        border: 1px solid var(--border, #e5ded3);
        border-radius: 1rem;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 1rem;
        min-width: 0;
      }
      .login-aside h3 {
        margin: 0 0 0.45rem;
        font-size: 1.02rem;
        font-weight: 750;
        color: var(--foreground, #292521);
      }
      .aside-list {
        margin: 0;
        padding-left: 1.15rem;
        color: var(--muted-foreground, #6e6259);
        font-size: 0.86rem;
        display: grid;
        gap: 0.5rem;
      }
      .aside-note {
        padding: 0.75rem 0.85rem;
        border-radius: 0.7rem;
        background: var(--card, #ffffff);
        border: 1px solid var(--border, #e5ded3);
        font-size: 0.82rem;
        color: var(--muted-foreground, #6e6259);
      }
      .session-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.75rem;
        background: var(--card, #ffffff);
        border: 1px solid var(--border, #e5ded3);
        border-radius: 1rem;
        padding: 0.85rem 1.15rem;
        margin-bottom: 1rem;
        box-shadow: var(--shadow-soft, 0 1px 2px rgba(41, 37, 33, 0.06));
      }
      .session-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.6rem;
        min-width: 0;
      }
      .session-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 750;
        color: var(--foreground, #292521);
      }
      .console-grid {
        display: grid;
        grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
        gap: 1.25rem;
        align-items: start;
        margin-bottom: 1.5rem;
      }
      .stack {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        min-width: 0;
      }
      .step-box {
        margin-top: 0.95rem;
        padding-top: 0.95rem;
        border-top: 1px dotted var(--border, #e5ded3);
      }
      .step-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-bottom: 0.55rem;
      }
      .step-kicker {
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted-foreground, #6e6259);
      }
      article.item-card {
        background: var(--card, #ffffff);
        border: 1px solid var(--border, #e5ded3);
        border-radius: 0.9rem;
        padding: 0.95rem;
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.65rem;
        flex-wrap: wrap;
        margin-bottom: 0.45rem;
      }
      .card-head h4 {
        margin: 0;
        flex: 1 1 0;
        min-width: 0;
        font-size: 1rem;
        font-weight: 750;
        color: var(--foreground, #292521);
        overflow-wrap: anywhere;
      }
      .meta-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.45rem;
        font-size: 0.82rem;
        color: var(--muted-foreground, #6e6259);
        overflow-wrap: anywhere;
      }
      .mono-chip {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.76rem;
        background: var(--muted, #f3eee7);
        border: 1px solid var(--border, #e5ded3);
        color: var(--foreground, #292521);
        padding: 0.2rem 0.5rem;
        border-radius: 0.45rem;
        overflow-wrap: anywhere;
      }
      .meta-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
        margin-top: 0.65rem;
      }
      .domain-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-top: 0.6rem;
      }
      .toolbar-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin-bottom: 0.65rem;
      }
      .filter-pills {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.4rem;
        margin: 0.7rem 0 0.85rem;
      }
      .pill-btn {
        min-height: 48px;
        padding: 0.4rem 0.5rem;
        border-radius: 0.6rem;
        border: 1px solid var(--border, #e5ded3);
        background: var(--secondary, #f0ebe3);
        color: var(--secondary-foreground, #44372e);
        font: inherit;
        font-size: 0.82rem;
        font-weight: 650;
        cursor: pointer;
        text-align: center;
        box-shadow: none;
      }
      .pill-btn[aria-pressed='true'] {
        background: var(--primary, #a53e2b);
        color: var(--primary-foreground, #ffffff);
        border-color: var(--primary, #a53e2b);
      }
      .paginacao {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 0.6rem;
        padding-top: 0.85rem;
        margin-top: 0.85rem;
        border-top: 1px dotted var(--border, #e5ded3);
      }
      .paginacao span {
        font-size: 0.84rem;
        font-weight: 650;
        color: var(--muted-foreground, #6e6259);
        font-variant-numeric: tabular-nums;
        text-align: center;
        padding: 0 0.35rem;
      }
      .env-footnote {
        margin: 0.5rem 0 0;
        font-size: 0.8rem;
        color: var(--muted-foreground, #6e6259);
        text-align: center;
      }
      @media (max-width: 900px) {
        .login-grid,
        .console-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 640px) {
        .filter-pills {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .session-bar > button,
        .toolbar-row > button {
          width: 100%;
        }
        .paginacao {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .paginacao > span {
          grid-column: 1 / -1;
          order: -1;
        }
      }
    `,
  ],
  template: `
    <section aria-labelledby="plataforma-titulo" [attr.aria-busy]="ocupado()">
      @if (erro()) {
        <p id="erro-plataforma" role="alert" tabindex="-1" #alerta>{{ erro() }}</p>
      }
      @if (!sessao.autenticado()) {
        <div class="login-grid">
          <div class="bistro-talao">
            <div class="sec-line">
              <span class="sec-num">01 · ACESSO DO OPERADOR SAAS</span>
              <span class="sec-dotted"></span>
              <span class="badge badge-neutral">Sessão isolada</span>
            </div>
            <h2 id="plataforma-titulo" class="card-title">Administração SaaS</h2>
            <p class="hint" style="margin-bottom: 1rem;">
              Acesso separado das contas dos restaurantes. Somente metadados de empresas; sem acesso a clientes, pedidos ou pagamentos.
            </p>
            <form (submit)="entrar($event, emailInput.value, senhaInput)">
              <div class="field">
                <label for="saas-email">E-mail do operador</label>
                <input
                  #emailInput
                  id="saas-email"
                  name="email"
                  type="email"
                  autocomplete="username"
                  required
                  maxlength="254"
                  [disabled]="ocupado() || saidaPendente()"
                />
              </div>
              <div class="field">
                <label for="saas-senha">Senha do operador</label>
                <input
                  #senhaInput
                  id="saas-senha"
                  name="senha"
                  type="password"
                  autocomplete="current-password"
                  required
                  maxlength="72"
                  [disabled]="ocupado() || saidaPendente()"
                />
              </div>
              <button
                type="submit"
                hlmBtn
                class="plat-btn-block plat-btn-primary"
                [disabled]="ocupado() || saidaPendente()"
              >
                Entrar na plataforma
              </button>
            </form>
            @if (saidaPendente()) {
              <div class="warn-box">
                <p style="margin: 0 0 0.75rem;">
                  A saída no servidor não foi confirmada. Conclua antes de entrar novamente.
                </p>
                <button
                  type="button"
                  hlmBtn
                  variant="outline"
                  class="plat-btn-block"
                  (click)="sair()"
                  [disabled]="ocupado()"
                >
                  Tentar encerrar sessão SaaS
                </button>
              </div>
            }
          </div>
          <aside class="login-aside">
            <div>
              <p class="eyebrow">GOVERNANÇA MULTI-TENANT</p>
              <h3>Escopo estrito de plataforma</h3>
              <ul class="aside-list">
                <li>Autenticação própria em memória e cookie restrito ao caminho da plataforma.</li>
                <li>
                  Consulta e alteração de estado comercial (<strong>Ativo</strong> /
                  <strong>Suspenso</strong>) com confirmação recente de senha.
                </li>
                <li>Provisionamento assistido com identificador idempotente de intenção.</li>
                <li>Sem leitura de cardápios, clientes, pedidos ou transações financeiras das lojas.</li>
              </ul>
            </div>
            <div class="aside-note">
              Nenhum dado de sessão comercial é compartilhado com o painel dos restaurantes.
            </div>
          </aside>
        </div>
      } @else {
        <div class="session-bar">
          <div class="session-meta">
            <h2 id="plataforma-titulo" class="session-title">Administração SaaS</h2>
            <span class="badge badge-info">Perfil: OPERADOR_SAAS</span>
          </div>
          <button type="button" hlmBtn variant="outline" (click)="sair()" [disabled]="ocupado()">
            Sair da plataforma
          </button>
        </div>

        <p class="status-box" role="status" aria-live="polite">{{ mensagem() }}</p>

        <div class="console-grid">
          <section class="bistro-talao" aria-labelledby="estado-comercial-titulo">
            <div class="sec-line">
              <span class="sec-num">01 · ESTADO COMERCIAL DA EMPRESA</span>
              <span class="sec-dotted"></span>
            </div>
            <h3 id="estado-comercial-titulo" class="card-title">Estado comercial da empresa</h3>
            <p class="hint" style="margin-bottom: 0.95rem;">
              Suspensão comercial bloqueia novas vendas e preserva consulta e resolução das operações existentes por usuários autorizados. Não revoga contas nem permite impersonação.
            </p>
            <form (submit)="consultar($event, empresaId.value)">
              <div class="field">
                <label for="saas-empresa-id">Identificador da empresa</label>
                <input
                  #empresaId
                  id="saas-empresa-id"
                  required
                  pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                  [disabled]="ocupado()"
                />
              </div>
              <button
                type="submit"
                hlmBtn
                variant="outline"
                class="plat-btn-block"
                [disabled]="ocupado()"
              >
                Consultar estado comercial
              </button>
            </form>

            @if (selecionada(); as empresa) {
              <div class="step-box">
                <div class="card-head" data-testid="empresa-estado">
                  <div>
                    <strong>{{ empresa.nome }}</strong>
                    <p class="hint">Versão {{ empresa.versao }}</p>
                  </div>
                  <span
                    class="badge"
                    [class.badge-ok]="empresa.estado === 'ATIVO'"
                    [class.badge-danger]="empresa.estado === 'SUSPENSO'"
                    [class.badge-warn]="empresa.estado !== 'ATIVO' && empresa.estado !== 'SUSPENSO'"
                  >
                    {{ empresa.estado }}
                  </span>
                </div>

                @if (empresa.estado === 'ATIVO' || empresa.estado === 'SUSPENSO') {
                  <form (submit)="confirmar($event, confirmacaoSenha)" class="step-box">
                    <div class="step-head">
                      <span class="step-kicker">Passo A · Confirmação de segurança</span>
                      <span class="badge badge-neutral">Requer senha</span>
                    </div>
                    <div class="field">
                      <label for="saas-confirmacao">Senha de confirmação do operador</label>
                      <input
                        #confirmacaoSenha
                        id="saas-confirmacao"
                        type="password"
                        autocomplete="current-password"
                        required
                        maxlength="72"
                        [attr.aria-describedby]="erro() && senhaInvalida() ? 'erro-plataforma' : null"
                        [attr.aria-invalid]="erro() && senhaInvalida() ? true : null"
                        [disabled]="ocupado()"
                      />
                    </div>
                    <button
                      type="submit"
                      hlmBtn
                      variant="secondary"
                      class="plat-btn-block"
                      [disabled]="ocupado()"
                    >
                      Confirmar senha SaaS
                    </button>
                  </form>

                  <form (submit)="alterar($event, empresa, motivo.value)" class="step-box">
                    <div class="step-head">
                      <span class="step-kicker">Passo B · Alteração comercial</span>
                    </div>
                    <p class="hint" style="margin-bottom: 0.65rem;">
                      Próximo estado:
                      <strong>{{ empresa.estado === 'ATIVO' ? 'SUSPENSO' : 'ATIVO' }}</strong>.
                      Confirme o motivo antes de aplicar.
                    </p>
                    <div class="field">
                      <label for="saas-motivo">Motivo da alteração comercial</label>
                      <input
                        #motivo
                        id="saas-motivo"
                        required
                        maxlength="240"
                        [disabled]="ocupado() || consultaObrigatoria()"
                      />
                    </div>
                    <button
                      type="submit"
                      hlmBtn
                      class="plat-btn-block plat-btn-primary"
                      [disabled]="ocupado() || consultaObrigatoria()"
                    >
                      Aplicar estado comercial
                    </button>
                  </form>

                  @if (consultaObrigatoria()) {
                    <p class="warn-box">
                      Consulte novamente pelo identificador antes de outra alteração. Não reenviaremos a escrita automaticamente.
                    </p>
                  }
                } @else {
                  <p class="warn-box">
                    Empresa incompleta: use o provisionamento assistido. Esta ação não permite ativá-la.
                  </p>
                }
              </div>
            }
          </section>

          <section class="bistro-card" aria-labelledby="empresas-titulo">
            <div class="sec-line">
              <span class="sec-num">02 · EMPRESAS CADASTRADAS</span>
              <span class="sec-dotted"></span>
              <span class="badge badge-neutral">
                {{ empresasFiltradas().length }}
                {{ empresasFiltradas().length === 1 ? 'empresa' : 'empresas' }}
              </span>
            </div>

            <div class="toolbar-row">
              <h3 id="empresas-titulo" class="card-title" style="margin: 0;">Empresas cadastradas</h3>
              <button
                type="button"
                hlmBtn
                variant="outline"
                (click)="carregar(pagina())"
                [disabled]="ocupado()"
              >
                Atualizar empresas
              </button>
            </div>

            <div class="field" style="margin-bottom: 0.25rem;">
              <label for="busca-empresa">Filtrar por nome ou domínio</label>
              <input
                id="busca-empresa"
                type="search"
                placeholder="Ex.: Forneria ou porto.localhost"
                [value]="termoBusca()"
                (input)="termoBusca.set($any($event.target).value)"
              />
            </div>

            <div class="filter-pills" role="group" aria-label="Filtrar empresas por estado">
              <button
                type="button"
                class="pill-btn"
                [attr.aria-pressed]="filtroEstado() === 'TODOS'"
                (click)="filtroEstado.set('TODOS')"
              >
                Todas
              </button>
              <button
                type="button"
                class="pill-btn"
                [attr.aria-pressed]="filtroEstado() === 'ATIVO'"
                (click)="filtroEstado.set('ATIVO')"
              >
                Ativas
              </button>
              <button
                type="button"
                class="pill-btn"
                [attr.aria-pressed]="filtroEstado() === 'SUSPENSO'"
                (click)="filtroEstado.set('SUSPENSO')"
              >
                Suspensas
              </button>
              <button
                type="button"
                class="pill-btn"
                [attr.aria-pressed]="filtroEstado() === 'INCOMPLETA'"
                (click)="filtroEstado.set('INCOMPLETA')"
              >
                Incompletas
              </button>
            </div>

            <div class="stack">
              @for (empresa of empresasFiltradas(); track empresa.id) {
                <article class="item-card">
                  <div class="card-head">
                    <h4>{{ empresa.nome }}</h4>
                    <span
                      class="badge"
                      [class.badge-ok]="empresa.estado === 'ATIVO'"
                      [class.badge-danger]="empresa.estado === 'SUSPENSO'"
                      [class.badge-warn]="empresa.estado !== 'ATIVO' && empresa.estado !== 'SUSPENSO'"
                    >
                      <span class="sr-only">Estado: </span>{{ empresa.estado }}
                    </span>
                  </div>
                  <div class="meta-row">
                    <span class="mono-chip" [title]="empresa.id">
                      <span class="sr-only">{{ empresa.id }}</span>{{ idCurto(empresa.id) }}
                    </span>
                  </div>
                  <div class="domain-chips">
                    @for (dom of empresa.dominios; track dom) {
                      <span class="badge badge-neutral">{{ dom }}</span>
                    } @empty {
                      <span class="hint">Nenhum domínio cadastrado</span>
                    }
                  </div>
                  <div class="meta-actions">
                    <button
                      type="button"
                      hlmBtn
                      variant="outline"
                      (click)="copiarId(empresa.id)"
                    >
                      Copiar ID
                    </button>
                    <button
                      type="button"
                      hlmBtn
                      variant="outline"
                      (click)="selecionarEmpresa(empresa, empresaId)"
                    >
                      Selecionar
                    </button>
                  </div>
                </article>
              } @empty {
                <p class="hint">
                  {{ empresas().length ? 'Nenhuma empresa corresponde ao filtro.' : 'Nenhuma empresa nesta página.' }}
                </p>
              }
            </div>

            <nav class="paginacao" aria-label="Páginas de empresas">
              <button
                type="button"
                hlmBtn
                variant="outline"
                (click)="carregar(pagina() - 1)"
                [disabled]="ocupado() || pagina() === 0"
              >
                Página anterior
              </button>
              <span>Página {{ pagina() + 1 }}</span>
              <button
                type="button"
                hlmBtn
                variant="outline"
                (click)="carregar(pagina() + 1)"
                [disabled]="ocupado() || empresas().length < 50"
              >
                Próxima página
              </button>
            </nav>
          </section>
        </div>

        <app-provisionamento />

        <p class="env-footnote">Não há operação comercial neste ambiente.</p>
      }
    </section>
  `,
})
export class PlataformaComponent {
  readonly sessao = inject(PlataformaSessaoService);
  readonly ocupado = signal(false);
  readonly saidaPendente = signal(false);
  readonly erro = signal('');
  readonly mensagem = signal('');
  readonly empresas = signal<EmpresaSaas[]>([]);
  readonly pagina = signal(0);
  readonly senhaInvalida = signal(false);
  readonly selecionada = signal<EmpresaSaas | null>(null);
  readonly consultaObrigatoria = signal(false);
  readonly filtroEstado = signal<'TODOS' | 'ATIVO' | 'SUSPENSO' | 'INCOMPLETA'>('TODOS');
  readonly termoBusca = signal('');
  readonly empresasFiltradas = computed(() => {
    const estado = this.filtroEstado();
    const termo = this.termoBusca().trim().toLowerCase();
    return this.empresas().filter((e) => {
      const okEstado = estado === 'TODOS' || e.estado === estado;
      const okTermo =
        !termo ||
        e.nome.toLowerCase().includes(termo) ||
        e.id.toLowerCase().includes(termo) ||
        e.dominios.some((d) => d.toLowerCase().includes(termo));
      return okEstado && okTermo;
    });
  });
  private geracao = 0;
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  constructor() {
    effect(() => {
      if (!this.sessao.autenticado()) {
        this.geracao++;
        this.empresas.set([]);
        this.pagina.set(0);
        this.selecionada.set(null);
        this.consultaObrigatoria.set(false);
        this.filtroEstado.set('TODOS');
        this.termoBusca.set('');
        this.mensagem.set('');
      }
    });
    void this.iniciar();
  }

  idCurto(id: string): string {
    return '#' + id.slice(0, 8) + '…' + id.slice(-4);
  }

  copiarId(id: string): void {
    try {
      void navigator.clipboard?.writeText(id);
    } catch {
      /* Clipboard indisponível em contexto restrito. */
    }
    this.mensagem.set('Identificador copiado: ' + this.idCurto(id));
  }

  selecionarEmpresa(empresa: EmpresaSaas, input: HTMLInputElement): void {
    input.value = empresa.id;
    void this.consultar(new Event('submit'), empresa.id);
  }

  private async iniciar(): Promise<void> {
    this.ocupado.set(true);
    try {
      await this.sessao.restaurar();
      if (this.sessao.autenticado()) await this.listar(0);
    } catch (e) {
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async entrar(event: Event, email: string, campoSenha: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado() || this.saidaPendente()) return;
    this.ocupado.set(true);
    this.erro.set('');
    const senha = campoSenha.value;
    campoSenha.value = '';
    try {
      await this.sessao.entrar(email, senha);
      await this.listar(0);
    } catch (e) {
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async sair(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    this.saidaPendente.set(true);
    this.geracao++;
    this.empresas.set([]);
    try {
      await this.sessao.sair();
      this.saidaPendente.set(false);
      setTimeout(() => this.emailInput?.nativeElement.focus());
    } catch (e) {
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async carregar(pagina: number): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      await this.listar(pagina);
    } catch (e) {
      this.mensagem.set('Consulta não atualizada. Os dados anteriores podem estar desatualizados.');
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async consultar(event: Event, id: string): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    const geracao = this.geracao;
    try {
      const empresa = await this.sessao.empresa(id);
      if (geracao === this.geracao && this.sessao.autenticado()) {
        this.selecionada.set(empresa);
        this.empresas.update((lista) => lista.map((e) => (e.id === empresa.id ? empresa : e)));
        this.consultaObrigatoria.set(false);
        this.mensagem.set('Estado comercial consultado. Confira a versão antes de alterar.');
      }
    } catch (e) {
      this.consultaObrigatoria.set(true);
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async confirmar(event: Event, campo: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    const senha = campo.value;
    campo.value = '';
    try {
      await this.sessao.reautenticar(senha);
      this.mensagem.set('Senha confirmada por cinco minutos nesta sessão SaaS.');
    } catch (e) {
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async alterar(event: Event, empresa: EmpresaSaas, motivo: string): Promise<void> {
    event.preventDefault();
    if (this.ocupado() || this.consultaObrigatoria()) return;
    this.ocupado.set(true);
    this.erro.set('');
    const geracao = this.geracao;
    this.mensagem.set('Alteração comercial em andamento…');
    try {
      const atual = await this.sessao.alterarEstado(
        empresa,
        empresa.estado === 'ATIVO' ? 'SUSPENSO' : 'ATIVO',
        motivo,
      );
      if (geracao !== this.geracao || !this.sessao.autenticado()) return;
      this.selecionada.set(atual);
      this.empresas.update((lista) => lista.map((e) => (e.id === atual.id ? atual : e)));
      this.mensagem.set('Estado comercial atualizado. Acesso empresarial preservado.');
    } catch (e) {
      this.senhaInvalida.set(false);
      this.consultaObrigatoria.set(true);
      this.mensagem.set(
        'Resultado da escrita não reconciliado. Consulte a empresa antes de tentar novamente.',
      );
      this.erro.set(
        (e instanceof Error && !(e instanceof TypeError) ? e.message + ' ' : '') +
          'A alteração pode ter sido aplicada. Consulte o estado pelo identificador; não há reenvio automático.',
      );
      setTimeout(() => this.alerta?.nativeElement.focus());
    } finally {
      this.ocupado.set(false);
    }
  }

  private async listar(pagina: number): Promise<void> {
    const geracao = this.geracao;
    const empresas = await this.sessao.empresas(pagina);
    if (geracao !== this.geracao || !this.sessao.autenticado()) return;
    this.empresas.set(empresas);
    this.pagina.set(pagina);
    this.mensagem.set(empresas.length ? 'Consulta atualizada.' : 'Nenhuma empresa nesta página.');
  }

  private falhar(e: unknown): void {
    this.senhaInvalida.set(
      e instanceof ApiFailure && e.status === 422 && e.codigo === 'CONFIRMACAO_INVALIDA',
    );
    this.erro.set(
      e instanceof TypeError
        ? 'Sem conexão. Nenhuma operação foi confirmada.'
        : e instanceof Error && ['TimeoutError', 'AbortError'].includes(e.name)
          ? 'A resposta não chegou no prazo. Consulte o estado antes de repetir.'
          : e instanceof Error
            ? e.message
            : 'Não foi possível concluir.',
    );
    setTimeout(() => this.alerta?.nativeElement.focus());
  }
}

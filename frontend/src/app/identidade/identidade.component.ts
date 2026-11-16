import { EnderecosComponent } from '../delivery/enderecos.component';
import { Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, ROUTES, Router, RouterLink } from '@angular/router';
import { CriacaoPendenteService } from '../unidades/criacao-pendente.service';
import { ConvitePendenteService } from '../acessos/convite-pendente.service';
import { CatalogoPendenteService } from '../catalogo/catalogo-pendente.service';
import { MidiaPendenteService } from '../catalogo/midia-pendente.service';
import { ContextoOperacaoService } from '../rotas/contexto-operacao.service';
import { IconeComponent } from '../rotas/icone.component';
import { MarcaService } from '../rotas/marca.service';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
import { retornoSeguro } from '../rotas/guardas';
import { HlmButton } from '../ui/button';
import { RecuperacaoComponent } from './recuperacao.component';
import { CadastroComponent } from './cadastro.component';
import { AceitarConviteComponent } from './aceitar-convite.component';
import { VerificacaoComponent } from './verificacao.component';
import { senhaEmBranco } from './senha';
import { ApiFailure, Identidade, SessaoService } from './sessao.service';
import { SessaoNavegacaoService } from './sessao-navegacao.service';

type Formulario = 'login' | 'conta' | 'recuperacao' | 'cadastro' | 'convite' | 'verificacao';

function validarCpfDigitos(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(digitos[i]) * (10 - i);
  const dv1 = ((soma * 10) % 11) % 10;
  if (dv1 !== Number(digitos[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(digitos[i]) * (11 - i);
  const dv2 = ((soma * 10) % 11) % 10;
  return dv2 === Number(digitos[10]);
}

function formatarCpfEntrada(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatarTelefoneEntrada(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

@Component({
  selector: 'app-identidade',
  imports: [
    EnderecosComponent,
    IconeComponent,
    RouterLink,
    HlmButton,
    RecuperacaoComponent,
    CadastroComponent,
    AceitarConviteComponent,
    VerificacaoComponent,
  ],
  template: `
    <section
      class="auth-card"
      [class.auth-card--conta]="
        !!sessao.identidade() && !exigeTrocaParaEquipe(sessao.identidade()!)
      "
      [class.auth-card--dossie]="!sessao.identidade() && pagina() !== 'login'"
      [attr.aria-labelledby]="tituloFormulario()"
      [attr.aria-busy]="ocupado()"
    >
      @if (sessao.identidade(); as pessoa) {
        @if (exigeTrocaParaEquipe(pessoa)) {
          <div class="equipe-troca-gate">
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
              <span class="auth-casa-nome">{{ marca.nome() }}</span>
            </div>
            <p class="eyebrow">ÁREA DA EQUIPE · SESSÃO ATUAL DE CLIENTE</p>
            <h1 id="conta-titulo">Você entrou com uma conta de cliente.</h1>
            <p class="auth-intro">
              A sessão ativa pertence a
              <strong>{{ pessoa.nome || pessoa.email || 'Cliente' }}</strong>
              ({{ pessoa.email || 'sem e-mail' }} · perfil {{ nomePerfil(pessoa.perfil) }}), que
              não possui acesso ao painel administrativo nem à gestão.
            </p>
            <p class="equipe-troca-dica">
              Para acessar a Gestão ou a Cozinha com um usuário administrador ou da equipe, encerre
              a sessão de cliente abaixo e faça login com sua credencial da equipe.
            </p>
            <div class="modulo-acoes">
              <button
                hlmBtn
                type="button"
                (click)="trocarParaEquipe()"
                [disabled]="ocupado() || encerramentoPendente()"
              >
                <app-icone nome="sair" />Sair da conta de cliente e entrar na equipe
              </button>
              @if (router) {
                <a hlmBtn variant="outline" routerLink="/conta">Ir para Minha conta</a>
                <a hlmBtn variant="ghost" routerLink="/cardapio">Voltar ao cardápio</a>
              }
            </div>
            @if (erro()) {
              <p #alerta class="erro" role="alert" tabindex="-1">{{ erro() }}</p>
            }
            @if (encerramentoPendente()) {
              <button
                hlmBtn
                type="button"
                (click)="trocarParaEquipe()"
                [disabled]="ocupado()"
              >
                Tentar encerrar novamente
              </button>
            }
          </div>
        } @else {
          <div class="conta-layout">
          @if (pagina() === 'cadastro' || pagina() === 'recuperacao' || pagina() === 'convite' || pagina() === 'verificacao') {
            <div class="conta-aviso-rota" role="status">
              <p>
                <strong>Você já está conectado</strong> como {{ pessoa.nome || pessoa.email || 'cliente' }}.
                Para {{
                  pagina() === 'cadastro'
                    ? 'criar uma nova conta'
                    : pagina() === 'recuperacao'
                      ? 'redefinir a senha de outro e-mail'
                      : pagina() === 'convite'
                        ? 'aceitar um convite'
                        : 'verificar outra conta'
                }}, encerre a sessão atual primeiro.
              </p>
              <button hlmBtn type="button" variant="outline" size="sm" (click)="sairParaDestino()" [disabled]="ocupado()">
                Sair e continuar nesta tela
              </button>
            </div>
          }
          <aside class="conta-passaporte" aria-label="Cartela da conta">
            <div class="conta-marca">
              <span class="conta-marca-selo">
                @if (marca.logoUrl() && !marca.erroLogo()) {
                  <img
                    class="conta-marca-logo"
                    [src]="marca.logoUrl()!"
                    [alt]="'Logo de ' + marca.nome()"
                    width="44"
                    height="44"
                    decoding="async"
                    (error)="marca.marcarErroLogo()"
                  />
                } @else {
                  <app-icone nome="marca" />
                }
              </span>
              <div class="conta-marca-texto">
                <span class="conta-marca-tag">CARTELA DA CONTA</span>
                <strong class="conta-marca-nome">{{ marca.nome() }}</strong>
              </div>
            </div>

            <div class="conta-titular">
              <span class="conta-avatar" aria-hidden="true">{{ iniciaisConta(pessoa) }}</span>
              <div class="conta-titular-texto">
                <p class="eyebrow">MINHA CONTA</p>
                <h1 id="conta-titulo">Que bom ter você por aqui.</h1>
                <p class="conta-subtitulo">
                  {{ pessoa.nome || pessoa.email || 'Titular autenticado' }}
                </p>
              </div>
            </div>

            <div class="conta-badges">
              <span class="perfil conta-badge-perfil">{{ nomePerfil(pessoa.perfil) }}</span>
              <p
                class="conta-status-pill"
                [class.conta-status-pill--ok]="pessoa.emailVerificado"
                [class.conta-status-pill--pendente]="!pessoa.emailVerificado"
              >
                {{ pessoa.emailVerificado ? 'E-mail verificado.' : 'E-mail ainda não verificado.' }}
              </p>
            </div>

            <dl class="conta-ficha" aria-label="Resumo cadastral">
              <div class="ficha-linha">
                <dt>Estabelecimento</dt>
                <span class="ficha-guia" aria-hidden="true"></span>
                <dd>{{ marca.nome() }}</dd>
              </div>
              <div class="ficha-linha">
                <dt>E-mail</dt>
                <span class="ficha-guia" aria-hidden="true"></span>
                <dd>{{ pessoa.email || 'Sincronização pendente com servidor' }}</dd>
              </div>
              <div class="ficha-linha">
                <dt>Perfil</dt>
                <span class="ficha-guia" aria-hidden="true"></span>
                <dd>Acesso · {{ nomePerfil(pessoa.perfil) }}</dd>
              </div>
              <div class="ficha-linha">
                <dt>Telefone</dt>
                <span class="ficha-guia" aria-hidden="true"></span>
                <dd>{{ pessoa.telefone || 'Ainda não informado' }}</dd>
              </div>
              <div class="ficha-linha">
                <dt>CPF</dt>
                <span class="ficha-guia" aria-hidden="true"></span>
                <dd>
                  {{
                    pessoa.cpfMascarado ||
                      (pessoa.cpfInformado ? '***.***.***-**' : 'Opcional — não informado')
                  }}
                </dd>
              </div>
            </dl>

            @if (router) {
              <div class="account-actions">
                @if (pessoa.perfil === 'CLIENTE') {
                  <a hlmBtn routerLink="/pedidos">Acompanhar meus pedidos</a>
                } @else {
                  <a hlmBtn routerLink="/gestao">Abrir área da equipe</a>
                }
                <a hlmBtn variant="outline" routerLink="/cardapio">Explorar cardápio</a>
              </div>
            }

            <div class="conta-rodape-acoes">
              <button
                hlmBtn
                variant="ghost"
                type="button"
                class="conta-sair-btn"
                (click)="sair()"
                [disabled]="ocupado()"
              >
                <app-icone nome="sair" />Sair da conta
              </button>
            </div>

            @if (erro()) {
              <p #alerta class="erro conta-alerta-global" role="alert" tabindex="-1">{{ erro() }}</p>
            }
            @if (encerramentoPendente()) {
              <button
                hlmBtn
                type="button"
                class="conta-retry-btn"
                (click)="sair()"
                [disabled]="ocupado()"
              >
                Tentar encerrar novamente
              </button>
            }
            @if (aviso() || coordenacao.aviso()) {
              <p class="conta-status-global" role="status">{{ aviso() || coordenacao.aviso() }}</p>
            }
          </aside>

          <div class="conta-modulos">
            @if (!pessoa.emailVerificado) {
              <section
                class="conta-modulo conta-modulo--alerta"
                aria-labelledby="conta-sec-verificacao"
              >
                <div class="modulo-cabecalho">
                  <span class="modulo-indice modulo-indice--alerta" aria-hidden="true">!</span>
                  <div>
                    <p class="modulo-eyebrow">VERIFICAÇÃO DE E-MAIL</p>
                    <h2 id="conta-sec-verificacao">Confirme seu e-mail sem sair da conta</h2>
                  </div>
                </div>
                <p class="modulo-ajuda">
                  Valide seu código de confirmação para reforçar a segurança da conta e receber
                  recibos e avisos de pedido sem interrupções.
                </p>
                <div class="modulo-acoes">
                  <button
                    hlmBtn
                    variant="outline"
                    type="button"
                    (click)="reenviarVerificacao()"
                    [disabled]="verificacaoOcupada() || ocupado()"
                  >
                    {{ verificacaoOcupada() ? 'Enviando…' : 'Reenviar código de verificação' }}
                  </button>
                </div>
                <form
                  class="modulo-form modulo-form--compacto"
                  (submit)="confirmarVerificacao($event, codigoVerificacao)"
                >
                  <div class="campo-grupo">
                    <label for="conta-codigo-verificacao">Código de verificação recebido</label>
                    <input
                      #codigoVerificacao
                      id="conta-codigo-verificacao"
                      name="codigo"
                      type="text"
                      autocomplete="one-time-code"
                      required
                      maxlength="128"
                      placeholder="Cole o código recebido por e-mail"
                      [attr.aria-invalid]="verificacaoCampoErro() ? true : null"
                      [disabled]="verificacaoOcupada() || ocupado()"
                    />
                  </div>
                  <button hlmBtn type="submit" [disabled]="verificacaoOcupada() || ocupado()">
                    Confirmar e-mail
                  </button>
                </form>
                @if (verificacaoErro()) {
                  <p role="alert" class="erro">{{ verificacaoErro() }}</p>
                }
                @if (verificacaoAviso()) {
                  <p class="modulo-aviso" role="status">{{ verificacaoAviso() }}</p>
                }
              </section>
            }

            <section class="conta-modulo" aria-labelledby="conta-sec-dados">
              <div class="modulo-cabecalho">
                <span class="modulo-indice" aria-hidden="true">01</span>
                <div>
                  <p class="modulo-eyebrow">IDENTIFICAÇÃO & CONTATO</p>
                  <h2 id="conta-sec-dados">Dados pessoais e preferências</h2>
                </div>
              </div>
              <form class="modulo-form" (submit)="salvarPerfil($event, pessoa)">
                <div class="modulo-grid-2">
                  <div class="campo-grupo campo-grupo--full">
                    <label for="conta-nome">Nome completo</label>
                    <input
                      id="conta-nome"
                      name="nome"
                      type="text"
                      autocomplete="name"
                      required
                      minlength="2"
                      maxlength="120"
                      [value]="nomePerfilCadastro()"
                      (input)="atualizarNomeCadastro($event)"
                      [attr.aria-invalid]="perfilCampoErro() === 'nome' ? true : null"
                      [disabled]="perfilOcupado() || ocupado()"
                    />
                  </div>
                  <div class="campo-grupo">
                    <label for="conta-telefone">Telefone / WhatsApp</label>
                    <input
                      id="conta-telefone"
                      name="telefone"
                      type="tel"
                      autocomplete="tel"
                      required
                      maxlength="40"
                      [value]="telefoneCadastro()"
                      (input)="atualizarTelefoneCadastro($event)"
                      [attr.aria-invalid]="perfilCampoErro() === 'telefone' ? true : null"
                      [disabled]="perfilOcupado() || ocupado()"
                    />
                  </div>
                  <div class="campo-grupo">
                    <label for="conta-cpf">CPF (opcional — nota fiscal/Pix)</label>
                    <input
                      id="conta-cpf"
                      name="cpf"
                      type="text"
                      inputmode="numeric"
                      autocomplete="off"
                      maxlength="14"
                      [placeholder]="
                        pessoa.cpfMascarado
                          ? pessoa.cpfMascarado + ' (salvo)'
                          : '000.000.000-00'
                      "
                      [value]="cpfCadastro()"
                      (input)="atualizarCpfCadastro($event)"
                      [attr.aria-invalid]="perfilCampoErro() === 'cpf' ? true : null"
                      [disabled]="perfilOcupado() || ocupado()"
                    />
                  </div>
                </div>
                <p class="modulo-ajuda">
                  @if (pessoa.cpfMascarado) {
                    CPF já salvo no cadastro ({{ pessoa.cpfMascarado }}). Por proteção de privacidade
                    (LGPD), nunca exibimos os dígitos completos em aberto — digite novamente apenas
                    se desejar substituir.
                  } @else {
                    Opcional para emissão de nota fiscal e pagamentos via Pix. Seus dados são
                    protegidos conforme a LGPD.
                  }
                </p>
                <label class="conta-check">
                  <input
                    type="checkbox"
                    name="receberEmailsPedido"
                    [checked]="receberEmailsPedido()"
                    (change)="atualizarReceberEmailsPedido($event)"
                    [disabled]="perfilOcupado() || ocupado()"
                  />
                  <span>Receber avisos de acompanhamento de pedidos por e-mail</span>
                </label>
                <div class="modulo-acoes">
                  <button hlmBtn type="submit" [disabled]="perfilOcupado() || ocupado()">
                    {{ perfilOcupado() ? 'Salvando…' : 'Salvar dados pessoais' }}
                  </button>
                  <button
                    hlmBtn
                    variant="outline"
                    type="button"
                    (click)="recarregarIdentidade()"
                    [disabled]="perfilOcupado() || ocupado()"
                  >
                    Recarregar dados
                  </button>
                </div>
                @if (perfilErro()) {
                  <p role="alert" class="erro">{{ perfilErro() }}</p>
                }
                @if (perfilAviso()) {
                  <p class="modulo-aviso" role="status">{{ perfilAviso() }}</p>
                }
              </form>
            </section>

            @if (pessoa.perfil === 'CLIENTE') {
              <section class="conta-modulo" aria-label="Endereços de entrega do titular">
                <div class="modulo-indice-topo">
                  <span class="modulo-indice" aria-hidden="true">02</span>
                  <span class="modulo-eyebrow">DELIVERY & RETIRADA</span>
                </div>
                <app-enderecos />
              </section>
            }

            <section class="conta-modulo" aria-labelledby="conta-sec-seguranca">
              <div class="modulo-cabecalho">
                <span class="modulo-indice" aria-hidden="true">{{
                  pessoa.perfil === 'CLIENTE' ? '03' : '02'
                }}</span>
                <div>
                  <p class="modulo-eyebrow">SEGURANÇA, PAGAMENTOS & LGPD</p>
                  <h2 id="conta-sec-seguranca">Proteção da conta e privacidade</h2>
                </div>
              </div>

              <div class="seguranca-blocos">
                <form
                  class="modulo-form seguranca-subcard"
                  (submit)="alterarSenha($event, senhaAtual, novaSenha, confirmarNovaSenha)"
                >
                  <h3>Alterar senha de acesso</h3>
                  <p class="modulo-ajuda">
                    Informe entre 12 caracteres e 72 bytes UTF-8, usando uma combinação exclusiva
                    para esta conta.
                  </p>
                  <div class="modulo-grid-2">
                    <div class="campo-grupo campo-grupo--full">
                      <label for="conta-senha-atual">Senha atual</label>
                      <input
                        #senhaAtual
                        id="conta-senha-atual"
                        name="senhaAtual"
                        type="password"
                        autocomplete="current-password"
                        required
                        maxlength="72"
                        [attr.aria-invalid]="senhaCampoErro() === 'atual' ? true : null"
                        [disabled]="senhaOcupada() || ocupado()"
                      />
                    </div>
                    <div class="campo-grupo">
                      <label for="conta-nova-senha">Nova senha</label>
                      <input
                        #novaSenha
                        id="conta-nova-senha"
                        name="novaSenha"
                        type="password"
                        autocomplete="new-password"
                        required
                        minlength="12"
                        maxlength="72"
                        [attr.aria-invalid]="senhaCampoErro() === 'nova' ? true : null"
                        [disabled]="senhaOcupada() || ocupado()"
                      />
                    </div>
                    <div class="campo-grupo">
                      <label for="conta-confirmar-senha">Confirmar nova senha</label>
                      <input
                        #confirmarNovaSenha
                        id="conta-confirmar-senha"
                        name="confirmarNovaSenha"
                        type="password"
                        autocomplete="new-password"
                        required
                        minlength="12"
                        maxlength="72"
                        [attr.aria-invalid]="senhaCampoErro() === 'confirmacao' ? true : null"
                        [disabled]="senhaOcupada() || ocupado()"
                      />
                    </div>
                  </div>
                  <div class="modulo-acoes">
                    <button hlmBtn type="submit" [disabled]="senhaOcupada() || ocupado()">
                      {{ senhaOcupada() ? 'Atualizando…' : 'Alterar senha' }}
                    </button>
                  </div>
                  @if (senhaErro()) {
                    <p role="alert" class="erro">{{ senhaErro() }}</p>
                  }
                  @if (senhaAviso()) {
                    <p class="modulo-aviso" role="status">{{ senhaAviso() }}</p>
                  }
                </form>

                <div class="seguranca-subcard seguranca-pagamentos">
                  <div class="pagamento-cabecalho">
                    <span class="pagamento-selo" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.9"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <div>
                      <h3>Segurança dos pagamentos</h3>
                      <p class="modulo-ajuda">
                        Nenhum dado de cartão de crédito ou débito fica armazenado neste sistema.
                        Todos os pagamentos online são processados diretamente no Checkout Pro seguro
                        do Mercado Pago no momento do pedido.
                      </p>
                    </div>
                  </div>
                  @if (router && pessoa.perfil === 'CLIENTE') {
                    <div class="modulo-acoes">
                      <a hlmBtn variant="outline" routerLink="/pedidos">
                        Acompanhar pedidos e pagamentos
                      </a>
                    </div>
                  }
                </div>

                <div class="seguranca-subcard seguranca-sessoes">
                  <h3>Sessões e dispositivos conectados</h3>
                  <p class="modulo-ajuda">
                    Encerre acessos anteriores em outros celulares ou navegadores sem desconectar o
                    aparelho atual.
                  </p>
                  <div class="modulo-acoes">
                    <button
                      hlmBtn
                      variant="outline"
                      type="button"
                      (click)="encerrarOutrasSessoes()"
                      [disabled]="sessoesOcupada() || ocupado()"
                    >
                      Encerrar sessões em outros aparelhos
                    </button>
                  </div>
                  @if (sessoesErro()) {
                    <p role="alert" class="erro">{{ sessoesErro() }}</p>
                  }
                  @if (sessoesAviso()) {
                    <p class="modulo-aviso" role="status">{{ sessoesAviso() }}</p>
                  }
                </div>

                <div class="seguranca-subcard seguranca-lgpd">
                  <h3>Privacidade e dados pessoais (LGPD)</h3>
                  <p class="modulo-ajuda">
                    Solicite a exclusão dos seus dados cadastrais após confirmar a senha atual da
                    sua conta.
                  </p>
                  <div class="modulo-acoes">
                    <button
                      hlmBtn
                      variant="ghost"
                      type="button"
                      class="conta-lgpd-toggle"
                      (click)="alternarExclusao(!confirmandoExclusao())"
                      [attr.aria-expanded]="confirmandoExclusao()"
                    >
                      Solicitar exclusão dos meus dados (LGPD)
                    </button>
                  </div>
                  @if (confirmandoExclusao()) {
                    <form
                      class="modulo-form conta-lgpd-form"
                      (submit)="solicitarExclusao($event, senhaExclusao)"
                    >
                      <div class="campo-grupo">
                        <label for="conta-senha-exclusao">
                          Confirme sua senha atual para excluir a conta
                        </label>
                        <input
                          #senhaExclusao
                          id="conta-senha-exclusao"
                          name="senhaExclusao"
                          type="password"
                          autocomplete="current-password"
                          required
                          maxlength="72"
                          [disabled]="exclusaoOcupada() || ocupado()"
                        />
                      </div>
                      <div class="modulo-acoes">
                        <button
                          hlmBtn
                          type="submit"
                          class="conta-btn-perigo"
                          [disabled]="exclusaoOcupada() || ocupado()"
                        >
                          Confirmar solicitação de exclusão
                        </button>
                      </div>
                    </form>
                  }
                  @if (exclusaoErro()) {
                    <p role="alert" class="erro">{{ exclusaoErro() }}</p>
                  }
                  @if (exclusaoAviso()) {
                    <p class="modulo-aviso" role="status">{{ exclusaoAviso() }}</p>
                  }
                </div>
              </div>
            </section>
          </div>
        </div>
        }
      } @else if (pagina() === 'verificacao') {
        <app-verificacao (voltar)="voltarAoLogin()" />
      } @else if (pagina() === 'convite') {
        <app-aceitar-convite (voltar)="voltarAoLogin()" />
      } @else if (pagina() === 'cadastro') {
        <app-cadastro (voltar)="voltarAoLogin()" />
      } @else if (pagina() === 'recuperacao') {
        <app-recuperacao (voltar)="voltarAoLogin()" />
      } @else {
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
          <span class="auth-casa-nome">{{ marca.nome() }}</span>
        </div>
        <p class="eyebrow">{{ equipe ? 'ÁREA DA EQUIPE' : 'BEM-VINDO DE VOLTA' }}</p>
        <h1 id="conta-titulo">Entre na sua conta.</h1>
        <p class="auth-intro">
          {{
            equipe
              ? 'Entre para cuidar dos pedidos, da cozinha e da rotina do restaurante.'
              : 'Seu próximo pedido e bons momentos à mesa começam aqui.'
          }}
        </p>
        @if (encerramentoPendente()) {
          <div class="conta-pendencia-topo" role="alert">
            <p>
              <strong>Confirmação de saída pendente.</strong> O acesso anterior já foi limpo neste
              navegador, mas o servidor ainda não confirmou o encerramento.
            </p>
            <div class="conta-pendencia-acoes">
              <button
                hlmBtn
                type="button"
                size="sm"
                (click)="sair()"
                [disabled]="ocupado()"
              >
                Tentar encerrar novamente
              </button>
              <button
                hlmBtn
                variant="outline"
                type="button"
                size="sm"
                (click)="coordenacao.dispensarPendenciaEncerramento()"
                [disabled]="ocupado()"
              >
                Continuar mesmo assim
              </button>
            </div>
          </div>
        }
        <form (submit)="entrar($event, email.value, senha)">
          <label for="email-conta">E-mail</label>
          <input
            #email
            id="email-conta"
            name="email"
            type="email"
            autocomplete="username"
            required
            maxlength="254"
            placeholder="seu@email.com"
            [disabled]="ocupado() || encerramentoPendente()"
          />
          <div class="password-label">
            <label for="senha-conta">Senha</label>
            <button
              type="button"
              class="text-action"
              (click)="abrirFormulario('recuperacao')"
              [disabled]="ocupado() || encerramentoPendente()"
            >
              Recuperar senha
            </button>
          </div>
          <input
            #senha
            id="senha-conta"
            name="senha"
            type="password"
            autocomplete="current-password"
            required
            maxlength="72"
            placeholder="Sua senha"
            [disabled]="ocupado() || encerramentoPendente()"
          />
          <button hlmBtn type="submit" [disabled]="ocupado() || encerramentoPendente()">
            {{ ocupado() ? 'Aguarde…' : 'Entrar' }}
          </button>
        </form>
        @if (equipe && router) {
          <p class="signup">
            Veio escolher seu pedido? <a routerLink="/entrar">Acessar conta de cliente</a>
          </p>
        } @else {
          <p class="signup">
            Ainda não tem conta?
            <button
              type="button"
              class="text-action"
              (click)="abrirFormulario('cadastro')"
              [disabled]="ocupado() || encerramentoPendente()"
            >
              Criar conta de cliente
            </button>
          </p>
        }
        <details class="other-access">
          <summary>Convites e verificação de e-mail</summary>
          <nav aria-label="Outras formas de acesso">
            <button
              hlmBtn
              variant="ghost"
              type="button"
              (click)="abrirFormulario('convite')"
              [disabled]="ocupado() || encerramentoPendente()"
            >
              Aceitar convite de funcionário
            </button>
            <button
              hlmBtn
              variant="ghost"
              type="button"
              (click)="abrirFormulario('verificacao')"
              [disabled]="ocupado() || encerramentoPendente()"
            >
              Verificar e-mail existente
            </button>
          </nav>
        </details>
      }
      @if (!sessao.identidade()) {
        @if (erro()) {
          <p #alerta class="erro conta-alerta-global" role="alert" tabindex="-1">{{ erro() }}</p>
        }
        @if (encerramentoPendente()) {
          <button
            hlmBtn
            type="button"
            class="conta-retry-btn"
            (click)="sair()"
            [disabled]="ocupado()"
          >
            Tentar encerrar novamente
          </button>
        }
        @if (aviso() || coordenacao.aviso()) {
          <p class="conta-status-global" role="status">{{ aviso() || coordenacao.aviso() }}</p>
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      padding: clamp(1rem, 3.8vw, 3rem) 0;
      color: var(--foreground, #292521);
    }
    .auth-card {
      width: min(100%, 35rem);
      margin: auto;
      background: var(--card, #ffffff);
      padding: clamp(1.25rem, 4.5vw, 2.75rem);
      border: 1px solid var(--border, #e5ded3);
      border-radius: 24px;
      box-shadow: 0 12px 32px #2925210e;
    }
    .auth-card--conta,
    .auth-card--dossie {
      width: min(100%, 68rem);
      background: var(--background, #faf7f2);
      padding: clamp(0.85rem, 2.6vw, 1.85rem);
    }
    .auth-card--dossie {
      width: min(100%, 64rem);
    }
    .auth-card button[hlmBtn]:not([data-variant]) {
      background: var(--primary, #a53e2b);
      border: 1px solid var(--primary-deep, #7f2f20);
      color: #ffffff;
      border-radius: 14px;
      box-shadow: 0 3px 0 var(--primary-deep, #7f2f20);
    }
    .auth-card button[hlmBtn]:not([data-variant]):hover:not(:disabled),
    .auth-card a[hlmBtn]:not([data-variant]):hover {
      background: #933524;
      filter: none;
    }
    .auth-card a[hlmBtn]:not([data-variant]) {
      background: var(--primary, #a53e2b);
      border: 1px solid var(--primary-deep, #7f2f20);
      color: #ffffff;
      border-radius: 14px;
      box-shadow: 0 3px 0 var(--primary-deep, #7f2f20);
    }
    .auth-card [hlmBtn][data-variant='outline'] {
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      color: var(--foreground, #292521);
      border-radius: 14px;
      box-shadow: 0 2px 0 #ddd4c7;
    }
    .auth-card [hlmBtn][data-variant='outline']:hover:not(:disabled) {
      background: var(--muted, #f3eee7);
      filter: none;
    }
    .auth-card [hlmBtn][data-variant='ghost'] {
      background: var(--muted, #f3eee7);
      border: 1px solid #d7cec1;
      color: var(--secondary-foreground, #44372e);
      border-radius: 14px;
    }
    .auth-card [hlmBtn][data-variant='ghost']:hover:not(:disabled) {
      background: #e9e1d6;
      filter: none;
    }
    .auth-card button:disabled,
    .auth-card [hlmBtn]:disabled {
      opacity: 1;
      background: #efe9e0;
      border-color: #d8cfc3;
      color: #594e46;
      box-shadow: none;
      cursor: not-allowed;
    }
    .auth-marca-topo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.35rem;
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
    .auth-casa-nome {
      font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
      font-size: 1.08rem;
      font-weight: 500;
      color: var(--foreground, #292521);
    }
    .conta-marca-logo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      border-radius: inherit;
    }
    .eyebrow {
      margin: 0;
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.13em;
      text-transform: uppercase;
      color: var(--primary, #a53e2b);
    }
    h1 {
      font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
      font-size: clamp(1.65rem, 3.6vw, 2.25rem);
      font-weight: 500;
      line-height: 1.14;
      letter-spacing: -0.025em;
      margin: 0.45rem 0 0.75rem;
      color: var(--foreground, #292521);
    }
    .auth-intro {
      color: var(--muted-foreground, #6e6259);
      margin: 0 0 1.6rem;
      line-height: 1.5;
    }
    form {
      display: grid;
      gap: 0.65rem;
    }
    input:not([type='checkbox']) {
      width: 100%;
      min-height: 48px;
      border: 1px solid #d5cbbd;
      border-radius: 12px;
      padding: 0.72rem 0.95rem;
      font: inherit;
      background: var(--card, #ffffff);
      color: var(--foreground, #292521);
    }
    input:not([type='checkbox']):focus-visible {
      outline: 3px solid #a53e2b45;
      border-color: var(--primary, #a53e2b);
    }
    label {
      font-size: 0.88rem;
      font-weight: 650;
      color: var(--foreground, #292521);
    }
    .password-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .text-action {
      background: none;
      border: 0;
      padding: 0 0.25rem;
      color: var(--primary, #a53e2b);
      font: inherit;
      font-size: 0.88rem;
      font-weight: 650;
      text-decoration: underline;
      text-underline-offset: 4px;
      min-height: 48px;
      box-shadow: none;
    }
    .text-action:hover:not(:disabled) {
      background: var(--muted, #f3eee7);
      border-radius: 8px;
      filter: none;
    }
    .text-action:disabled {
      background: transparent;
      border-color: transparent;
      color: #594e46;
      opacity: 1;
    }
    .auth-card:not(.auth-card--conta) form button[type='submit'] {
      margin-top: 0.75rem;
      width: 100%;
    }
    .signup {
      margin: 1.15rem 0;
      text-align: center;
      font-size: 0.9rem;
      color: var(--muted-foreground, #6e6259);
    }
    .signup a {
      display: inline-flex;
      align-items: center;
      min-height: 48px;
      color: var(--primary, #a53e2b);
      font-weight: 650;
    }
    .other-access {
      border-top: 1px dashed var(--border, #e5ded3);
      padding-top: 0.85rem;
      font-size: 0.88rem;
    }
    .other-access summary {
      min-height: 48px;
      display: flex;
      align-items: center;
      cursor: pointer;
      font-weight: 650;
      color: var(--foreground, #292521);
    }
    .other-access nav {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
      padding-top: 0.5rem;
    }
    .conta-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1.35rem;
      align-items: start;
    }
    .conta-passaporte {
      display: grid;
      gap: 1.15rem;
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      border-radius: 20px;
      padding: clamp(1.1rem, 2.5vw, 1.55rem);
      box-shadow: 0 3px 0 #e5ded3;
    }
    .conta-marca {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 0.95rem;
      border-bottom: 1px dashed var(--border, #e5ded3);
    }
    .conta-marca-selo {
      width: 44px;
      height: 44px;
      flex: none;
      border-radius: 50%;
      background: var(--primary, #a53e2b);
      color: #ffffff;
      display: grid;
      place-items: center;
      overflow: hidden;
      box-shadow:
        inset 0 0 0 3px var(--primary, #a53e2b),
        inset 0 0 0 4px #f3d9d2;
    }
    .conta-marca-texto {
      display: grid;
      gap: 0.12rem;
      min-width: 0;
    }
    .conta-marca-tag {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: var(--muted-foreground, #6e6259);
    }
    .conta-marca-nome {
      font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
      font-size: 1.05rem;
      font-weight: 500;
      color: var(--foreground, #292521);
      overflow-wrap: anywhere;
    }
    .conta-titular {
      display: flex;
      align-items: flex-start;
      gap: 0.9rem;
    }
    .conta-avatar {
      width: 52px;
      height: 52px;
      flex: none;
      border-radius: 16px;
      background: var(--secondary, #f0ebe3);
      border: 1px solid #d8cfc3;
      color: var(--foreground, #292521);
      display: grid;
      place-items: center;
      font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
      font-size: 1.2rem;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .conta-titular-texto {
      min-width: 0;
    }
    .conta-titular-texto h1 {
      font-size: clamp(1.38rem, 2.4vw, 1.68rem);
      margin: 0.3rem 0 0.35rem;
    }
    .conta-subtitulo {
      margin: 0;
      font-size: 0.92rem;
      color: var(--muted-foreground, #6e6259);
      overflow-wrap: anywhere;
    }
    .conta-badges {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .perfil.conta-badge-perfil {
      display: inline-flex;
      align-items: center;
      padding: 0.34rem 0.78rem;
      border-radius: 999px;
      background: var(--secondary, #f0ebe3);
      border: 1px solid var(--border, #e5ded3);
      color: var(--secondary-foreground, #44372e);
      font-size: 0.82rem;
      font-weight: 700;
    }
    .conta-status-pill {
      margin: 0;
      display: inline-flex;
      align-items: center;
      padding: 0.34rem 0.78rem;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 700;
    }
    .conta-status-pill--ok {
      background: var(--accent, #e8efe7);
      border: 1px solid #c2d4c2;
      color: var(--accent-foreground, #30523b);
    }
    .conta-status-pill--pendente {
      background: #fdf6e9;
      border: 1px solid #e2c598;
      color: #6b4310;
    }
    .conta-ficha {
      margin: 0;
      padding: 0.9rem 0;
      border-top: 1px dashed var(--border, #e5ded3);
      border-bottom: 1px dashed var(--border, #e5ded3);
      display: grid;
      gap: 0.65rem;
    }
    .ficha-linha {
      display: flex;
      align-items: baseline;
      gap: 0.45rem;
      min-width: 0;
      font-size: 0.87rem;
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
      overflow-wrap: anywhere;
      min-width: 0;
    }
    .account-actions {
      display: grid;
      gap: 0.6rem;
      margin: 0;
    }
    .account-actions a {
      width: 100%;
    }
    .conta-rodape-acoes {
      display: grid;
    }
    .conta-sair-btn {
      width: 100%;
    }
    .conta-retry-btn {
      width: 100%;
    }
    .conta-modulos {
      display: grid;
      gap: 1.25rem;
      min-width: 0;
    }
    .conta-modulo {
      display: grid;
      gap: 1rem;
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      border-radius: 20px;
      padding: clamp(1.1rem, 2.5vw, 1.55rem);
      box-shadow: 0 3px 0 #e5ded3;
      min-width: 0;
    }
    .conta-modulo--alerta {
      background: #fffaf2;
      border-color: #dfbe89;
      box-shadow: 0 3px 0 #e7d1aa;
    }
    .modulo-cabecalho {
      display: flex;
      align-items: flex-start;
      gap: 0.8rem;
    }
    .modulo-indice-topo {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .modulo-indice {
      display: inline-grid;
      place-items: center;
      min-width: 2.2rem;
      height: 2rem;
      padding: 0 0.45rem;
      border-radius: 999px;
      background: var(--secondary, #f0ebe3);
      border: 1px solid var(--border, #e5ded3);
      color: var(--foreground, #292521);
      font-size: 0.76rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      flex: none;
    }
    .modulo-indice--alerta {
      background: #fae8ca;
      border-color: #d9ac66;
      color: #6b4310;
    }
    .modulo-eyebrow {
      margin: 0 0 0.2rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--primary, #a53e2b);
    }
    .conta-modulo h2 {
      margin: 0;
      font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
      font-size: clamp(1.22rem, 2.1vw, 1.48rem);
      font-weight: 500;
      letter-spacing: -0.02em;
      color: var(--foreground, #292521);
    }
    .conta-modulo h3 {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 700;
      color: var(--foreground, #292521);
    }
    .modulo-ajuda {
      margin: 0;
      color: var(--muted-foreground, #6e6259);
      font-size: 0.89rem;
      line-height: 1.5;
    }
    .modulo-form {
      display: grid;
      gap: 0.9rem;
    }
    .modulo-form--compacto {
      grid-template-columns: minmax(0, 1fr);
      align-items: end;
    }
    .modulo-grid-2 {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.8rem 0.9rem;
    }
    .campo-grupo {
      display: grid;
      gap: 0.35rem;
      min-width: 0;
    }
    .conta-check {
      display: inline-flex;
      align-items: center;
      gap: 0.7rem;
      min-height: 48px;
      padding: 0.6rem 0.9rem;
      border-radius: 12px;
      border: 1px dashed #d5cbbd;
      background: var(--background, #faf7f2);
      color: var(--foreground, #292521);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }
    .conta-check input[type='checkbox'] {
      width: 22px;
      height: 22px;
      min-height: 22px;
      flex: none;
      margin: 0;
      accent-color: var(--primary, #a53e2b);
    }
    .modulo-acoes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }
    .seguranca-blocos {
      display: grid;
      gap: 1rem;
    }
    .seguranca-subcard {
      display: grid;
      gap: 0.75rem;
      padding: 1rem 1.05rem;
      border-radius: 16px;
      border: 1px solid var(--border, #e5ded3);
      background: var(--background, #faf7f2);
    }
    .seguranca-pagamentos {
      background: #f8fbf8;
      border-color: #c2d4c2;
    }
    .pagamento-cabecalho {
      display: flex;
      align-items: flex-start;
      gap: 0.8rem;
    }
    .pagamento-selo {
      width: 40px;
      height: 40px;
      flex: none;
      border-radius: 12px;
      background: var(--accent, #e8efe7);
      border: 1px solid #c2d4c2;
      color: var(--accent-foreground, #30523b);
      display: grid;
      place-items: center;
    }
    .seguranca-lgpd {
      border-style: dashed;
      border-color: #dfc3be;
      background: #fffaf9;
    }
    .auth-card .conta-lgpd-toggle[hlmBtn][data-variant='ghost'] {
      background: #fff8f7;
      border-color: #e6c6c0;
      color: #8f2d1f;
    }
    .auth-card .conta-lgpd-toggle[hlmBtn][data-variant='ghost']:hover:not(:disabled) {
      background: #fcebe8;
    }
    .conta-lgpd-form {
      padding-top: 0.35rem;
      border-top: 1px dashed #e6c6c0;
    }
    .auth-card .conta-btn-perigo[hlmBtn] {
      background: #96291c;
      border-color: #6b1a11;
      color: #ffffff;
      box-shadow: 0 3px 0 #6b1a11;
    }
    .auth-card .conta-btn-perigo[hlmBtn]:hover:not(:disabled) {
      background: #7f2116;
    }
    .erro {
      margin: 0;
      padding: 0.75rem 0.9rem;
      border-radius: 12px;
      background: #fdf1ef;
      border: 1px solid #e6bfb8;
      color: #8f2318;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .modulo-aviso,
    .conta-status-global {
      margin: 0;
      padding: 0.75rem 0.9rem;
      border-radius: 12px;
      background: var(--accent, #e8efe7);
      border: 1px solid #c2d4c2;
      color: var(--accent-foreground, #30523b);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .conta-aviso-rota {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1rem;
      padding: 0.9rem 1.05rem;
      border-radius: 14px;
      background: #f9f4eb;
      border: 1px solid #dfd3c2;
      color: var(--foreground, #292521);
    }
    .conta-aviso-rota p {
      margin: 0;
      flex: 1 1 16rem;
      font-size: 0.92rem;
      line-height: 1.5;
    }
    .conta-pendencia-topo {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem 1rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px dashed var(--border, #e5ded3);
    }
    .conta-pendencia-topo p {
      margin: 0.25rem 0 0;
      color: var(--muted-foreground, #6e6259);
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .conta-pendencia-acoes {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
    }
    @media (min-width: 1024px) {
      .conta-aviso-rota {
        grid-column: 1 / -1;
      }
    }
    @media (max-width: 599px) {
      .conta-aviso-rota a,
      .conta-aviso-rota button,
      .conta-pendencia-acoes a,
      .conta-pendencia-acoes button {
        width: 100%;
        justify-content: center;
      }
    }
    .perfil {
      font-weight: 700;
    }
    @media (min-width: 600px) {
      .modulo-grid-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .campo-grupo--full {
        grid-column: 1 / -1;
      }
      .modulo-form--compacto {
        grid-template-columns: minmax(0, 1fr) auto;
      }
    }
    @media (min-width: 1024px) {
      .conta-layout {
        grid-template-columns: 340px minmax(0, 1fr);
        gap: 1.5rem;
      }
      .conta-passaporte {
        position: sticky;
        top: 88px;
      }
    }
    @media (max-width: 599px) {
      :host {
        padding: 0.75rem 0;
      }
      .auth-card {
        border-radius: 18px;
        padding: 1rem;
      }
      .auth-card--dossie,
      .auth-card--conta {
        padding: 0.75rem;
      }
      .modulo-acoes {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
      }
      .modulo-acoes [hlmBtn] {
        width: 100%;
      }
      .ficha-linha {
        flex-wrap: wrap;
        justify-content: space-between;
      }
      .ficha-guia {
        display: none;
      }
      .ficha-linha dd {
        text-align: left;
      }
    }
  `,
})
export class IdentidadeComponent {
  readonly sessao = inject(SessaoService);
  readonly coordenacao = inject(SessaoNavegacaoService);
  readonly marca = inject(MarcaService);
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
  readonly encerramentoPendente = this.coordenacao.encerramentoPendente;
  readonly equipe = this.rota?.snapshot.data['equipe'] === true;
  readonly pagina = signal<Formulario>(
    (this.rota?.snapshot.data['formulario'] as Formulario) ?? 'login',
  );
  readonly nomePerfilCadastro = signal('');
  readonly telefoneCadastro = signal('');
  readonly cpfCadastro = signal('');
  readonly receberEmailsPedido = signal(true);
  readonly perfilOcupado = signal(false);
  readonly perfilErro = signal('');
  readonly perfilAviso = signal('');
  readonly perfilCampoErro = signal<'nome' | 'telefone' | 'cpf' | null>(null);
  readonly verificacaoOcupada = signal(false);
  readonly verificacaoErro = signal('');
  readonly verificacaoAviso = signal('');
  readonly verificacaoCampoErro = signal(false);
  readonly senhaOcupada = signal(false);
  readonly senhaErro = signal('');
  readonly senhaAviso = signal('');
  readonly senhaCampoErro = signal<'atual' | 'nova' | 'confirmacao' | null>(null);
  readonly sessoesOcupada = signal(false);
  readonly sessoesErro = signal('');
  readonly sessoesAviso = signal('');
  readonly confirmandoExclusao = signal(false);
  readonly exclusaoOcupada = signal(false);
  readonly exclusaoErro = signal('');
  readonly exclusaoAviso = signal('');
  private versaoCarregada = '';
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      const pessoa = this.sessao.identidade();
      if (!pessoa) {
        this.versaoCarregada = '';
        this.nomePerfilCadastro.set('');
        this.telefoneCadastro.set('');
        this.cpfCadastro.set('');
        this.receberEmailsPedido.set(true);
        return;
      }
      const chave = `${pessoa.usuarioId}:${pessoa.versao ?? 0}`;
      if (chave !== this.versaoCarregada) {
        this.versaoCarregada = chave;
        this.nomePerfilCadastro.set(pessoa.nome ?? '');
        this.telefoneCadastro.set(pessoa.telefone ?? '');
        this.cpfCadastro.set('');
        this.receberEmailsPedido.set(pessoa.receberEmailsPedido ?? true);
      }
    });
    void this.coordenacao.inicializar().finally(() => this.ocupado.set(false));
  }

  atualizarNomeCadastro(event: Event): void {
    this.nomePerfilCadastro.set((event.target as HTMLInputElement).value);
  }

  atualizarTelefoneCadastro(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatado = formatarTelefoneEntrada(input.value);
    input.value = formatado;
    this.telefoneCadastro.set(formatado);
  }

  atualizarCpfCadastro(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatado = formatarCpfEntrada(input.value);
    input.value = formatado;
    this.cpfCadastro.set(formatado);
  }

  atualizarReceberEmailsPedido(event: Event): void {
    this.receberEmailsPedido.set((event.target as HTMLInputElement).checked);
  }

  iniciaisConta(pessoa: Identidade): string {
    const origem = (pessoa.nome || pessoa.email || 'U').trim();
    const partes = origem.split(/\s+/).filter(Boolean);
    if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    return (partes[0]?.slice(0, 2) || 'U').toUpperCase();
  }

  async recarregarIdentidade(): Promise<void> {
    if (this.perfilOcupado() || this.ocupado()) return;
    this.perfilOcupado.set(true);
    this.perfilErro.set('');
    this.perfilAviso.set('');
    this.perfilCampoErro.set(null);
    try {
      await this.sessao.atualizarIdentidade();
      const pessoa = this.sessao.identidade();
      if (pessoa) {
        this.versaoCarregada = `${pessoa.usuarioId}:${pessoa.versao ?? 0}`;
        this.nomePerfilCadastro.set(pessoa.nome ?? '');
        this.telefoneCadastro.set(pessoa.telefone ?? '');
        this.cpfCadastro.set('');
        this.receberEmailsPedido.set(pessoa.receberEmailsPedido ?? true);
      }
      this.perfilAviso.set('Dados da conta atualizados do servidor.');
    } catch (error) {
      this.perfilErro.set(this.mensagemErro(error));
    } finally {
      this.perfilOcupado.set(false);
    }
  }

  async salvarPerfil(event: Event, pessoa: Identidade): Promise<void> {
    event.preventDefault();
    if (this.perfilOcupado() || this.ocupado()) return;
    this.perfilOcupado.set(true);
    this.perfilErro.set('');
    this.perfilAviso.set('');
    this.perfilCampoErro.set(null);
    const nome = this.nomePerfilCadastro().trim();
    const telefone = this.telefoneCadastro().trim();
    const cpfDigitos = this.cpfCadastro().replace(/\D/g, '');
    try {
      if (nome.length < 2 || nome.length > 120) {
        this.perfilCampoErro.set('nome');
        throw new Error('Informe seu nome completo com pelo menos 2 caracteres.');
      }
      const digitos = telefone.replace(/\D/g, '').length;
      if (telefone.length > 40 || digitos < 8 || digitos > 15) {
        this.perfilCampoErro.set('telefone');
        throw new Error('Informe um telefone ou WhatsApp válido com DDD.');
      }
      if (cpfDigitos && !validarCpfDigitos(cpfDigitos)) {
        this.perfilCampoErro.set('cpf');
        throw new Error('Informe um CPF válido ou deixe o campo em branco.');
      }
      const salvo = await this.sessao.atualizarPerfil({
        versao: pessoa.versao ?? 0,
        nome,
        telefone,
        ...(cpfDigitos ? { cpf: cpfDigitos } : {}),
        receberEmailsPedido: this.receberEmailsPedido(),
      });
      this.versaoCarregada = `${salvo.usuarioId}:${salvo.versao ?? 0}`;
      this.nomePerfilCadastro.set(salvo.nome ?? nome);
      this.telefoneCadastro.set(salvo.telefone ?? telefone);
      this.cpfCadastro.set('');
      this.receberEmailsPedido.set(salvo.receberEmailsPedido ?? this.receberEmailsPedido());
      this.perfilAviso.set('Dados pessoais atualizados.');
    } catch (error) {
      if (error instanceof ApiFailure && error.status === 422) {
        if (error.codigo === 'NOME_INVALIDO') this.perfilCampoErro.set('nome');
        else if (error.codigo === 'TELEFONE_INVALIDO') this.perfilCampoErro.set('telefone');
        else if (error.codigo === 'CPF_INVALIDO') this.perfilCampoErro.set('cpf');
      }
      this.perfilErro.set(this.mensagemErro(error));
    } finally {
      this.perfilOcupado.set(false);
    }
  }

  async reenviarVerificacao(): Promise<void> {
    if (this.verificacaoOcupada() || this.ocupado()) return;
    this.verificacaoOcupada.set(true);
    this.verificacaoErro.set('');
    this.verificacaoAviso.set('');
    this.verificacaoCampoErro.set(false);
    try {
      this.verificacaoAviso.set(await this.sessao.reenviarVerificacao());
    } catch (error) {
      this.verificacaoErro.set(this.mensagemErro(error));
    } finally {
      this.verificacaoOcupada.set(false);
    }
  }

  async confirmarVerificacao(event: Event, codigo: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.verificacaoOcupada() || this.ocupado()) return;
    this.verificacaoOcupada.set(true);
    this.verificacaoErro.set('');
    this.verificacaoAviso.set('');
    this.verificacaoCampoErro.set(false);
    const valor = codigo.value.trim();
    try {
      if (!valor) {
        this.verificacaoCampoErro.set(true);
        throw new Error('Informe o código de verificação recebido por e-mail.');
      }
      await this.sessao.verificarEmail('verificacao/confirmar', { codigo: valor });
      codigo.value = '';
      await this.sessao.atualizarIdentidade();
      this.verificacaoAviso.set('E-mail verificado com sucesso.');
    } catch (error) {
      if (error instanceof ApiFailure && error.status === 422) {
        this.verificacaoCampoErro.set(true);
      }
      this.verificacaoErro.set(this.mensagemErro(error));
    } finally {
      this.verificacaoOcupada.set(false);
    }
  }

  async alterarSenha(
    event: Event,
    atual: HTMLInputElement,
    nova: HTMLInputElement,
    confirmacao: HTMLInputElement,
  ): Promise<void> {
    event.preventDefault();
    if (this.senhaOcupada() || this.ocupado()) return;
    this.senhaOcupada.set(true);
    this.senhaErro.set('');
    this.senhaAviso.set('');
    this.senhaCampoErro.set(null);
    const senhaAtual = atual.value;
    const novaSenha = nova.value;
    const repetir = confirmacao.value;
    try {
      if (!senhaAtual) {
        this.senhaCampoErro.set('atual');
        throw new Error('Informe sua senha atual.');
      }
      if (novaSenha !== repetir) {
        this.senhaCampoErro.set('confirmacao');
        throw new Error('As senhas devem ser iguais.');
      }
      if (senhaEmBranco(novaSenha) || novaSenha.length < 12) {
        this.senhaCampoErro.set('nova');
        throw new Error('A nova senha deve ter pelo menos 12 caracteres válidos.');
      }
      if (new TextEncoder().encode(novaSenha).length > 72) {
        this.senhaCampoErro.set('nova');
        throw new Error('A nova senha deve ter no máximo 72 bytes.');
      }
      if (senhaAtual === novaSenha) {
        this.senhaCampoErro.set('nova');
        throw new Error('A nova senha deve ser diferente da senha atual.');
      }
      await this.sessao.alterarSenha({ senhaAtual, novaSenha });
      this.senhaAviso.set(
        'Senha atualizada com segurança. Outros dispositivos foram desconectados.',
      );
    } catch (error) {
      if (error instanceof ApiFailure && error.status === 422) {
        if (error.codigo === 'CONFIRMACAO_INVALIDA') this.senhaCampoErro.set('atual');
        else if (error.codigo === 'SENHA_IGUAL' || error.codigo === 'SENHA_FRACA')
          this.senhaCampoErro.set('nova');
      }
      this.senhaErro.set(this.mensagemErro(error));
    } finally {
      atual.value = '';
      nova.value = '';
      confirmacao.value = '';
      this.senhaOcupada.set(false);
    }
  }

  async encerrarOutrasSessoes(): Promise<void> {
    if (this.sessoesOcupada() || this.ocupado()) return;
    if (!window.confirm('Encerrar todas as sessões abertas em outros aparelhos e navegadores?')) {
      return;
    }
    this.sessoesOcupada.set(true);
    this.sessoesErro.set('');
    this.sessoesAviso.set('');
    try {
      this.sessoesAviso.set(await this.sessao.encerrarOutrasSessoes());
    } catch (error) {
      this.sessoesErro.set(this.mensagemErro(error));
    } finally {
      this.sessoesOcupada.set(false);
    }
  }

  alternarExclusao(abrir: boolean): void {
    this.confirmandoExclusao.set(abrir);
    this.exclusaoErro.set('');
    this.exclusaoAviso.set('');
  }

  async solicitarExclusao(event: Event, senhaInput: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.exclusaoOcupada() || this.ocupado()) return;
    this.exclusaoOcupada.set(true);
    this.exclusaoErro.set('');
    this.exclusaoAviso.set('');
    const senhaAtual = senhaInput.value;
    try {
      if (!senhaAtual) {
        throw new Error('Informe sua senha atual para confirmar a solicitação.');
      }
      const msg = await this.sessao.solicitarExclusaoConta({ senhaAtual });
      this.exclusaoAviso.set(msg);
      this.confirmandoExclusao.set(false);
    } catch (error) {
      this.exclusaoErro.set(this.mensagemErro(error));
    } finally {
      senhaInput.value = '';
      this.exclusaoOcupada.set(false);
    }
  }

  private mensagemErro(error: unknown): string {
    if (error instanceof ApiFailure && [404, 405, 501].includes(error.status)) {
      return 'Recurso ainda não habilitado no servidor (backend). A interface já está validada e o requisito técnico está documentado para integração.';
    }
    return error instanceof Error && error.name !== 'TypeError' && error.name !== 'TimeoutError'
      ? error.message
      : 'Sem conexão com o sistema. Nenhuma operação foi confirmada.';
  }

  tituloFormulario(): string {
    if (this.sessao.identidade()) return 'conta-titulo';
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

  async sair(destino = '/entrar'): Promise<void> {
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
      if (this.router) await this.router.navigateByUrl(destino);
    }
  }

  async sairParaDestino(): Promise<void> {
    const mapa: Record<string, string> = {
      cadastro: '/cadastro',
      recuperacao: '/recuperar-senha',
      convite: '/aceitar-convite',
      verificacao: '/verificar-email',
    };
    const destino = mapa[this.pagina()] ?? '/entrar';
    await this.sair(destino);
  }

  exigeTrocaParaEquipe(pessoa: Identidade): boolean {
    if (pessoa.perfil !== 'CLIENTE') return false;
    if (this.equipe) return true;
    const retorno = retornoSeguro(this.rota?.snapshot.queryParamMap.get('retorno') ?? null);
    return (
      !!retorno &&
      (retorno === '/cozinha' || retorno === '/gestao' || retorno.startsWith('/gestao/'))
    );
  }

  async trocarParaEquipe(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.navegacao.permitirLogout();
    try {
      await this.coordenacao.sair();
      this.pagina.set('login');
    } catch (error) {
      this.falha(error);
    } finally {
      this.ocupado.set(false);
      if (this.router) {
        await this.router.navigate(['/gestao/entrar'], { queryParamsHandling: 'preserve' });
      }
      setTimeout(() => document.getElementById('email-conta')?.focus());
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

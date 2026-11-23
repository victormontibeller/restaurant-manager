import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  NavigationSkipped,
  NavigationSkippedCode,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { SessaoNavegacaoService } from '../identidade/sessao-navegacao.service';
import { HlmButton } from '../ui/button';
import { ContextoOperacaoService } from './contexto-operacao.service';
import { IconeComponent } from './icone.component';
import { MarcaService } from './marca.service';
import { NavegacaoProtegidaService } from './navegacao-protegida.service';

import { AlternarTemaComponent } from '../ui/alternar-tema.component';
import { TemaService } from '../ui/tema.service';

@Component({
  selector: 'app-equipe-layout',
  imports: [
    CdkTrapFocus,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    HlmButton,
    IconeComponent,
    AlternarTemaComponent,
  ],
  templateUrl: './equipe-layout.component.html',
  styleUrl: './equipe-layout.css',
})
export class EquipeLayoutComponent {
  readonly contexto = inject(ContextoOperacaoService);
  readonly coordenacao = inject(SessaoNavegacaoService);
  readonly marca = inject(MarcaService);
  readonly navegacao = inject(NavegacaoProtegidaService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  readonly cozinha = this.rota.snapshot.data['cozinha'] === true;
  readonly tema = inject(TemaService).atual;
  readonly menuAberto = signal(false);
  @ViewChild('abrirMenu') abrirMenu?: ElementRef<HTMLButtonElement>;
  @ViewChild('painel') painel?: ElementRef<HTMLElement>;
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly pagina = signal<Record<string, unknown>>({});
  readonly titulo = computed(() =>
    String(this.pagina()['titulo'] ?? (this.cozinha ? 'Cozinha' : 'Pedidos')),
  );
  readonly autorizado = computed(() => {
    const pessoa = this.coordenacao.sessao.identidade();
    const dados = this.pagina();
    return (
      !!pessoa &&
      pessoa.perfil !== 'CLIENTE' &&
      (!dados['administrador'] || this.contexto.administrador()) &&
      (!this.cozinha || this.contexto.podeCozinha()) &&
      (!dados['expedicao'] || this.contexto.podeExpedicao()) &&
      (!dados['acao'] || this.contexto.tem(String(dados['acao'])))
    );
  });

  constructor() {
    this.atualizarPagina();
    const eventos = this.router.events.subscribe((evento) => {
      if (evento instanceof NavigationEnd) {
        this.atualizarPagina();
        this.menuAberto.set(false);
        this.painel?.nativeElement.scrollTo(0, 0);
      } else if (
        evento instanceof NavigationSkipped &&
        evento.code === NavigationSkippedCode.IgnoredSameUrlNavigation
      ) {
        this.fecharMenu();
      }
    });
    this.contexto.ativar();
    effect(() => {
      if (this.coordenacao.pronta() && !this.coordenacao.sessao.identidade()) {
        this.navegacao.permitirLogout();
        void this.router.navigate(['/entrar'], { queryParams: { retorno: this.router.url } });
      }
    });
    inject(DestroyRef).onDestroy(() => {
      eventos.unsubscribe();
      this.contexto.desativar();
    });
  }

  @HostListener('window:resize') ajustarMenu(): void {
    if (this.menuAberto() && !window.matchMedia('(max-width: 800px)').matches)
      this.menuAberto.set(false);
  }

  alternarMenu(): void {
    if (this.menuAberto()) {
      this.fecharMenu();
      return;
    }
    this.menuAberto.set(true);
    requestAnimationFrame(() => {
      if (this.menuAberto())
        this.elemento.nativeElement.querySelector<HTMLElement>('.sidebar a')?.focus();
    });
  }

  @HostListener('document:keydown.escape') fecharMenu(): void {
    if (!this.menuAberto()) return;
    this.menuAberto.set(false);
    setTimeout(() => this.abrirMenu?.nativeElement.focus());
  }

  selecionarUnidade(id: string): void {
    if (!this.navegacao.impedirSaida()) this.contexto.selecionarUnidade(id);
  }

  async sair(): Promise<void> {
    this.navegacao.permitirLogout();
    try {
      await this.coordenacao.sair();
    } catch {
      /* A tela de acesso conserva a opção de repetir a saída. */
    }
    await this.router.navigateByUrl('/entrar');
  }

  private atualizarPagina(): void {
    // Durante a criação do layout, o ActivatedRoute do filho ainda não foi ativado.
    // A árvore de snapshots já contém os dados reconhecidos da navegação inteira.
    let snapshot = this.rota.snapshot;
    while (snapshot.firstChild) snapshot = snapshot.firstChild;
    this.pagina.set(snapshot.data);
  }
}

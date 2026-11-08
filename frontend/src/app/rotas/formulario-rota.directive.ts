import { DestroyRef, Directive, ElementRef, HostListener, inject, input } from '@angular/core';
import { NavegacaoProtegidaService } from './navegacao-protegida.service';

@Directive({ selector: '[appFormularioRota]', exportAs: 'formularioRota' })
export class FormularioRotaDirective {
  readonly appFormularioRota = input<'' | 'marcados'>('');
  private readonly navegacao = inject(NavegacaoProtegidaService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly chave = 'formulario-' + crypto.randomUUID();
  private readonly grupos = new Set<HTMLElement>();
  constructor() {
    this.navegacao.registrarRascunho(this.chave, () => {
      for (const grupo of this.grupos) if (!grupo.isConnected) this.grupos.delete(grupo);
      return this.grupos.size > 0;
    });
    inject(DestroyRef).onDestroy(() => this.navegacao.retirarRascunho(this.chave));
  }
  marcarAlterado(chave: string): void {
    for (const grupo of this.elemento.nativeElement.querySelectorAll<HTMLElement>(
      '[data-rascunho]',
    ))
      if (grupo.dataset['rascunho'] === chave) this.grupos.add(grupo);
  }
  confirmarSalvo(chave?: string): void {
    for (const grupo of this.grupos)
      if (!chave || grupo.dataset['rascunho'] === chave) this.grupos.delete(grupo);
  }
  @HostListener('input', ['$event']) @HostListener('change', ['$event']) alterar(
    event: Event,
  ): void {
    const campo = event.target;
    if (!(
      campo instanceof HTMLInputElement ||
      campo instanceof HTMLTextAreaElement ||
      campo instanceof HTMLSelectElement
    ))
      return;
    if (campo instanceof HTMLInputElement && ['search', 'password'].includes(campo.type)) return;
    if (campo.closest('[data-sem-rascunho]')) return;
    const marcado = campo.closest<HTMLElement>('[data-rascunho]');
    if (this.appFormularioRota() === 'marcados' && !marcado) return;
    const grupo =
      marcado ??
      campo.closest<HTMLElement>(
        'form,app-produto-editor,app-categoria-editor,app-oferta-unidade,app-midia-editor',
      );
    if (grupo) this.grupos.add(grupo);
  }
}

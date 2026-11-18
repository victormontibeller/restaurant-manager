import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icone',
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="desenho()"/></svg>`,
  styles: `:host{display:inline-flex;width:21px;height:21px;flex:none}svg{width:100%;height:100%}`,
})
export class IconeComponent {
  readonly nome = input('menu');
  desenho(): string {
    return (
      (
        {
          marca: 'M4 3v5a3 3 0 0 0 6 0V3M7 3v18M20 21V3c-5 3-5 10 0 10',
          cardapio:
            'M4 4h6a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H4zM13 7a3 3 0 0 1 3-3h4v14h-4a3 3 0 0 0-3 3',
          sacola: 'M5 7h14l1 14H4zM9 8V6a3 3 0 0 1 6 0v2',
          pedidos: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h3',
          conta: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
          mesas:
            'M4 10.5h16v2.2H4zM6.5 12.7v6.8M17.5 12.7v6.8M12 12.7v6.8M9 6.5h6M12 6.5v4M3 14v5.5M21 14v5.5',
          cozinha: 'M7 14a5 5 0 0 1-2-9 4 4 0 0 1 7-2 4 4 0 0 1 7 2 5 5 0 0 1-2 9v6H7zM7 16h10',
          equipe:
            'M10 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0M20 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0M1 20v-2a6 6 0 0 1 12 0v2M13 14a6 6 0 0 1 10 4v2',
          unidade: 'M3 21V3h13v18M16 9h5v12M1 21h22M6 7h2M11 7h2M6 11h2M11 11h2M8 21v-5h3v5',
          relogio: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',
          atualizacoes: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
          seta: 'M5 12h14M14 7l5 5-5 5',
          sair: 'M9 3H4v18h5M10 12h11M17 8l4 4-4 4',
          menu: 'M4 6h16M4 12h16M4 18h16',
          fechar: 'M6 6l12 12M18 6 6 18',
          lua: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
          sol: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
        } as Record<string, string>
      )[this.nome()] ?? 'M4 6h16M4 12h16M4 18h16'
    );
  }
}

import { Component, input, signal } from '@angular/core';
import { FilaOperacionalComponent } from './fila-operacional.component';

@Component({
  selector: 'app-pendencias-pagamento',
  imports: [FilaOperacionalComponent],
  styleUrl: '../relatorios/painel-financeiro.css',
  templateUrl: './pendencias.component.html',
})
export class PendenciasPagamentoComponent {
  readonly unidadeId = input.required<string>();
  readonly aba = signal<'pagamentos' | 'notificacoes'>('pagamentos');
}

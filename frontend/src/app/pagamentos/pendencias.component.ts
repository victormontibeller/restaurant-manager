import { Component, input } from '@angular/core';
import { FilaOperacionalComponent } from './fila-operacional.component';

@Component({
  selector: 'app-pendencias-pagamento',
  imports: [FilaOperacionalComponent],
  styleUrl: '../operacao.css',
  templateUrl: './pendencias.component.html',
})
export class PendenciasPagamentoComponent {
  readonly unidadeId = input.required<string>();
}

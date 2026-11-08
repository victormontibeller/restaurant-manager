import { Component, DestroyRef, Directive, inject } from '@angular/core';
import { AcessosComponent } from '../acessos/acessos.component';
import { ConvitesComponent } from '../acessos/convites.component';
import { GestaoCatalogoComponent } from '../catalogo/gestao-catalogo.component';
import { VitrineComponent } from '../catalogo/vitrine.component';
import { CozinhaComponent } from '../cozinha/cozinha.component';
import { MesasComponent } from '../mesas/mesas.component';
import { OperacaoPedidosComponent } from '../pedidos/operacao-pedidos.component';
import { EventosUnidadeComponent } from '../unidades/eventos-unidade.component';
import { PrazosAceiteComponent } from '../unidades/prazos-aceite.component';
import { UnidadesComponent } from '../unidades/unidades.component';
import { ContextoOperacaoService } from './contexto-operacao.service';
import { FormularioRotaDirective } from './formulario-rota.directive';
import { NavegacaoProtegidaService } from './navegacao-protegida.service';

@Directive()
abstract class PaginaProtegida {
  readonly contexto = inject(ContextoOperacaoService);
  private readonly navegacao = inject(NavegacaoProtegidaService);
  private readonly chave = 'pagina-' + crypto.randomUUID();
  constructor() {
    inject(DestroyRef).onDestroy(() => this.navegacao.liberar(this.chave));
  }
  bloquear(valor: boolean): void {
    this.navegacao.bloquear(this.chave, valor);
  }
}

@Component({
  selector: 'app-pagina-operacao',
  imports: [OperacaoPedidosComponent],
  template: `<app-operacao-pedidos [unidadeExterna]="contexto.unidadeId()" [acoesExternas]="contexto.acoes()" [administradorExterno]="contexto.administrador()" [navegacaoInterna]="false" areaInicial="pedidos"/>`,
})
export class PaginaOperacaoComponent extends PaginaProtegida {}

@Component({
  selector: 'app-pagina-mesas',
  imports: [MesasComponent],
  template: `@if(contexto.unidadeId()){ @for(unidade of [contexto.unidadeId()];track unidade){<app-mesas [unidadeId]="unidade" [acoes]="contexto.acoes()" [administrador]="contexto.administrador()"/>} }@else{<p role="status">Selecione uma unidade para acompanhar as mesas.</p>}`,
})
export class PaginaMesasComponent extends PaginaProtegida {}

@Component({
  selector: 'app-pagina-cozinha',
  imports: [CozinhaComponent],
  template: `@if(contexto.unidadeId()){ @for(unidade of [contexto.unidadeId()];track unidade){<app-cozinha [unidadeId]="unidade" [acoes]="contexto.acoes()"/>} }@else{<p role="status">Selecione uma unidade para acompanhar o preparo.</p>}`,
})
export class PaginaCozinhaComponent extends PaginaProtegida {}

@Component({
  selector: 'app-pagina-catalogo',
  imports: [GestaoCatalogoComponent, FormularioRotaDirective],
  template: `<div appFormularioRota #rascunho="formularioRota"><app-gestao-catalogo (bloqueio)="bloquear($event)" (salvo)="rascunho.confirmarSalvo($event)" (rascunhoAlterado)="rascunho.marcarAlterado($event)"/></div>`,
})
export class PaginaCatalogoComponent extends PaginaProtegida {}

@Component({
  selector: 'app-pagina-equipe',
  imports: [AcessosComponent, FormularioRotaDirective],
  template: `<div appFormularioRota="marcados" #rascunho="formularioRota"><app-acessos (bloqueio)="bloquear($event)" (salvo)="rascunho.confirmarSalvo($event)"/></div>`,
})
export class PaginaEquipeComponent extends PaginaProtegida {}

@Component({
  selector: 'app-pagina-convites',
  imports: [ConvitesComponent, FormularioRotaDirective],
  template: `<div appFormularioRota="marcados" #rascunho="formularioRota"><app-convites (bloqueio)="bloquear($event)" (salvo)="rascunho.confirmarSalvo($event)"/></div>`,
})
export class PaginaConvitesComponent extends PaginaProtegida {}

@Component({
  selector: 'app-pagina-unidades',
  imports: [UnidadesComponent, FormularioRotaDirective],
  template: `<div appFormularioRota="marcados" #rascunho="formularioRota"><app-unidades (bloqueio)="bloquear($event)" (salvo)="rascunho.confirmarSalvo($event)"/></div>`,
})
export class PaginaUnidadesComponent extends PaginaProtegida {}

@Component({
  selector: 'app-pagina-prazos',
  imports: [PrazosAceiteComponent, FormularioRotaDirective],
  template: `@if(contexto.unidadeId()){@for(unidade of [contexto.unidadeId()];track unidade){<div appFormularioRota="marcados" #rascunho="formularioRota"><app-prazos-aceite [unidadeId]="unidade" (bloqueio)="bloquear($event)" (salvo)="rascunho.confirmarSalvo('prazos')"/></div>}}@else{<p role="status">Selecione uma unidade para configurar os prazos.</p>}`,
})
export class PaginaPrazosComponent extends PaginaProtegida {}

@Component({
  selector: 'app-pagina-atualizacoes',
  imports: [EventosUnidadeComponent],
  template: `<app-eventos-unidade/>`,
})
export class PaginaAtualizacoesComponent {}

@Component({
  selector: 'app-pagina-pedido-assistido',
  imports: [VitrineComponent],
  template: `<app-vitrine [unidadeExterna]="contexto.unidadeId()"/>`,
})
export class PaginaPedidoAssistidoComponent extends PaginaProtegida {}

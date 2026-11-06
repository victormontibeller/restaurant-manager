import {Injectable,signal,WritableSignal} from '@angular/core';
export interface ConviteIntencao {id:string;email:string;perfil:string;unidades:string[];incerta:boolean}
@Injectable({providedIn:'root'})
export class ConvitePendenteService {
  private readonly contas=new Map<string,WritableSignal<ConviteIntencao|null>>();
  daConta(id:string):WritableSignal<ConviteIntencao|null>{
    const chave=location.origin+'|'+id;
    let valor=this.contas.get(chave);if(!valor){valor=signal<ConviteIntencao|null>(null);this.contas.set(chave,valor);}return valor;
  }
}

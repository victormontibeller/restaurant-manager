import {Injectable,WritableSignal,signal} from '@angular/core';
export interface CriacaoUnidade {id:string;nome:string;fuso:string;ativa:boolean}

@Injectable({providedIn:'root'})
export class CriacaoPendenteService {
  // Intenções ficam apenas na memória desta origem/página, segregadas por conta.
  // Logout remove credenciais, não a possibilidade de reconciliar ao reentrar.
  private readonly contas=new Map<string,WritableSignal<CriacaoUnidade|null>>();
  constructor(){
    window.addEventListener('beforeunload',event=>{
      if([...this.contas.values()].some(pendente=>pendente())){event.preventDefault();event.returnValue='';}
    });
  }
  daConta(usuarioId:string):WritableSignal<CriacaoUnidade|null>{
    let pendente=this.contas.get(usuarioId);
    if(!pendente){pendente=signal<CriacaoUnidade|null>(null);this.contas.set(usuarioId,pendente);}
    return pendente;
  }
}

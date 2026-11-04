import {Injectable,signal} from '@angular/core';

export interface EmpresaSaas {id:string;nome:string;estado:string;versao:number;dominios:string[];}
@Injectable({providedIn:'root'})
export class PlataformaSessaoService {
  readonly autenticado=signal(false);
  private access:string|null=null;
  private timer?:ReturnType<typeof setTimeout>;
  private restauracao:Promise<void>|null=null;
  private readonly canal=new BroadcastChannel('rm-plataforma');
  constructor(){this.canal.onmessage=e=>{if(e.data==='saiu')this.limpar();};}
  async entrar(email:string,senha:string):Promise<void>{
    await navigator.locks.request('rm-plataforma',async()=>this.receber(await this.comando('login',{email,senha})));
  }
  async restaurar():Promise<void>{
    if(!this.restauracao)this.restauracao=navigator.locks.request('rm-plataforma',async()=>{
      const r=await this.comando('refresh');if(r.status===401){this.limpar();return;}await this.receber(r);
    }).finally(()=>{this.restauracao=null;});
    return this.restauracao;
  }
  async sair():Promise<void>{
    try{
      const r=await navigator.locks.request('rm-plataforma',()=>this.comando('logout'));
      if(!r.ok&&r.status!==401)throw new Error('Não foi possível confirmar a saída. Tente novamente.');this.canal.postMessage('saiu');
    }finally{this.limpar();}
  }
  async empresas(pagina:number):Promise<EmpresaSaas[]>{return this.api<EmpresaSaas[]>('/api/v1/plataforma/empresas?pagina='+pagina);}
  private async api<T>(url:string):Promise<T>{
    if(!this.access)throw new Error('Entre na plataforma para continuar.');
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Authorization:'Bearer '+this.access},signal:AbortSignal.timeout(10000)});
    if(!r.ok){if(r.status===401)this.limpar();throw await this.erro(r);}return await r.json() as T;
  }
  private async receber(r:Response):Promise<void>{
    if(!r.ok)throw await this.erro(r);
    const tokens=await r.json() as {accessToken:string;expiresIn:number};this.access=tokens.accessToken;
    try{await this.api('/api/v1/plataforma/auth/me');}catch(e){this.limpar();throw e;}
    this.autenticado.set(true);clearTimeout(this.timer);
    this.timer=setTimeout(()=>{void this.restaurar().catch(()=>this.limpar());},Math.max(1,tokens.expiresIn-60)*1000);
  }
  private limpar():void{clearTimeout(this.timer);this.access=null;this.autenticado.set(false);}
  private async comando(action:string,body?:object):Promise<Response>{
    const r=await fetch('/api/v1/plataforma/auth/csrf',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error('Plataforma indisponível. Confira o domínio SaaS e a conexão.');
    const csrf=await r.json() as {token:string;headerName:string};
    return fetch('/api/v1/plataforma/auth/'+action,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',[csrf.headerName]:csrf.token},body:body?JSON.stringify(body):undefined});
  }
  private async erro(r:Response):Promise<Error>{
    let mensagem='Não foi possível confirmar a operação. Confira a conexão e tente novamente.';
    if(r.status<500)try{const b=await r.json() as {mensagem?:unknown};if(typeof b.mensagem==='string')mensagem=b.mensagem;}catch{/* Resposta de intermediário não é contrato de erro. */}
    return new Error(mensagem);
  }
}

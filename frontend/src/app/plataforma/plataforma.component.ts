import {Component,ElementRef,ViewChild,effect,inject,signal} from '@angular/core';

import {EmpresaSaas,PlataformaSessaoService} from './plataforma-sessao.service';

@Component({
  selector:'app-plataforma',
  styles:[`:host{display:block}label{display:block;margin:1rem 0 .35rem}input{font:inherit;max-width:100%;width:100%;padding:.65rem;border:1px solid #627367;border-radius:.4rem;min-height:48px}button{margin:.5rem .5rem .5rem 0}article{border:1px solid #d4ddd5;padding:1rem;border-radius:.5rem;margin:1rem 0;overflow-wrap:anywhere}[role=alert]{border-left:4px solid #a33;padding:.8rem;background:#fff1ed}nav{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}`],
  template:`
    <section aria-labelledby="plataforma-titulo" [attr.aria-busy]="ocupado()">
      <h2 id="plataforma-titulo">Administração SaaS</h2>
      <p>Acesso separado das contas dos restaurantes. Somente metadados de empresas; sem acesso a clientes, pedidos ou pagamentos.</p>
      @if(erro()){<p role="alert" tabindex="-1" #alerta>{{erro()}}</p>}
      @if(!sessao.autenticado()){
        <form (submit)="entrar($event,emailInput.value,senhaInput)">
          <label for="saas-email">E-mail do operador</label><input #emailInput id="saas-email" name="email" type="email" autocomplete="username" required maxlength="254" [disabled]="ocupado()||saidaPendente()">
          <label for="saas-senha">Senha do operador</label><input #senhaInput id="saas-senha" name="senha" type="password" autocomplete="current-password" required maxlength="72" [disabled]="ocupado()||saidaPendente()">
          <button type="submit" [disabled]="ocupado()||saidaPendente()">Entrar na plataforma</button>
        </form>
        @if(saidaPendente()){<p>A saída no servidor não foi confirmada. Conclua antes de entrar novamente.</p><button (click)="sair()" [disabled]="ocupado()">Tentar encerrar sessão SaaS</button>}
      }@else{
        <p>Perfil: OPERADOR_SAAS</p>
        <button (click)="sair()" [disabled]="ocupado()">Sair da plataforma</button>
        <h3>Empresas cadastradas</h3>
        <button (click)="carregar(pagina())" [disabled]="ocupado()">Atualizar empresas</button>
        <p role="status" aria-live="polite">{{mensagem()}}</p>
        @for(empresa of empresas();track empresa.id){
          <article><h4>{{empresa.nome}}</h4><p>Estado: {{empresa.estado}}</p><p>Identificador: {{empresa.id}}</p>
            <p>Domínios: {{empresa.dominios.join(', ') || 'Nenhum domínio cadastrado'}}</p>
          </article>
        }
        <nav aria-label="Páginas de empresas"><button (click)="carregar(pagina()-1)" [disabled]="ocupado()||pagina()===0">Página anterior</button>
          <span>Página {{pagina()+1}}</span><button (click)="carregar(pagina()+1)" [disabled]="ocupado()||empresas().length<50">Próxima página</button></nav>
        <p>Provisionamento e suspensão pela interface ainda não estão disponíveis. Não há operação comercial neste ambiente.</p>
      }
    </section>`,
})
export class PlataformaComponent {
  readonly sessao=inject(PlataformaSessaoService);
  readonly ocupado=signal(false);readonly saidaPendente=signal(false);readonly erro=signal('');readonly mensagem=signal('');
  readonly empresas=signal<EmpresaSaas[]>([]);readonly pagina=signal(0);
  private geracao=0;
  @ViewChild('alerta') alerta?:ElementRef<HTMLElement>;
  @ViewChild('emailInput') emailInput?:ElementRef<HTMLInputElement>;
  constructor(){
    effect(()=>{if(!this.sessao.autenticado()){this.geracao++;this.empresas.set([]);this.pagina.set(0);}});
    void this.iniciar();
  }
  private async iniciar():Promise<void>{
    this.ocupado.set(true);
    try{await this.sessao.restaurar();if(this.sessao.autenticado())await this.listar(0);}catch(e){this.falhar(e);}finally{this.ocupado.set(false);}
  }
  async entrar(event:Event,email:string,campoSenha:HTMLInputElement):Promise<void>{
    event.preventDefault();if(this.ocupado()||this.saidaPendente())return;this.ocupado.set(true);this.erro.set('');const senha=campoSenha.value;campoSenha.value='';
    try{await this.sessao.entrar(email,senha);await this.listar(0);}catch(e){this.falhar(e);}finally{this.ocupado.set(false);}
  }
  async sair():Promise<void>{
    if(this.ocupado())return;this.ocupado.set(true);this.erro.set('');this.saidaPendente.set(true);this.geracao++;this.empresas.set([]);
    try{await this.sessao.sair();this.saidaPendente.set(false);setTimeout(()=>this.emailInput?.nativeElement.focus());}catch(e){this.falhar(e);}finally{this.ocupado.set(false);}
  }
  async carregar(pagina:number):Promise<void>{
    if(this.ocupado())return;this.ocupado.set(true);this.erro.set('');
    try{await this.listar(pagina);}catch(e){this.mensagem.set('Consulta não atualizada. Os dados anteriores podem estar desatualizados.');this.falhar(e);}finally{this.ocupado.set(false);}
  }
  private async listar(pagina:number):Promise<void>{
    const geracao=this.geracao;const empresas=await this.sessao.empresas(pagina);
    if(geracao!==this.geracao||!this.sessao.autenticado())return;
    this.empresas.set(empresas);this.pagina.set(pagina);this.mensagem.set(empresas.length?'Consulta atualizada.':'Nenhuma empresa nesta página.');
  }
  private falhar(e:unknown):void{this.erro.set(e instanceof TypeError||!navigator.onLine?'Sem conexão. Nenhuma operação foi confirmada.':e instanceof Error?e.message:'Não foi possível concluir.');setTimeout(()=>this.alerta?.nativeElement.focus());}
}

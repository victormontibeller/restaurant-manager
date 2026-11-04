import {Component,ElementRef,HostListener,OnInit,ViewChild,inject,output,signal} from '@angular/core';
import {ApiFailure,SessaoService} from '../identidade/sessao.service';
import {ConvitePendenteService} from './convite-pendente.service';
interface Unidade {id:string;nome:string}
interface Convite {id:string;email:string;perfil:string;unidades:string[];estado:string;expiraEm:string}
@Component({
  selector:'app-convites',
  template:`
    <section aria-labelledby="convites-titulo" [attr.aria-busy]="ocupado()">
      <h2 id="convites-titulo">Convites de funcionários</h2>
      <p>Somente contas novas. Não converte clientes nem reativa funcionários. O destinatário verifica o e-mail e define a própria senha. Validade: quinze minutos.</p>
      <p>Ambiente fictício: captura privada, sem envio real de e-mail. Administrador cobre todas as unidades; demais perfis sem vínculos não acessam unidades.</p>
      <form (submit)="reautenticar($event,senha)"><label for="senha-convite-admin">Confirme sua senha para convidar</label>
        <input #senha id="senha-convite-admin" type="password" autocomplete="current-password" required maxlength="72" [disabled]="ocupado()">
        <button [disabled]="ocupado()">Confirmar identidade para convites</button>
      </form>
      @if(pendente();as p){
        <p role="status">Convite com resultado pendente: {{p.id}} · {{p.email}}. Não crie outra intenção. Fechar ou recarregar esta página perde o rascunho; consulte este identificador ao retornar.</p>
        <button (click)="enviar()" [disabled]="ocupado()">Reenviar mesma intenção</button>
        <button (click)="consultar(p.id)" [disabled]="ocupado()">Conferir intenção pendente</button>
      } @else {
        <form (submit)="criar($event,email.value)">
          <label for="email-convite">E-mail do funcionário convidado</label><input #email id="email-convite" type="email" required maxlength="254" autocomplete="off" [disabled]="ocupado()">
          <label for="perfil-convite">Perfil do convite</label><select id="perfil-convite" (change)="perfil.set($any($event.target).value);vinculos.set([])" [disabled]="ocupado()">
            @for(p of perfis;track p){<option [value]="p" [selected]="perfil()===p">{{p}}</option>}
          </select>
          @if(perfil()!=='ADMINISTRADOR'){
            <fieldset [disabled]="ocupado()"><legend>Unidades do convite</legend>
              @for(u of unidades();track u.id){<label><input type="checkbox" [checked]="vinculos().includes(u.id)" (change)="vincular(u.id,$any($event.target).checked)">{{u.nome}}</label>}
            </fieldset>
          }
          <button [disabled]="ocupado()||!carregado()">Criar convite</button>
        </form>
      }
      @if(erro()){<p #alerta role="alert" tabindex="-1" class="erro">{{erro()}}</p>}
      @if(aviso()){<p role="status">{{aviso()}}</p>}
      <form (submit)="buscar($event,id.value)"><label for="id-convite">Identificador do convite</label><input #id id="id-convite" required [disabled]="ocupado()"><button [disabled]="ocupado()">Consultar convite</button></form>
      @if(encontrado();as c){<p role="status">{{c.id}} · {{c.email}} · {{c.perfil}} · {{c.estado}}</p>}
      <button (click)="carregar(pagina())" [disabled]="ocupado()">Recarregar convites</button>
      @for(c of lista();track c.id){<article><h3>{{c.email}}</h3><p>{{c.id}} · {{c.perfil}} · {{c.estado}}</p><p>Expira em {{c.expiraEm}}</p>
        @if(c.estado==='PENDENTE'){<button (click)="revogar(c.id)" [disabled]="ocupado()">Revogar convite de {{c.email}}</button>}
      </article>} @empty {<p>Nenhum convite nesta página.</p>}
      <nav aria-label="Páginas de convites"><button (click)="carregar(pagina()-1)" [disabled]="ocupado()||pagina()===0">Convites anteriores</button><span>Página {{pagina()+1}}</span><button (click)="carregar(pagina()+1)" [disabled]="ocupado()||lista().length<50">Próximos convites</button></nav>
    </section>
  `,
  styles:`form{display:grid;gap:.5rem;max-width:30rem;margin:1rem 0}input:not([type=checkbox]),select{width:100%;min-height:48px;font:inherit;padding:.6rem}input[type=checkbox]{width:22px;height:22px;margin:.7rem;vertical-align:middle}label{display:block}fieldset{min-width:0}article{border:1px solid #6b7a70;border-radius:.5rem;padding:1rem;margin:1rem 0}button{max-width:100%;overflow-wrap:anywhere}p,h3{overflow-wrap:anywhere}.erro{color:#9d2424}nav{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}`,
})
export class ConvitesComponent implements OnInit {
  private readonly sessao=inject(SessaoService);
  readonly pendente=inject(ConvitePendenteService).daConta(this.sessao.identidade()!.usuarioId);
  readonly perfis=['COZINHA','ATENDIMENTO','CAIXA','EXPEDICAO','GERENTE','ADMINISTRADOR'];
  readonly perfil=signal('COZINHA');readonly vinculos=signal<string[]>([]);
  readonly unidades=signal<Unidade[]>([]);readonly lista=signal<Convite[]>([]);readonly encontrado=signal<Convite|null>(null);
  readonly pagina=signal(0);readonly carregado=signal(false);readonly ocupado=signal(false);readonly erro=signal('');readonly aviso=signal('');readonly bloqueio=output<boolean>();
  @ViewChild('alerta') alerta?:ElementRef<HTMLElement>;
  ngOnInit():void {void this.carregar(0);}
  @HostListener('window:beforeunload',['$event']) aoSair(event:BeforeUnloadEvent):void {if(this.pendente()){event.preventDefault();event.returnValue='';}}
  vincular(id:string,ativo:boolean):void {this.vinculos.update(v=>ativo?[...new Set([...v,id])]:v.filter(x=>x!==id));}
  async carregar(pagina:number):Promise<void>{await this.executar(async()=>{
    const lista=await this.sessao.api<Convite[]>('/api/v1/equipe/convites?pagina='+pagina);
    const unidades=await this.sessao.api<Unidade[]>('/api/v1/operacao/unidades');
    this.lista.set(lista);this.unidades.set(unidades);this.pagina.set(pagina);this.carregado.set(true);
  });}
  async reautenticar(event:Event,input:HTMLInputElement):Promise<void>{event.preventDefault();const senha=input.value;input.value='';await this.executar(async()=>{await this.sessao.api('/api/v1/auth/reautenticar','POST',{senha});this.aviso.set('Identidade confirmada por cinco minutos.');});}
  async criar(event:Event,email:string):Promise<void>{event.preventDefault();if(this.ocupado()||this.pendente())return;this.pendente.set({id:crypto.randomUUID(),email,perfil:this.perfil(),unidades:[...this.vinculos()],incerta:false});await this.enviar();}
  async enviar():Promise<void>{await this.executar(async()=>{
    const p=this.pendente();if(!p)return;
    try{
      const c=await this.sessao.api<Convite>('/api/v1/equipe/convites','POST',{id:p.id,email:p.email,perfil:p.perfil,unidades:p.unidades});
      this.encontrado.set(c);this.pendente.set(null);this.aviso.set('Convite registrado no servidor: '+c.id+' · '+c.estado+'. Confira a captura privada.');
    }catch(error){
      if(error instanceof ApiFailure&&error.status<500&&!p.incerta)this.pendente.set(null);
      else {this.pendente.set({...p,incerta:true});throw new Error('Resultado incerto. Confira o identificador ou reenvie a mesma intenção; não crie outro convite.');}
      throw error;
    }
  });}
  async buscar(event:Event,id:string):Promise<void>{event.preventDefault();await this.consultar(id);}
  async consultar(id:string):Promise<void>{await this.executar(async()=>{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new Error('Informe um identificador UUID válido.');
    const c=await this.sessao.api<Convite>('/api/v1/equipe/convites/'+id);this.encontrado.set(c);if(this.pendente()?.id===c.id)this.pendente.set(null);
    this.aviso.set('Resultado consultado no servidor.');
  });}
  async revogar(id:string):Promise<void>{await this.executar(async()=>{const c=await this.sessao.api<Convite>('/api/v1/equipe/convites/'+id+'/revogar','POST',{});this.lista.update(v=>v.map(x=>x.id===id?c:x));this.aviso.set('Revogação confirmada. Mensagens já capturadas podem permanecer, mas o código não autoriza aceite.');});}
  private async executar(acao:()=>Promise<void>):Promise<void>{
    if(this.ocupado())return;this.ocupado.set(true);this.bloqueio.emit(true);this.erro.set('');this.aviso.set('');
    try{await acao();}catch(error){this.erro.set(error instanceof Error?error.message:'Resultado não confirmado. Consulte o identificador.');setTimeout(()=>this.alerta?.nativeElement.focus());}
    finally{this.ocupado.set(false);this.bloqueio.emit(!!this.pendente());}
  }
}

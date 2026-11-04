import {Component,ElementRef,ViewChild,inject,signal} from '@angular/core';
import {SessaoService} from '../identidade/sessao.service';
interface Unidade {id:string;nome:string;fuso:string;ativa:boolean;versao:number}

@Component({
  selector:'app-unidades',
  template:`
    <section aria-labelledby="unidades-titulo" [attr.aria-busy]="ocupado()">
      <h2 id="unidades-titulo">Configurações de unidades</h2>
      <p>Somente o Administrador configura unidades. Inativar remove a unidade da lista pública e dos acessos operacionais, sem apagar o cadastro ou seus vínculos.</p>
      <p>Horários, canais, regiões e parâmetros de pedidos ainda não estão disponíveis.</p>
      <button type="button" (click)="carregar()" [disabled]="ocupado()">Recarregar unidades</button>
      <form (submit)="confirmar($event,senha)">
        <label for="unidade-senha">Confirme sua senha</label>
        <input #senha id="unidade-senha" type="password" autocomplete="current-password" required maxlength="72" [disabled]="ocupado()">
        <button [disabled]="ocupado()">Confirmar identidade</button>
      </form>
      @if(erro()){<p #alerta role="alert" tabindex="-1" class="erro">{{erro()}}</p>}
      @if(aviso()){<p aria-live="polite">{{aviso()}}</p>}
      <h3>Nova unidade</h3>
      <p>Após falha de conexão, mantenha os dados e envie novamente: o mesmo identificador evita cadastro duplicado. Recarregue para conferir um resultado incerto.</p>
      <form (submit)="criar($event,nome,fuso)">
        <label for="nova-unidade-nome">Nome da nova unidade</label>
        <input #nome id="nova-unidade-nome" required maxlength="120" [disabled]="ocupado()">
        <label for="nova-unidade-fuso">Fuso da nova unidade</label>
        <input #fuso id="nova-unidade-fuso" required maxlength="60" value="America/Sao_Paulo" aria-describedby="fuso-ajuda" [disabled]="ocupado()">
        <small id="fuso-ajuda">Identificador IANA. Exemplos: America/Sao_Paulo, America/Manaus ou UTC.</small>
        <button [disabled]="ocupado()">Criar unidade</button>
      </form>
      <h3>Unidades cadastradas</h3>
      @for(u of unidades();track u.id){
        <article>
          <h4>{{u.nome}}</h4>
          <p>Versão {{u.versao}} · {{u.ativa?'Ativa':'Inativa'}}</p>
          <form (submit)="salvar($event,u,nomeEditado.value,fusoEditado.value,ativa.checked)">
            <label [for]="'nome-'+u.id">Nome da unidade</label>
            <input #nomeEditado [id]="'nome-'+u.id" [value]="u.nome" required maxlength="120" [disabled]="ocupado()">
            <label [for]="'fuso-'+u.id">Fuso da unidade</label>
            <input #fusoEditado [id]="'fuso-'+u.id" [value]="u.fuso" required maxlength="60" [disabled]="ocupado()">
            <label><input #ativa type="checkbox" [checked]="u.ativa" [disabled]="ocupado()">Unidade ativa</label>
            <button [disabled]="ocupado()">Salvar unidade</button>
          </form>
        </article>
      } @empty {<p>Nenhuma unidade nesta página.</p>}
      <nav aria-label="Páginas de unidades">
        <button (click)="mudarPagina(-1)" [disabled]="ocupado()||pagina()===0">Página anterior de unidades</button>
        <span>Página {{pagina()+1}}</span>
        <button (click)="mudarPagina(1)" [disabled]="ocupado()||unidades().length<50">Próxima página de unidades</button>
      </nav>
    </section>
  `,
  styles:`:host{display:block}form{display:grid;gap:.5rem;margin:1rem 0;max-width:32rem}input:not([type=checkbox]){width:100%;min-height:48px;font:inherit;padding:.5rem}input[type=checkbox]{width:22px;height:22px;vertical-align:middle;margin:.6rem}article{padding:1rem;border:1px solid #6b7a70;border-radius:.5rem;margin:1rem 0}h4{overflow-wrap:anywhere}.erro{color:#9d2424}nav{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}`,
})
export class UnidadesComponent {
  private readonly sessao=inject(SessaoService);
  readonly unidades=signal<Unidade[]>([]);
  readonly pagina=signal(0);
  readonly ocupado=signal(false);
  readonly erro=signal('');
  readonly aviso=signal('');
  private criacaoId=crypto.randomUUID();
  @ViewChild('alerta') alerta?:ElementRef<HTMLElement>;
  constructor(){void this.carregar();}
  async carregar():Promise<void>{await this.executar(()=>this.listar());}
  private async listar():Promise<void>{this.unidades.set(await this.sessao.api<Unidade[]>('/api/v1/configuracoes/unidades?pagina='+this.pagina()));}
  async confirmar(event:Event,input:HTMLInputElement):Promise<void>{event.preventDefault();const senha=input.value;input.value='';await this.executar(async()=>{await this.sessao.api('/api/v1/auth/reautenticar','POST',{senha});this.aviso.set('Identidade confirmada por cinco minutos.');});}
  async criar(event:Event,nome:HTMLInputElement,fuso:HTMLInputElement):Promise<void>{
    event.preventDefault();await this.executar(async()=>{
      const u=await this.sessao.api<Unidade>('/api/v1/configuracoes/unidades','POST',{id:this.criacaoId,nome:nome.value,fuso:fuso.value,ativa:true});
      this.criacaoId=crypto.randomUUID();nome.value='';
      // O resultado fica visível mesmo se sua posição ordenar em outra página.
      this.unidades.update(rows=>[u,...rows.filter(row=>row.id!==u.id)].slice(0,50));
      this.aviso.set('Unidade criada no servidor. Recarregue para ordenar a lista.');
    });
  }
  async salvar(event:Event,u:Unidade,nome:string,fuso:string,ativa:boolean):Promise<void>{
    event.preventDefault();await this.executar(async()=>{
      const atual=await this.sessao.api<Unidade>('/api/v1/configuracoes/unidades/'+u.id,'PUT',{versao:u.versao,nome,fuso,ativa});
      this.unidades.update(rows=>rows.map(row=>row.id===u.id?atual:row));this.aviso.set('Unidade atualizada no servidor.');
    });
  }
  mudarPagina(delta:number):void{this.pagina.update(p=>Math.max(0,p+delta));void this.carregar();}
  private async executar(action:()=>Promise<void>):Promise<void>{
    if(this.ocupado())return;this.ocupado.set(true);this.erro.set('');this.aviso.set('');
    try{await action();}catch(error){this.erro.set(error instanceof Error?error.message:'Não foi possível concluir. Recarregue para conferir o resultado.');setTimeout(()=>this.alerta?.nativeElement.focus());}finally{this.ocupado.set(false);}
  }
}

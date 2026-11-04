import {Component,ElementRef,OnInit,ViewChild,inject,output,signal} from '@angular/core';
import {SessaoService} from '../identidade/sessao.service';
interface Acao {codigo:string;descricao:string;escopo:string;dependencia:string|null}
interface Matriz {versao:number;acoes:Acao[];perfis:Record<string,string[]>}
interface Unidade {id:string;nome:string}
interface Funcionario {id:string;email:string;perfil:string;ativo:boolean;versao:number;unidades:string[]}

@Component({
  selector:'app-acessos',
  template:`
    <section aria-labelledby="acessos-titulo" [attr.aria-busy]="ocupado()">
      <h2 id="acessos-titulo">Configurações de acessos</h2>
      <p>Administrador é protegido e cobre todas as unidades. Alterações valem na próxima operação, sem novo login.</p>
      <p>As ações do catálogo são contratos para as próximas sprints; catálogo, pedidos e pagamentos ainda não estão disponíveis.</p>
      <button type="button" (click)="carregar()" [disabled]="ocupado()">Recarregar acessos</button>
      <form (submit)="confirmar($event,senha)">
        <label for="confirmar-senha">Confirme sua senha</label>
        <input #senha id="confirmar-senha" type="password" autocomplete="current-password" required maxlength="72" [disabled]="ocupado()">
        <button [disabled]="ocupado()">Confirmar identidade</button>
      </form>
      @if(erro()) {<p #alerta role="alert" tabindex="-1" class="erro">{{erro()}}</p>}
      @if(aviso()) {<p aria-live="polite">{{aviso()}}</p>}
      @if(matriz();as m) {
        <label for="perfil-acesso">Perfil operacional</label>
        <select id="perfil-acesso" [value]="perfil()" (change)="selecionar($any($event.target).value)" [disabled]="ocupado()">
          @for(p of perfis;track p){<option [value]="p">{{p}}</option>}
        </select>
        <label for="buscar-acao">Buscar ação</label>
        <input id="buscar-acao" type="search" (input)="busca.set($any($event.target).value)">
        <fieldset [disabled]="ocupado()"><legend>Permissões de {{perfil()}} · versão {{m.versao}}</legend>
          @for(a of acoesFiltradas();track a.codigo){
            <div class="acao"><label><input type="checkbox" [checked]="escolhidas().has(a.codigo)" [disabled]="dependenciaObrigatoria(a.codigo)" (change)="marcar(a,$any($event.target).checked)">{{a.descricao}}</label>
              <small>{{a.escopo==='EMPRESA'?'Afeta toda a empresa':'Restrita às unidades atribuídas'}} @if(a.dependencia){· Inclui consulta mínima: {{a.dependencia}}}</small>
            </div>
          }
        </fieldset>
        <button type="button" (click)="salvarMatriz()" [disabled]="ocupado()">Salvar permissões</button>
        <h3>Funcionários existentes</h3>
        <p>Convites e criação de funcionários ainda não estão disponíveis. Clientes não aparecem nesta lista.</p>
        @for(f of equipe();track f.id){
          <article>
            <h4>{{f.email}}</h4>
            <label [for]="'perfil-'+f.id">Perfil do funcionário</label>
            <select [id]="'perfil-'+f.id" [value]="f.perfil" (change)="mudarPerfil(f,$any($event.target).value)" [disabled]="ocupado()">
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              @for(p of perfis;track p){<option [value]="p">{{p}}</option>}
            </select>
            <label><input type="checkbox" [checked]="f.ativo" (change)="f.ativo=$any($event.target).checked" [disabled]="ocupado()">Ativo</label>
            @if(f.perfil!=='ADMINISTRADOR'){
              <fieldset [disabled]="ocupado()"><legend>Unidades atribuídas</legend>
                @for(u of unidades();track u.id){<label><input type="checkbox" [checked]="f.unidades.includes(u.id)" (change)="vincular(f,u.id,$any($event.target).checked)">{{u.nome}}</label>}
              </fieldset>
            } @else {<p>Cobertura integral da empresa.</p>}
            <button type="button" (click)="salvarFuncionario(f)" [disabled]="ocupado()">Salvar funcionário</button>
          </article>
        } @empty {<p>Nenhum funcionário nesta página.</p>}
        <nav aria-label="Páginas de funcionários">
          <button (click)="paginaAnterior()" [disabled]="ocupado()||pagina()===0">Página anterior</button>
          <span>Página {{pagina()+1}}</span>
          <button (click)="proximaPagina()" [disabled]="ocupado()||equipe().length<50">Próxima página</button>
        </nav>
      }
    </section>
  `,
  styles:`:host{display:block}form{display:grid;gap:.5rem;margin:1rem 0;max-width:28rem}input:not([type=checkbox]),select{max-width:100%;width:100%;min-height:48px;font:inherit;padding:.5rem;margin-bottom:.7rem}label{display:block}input[type=checkbox]{width:22px;height:22px;margin:.7rem;vertical-align:middle}fieldset{min-width:0;margin:1rem 0;border:1px solid #6b7a70;border-radius:.5rem}.acao{padding:.5rem;border-bottom:1px solid #d9e2dc}.acao small{display:block;overflow-wrap:anywhere}article{padding:1rem;border:1px solid #6b7a70;border-radius:.5rem;margin:1rem 0}h4{overflow-wrap:anywhere}.erro{color:#9d2424}nav{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}`,
})
export class AcessosComponent implements OnInit {
  private readonly sessao=inject(SessaoService);
  readonly perfis=['GERENTE','ATENDIMENTO','CAIXA','COZINHA','EXPEDICAO'];
  readonly matriz=signal<Matriz|null>(null);
  readonly equipe=signal<Funcionario[]>([]);
  readonly unidades=signal<Unidade[]>([]);
  readonly perfil=signal('GERENTE');
  readonly escolhidas=signal(new Set<string>());
  readonly busca=signal('');
  readonly ocupado=signal(false);
  readonly erro=signal('');
  readonly aviso=signal('');
  readonly pagina=signal(0);
  readonly bloqueio=output<boolean>();
  @ViewChild('alerta') alerta?:ElementRef<HTMLElement>;
  ngOnInit():void{void this.carregar();}
  async carregar(pagina=this.pagina()):Promise<void>{
    await this.executar(async()=>{
      const m=await this.sessao.api<Matriz>('/api/v1/configuracoes/acessos');
      const e=await this.sessao.api<Funcionario[]>('/api/v1/equipe?pagina='+pagina);
      const u=await this.sessao.api<Unidade[]>('/api/v1/operacao/unidades');
      this.matriz.set(m);this.equipe.set(e);this.unidades.set(u);this.pagina.set(pagina);this.selecionar(this.perfil());
    });
  }
  selecionar(perfil:string):void {this.perfil.set(perfil);this.escolhidas.set(new Set(this.matriz()?.perfis[perfil]??[]));}
  acoesFiltradas():Acao[]{const busca=this.busca().toLocaleLowerCase('pt-BR');return this.matriz()?.acoes.filter(a=>(a.descricao+' '+a.codigo).toLocaleLowerCase('pt-BR').includes(busca))??[];}
  dependenciaObrigatoria(codigo:string):boolean{return this.matriz()?.acoes.some(a=>a.dependencia===codigo&&this.escolhidas().has(a.codigo))??false;}
  marcar(acao:Acao,marcado:boolean):void {const a=new Set(this.escolhidas());if(marcado){a.add(acao.codigo);if(acao.dependencia)a.add(acao.dependencia);}else a.delete(acao.codigo);this.escolhidas.set(a);}
  async confirmar(event:Event,input:HTMLInputElement):Promise<void>{event.preventDefault();const senha=input.value;input.value='';await this.executar(async()=>{await this.sessao.api('/api/v1/auth/reautenticar','POST',{senha});this.aviso.set('Identidade confirmada por cinco minutos.');});}
  async salvarMatriz():Promise<void>{await this.executar(async()=>{const m=await this.sessao.api<Matriz>('/api/v1/configuracoes/acessos','PUT',{versao:this.matriz()?.versao,perfil:this.perfil(),acoes:[...this.escolhidas()]});this.matriz.set(m);this.selecionar(this.perfil());this.aviso.set('Permissões salvas no servidor.');});}
  mudarPerfil(f:Funcionario,perfil:string):void{f.perfil=perfil;if(perfil==='ADMINISTRADOR')f.unidades=[];}
  vincular(f:Funcionario,id:string,marcado:boolean):void{f.unidades=marcado?[...new Set([...f.unidades,id])]:f.unidades.filter(u=>u!==id);}
  async salvarFuncionario(f:Funcionario):Promise<void>{await this.executar(async()=>{const result=await this.sessao.api<Funcionario>('/api/v1/equipe/'+f.id,'PUT',{versao:f.versao,perfil:f.perfil,ativo:f.ativo,unidades:f.unidades});this.equipe.update(rows=>rows.map(row=>row.id===result.id?result:row));this.aviso.set('Funcionário atualizado no servidor.');await this.sessao.atualizarIdentidade();});}
  paginaAnterior():void{void this.carregar(Math.max(0,this.pagina()-1));}
  proximaPagina():void{void this.carregar(this.pagina()+1);}
  private async executar(action:()=>Promise<void>):Promise<void>{
    if(this.ocupado())return;this.ocupado.set(true);this.bloqueio.emit(true);this.erro.set('');this.aviso.set('');
    try{await action();}catch(error){this.erro.set(error instanceof Error?error.message:'Não foi possível concluir. Recarregue para conferir o resultado.');setTimeout(()=>this.alerta?.nativeElement.focus());}finally{this.ocupado.set(false);this.bloqueio.emit(false);}
  }
}

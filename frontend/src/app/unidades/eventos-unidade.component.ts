import {Component,DestroyRef,ElementRef,ViewChild,inject,signal} from '@angular/core';
import {ApiFailure,SessaoService} from '../identidade/sessao.service';

interface Unidade {id:string;nome:string;fuso:string;}
interface Atual extends Unidade {versao:string;}
interface Evento {versao:string;tipo:string;nome:string;fuso:string;ativa:boolean;ocorridoEm:string;}
interface Pagina {unidade:Atual;eventos:Evento[];proximo:string;temMais:boolean;}
@Component({
  selector:'app-eventos-unidade',
  template:`
    <section aria-labelledby="eventos-titulo">
      <h3 id="eventos-titulo">Atualizações da unidade</h3>
      <p>Acompanhamento cadastral com consulta automática. Não inclui pedidos, pagamentos ou dados de clientes.</p>
      <button type="button" (click)="carregar()" [disabled]="ocupado()">Recarregar unidades permitidas</button>
      <label for="unidade-eventos">Unidade acompanhada</label>
      <select id="unidade-eventos" #seletor [value]="selecionada()" (change)="selecionar(seletor.value)">
        <option value="">Selecione uma unidade</option>
        @for(unidade of unidades();track unidade.id){<option [value]="unidade.id">{{unidade.nome}}</option>}
      </select>
      <p role="status">{{estado()}}</p>
      @if(erro()){<p #alerta role="alert" tabindex="-1" class="erro">{{erro()}}</p>}
      @if(atual();as unidade){
        <p data-testid="unidade-atual"><strong>{{unidade.nome}}</strong> · {{unidade.fuso}} · versão {{unidade.versao}}</p>
        <p>Última consulta confirmada: {{confirmado()}}. Revalidação a cada cinco segundos enquanto esta tela estiver aberta.</p>
        @if(eventos().length===0){<p>Nenhuma alteração registrada desde o início deste acompanhamento.</p>}
        @else{<ol aria-label="Alterações cadastrais recebidas">
          @for(evento of eventos();track evento.versao){<li>{{evento.tipo==='UNIDADE_CRIADA'?'Unidade criada':'Cadastro alterado'}}: {{evento.nome}} · {{evento.fuso}} · {{evento.ativa?'ativa':'inativa'}} · versão {{evento.versao}}</li>}
        </ol><p>Exibidas até cinquenta alterações recentes desta consulta. O histórico permanece no servidor.</p>}
      }
    </section>
  `,
  styles:`:host{display:block;min-width:0}section{margin-top:1rem}label,select{display:block;margin-top:.6rem}select{width:100%;max-width:32rem;min-height:48px;font:inherit}button{max-width:100%;white-space:normal;overflow-wrap:anywhere}p,li{overflow-wrap:anywhere}.erro{color:#9d2424}`,
})
export class EventosUnidadeComponent {
  private readonly sessao=inject(SessaoService);
  private readonly conta=this.sessao.identidade()?.usuarioId;
  private geracao=0;
  private destruido=false;
  private timer?:ReturnType<typeof setTimeout>;
  private cursor='-1';
  readonly unidades=signal<Unidade[]>([]);
  readonly selecionada=signal('');
  readonly atual=signal<Atual|null>(null);
  readonly eventos=signal<Evento[]>([]);
  readonly estado=signal('Carregando unidades permitidas…');
  readonly erro=signal('');
  readonly ocupado=signal(false);
  readonly confirmado=signal('');
  @ViewChild('alerta') alerta?:ElementRef<HTMLElement>;
  constructor(){
    inject(DestroyRef).onDestroy(()=>{this.destruido=true;this.geracao++;clearTimeout(this.timer);});
    void this.carregar();
  }
  private vigente(geracao:number):boolean {return !this.destruido&&geracao===this.geracao&&this.conta===this.sessao.identidade()?.usuarioId;}
  private limpar():number {
    clearTimeout(this.timer);this.geracao++;this.cursor='-1';this.atual.set(null);this.eventos.set([]);this.confirmado.set('');this.erro.set('');this.ocupado.set(false);return this.geracao;
  }
  async carregar():Promise<void>{
    const geracao=this.limpar();this.unidades.set([]);this.selecionada.set('');this.ocupado.set(true);this.estado.set('Carregando unidades permitidas…');
    try{
      const dados=await this.sessao.api<{acoes:string[];unidades:Unidade[]}>('/api/v1/acessos/efetivos');
      if(!this.vigente(geracao))return;
      if(!dados.acoes.includes('unidade.acompanhar')){this.estado.set('Sua política não permite acompanhar atualizações.');return;}
      this.unidades.set(dados.unidades);this.estado.set(dados.unidades.length?'Selecione uma unidade para acompanhar.':'Nenhuma unidade ativa permitida.');
    }catch{if(this.vigente(geracao)){this.erro.set('Não foi possível consultar o acesso atual. Tente recarregar as unidades.');this.estado.set('Acompanhamento indisponível.');this.foco();}}
    finally{if(this.vigente(geracao))this.ocupado.set(false);}
  }
  selecionar(id:string):void{
    const geracao=this.limpar();this.selecionada.set(id);
    if(!id){this.estado.set('Selecione uma unidade para acompanhar.');return;}
    this.estado.set('Consultando atualizações…');void this.consultar(geracao,id);
  }
  private async consultar(geracao:number,id:string):Promise<void>{
    if(!this.vigente(geracao))return;this.ocupado.set(true);let intervalo=5000;let continuar=true;
    try{
      const pagina=await this.sessao.api<Pagina>('/api/v1/operacao/unidades/'+encodeURIComponent(id)+'/eventos?depois='+encodeURIComponent(this.cursor));
      if(!this.vigente(geracao))return;
      this.cursor=pagina.proximo;this.atual.set(pagina.unidade);
      this.eventos.set([...this.eventos(),...pagina.eventos].slice(-50));this.erro.set('');
      this.confirmado.set(new Date().toLocaleTimeString('pt-BR'));this.estado.set(pagina.temMais?'Recuperando alterações pendentes…':'Acompanhamento conectado.');
      if(pagina.temMais)intervalo=100;
    }catch(error){
      if(!this.vigente(geracao))return;
      this.atual.set(null);this.eventos.set([]);this.confirmado.set('');this.cursor='-1';
      if(error instanceof ApiFailure&&[401,403,404].includes(error.status)){
        continuar=false;this.unidades.set([]);this.selecionada.set('');this.estado.set('Acompanhamento encerrado.');
        this.erro.set('Acesso à unidade removido ou sessão encerrada. Recarregue as unidades permitidas.');this.foco();
      }else{this.estado.set('Sem conexão confirmada. Tentando recuperar o acompanhamento…');}
    }finally{
      if(this.vigente(geracao)){this.ocupado.set(false);if(continuar)this.timer=setTimeout(()=>void this.consultar(geracao,id),intervalo);}
    }
  }
  private foco():void {setTimeout(()=>{if(!this.destruido)this.alerta?.nativeElement.focus();});}
}

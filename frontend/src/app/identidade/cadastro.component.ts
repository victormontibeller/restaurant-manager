import {Component,ElementRef,ViewChild,inject,output,signal} from '@angular/core';
import {ApiFailure,SessaoService} from './sessao.service';
import {senhaEmBranco} from './senha';

@Component({
  selector:'app-cadastro',
  template:`
    <section aria-labelledby="cadastro-titulo" [attr.aria-busy]="ocupado()">
      <h2 id="cadastro-titulo" tabindex="-1">Criar conta de cliente</h2>
      <p>Primeiro confirme seu e-mail. Só então escolha a senha. A conta é exclusiva desta empresa e não concede acesso de funcionário.</p>
      <p>Neste ambiente fictício, as mensagens são capturadas localmente; nenhum e-mail real é enviado.</p>
      <form (submit)="solicitar($event,email.value)">
        <label for="email-cadastro">E-mail do cadastro</label>
        <input #email id="email-cadastro" type="email" autocomplete="email" required maxlength="254" [disabled]="ocupado()">
        <button type="submit" [disabled]="ocupado()">Solicitar código de cadastro</button>
      </form>
      <h3>Verificar e-mail e definir senha</h3>
      <p>O código recebido só funciona nesta empresa, expira em quinze minutos após a solicitação e pode ser usado uma vez. Se já possui conta, volte ao login ou recupere sua senha.</p>
      <form (submit)="confirmar($event,codigo,senha,confirmacao)">
        <label for="codigo-cadastro">Código de cadastro</label>
        <input #codigo id="codigo-cadastro" type="password" autocomplete="off" required minlength="43" maxlength="43" pattern="[A-Za-z0-9_-]{43}" [disabled]="ocupado()">
        <label for="senha-cadastro">Senha da nova conta</label>
        <input #senha id="senha-cadastro" type="password" autocomplete="new-password" required minlength="12" maxlength="72" [attr.aria-describedby]="campoErro()==='senha'?'regra-cadastro erro-cadastro':'regra-cadastro'" [attr.aria-invalid]="campoErro()==='senha'?true:null" [disabled]="ocupado()">
        <p id="regra-cadastro">Use pelo menos 12 caracteres e no máximo 72 bytes. Caracteres acentuados podem ocupar mais de um byte.</p>
        <label for="confirmacao-cadastro">Confirmar senha da nova conta</label>
        <input #confirmacao id="confirmacao-cadastro" type="password" autocomplete="new-password" required minlength="12" maxlength="72" [attr.aria-describedby]="campoErro()==='confirmacao'?'erro-cadastro':null" [attr.aria-invalid]="campoErro()==='confirmacao'?true:null" [disabled]="ocupado()">
        <button type="submit" [disabled]="ocupado()">Verificar e criar conta</button>
      </form>
      @if(erro()){<p #alerta id="erro-cadastro" role="alert" tabindex="-1" class="erro">{{erro()}}</p>}
      @if(aviso()){<p #resultado role="status" tabindex="-1">{{aviso()}}</p>}
      <button type="button" (click)="voltar.emit()" [disabled]="ocupado()">Voltar ao login</button>
    </section>
  `,
  styles:`form{display:grid;gap:.5rem;max-width:28rem;margin-bottom:1.5rem}input{width:100%;min-height:48px;border:1px solid #6b7a70;border-radius:.4rem;padding:.6rem;font:inherit}label{font-weight:650}.erro{color:#9d2424;font-weight:600}`,
})
export class CadastroComponent {
  private readonly sessao=inject(SessaoService);
  readonly voltar=output<void>();
  readonly ocupado=signal(false);
  readonly erro=signal('');
  readonly campoErro=signal<'senha'|'confirmacao'|null>(null);
  readonly aviso=signal('');
  @ViewChild('alerta') alerta?:ElementRef<HTMLElement>;
  @ViewChild('resultado') resultado?:ElementRef<HTMLElement>;
  async solicitar(event:Event,email:string):Promise<void> {
    event.preventDefault();if(this.ocupado())return;
    this.iniciar();
    try {await this.sessao.cadastrar('cadastro',{email});this.sucesso('Se o endereço estiver elegível, enviaremos instruções para criar a conta.');}
    catch(error){this.falha(error,false);}finally{this.ocupado.set(false);}
  }
  async confirmar(event:Event,codigo:HTMLInputElement,senha:HTMLInputElement,confirmacao:HTMLInputElement):Promise<void> {
    event.preventDefault();if(this.ocupado())return;
    this.iniciar();
    try {
      if(senha.value!==confirmacao.value){this.campoErro.set('confirmacao');throw new Error('As senhas devem ser iguais.');}
      if(senhaEmBranco(senha.value)){this.campoErro.set('senha');throw new Error('A senha não pode conter somente espaços em branco.');}
      if(new TextEncoder().encode(senha.value).length>72){this.campoErro.set('senha');throw new Error('A senha deve ter no máximo 72 bytes.');}
      await this.sessao.cadastrar('cadastro/confirmar',{codigo:codigo.value,senha:senha.value});
      codigo.value='';this.sucesso('Conta criada com e-mail verificado. Volte ao login para entrar.');
    } catch(error){this.falha(error,true);}finally{senha.value='';confirmacao.value='';this.ocupado.set(false);}
  }
  private iniciar():void{this.ocupado.set(true);this.erro.set('');this.aviso.set('');this.campoErro.set(null);}
  private sucesso(texto:string):void{this.aviso.set(texto);setTimeout(()=>this.resultado?.nativeElement.focus());}
  private falha(error:unknown,confirmacao:boolean):void {
    const rede=error instanceof TypeError||(error instanceof ApiFailure&&error.status>=500)||(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name));
    this.erro.set(rede?(confirmacao?'A resposta não chegou. A conta pode ter sido criada. Volte ao login e confira antes de solicitar outro código.':'Sem conexão. A solicitação não foi confirmada; confira a captura antes de repetir.'):(error instanceof Error?error.message:'Não foi possível concluir a operação.'));
    setTimeout(()=>this.alerta?.nativeElement.focus());
  }
}

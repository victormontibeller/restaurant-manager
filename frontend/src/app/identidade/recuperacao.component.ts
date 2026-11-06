import {Component,ElementRef,ViewChild,inject,output,signal} from '@angular/core';
import {ApiFailure,SessaoService} from './sessao.service';
import {senhaEmBranco} from './senha';

@Component({
  selector:'app-recuperacao',
  template:`
    <section aria-labelledby="recuperacao-titulo" [attr.aria-busy]="ocupado()">
      <h2 id="recuperacao-titulo" tabindex="-1">Recuperar senha</h2>
      <p>Solicite um código para a conta desta empresa. Neste ambiente fictício, as mensagens são capturadas localmente; nenhum e-mail real é enviado.</p>
      <form (submit)="solicitar($event,email.value)">
        <label for="email-recuperacao">E-mail da recuperação</label>
        <input #email id="email-recuperacao" type="email" autocomplete="username" required maxlength="254" [disabled]="ocupado()">
        <button type="submit" [disabled]="ocupado()">Solicitar código</button>
      </form>
      <h3>Já recebeu o código?</h3>
      <p>O código só funciona nesta empresa, expira em quinze minutos após a solicitação e pode ser usado uma vez. A alteração encerra todas as sessões anteriores.</p>
      <form (submit)="confirmar($event,codigo,nova,confirmacao)">
        <label for="codigo-recuperacao">Código de recuperação</label>
        <input #codigo id="codigo-recuperacao" type="password" autocomplete="off" required minlength="43" maxlength="43" pattern="[A-Za-z0-9_-]{43}" [attr.aria-describedby]="campoErro()==='codigo'?'erro-recuperacao':null" [attr.aria-invalid]="campoErro()==='codigo'?true:null" [disabled]="ocupado()">
        <label for="nova-senha">Nova senha</label>
        <input #nova id="nova-senha" type="password" autocomplete="new-password" required minlength="12" maxlength="72" [attr.aria-describedby]="campoErro()==='senha'?'regra-senha erro-recuperacao':'regra-senha'" [attr.aria-invalid]="campoErro()==='senha'?true:null" [disabled]="ocupado()">
        <p id="regra-senha">Use pelo menos 12 caracteres e no máximo 72 bytes. Caracteres acentuados podem ocupar mais de um byte.</p>
        <label for="confirmar-senha">Confirmar nova senha</label>
        <input #confirmacao id="confirmar-senha" type="password" autocomplete="new-password" required minlength="12" maxlength="72" [attr.aria-describedby]="campoErro()==='confirmacao'?'erro-recuperacao':null" [attr.aria-invalid]="campoErro()==='confirmacao'?true:null" [disabled]="ocupado()">
        <button type="submit" [disabled]="ocupado()">Alterar senha</button>
      </form>
      @if(erro()){<p #alerta id="erro-recuperacao" role="alert" tabindex="-1" class="erro">{{erro()}}</p>}
      @if(aviso()){<p #resultado role="status" tabindex="-1">{{aviso()}}</p>}
      <button type="button" (click)="voltar.emit()" [disabled]="ocupado()">Voltar ao login</button>
    </section>
  `,
  styles:`form{display:grid;gap:.5rem;max-width:28rem;margin-bottom:1.5rem}input{width:100%;min-height:48px;border:1px solid #6b7a70;border-radius:.4rem;padding:.6rem;font:inherit}label{font-weight:650}.erro{color:#9d2424;font-weight:600}`,
})
export class RecuperacaoComponent {
  private readonly sessao=inject(SessaoService);
  readonly voltar=output<void>();
  readonly ocupado=signal(false);
  readonly erro=signal('');
  readonly campoErro=signal<'codigo'|'senha'|'confirmacao'|null>(null);
  readonly aviso=signal('');
  @ViewChild('alerta') alerta?:ElementRef<HTMLElement>;
  @ViewChild('resultado') resultado?:ElementRef<HTMLElement>;
  async solicitar(event:Event,email:string):Promise<void> {
    event.preventDefault();if(this.ocupado())return;
    this.iniciar();
    try {await this.sessao.recuperar('recuperacao',{email});this.sucesso('Se a conta estiver elegível, enviaremos instruções de recuperação.');}
    catch(error){this.falha(error,false);}finally{this.ocupado.set(false);}
  }
  async confirmar(event:Event,codigo:HTMLInputElement,nova:HTMLInputElement,confirmacao:HTMLInputElement):Promise<void> {
    event.preventDefault();if(this.ocupado())return;
    this.iniciar();
    try {
      if(nova.value!==confirmacao.value){this.campoErro.set('confirmacao');throw new Error('As senhas devem ser iguais.');}
      if(senhaEmBranco(nova.value)){this.campoErro.set('senha');throw new Error('A senha não pode conter somente espaços em branco.');}
      if(new TextEncoder().encode(nova.value).length>72){this.campoErro.set('senha');throw new Error('A senha deve ter no máximo 72 bytes.');}
      await this.sessao.recuperar('recuperacao/confirmar',{codigo:codigo.value,senha:nova.value});
      codigo.value='';this.sucesso('Senha alterada e sessões anteriores encerradas. Volte ao login para entrar com a nova senha.');
    } catch(error){this.falha(error,true);}finally{nova.value='';confirmacao.value='';this.ocupado.set(false);}
  }
  private iniciar():void{this.ocupado.set(true);this.erro.set('');this.aviso.set('');this.campoErro.set(null);}
  private sucesso(texto:string):void{this.aviso.set(texto);setTimeout(()=>this.resultado?.nativeElement.focus());}
  private falha(error:unknown,confirmacao:boolean):void {
    if(confirmacao&&error instanceof ApiFailure&&error.status===422&&error.codigo==='RECUPERACAO_INVALIDA')this.campoErro.set('codigo');
    const rede=error instanceof TypeError||(error instanceof ApiFailure&&error.status>=500)||(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name));
    this.erro.set(rede?(confirmacao?'A resposta não chegou. A senha pode ter sido alterada. Volte ao login e confira antes de solicitar outro código.':'Sem conexão. A solicitação não foi confirmada; confira a captura antes de repetir.'):(error instanceof Error?error.message:'Não foi possível concluir a operação.'));
    setTimeout(()=>this.alerta?.nativeElement.focus());
  }
}

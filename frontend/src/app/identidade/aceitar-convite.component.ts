import {Component,ElementRef,ViewChild,inject,output,signal} from '@angular/core';
import {ApiFailure,SessaoService} from './sessao.service';
@Component({
  selector:'app-aceitar-convite',
  template:`
    <section aria-labelledby="aceitar-convite-titulo" [attr.aria-busy]="ocupado()">
      <h2 id="aceitar-convite-titulo" tabindex="-1">Aceitar convite de funcionário</h2>
      <p>Confira a empresa e o perfil na mensagem antes de aceitar. O Administrador define suas unidades. O código é de uso único e expira em quinze minutos. Neste ambiente, consulte a captura privada; não há envio real.</p>
      <form (submit)="aceitar($event,codigo,senha,confirmacao)">
        <label for="codigo-convite">Código do convite</label><input #codigo id="codigo-convite" type="password" required autocomplete="off" minlength="43" maxlength="43" pattern="[A-Za-z0-9_-]{43}" [disabled]="ocupado()">
        <label for="senha-convite">Senha da conta de funcionário</label><input #senha id="senha-convite" type="password" required autocomplete="new-password" minlength="12" maxlength="72" [attr.aria-describedby]="campoErro()==='senha'?'regra-convite erro-convite':'regra-convite'" [attr.aria-invalid]="campoErro()==='senha'?true:null" [disabled]="ocupado()">
        <p id="regra-convite">Use pelo menos 12 caracteres e no máximo 72 bytes. Acentos podem ocupar mais de um byte.</p>
        <label for="confirmacao-convite">Confirmar senha de funcionário</label><input #confirmacao id="confirmacao-convite" type="password" required autocomplete="new-password" minlength="12" maxlength="72" [attr.aria-describedby]="campoErro()==='confirmacao'?'erro-convite':null" [attr.aria-invalid]="campoErro()==='confirmacao'?true:null" [disabled]="ocupado()">
        <button [disabled]="ocupado()">Verificar e aceitar convite</button>
      </form>
      @if(erro()){<p #alerta id="erro-convite" role="alert" tabindex="-1" class="erro">{{erro()}}</p>}
      @if(aviso()){<p #resultado role="status" tabindex="-1">{{aviso()}}</p>}
      <button (click)="voltar.emit()" [disabled]="ocupado()">Voltar ao login</button>
    </section>
  `,
  styles:`form{display:grid;gap:.5rem;max-width:28rem}input{width:100%;min-height:48px;padding:.6rem;font:inherit}label{font-weight:650}.erro{color:#9d2424}`,
})
export class AceitarConviteComponent {
  private readonly sessao=inject(SessaoService);
  readonly voltar=output<void>();readonly ocupado=signal(false);readonly erro=signal('');readonly aviso=signal('');
  readonly campoErro=signal<'senha'|'confirmacao'|null>(null);
  @ViewChild('alerta') alerta?:ElementRef<HTMLElement>;@ViewChild('resultado') resultado?:ElementRef<HTMLElement>;
  async aceitar(event:Event,codigo:HTMLInputElement,senha:HTMLInputElement,confirmacao:HTMLInputElement):Promise<void>{
    event.preventDefault();if(this.ocupado())return;this.ocupado.set(true);this.erro.set('');this.aviso.set('');this.campoErro.set(null);
    try{
      if(senha.value!==confirmacao.value){this.campoErro.set('confirmacao');throw new Error('As senhas devem ser iguais.');}
      if(new TextEncoder().encode(senha.value).length>72){this.campoErro.set('senha');throw new Error('A senha deve ter no máximo 72 bytes.');}
      await this.sessao.aceitarConvite({codigo:codigo.value,senha:senha.value});codigo.value='';
      this.aviso.set('Convite aceito e e-mail verificado. Volte ao login para entrar.');setTimeout(()=>this.resultado?.nativeElement.focus());
    }catch(error){
      const incerto=error instanceof TypeError||(error instanceof ApiFailure&&error.status>=500)||(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name));
      this.erro.set(incerto?'A resposta não chegou. O convite pode ter sido aceito. Confira o login antes de pedir outro convite.':error instanceof Error?error.message:'Não foi possível confirmar o aceite.');setTimeout(()=>this.alerta?.nativeElement.focus());
    }finally{senha.value='';confirmacao.value='';this.ocupado.set(false);}
  }
}

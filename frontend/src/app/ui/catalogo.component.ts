import { Component } from '@angular/core';
import { HlmButton } from './button';

@Component({
  selector: 'app-catalogo-ui',
  imports: [HlmButton],
  template: `
    <main class="ui-catalogo">
      <p class="eyebrow">RESTAURANT MANAGER · DESIGN SYSTEM</p>
      <h1>Uma experiência à mesa.</h1>
      <p>Fundação visual compartilhada por cliente, gestão e cozinha.</p>
      <section><h2>Ações e foco</h2><div class="acoes">
        <button hlmBtn>Confirmar pedido</button><button hlmBtn variant="secondary">Ver detalhes</button>
        <button hlmBtn variant="outline">Voltar</button><button hlmBtn disabled>Enviando…</button>
      </div></section>
      <section><h2>Campos e validação</h2><label for="ui-nome">Nome da mesa</label><input id="ui-nome" placeholder="Ex.: Varanda 02" />
        <label for="ui-unidade">Unidade</label><select id="ui-unidade"><option>Centro</option><option>Jardins</option></select>
        <p class="erro" role="status">Exemplo de validação: informe um nome para continuar.</p></section>
      <section><h2>Estados operacionais</h2><div class="acoes"><span class="badge">Aguardando aceite</span><span class="badge badge-verde">Pronto</span><span class="badge badge-ambar">Em preparo</span></div>
        <p class="aviso">Sem conexão. As informações podem estar desatualizadas.</p><p class="vazio">Nenhum pedido nesta etapa.</p></section>
      <section><h2>Diálogo</h2><button hlmBtn variant="outline" (click)="dialogo.showModal()">Abrir exemplo</button>
        <dialog #dialogo aria-labelledby="ui-dialogo-titulo"><h2 id="ui-dialogo-titulo">Confirmar alteração</h2><p>Confira a unidade antes de continuar.</p><button hlmBtn (click)="dialogo.close()">Entendi</button></dialog>
      </section>
    </main>
  `,
})
export class CatalogoUiComponent {}

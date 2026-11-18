import { Component, signal } from '@angular/core';
import { AlternarTemaComponent } from './alternar-tema.component';
import { HlmButton } from './button';
import { RM_TABS } from './tabs';

@Component({
  selector: 'app-catalogo-ui',
  imports: [HlmButton, RM_TABS, AlternarTemaComponent],
  template: `
    <main class="ui-catalogo">
      <h1>Componentes do Restaurant Manager</h1>
      <section class="gestao-compacta" aria-labelledby="ui-gestao">
        <h2 id="ui-gestao">Gestão</h2><app-alternar-tema/>
        <div class="gestao-toolbar" role="group" aria-label="Filtros de exemplo">
          <div><label for="ui-estado">Estado</label><select id="ui-estado"><option>Em andamento</option><option>Concluídos</option></select></div>
          <div><label for="ui-canal">Canal</label><select id="ui-canal"><option>Todos os canais</option><option>Mesa</option></select></div>
        </div>
        <div class="gestao-lista">
          <article class="gestao-linha">
            <div><h3>Pedido #AB12CD34</h3><p>Mesa · 14:20</p></div>
            <span class="gestao-estado">Em preparo</span>
            <button hlmBtn variant="outline" type="button" [attr.aria-expanded]="detalhes()" aria-controls="ui-pedido-detalhes" (click)="detalhes.set(!detalhes())">Detalhes</button>
            <div id="ui-pedido-detalhes" class="ui-pedido-detalhes" [hidden]="!detalhes()"><p>1 × Risoto de cogumelos</p></div>
          </article>
        </div>
        <form class="gestao-editor" (submit)="$event.preventDefault()">
          <h3>Editar unidade</h3>
          <div class="gestao-campos">
            <div><label for="ui-editar-nome">Nome</label><input id="ui-editar-nome" value="Unidade Centro" required /></div>
            <div><label for="ui-editar-fuso">Fuso horário</label><input id="ui-editar-fuso" value="America/Sao_Paulo" required /></div>
          </div>
          <div class="gestao-acoes"><button hlmBtn type="submit">Salvar unidade</button><button hlmBtn variant="outline" type="reset">Restaurar campos</button></div>
        </form>
      </section>
      <section><h2>Ações e foco</h2><div class="acoes">
        <button hlmBtn>Confirmar pedido</button><button hlmBtn variant="secondary">Ver detalhes</button>
        <button hlmBtn variant="outline">Voltar</button><button hlmBtn disabled>Enviando…</button>
      </div></section>
      <section><h2>Campos e validação</h2><label for="ui-nome">Nome da mesa</label><input id="ui-nome" placeholder="Ex.: Varanda 02" />
        <label for="ui-unidade">Unidade</label><select id="ui-unidade"><option>Centro</option><option>Jardins</option></select>
        <p class="erro" role="status">Exemplo de validação: informe um nome para continuar.</p></section>
      <section brnTabs="ui-fila" activationMode="manual"><h2>Abas e teclado</h2>
        <div brnTabsList class="rm-tabs-list" aria-label="Exemplo de etapas">
          <button brnTabsTrigger="ui-fila">Fila</button><button brnTabsTrigger="ui-preparo">Preparo</button><button brnTabsTrigger="ui-prontos">Prontos</button>
        </div>
        <div brnTabsContent="ui-fila">Nenhum pedido na fila.</div><div brnTabsContent="ui-preparo">Pedidos em preparo aparecem aqui.</div><div brnTabsContent="ui-prontos">Pedidos prontos aparecem aqui.</div>
      </section>
      <section><h2>Estados operacionais</h2><div class="acoes"><span class="badge">Aguardando aceite</span><span class="badge badge-verde">Pronto</span><span class="badge badge-ambar">Em preparo</span></div>
        <p class="aviso">Sem conexão. As informações podem estar desatualizadas.</p><p class="vazio">Nenhum pedido nesta etapa.</p></section>
      <section><h2>Diálogo</h2><button hlmBtn variant="outline" (click)="dialogo.showModal()">Abrir exemplo</button>
        <dialog #dialogo aria-labelledby="ui-dialogo-titulo"><h2 id="ui-dialogo-titulo">Confirmar alteração</h2><p>Confira a unidade antes de continuar.</p><button hlmBtn (click)="dialogo.close()">Entendi</button></dialog>
      </section>
    </main>
  `,
  styles: `
    .ui-pedido-detalhes { flex-basis: 100%; }
  `,
})
export class CatalogoUiComponent {
  readonly detalhes = signal(false);
}

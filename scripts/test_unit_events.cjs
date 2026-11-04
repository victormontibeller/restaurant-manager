const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const repo=path.resolve(__dirname,'..');
const ts=require(repo+'/frontend/node_modules/typescript');
const signal=v=>Object.assign(()=>v,{set:x=>v=x,update:f=>v=f(v)});
function load(file,core,extra={}){
  const context={exports:{},require:n=>n==='@angular/core'?core:{},setTimeout,clearTimeout,console,Error,AbortSignal,BroadcastChannel:class{postMessage(){}},...extra};
  const source=extra.source??fs.readFileSync(repo+'/frontend/src/app/'+file,'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,context);
  return context.exports;
}
async function respostaDeSessaoAntiga(){
  let resolve;const response=new Promise(r=>resolve=r);
  const {SessaoService}=load('identidade/sessao.service.ts',{Injectable:()=>c=>c,signal},{fetch:()=>response});
  const service=new SessaoService();service.access='A';service.identidade.set({usuarioId:'A'});
  const request=service.api('/api/v1/operacao/unidades/id/eventos').catch(()=>{});
  service.limpar();service.access='B';service.identidade.set({usuarioId:'B'});
  resolve({ok:false,status:401,json:async()=>({mensagem:'Sessão antiga encerrada.'})});await request;
  assert.equal(service.identidade()?.usuarioId,'B','401 atrasado não encerra outra sessão');
}
async function renovarNaoRessuscitaSessaoNemAceita401Antigo(){
  for(const [file,nome] of [['identidade/sessao.service.ts','SessaoService'],['plataforma/plataforma-sessao.service.ts','PlataformaSessaoService']]){
    const anterior=process.env.RM_TEST_BASE_SHA;
    const source=anterior?require('node:child_process').execFileSync('git',['show',anterior+':frontend/src/app/'+file],{cwd:repo,encoding:'utf8'}):undefined;
    let finish;const body=new Promise(r=>finish=r);const timers=[];
    let fetcher=async()=>({ok:true,status:200,json:()=>body});
    const Klass=load(file,{Injectable:()=>c=>c,signal},{source,fetch:(...args)=>fetcher(...args),setTimeout:()=>{timers.push(1);return 1;},clearTimeout:()=>{}})[nome];
    const s=new Klass();const tokens={ok:true,json:async()=>({accessToken:'novo',expiresIn:300})};
    const receiving=s.receber(tokens).catch(()=>{});await new Promise(r=>setImmediate(r));s.limpar();finish({usuarioId:'A'});await receiving;
    assert.equal(s.access,null,nome+': logout remove access');
    assert.equal(nome==='SessaoService'?s.identidade():s.autenticado(),nome==='SessaoService'?null:false,nome+': identidade não ressuscita');assert.equal(timers.length,0);
    s.access='antigo';let release;const old=new Promise(r=>release=r);fetcher=()=>old;
    const pending=s.api('/evento').catch(()=>{});fetcher=async()=>({ok:true,status:200,json:async()=>({usuarioId:'A'})});
    await s.receber(tokens);release({ok:false,status:401,json:async()=>({mensagem:'Expirado'})});await pending;
    assert.equal(s.access,'novo',nome+': 401 anterior não elimina credencial renovada');
  }
}
async function trocaDeUnidadeEDestruicaoDescartamRespostas(){
  let resolve;const antiga=new Promise(r=>resolve=r);const callbacks=[];const destroy={};
  const pagina=id=>({unidade:{id,nome:id,fuso:'UTC',versao:'1'},eventos:[],proximo:'1',temMais:false});
  const service={identidade:()=>({usuarioId:'conta'}),api:url=>url.includes('efetivos')?Promise.resolve({acoes:['unidade.acompanhar'],unidades:[]}):url.includes('/A/')?antiga:Promise.resolve(pagina('B'))};
  const core={Component:()=>c=>c,ViewChild:()=>()=>{},DestroyRef:destroy,signal,inject:t=>t===destroy?{onDestroy:cb=>callbacks.push(cb)}:service};
  const {EventosUnidadeComponent}=load('unidades/eventos-unidade.component.ts',core,{setTimeout:()=>0,clearTimeout:()=>{}});
  const c=new EventosUnidadeComponent();await Promise.resolve();
  c.selecionar('A');c.selecionar('B');await Promise.resolve();
  resolve(pagina('A'));await Promise.resolve();await Promise.resolve();
  assert.equal(c.atual().id,'B','Resposta antiga não substitui a unidade atual');
  let finish;service.api=()=>new Promise(r=>finish=r);c.selecionar('A');callbacks.forEach(cb=>cb());
  finish(pagina('A'));await Promise.resolve();
  assert.equal(c.atual(),null,'Instância destruída não publica resposta');
}
async function revogacaoLimpaDadosEEncerraPolling(){
  const destroy={};const timers=[];class Failure extends Error{constructor(status){super();this.status=status;}}
  const service={identidade:()=>({usuarioId:'conta'}),api:async()=>({acoes:['unidade.acompanhar'],unidades:[]})};
  const core={Component:()=>c=>c,ViewChild:()=>()=>{},DestroyRef:destroy,signal,inject:t=>t===destroy?{onDestroy:()=>{}}:service};
  const {EventosUnidadeComponent}=load('unidades/eventos-unidade.component.ts',core,{require:n=>n==='@angular/core'?core:{ApiFailure:Failure},setTimeout:(fn,ms)=>{timers.push(ms);return 0;},clearTimeout:()=>{}});
  const c=new EventosUnidadeComponent();await Promise.resolve();service.api=async()=>{throw new Failure(403);};
  c.selecionar('A');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(c.atual(),null);assert.equal(c.selecionada(),'');assert.equal(c.unidades().length,0);
  assert.match(c.erro(),/Acesso à unidade removido/);assert.equal(timers.includes(5000),false,'Não repetir assinatura negada');
}
(async()=>{let failed=0;for(const test of [respostaDeSessaoAntiga,renovarNaoRessuscitaSessaoNemAceita401Antigo,trocaDeUnidadeEDestruicaoDescartamRespostas,revogacaoLimpaDadosEEncerraPolling]){try{await test();console.log(test.name+': aprovado');}catch(e){failed++;console.error(test.name+': '+e.message);}}process.exitCode=failed?1:0;})();

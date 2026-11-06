const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('frontend/e2e-hml-identidade/contas.spec.ts','utf8');
const guard=source.slice(source.indexOf('const profiles='),source.indexOf('const origin='));
assert(guard.includes('throw new Error'));
const profiles=['ADMINISTRADOR','ADMINISTRADOR','GERENTE','ATENDIMENTO','CAIXA','COZINHA','EXPEDICAO','CLIENTE','CLIENTE','OPERADOR_SAAS'];
const fixture={stage:'hml',approved:true,accounts:profiles.map((perfil,i)=>({perfil,host:i===1?'hmlb.localhost':i===9?'plataforma.localhost':'hmla.localhost',usuario_id:'id-'+i,email:'conta-'+i+'@example.invalid',empresa_id:i===1?'empresa-b':'empresa-a'}))};
vm.runInNewContext(guard,{fixture});
for(const change of ['cliente','admin','host','empresa','perfil']){
  const data=structuredClone(fixture);
  if(change==='cliente')data.accounts[8]=data.accounts[7];
  if(change==='admin')data.accounts[1]=data.accounts[0];
  if(change==='host')data.accounts[2].host='outro.localhost';
  if(change==='empresa')data.accounts[1].empresa_id=data.accounts[0].empresa_id;
  if(change==='perfil')data.accounts[7].perfil='ADMINISTRADOR';
  assert.throws(()=>vm.runInNewContext(guard,{fixture:data}),/Massa incompleta/);
}
console.log('Guardas reais da fixture: massa distinta aceita e cinco adulterações recusadas.');
const extra='11111111-2222-4333-8444-555555555555';
const expanded=vm.runInNewContext(guard+'\nJSON.stringify(companyIds)',{fixture:{...fixture,empresas_adicionais:[extra]}});
assert.deepEqual(JSON.parse(expanded),['empresa-a','empresa-b',extra]);
const excess=Array.from({length:49},(_,i)=>'11111111-2222-4333-8444-'+String(i).padStart(12,'0'));
for(const extras of [[extra,extra],['invalido'],['EMPRESA-A'],excess,null]){
  assert.throws(()=>vm.runInNewContext(guard,{fixture:{...fixture,empresas_adicionais:extras}}),/Empresas adicionais/);
}
const duplicatedPrimary=structuredClone(fixture);duplicatedPrimary.accounts[0].empresa_id=extra;
assert.throws(()=>vm.runInNewContext(guard,{fixture:{...duplicatedPrimary,empresas_adicionais:[extra]}}),/Empresas adicionais/);
console.log('Inventário explícito adicional aceito; duplicação, formato e limite recusados.');

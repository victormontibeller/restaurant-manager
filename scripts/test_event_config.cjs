const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const repo=path.resolve(__dirname,'..');
const ts=require(repo+'/frontend/node_modules/typescript');
const source=ts.transpileModule(fs.readFileSync(repo+'/frontend/playwright.eventos.config.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const valid='https://eventos-11111111-1111-1111-1111-111111111111.localhost:8089';
function load(target){
  const context={exports:{},URL,process:{env:{RM_BASE_URL:target,RM_REPORT_DIR:'/private/reports'}},require:name=>{
    if(name==='@playwright/test')return {defineConfig:x=>x};
    if(name==='node:path')return path;
    if(name==='./playwright.config'){
      const foundation={...context,exports:{}};
      vm.runInNewContext(ts.transpileModule(fs.readFileSync(repo+'/frontend/playwright.config.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,foundation);
      return foundation.exports;
    }
    throw new Error('Importação indevida: '+name);
  }};
  vm.runInNewContext(source,context);return context.exports.default;
}
const config=load(valid);
assert.equal(config.use.baseURL,valid);assert.equal(config.workers,1);assert.equal(config.retries,0);
assert.equal(config.testDir,'./e2e-eventos');assert.equal(config.use.ignoreHTTPSErrors,true);
assert.equal(config.globalSetup,'./e2e-identidade/prontidao.ts');
assert.equal(config.timeout,90000);assert.equal(config.forbidOnly,true);
assert.equal(config.use.trace,'retain-on-failure');
assert.equal(config.use.screenshot,'only-on-failure');
assert.deepEqual(Array.from(config.projects,p=>p.name),['chromium-desktop','chromium-mobile','chromium-tablet','firefox-desktop','webkit-desktop']);
for(const target of [undefined,'https://c4.localhost:8089',valid.replace('https:','http:'),valid.replace(':8089',':8088'),valid+'/?x=1',valid+'/#x',valid.replace('https://','https://user@'),valid.replace('.localhost','.example.com'),valid.replace('11111111-','invalido-')]) assert.throws(()=>load(target));
console.log('Configuração de eventos: origem própria aceita; nove destinos inválidos recusados.');

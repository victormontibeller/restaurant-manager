// Probe de template Angular real; API em memória somente nesta unidade de UI.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const repo=path.resolve(__dirname,'..');
const {build}=require(repo+'/frontend/node_modules/esbuild');
const playwright=require(repo+'/frontend/node_modules/playwright');
(async()=>{
  const built=await build({stdin:{contents:`
    import '@angular/compiler';
    import {bootstrapApplication} from '@angular/platform-browser';
    import {AcessosComponent} from './src/app/acessos/acessos.component';
    import {ConvitesComponent} from './src/app/acessos/convites.component';
    import {SessaoService} from './src/app/identidade/sessao.service';
    const roles=['ADMINISTRADOR','GERENTE','ATENDIMENTO','CAIXA','COZINHA','EXPEDICAO'];
    const team=roles.map((perfil,i)=>({id:'f'+i,email:'p'+i+'@example.invalid',perfil,ativo:true,versao:0,unidades:[]}));
    const mock={identidade:()=>({usuarioId:'ficticio'}),api:async(path)=>path.includes('/configuracoes/acessos')?{versao:0,acoes:[],perfis:Object.fromEntries(roles.slice(1).map(r=>[r,[]]))}:path.includes('/equipe/convites')?[]:path.includes('/equipe')?structuredClone(team):[],atualizarIdentidade:async()=>{}};
    bootstrapApplication(window.kind==='convites'?ConvitesComponent:AcessosComponent,{providers:[{provide:SessaoService,useValue:mock}]}).then(app=>{window.fixture={app:app.components[0],team,roles};});
  `,resolveDir:repo+'/frontend',sourcefile:'profile-template-probe.ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',tsconfigRaw:{compilerOptions:{experimentalDecorators:true}},logLevel:'silent'});
  const name=process.env.RM_TEMPLATE_BROWSER||'chromium';
  assert.ok(['chromium','firefox','webkit'].includes(name));
  const browser=await playwright[name].launch(name==='webkit'&&process.env.RM_WEBKIT_EXECUTABLE?{executablePath:process.env.RM_WEBKIT_EXECUTABLE}:{});
  try{
    const page=await browser.newPage({viewport:{width:360,height:800}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.setContent('<app-acessos></app-acessos>');await page.addScriptTag({content:built.outputFiles[0].text});
    await page.waitForFunction(()=>window.fixture&&document.querySelectorAll('article').length===6);
    const values=await page.locator('article select').evaluateAll(selects=>selects.map(s=>s.value));
    const roles=['ADMINISTRADOR','GERENTE','ATENDIMENTO','CAIXA','COZINHA','EXPEDICAO'];
    console.log(JSON.stringify({browser:name,expected:roles,observed:values}));assert.deepEqual(values,roles,'Perfil exibido diverge do modelo carregado');
    await page.getByLabel('Perfil operacional').selectOption('COZINHA');
    await page.getByRole('button',{name:'Recarregar acessos'}).click();
    await page.waitForFunction(()=>!window.fixture.app.instance.ocupado());
    assert.equal(await page.getByLabel('Perfil operacional').inputValue(),'COZINHA');
    assert.deepEqual(await page.locator('article select').evaluateAll(s=>s.map(x=>x.value)),roles);
    await page.locator('article').nth(4).getByLabel('Perfil do funcionário').selectOption('GERENTE');
    await page.locator('article').nth(4).getByLabel('Perfil do funcionário').focus();
    assert.equal(await page.evaluate(()=>window.fixture.app.instance.equipe()[4].perfil),'GERENTE');
    await page.getByRole('button',{name:'Recarregar acessos'}).click();
    await page.waitForFunction(()=>!window.fixture.app.instance.ocupado());
    assert.equal(await page.locator('article').nth(4).getByLabel('Perfil do funcionário').inputValue(),'COZINHA');
    const invitation=await browser.newPage();invitation.on('pageerror',error=>errors.push(error.message));
    await invitation.setContent('<app-convites></app-convites>');await invitation.evaluate(()=>window.kind='convites');
    await invitation.addScriptTag({content:built.outputFiles[0].text});
    await invitation.waitForFunction(()=>window.fixture&&window.fixture.app.instance.carregado());
    await invitation.getByLabel('Perfil do convite').selectOption('GERENTE');
    await invitation.evaluate(()=>window.fixture.app.instance.pendente.set({id:'fixture',email:'convite@example.invalid',perfil:'GERENTE',unidades:[],incerta:true}));
    await invitation.getByRole('button',{name:'Reenviar mesma intenção'}).waitFor();
    await invitation.evaluate(()=>window.fixture.app.instance.pendente.set(null));
    await invitation.getByLabel('Perfil do convite').waitFor();
    assert.equal(await invitation.getByLabel('Perfil do convite').inputValue(),'GERENTE','Formulário recriado deve preservar perfil visível');
    assert.deepEqual(errors,[]);
    console.log('Perfis iniciais, recarga assíncrona e edição coerentes no template Angular real. API fictícia: não é E2E.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});

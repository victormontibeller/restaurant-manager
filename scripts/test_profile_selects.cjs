// Probe de template Angular real; API em memória somente nesta unidade de UI.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
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
    const writes=[];const invitations=[];
    const matrix={versao:0,acoes:[{codigo:'UNIDADE_CONSULTAR',descricao:'Consultar unidade',escopo:'UNIDADE',dependencia:null}],perfis:Object.fromEntries(roles.slice(1).map(r=>[r,[]]))};
    const mock={identidade:()=>({usuarioId:'ficticio'}),api:async(path,method='GET',body)=>{
      if(method!=='GET')writes.push({path,method,body:structuredClone(body)});
      if(path.includes('/configuracoes/acessos')){
        if(method==='PUT'){matrix.perfis[body.perfil]=[...body.acoes];matrix.versao++;}
        return structuredClone(matrix);
      }
      if(path.includes('/equipe/convites')){
        if(method==='POST'){const c={...body,estado:'PENDENTE',expiraEm:'ficticia'};invitations.push(c);return structuredClone(c);}
        return structuredClone(invitations);
      }
      if(path.includes('/equipe')){
        if(method==='PUT'){const i=team.findIndex(f=>path.endsWith('/'+f.id));team[i]={...team[i],...body,versao:body.versao+1};return structuredClone(team[i]);}
        return structuredClone(team);
      }
      return [];
    },atualizarIdentidade:async()=>{}};
    bootstrapApplication(window.kind==='convites'?ConvitesComponent:AcessosComponent,{providers:[{provide:SessaoService,useValue:mock}]}).then(app=>{window.fixture={app:app.components[0],team,roles,writes};});
  `,resolveDir:repo+'/frontend',sourcefile:'profile-template-probe.ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',tsconfigRaw:{compilerOptions:{experimentalDecorators:true}},logLevel:'silent'});
  const name=process.env.RM_TEMPLATE_BROWSER||'chromium';
  assert.ok(['chromium','firefox','webkit'].includes(name));
  const browser=await playwright[name].launch(name==='webkit'&&process.env.RM_WEBKIT_EXECUTABLE?{executablePath:process.env.RM_WEBKIT_EXECUTABLE}:{});
  const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end(req.url==='/convites'?'<app-convites></app-convites>':'<app-acessos></app-acessos>');});
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin='http://127.0.0.1:'+server.address().port;
    const page=await browser.newPage({viewport:{width:360,height:800}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin);await page.addScriptTag({content:built.outputFiles[0].text});
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
    await page.locator('article').nth(4).getByLabel('Perfil do funcionário').selectOption('EXPEDICAO');
    await page.locator('article').nth(4).getByRole('button',{name:'Salvar funcionário'}).click();
    await page.waitForFunction(()=>!window.fixture.app.instance.ocupado());
    assert.deepEqual(await page.evaluate(()=>window.fixture.writes.at(-1)),{path:'/api/v1/equipe/f4',method:'PUT',body:{versao:0,perfil:'EXPEDICAO',ativo:true,unidades:[]}});
    await page.getByRole('button',{name:'Recarregar acessos'}).click();
    await page.waitForFunction(()=>!window.fixture.app.instance.ocupado());
    assert.equal(await page.locator('article').nth(4).getByLabel('Perfil do funcionário').inputValue(),'EXPEDICAO');
    await page.getByLabel('Consultar unidade',{exact:true}).check();
    await page.getByRole('button',{name:'Salvar permissões'}).click();
    await page.waitForFunction(()=>!window.fixture.app.instance.ocupado());
    assert.deepEqual(await page.evaluate(()=>window.fixture.writes.at(-1)),{path:'/api/v1/configuracoes/acessos',method:'PUT',body:{versao:0,perfil:'COZINHA',acoes:['UNIDADE_CONSULTAR']}});
    await page.getByRole('button',{name:'Recarregar acessos'}).click();
    await page.waitForFunction(()=>!window.fixture.app.instance.ocupado());
    assert.equal(await page.getByLabel('Perfil operacional').inputValue(),'COZINHA');
    assert.equal(await page.getByLabel('Consultar unidade',{exact:true}).isChecked(),true);
    const invitation=await browser.newPage();invitation.on('pageerror',error=>errors.push(error.message));
    await invitation.goto(origin+'/convites');await invitation.evaluate(()=>window.kind='convites');
    await invitation.addScriptTag({content:built.outputFiles[0].text});
    await invitation.waitForFunction(()=>window.fixture&&window.fixture.app.instance.carregado());
    await invitation.getByLabel('Perfil do convite').selectOption('GERENTE');
    await invitation.evaluate(()=>window.fixture.app.instance.pendente.set({id:'fixture',email:'convite@example.invalid',perfil:'GERENTE',unidades:[],incerta:true}));
    await invitation.getByRole('button',{name:'Reenviar mesma intenção'}).waitFor();
    await invitation.evaluate(()=>window.fixture.app.instance.pendente.set(null));
    await invitation.getByLabel('Perfil do convite').waitFor();
    assert.equal(await invitation.getByLabel('Perfil do convite').inputValue(),'GERENTE','Formulário recriado deve preservar perfil visível');
    await invitation.getByLabel('E-mail do funcionário convidado').fill('convite@example.invalid');
    await invitation.getByRole('button',{name:'Criar convite',exact:true}).click();
    await invitation.waitForFunction(()=>window.fixture.writes.some(w=>w.method==='POST'));
    const created=await invitation.evaluate(()=>window.fixture.writes.at(-1));
    assert.equal(created.method,'POST');assert.equal(created.path,'/api/v1/equipe/convites');
    assert.equal(created.body.perfil,'GERENTE');assert.equal(created.body.email,'convite@example.invalid');assert.deepEqual(created.body.unidades,[]);
    await invitation.getByRole('button',{name:'Recarregar convites'}).click();
    await invitation.waitForFunction(()=>!window.fixture.app.instance.ocupado());
    assert.ok((await invitation.locator('article').innerText()).includes('GERENTE'));
    assert.deepEqual(errors,[]);
    console.log('Perfis iniciais, recarga, payloads de equipe/matriz/convite e leitura posterior coerentes. API fictícia: não é E2E.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.message);process.exitCode=1;});

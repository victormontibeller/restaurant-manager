// Componentes Angular reais; transporte fictício, sem API/banco: não é E2E.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const repo=path.resolve(__dirname,'..');
const {build}=require(repo+'/frontend/node_modules/esbuild');
const playwright=require(repo+'/frontend/node_modules/playwright');
const {expect}=require(repo+'/frontend/node_modules/@playwright/test');
(async()=>{
  const built=await build({stdin:{contents:`
    import '@angular/compiler';
    import {signal} from '@angular/core';
    import {bootstrapApplication} from '@angular/platform-browser';
    import {IdentidadeComponent} from './src/app/identidade/identidade.component';
    import {ApiFailure,SessaoService} from './src/app/identidade/sessao.service';
    const calls=[];
    const command=async(...args)=>{calls.push(args);if(window.failure)throw new ApiFailure(window.failure,'Código inválido, expirado ou já utilizado.');};
    const mock={identidade:signal(null),restaurar:async()=>{},recuperar:command,cadastrar:command,aceitarConvite:command,verificarEmail:command};
    bootstrapApplication(IdentidadeComponent,{providers:[{provide:SessaoService,useValue:mock}]}).then(app=>window.fixture={app,calls});
  `,resolveDir:repo+'/frontend',sourcefile:'identity-forms-probe.ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',tsconfigRaw:{compilerOptions:{experimentalDecorators:true}},logLevel:'silent'});
  const name=process.env.RM_TEMPLATE_BROWSER||'chromium';
  assert.ok(['chromium','firefox','webkit'].includes(name));
  const browser=await playwright[name].launch(name==='webkit'&&process.env.RM_WEBKIT_EXECUTABLE?{executablePath:process.env.RM_WEBKIT_EXECUTABLE}:{});
  const styles=fs.readFileSync(repo+'/frontend/src/styles.css','utf8');
  const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<style>'+styles+'</style><main><app-identidade></app-identidade></main>');});
  const failures=[];const errors=[];
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const page=await browser.newPage({viewport:{width:360,height:800}});
    page.on('pageerror',error=>errors.push(error.message));
    const forms=[
      {name:'Recuperar senha',code:'codigo-recuperacao',password:'nova-senha',confirm:'confirmar-senha',submit:'Alterar senha',rule:'regra-senha'},
      {name:'Criar conta de cliente',code:'codigo-cadastro',password:'senha-cadastro',confirm:'confirmacao-cadastro',submit:'Verificar e criar conta',rule:'regra-cadastro'},
      {name:'Aceitar convite de funcionário',code:'codigo-convite',password:'senha-convite',confirm:'confirmacao-convite',submit:'Verificar e aceitar convite',rule:'regra-convite'},
      {name:'Verificar e-mail existente',code:'codigo-verificacao',submit:'Confirmar verificação'},
    ];
    for(const form of forms){
      await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({content:built.outputFiles[0].text});
      await expect(page.getByRole('button',{name:form.name,exact:true})).toBeEnabled();
      await page.getByRole('button',{name:form.name,exact:true}).focus();await page.keyboard.press('Enter');
      await expect(page.getByRole('heading',{name:form.name,exact:true})).toBeVisible();
      try{await expect(page.getByRole('heading',{name:form.name,exact:true})).toBeFocused({timeout:1000});}
      catch{failures.push(form.name+': título não recebe foco');}
      const code=page.locator('#'+form.code);const button=page.getByRole('button',{name:form.submit,exact:true});
      if(form.password){
        const password=page.locator('#'+form.password),confirmation=page.locator('#'+form.confirm);
        await code.fill('A'.repeat(43));await password.fill('Senha fictícia 123');await confirmation.fill('Outra senha 456');await button.click();
        await expect(page.getByRole('alert')).toHaveText('As senhas devem ser iguais.');
        try{
          await expect(confirmation).toHaveAttribute('aria-invalid','true',{timeout:1000});
          const message=await confirmation.getAttribute('aria-describedby');assert(message);
          await expect(page.locator('#'+message)).toHaveText('As senhas devem ser iguais.');
        }catch{failures.push(form.name+': divergência sem associação ao campo');}
        assert.equal(await page.evaluate(()=>window.fixture.calls.length),0);
        await expect(password).toHaveValue('');await expect(confirmation).toHaveValue('');
        await password.fill('á'.repeat(37));await confirmation.fill('á'.repeat(37));await button.click();
        await expect(page.getByRole('alert')).toHaveText('A senha deve ter no máximo 72 bytes.');
        try{
          await expect(password).toHaveAttribute('aria-invalid','true',{timeout:1000});
          const ids=(await password.getAttribute('aria-describedby')).split(' ');assert(ids.includes(form.rule));
          assert.equal(ids.length,2);
          await expect(page.locator('#'+ids.find(id=>id!==form.rule))).toHaveText('A senha deve ter no máximo 72 bytes.');
          await expect(password).toHaveAccessibleDescription(/A senha deve ter no máximo 72 bytes\./);
          await expect(confirmation).not.toHaveAttribute('aria-invalid','true');
        }catch{failures.push(form.name+': limite UTF-8 sem associação ao campo');}
        assert.equal(await page.evaluate(()=>window.fixture.calls.length),0);
        await password.fill('Senha fictícia 123');await confirmation.fill('Senha fictícia 123');
        await page.evaluate(()=>window.failure=503);await button.click();
        await expect(page.getByRole('alert')).toContainText('A resposta não chegou.');
        await expect(password).not.toHaveAttribute('aria-invalid','true');await expect(confirmation).not.toHaveAttribute('aria-invalid','true');
        await expect(code).not.toHaveAttribute('aria-invalid','true');
        await password.fill('Senha fictícia 123');await confirmation.fill('Senha fictícia 123');
        await page.evaluate(()=>window.failure=0);await button.click();
        await expect(page.getByRole('status')).toContainText(/Senha alterada|Conta criada|Convite aceito/);
        await expect(code).toHaveValue('');await expect(password).toHaveValue('');await expect(confirmation).toHaveValue('');
        assert.equal(await page.evaluate(()=>window.fixture.calls.length),2);
      }
      for(const width of [360,768,1280]){
        await page.setViewportSize({width,height:800});
        assert(await page.evaluate(()=>document.documentElement.scrollWidth)<=width,'Overflow '+form.name);
      }
      // Este bundle JIT não gera metadados de output(); E2E cobre a emissão.
      await page.evaluate(()=>window.fixture.app.components[0].instance.voltarAoLogin());
      await expect(page.getByLabel('E-mail',{exact:true})).toBeFocused();
      assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    console.log(name+': foco nas quatro jornadas, erros de senha associados, UTF-8, limpeza, resultado incerto e handler de retorno aprovados; transporte fictício/JIT.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});

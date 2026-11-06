import {test,expect,Page} from '@playwright/test';
import fs from 'node:fs';

interface Conta {
  host:string;email:string;senha:string;perfil:string;usuario_id:string;
  empresa_id?:string;unit?:string;second_unit?:string;allowed_unit?:string;forbidden_unit?:string;
}
interface Massa {stage:string;approved:boolean;git_sha:string;accounts:Conta[];empresas_adicionais?:string[];}
const path=process.env['RM_HML_FIXTURE'];
if(!path)throw new Error('Massa privada consolidada de homologação obrigatória.');
const fixture=JSON.parse(fs.readFileSync(path,'utf8')) as Massa;
const profiles=['ADMINISTRADOR','ADMINISTRADOR','GERENTE','ATENDIMENTO','CAIXA','COZINHA','EXPEDICAO','CLIENTE','CLIENTE','OPERADOR_SAAS'];
if(fixture.stage!=='hml'||fixture.approved!==true||fixture.accounts.length!==10||
   new Set(fixture.accounts.map(a=>a.host+'/'+a.usuario_id)).size!==10||
   new Set(fixture.accounts.map(a=>a.host+'/'+a.email)).size!==10||
   fixture.accounts[0].empresa_id===fixture.accounts[1].empresa_id||
   fixture.accounts.some((a,i)=>!a.usuario_id||a.perfil!==profiles[i]||
     a.host!==(i===1?'hmlb.localhost':i===9?'plataforma.localhost':'hmla.localhost')||
     (i!==9&&!a.empresa_id))){
  throw new Error('Massa incompleta ou fora das origens de homologação.');
}
const additional=fixture.empresas_adicionais===undefined?[]:fixture.empresas_adicionais;
if(!Array.isArray(additional)||additional.length>48||new Set(additional).size!==additional.length||
   additional.some(id=>typeof id!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id)||
     fixture.accounts.slice(0,2).some(a=>a.empresa_id===id))){
  throw new Error('Empresas adicionais exigem inventário explícito, UUIDs únicos e limite da página.');
}
const companyIds=[...fixture.accounts.slice(0,2).map(a=>a.empresa_id),...additional];
const origin=(host:string)=>`https://${host}:8088`;
async function screen(page:Page,name:string):Promise<void>{
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({path:test.info().outputPath(name+'.png'),fullPage:false});
}
for(const [index,account] of fixture.accounts.entries()){
  test(`S01-HML${String(index+1).padStart(2,'0')}: ${account.perfil} acessa somente seu contexto real`,async({page,context})=>{
    const platform=account.perfil==='OPERADOR_SAAS';
    const base=origin(account.host);
    const prefix=platform?'/api/v1/plataforma/auth':'/api/v1/auth';
    await page.goto(base+(platform?'/?area=plataforma':'/'));
    const login=page.getByRole('button',{name:platform?'Entrar na plataforma':'Entrar',exact:true});
    await expect(login).toBeEnabled();
    await page.getByLabel(platform?'E-mail do operador':'E-mail',{exact:true}).fill(account.email);
    await page.getByLabel(platform?'Senha do operador':'Senha',{exact:true}).fill(account.senha);
    const responsePromise=page.waitForResponse(r=>r.url()===base+prefix+'/login'&&r.request().method()==='POST');
    await login.focus();await expect(login).toBeFocused();await page.keyboard.press('Enter');
    const response=await responsePromise;expect(response.status()).toBe(200);
    const token=(await response.json()).accessToken as string;
    const headers={Authorization:'Bearer '+token};
    await expect(page.getByText('Perfil: '+account.perfil,{exact:true})).toBeVisible();
    const cookieName=platform?'RM_PLATFORM_REFRESH':'RM_REFRESH';
    const refresh=(await context.cookies()).find(c=>c.name===cookieName);
    expect(refresh).toBeTruthy();expect(refresh?.httpOnly).toBe(true);expect(refresh?.secure).toBe(true);
    expect(refresh?.sameSite).toBe('Strict');expect(refresh?.domain).toBe(account.host);expect(refresh?.path).toBe(prefix);
    expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
    const api=page.request;
    if(platform){
      await expect(page.getByRole('status').filter({hasText:'Consulta atualizada.'})).toBeVisible();
      await expect(page.getByRole('article')).toHaveCount(companyIds.length);
      const result=await api.get(base+'/api/v1/plataforma/empresas',{headers});expect(result.status()).toBe(200);
      const companies=await result.json() as Array<Record<string,unknown>>;
      expect(companies.map(c=>c['id']).sort()).toEqual([...companyIds].sort());
      for(const company of companies)expect(Object.keys(company).sort()).toEqual(['dominios','estado','id','nome','versao']);
      expect((await api.get(origin('hmla.localhost')+'/api/v1/auth/me',{headers})).status()).toBe(401);
      expect((await api.get(base+'/api/v1/plataforma/empresas')).status()).toBe(401);
      await page.getByLabel('Identificador da empresa').fill(fixture.accounts[0].empresa_id!);
      await page.getByRole('button',{name:'Consultar estado comercial',exact:true}).click();
      await expect(page.getByTestId('empresa-estado')).toContainText('ATIVO');
      await screen(page,'saas-consulta');
    }else{
      const me=await api.get(base+'/api/v1/auth/me',{headers});expect(me.status()).toBe(200);
      expect(await me.json()).toMatchObject({usuarioId:account.usuario_id,empresaId:account.empresa_id,perfil:account.perfil});
      const other=account.host==='hmla.localhost'?'hmlb.localhost':'hmla.localhost';
      expect((await api.get(origin(other)+'/api/v1/auth/me',{headers})).status()).toBe(401);
      expect((await api.get(origin('plataforma.localhost')+'/api/v1/plataforma/empresas',{headers})).status()).toBe(401);
      if(account.perfil==='ADMINISTRADOR'){
        await expect(page.getByRole('heading',{name:'Configurações de acessos'})).toBeVisible();
        const select=page.getByLabel('Perfil operacional');await expect(select).toBeEnabled();
        await select.selectOption('COZINHA');await expect(select).toHaveValue('COZINHA');
        await expect(page.getByLabel('Iniciar preparo',{exact:true})).toBeChecked();
        await screen(page,'administracao-acessos');
        await page.getByRole('button',{name:'Gerenciar unidades',exact:true}).click();
        await expect(page.getByRole('heading',{name:'Configurações de unidades',exact:true})).toBeVisible();
        const units=await api.get(base+'/api/v1/configuracoes/unidades',{headers});expect(units.status()).toBe(200);
        const list=await units.json() as Array<{id:string}>;expect(list.map(u=>u.id)).toContain(account.unit);
        if(account.second_unit)expect(list.map(u=>u.id)).toContain(account.second_unit);
        await page.getByRole('button',{name:'Gerenciar convites',exact:true}).click();
        await expect(page.getByRole('heading',{name:'Convites de funcionários',exact:true})).toBeVisible();
        expect((await api.get(base+'/api/v1/equipe/convites',{headers})).status()).toBe(200);
      }else{
        await expect(page.getByRole('navigation',{name:'Configurações da empresa'})).toHaveCount(0);
        for(const path of ['/api/v1/equipe','/api/v1/configuracoes/acessos','/api/v1/configuracoes/unidades','/api/v1/equipe/convites']){
          expect((await api.get(base+path,{headers})).status()).toBe(403);
        }
        if(account.perfil==='CLIENTE'){
          await expect(page.getByRole('button',{name:'Acompanhar atualizações da unidade'})).toHaveCount(0);
          expect((await api.get(base+'/api/v1/operacao/unidades/'+account.allowed_unit+'/eventos',{headers})).status()).toBe(403);
        }else{
          await page.getByRole('button',{name:'Acompanhar atualizações da unidade'}).click();
          const select=page.getByLabel('Unidade acompanhada',{exact:true});
          await expect(select.locator(`option[value="${account.allowed_unit}"]`)).toHaveCount(1);
          await expect(select.locator(`option[value="${account.forbidden_unit}"]`)).toHaveCount(0);
          await select.selectOption(account.allowed_unit!);await expect(page.getByTestId('unidade-atual')).toBeVisible();
          const events=await api.get(base+'/api/v1/operacao/unidades/'+account.allowed_unit+'/eventos',{headers});expect(events.status()).toBe(200);
          expect((await api.get(base+'/api/v1/operacao/unidades/'+account.forbidden_unit+'/eventos',{headers})).status()).toBe(404);
          await select.focus();await expect(select).toBeFocused();
        }
        await screen(page,'conta-'+account.perfil.toLowerCase());
      }
    }
    await page.reload();await expect(page.getByText('Perfil: '+account.perfil,{exact:true})).toBeVisible();
    expect((await context.cookies()).find(c=>c.name===cookieName)?.value).not.toBe(refresh?.value);
    const logout=page.waitForResponse(r=>r.url()===base+prefix+'/logout'&&r.request().method()==='POST');
    await page.getByRole('button',{name:platform?'Sair da plataforma':'Sair da conta',exact:true}).click();
    expect((await logout).status()).toBe(204);await expect(login).toBeEnabled();
    expect((await api.get(base+(platform?'/api/v1/plataforma/empresas':'/api/v1/auth/me'),{headers})).status()).toBe(401);
    expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
    await page.reload();await expect(login).toBeEnabled();await expect(page.getByText('Perfil: '+account.perfil,{exact:true})).toHaveCount(0);
  });
}

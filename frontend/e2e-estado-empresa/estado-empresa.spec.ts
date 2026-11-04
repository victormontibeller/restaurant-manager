import {test,expect,Page} from '@playwright/test';
import fs from 'node:fs';
const arquivo=process.env['RM_PLATFORM_FIXTURE'];const empresaArquivo=process.env['RM_AUTH_FIXTURE'];
if(!arquivo||!empresaArquivo)throw new Error('Fixtures privadas SaaS e empresarial obrigatórias.');
const fixture=JSON.parse(fs.readFileSync(arquivo,'utf8')) as {email:string;senha:string};
const empresa=JSON.parse(fs.readFileSync(empresaArquivo,'utf8')) as {id:string};
const url='/api/v1/plataforma/empresas/'+empresa.id;
async function entrar(page:Page):Promise<string>{
  await page.goto('/?area=plataforma');await expect(page.getByRole('button',{name:'Entrar na plataforma',exact:true})).toBeEnabled();
  await page.getByLabel('E-mail do operador').fill(fixture.email);await page.getByLabel('Senha do operador',{exact:true}).fill(fixture.senha);
  const response=page.waitForResponse(r=>r.url().endsWith('/plataforma/auth/login')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Entrar na plataforma',exact:true}).click();const login=await response;expect(login.status()).toBe(200);
  const body=await login.json() as {accessToken:string};await expect(page.getByText('Perfil: OPERADOR_SAAS',{exact:true})).toBeVisible();
  await expect(page.getByRole('status').filter({hasText:'Consulta atualizada.'})).toBeVisible();return body.accessToken;
}
async function consultar(page:Page):Promise<void>{
  await page.getByLabel('Identificador da empresa').fill(empresa.id);
  const response=page.waitForResponse(r=>r.url().endsWith(url)&&r.request().method()==='GET');
  await page.getByRole('button',{name:'Consultar estado comercial',exact:true}).click();expect((await response).status()).toBe(200);
  await expect(page.getByRole('status').filter({hasText:'Estado comercial consultado.'})).toBeVisible();
}
async function confirmar(page:Page,senha=fixture.senha,status=204):Promise<void>{
  await page.getByLabel('Senha de confirmação do operador').fill(senha);
  const response=page.waitForResponse(r=>r.url().endsWith('/plataforma/auth/reautenticar')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Confirmar senha SaaS',exact:true}).click();expect((await response).status()).toBe(status);
  if(status===204)await expect(page.getByRole('status').filter({hasText:'Senha confirmada por cinco minutos'})).toBeVisible();
}
async function alterar(page:Page,status=200):Promise<void>{
  await page.getByLabel('Motivo da alteração comercial').fill('Ensaio fictício de suspensão comercial');
  const response=page.waitForResponse(r=>r.url().endsWith(url+'/estado')&&r.request().method()==='PUT');
  await page.getByRole('button',{name:'Aplicar estado comercial',exact:true}).click();expect((await response).status()).toBe(status);
  if(status===200)await expect(page.getByRole('status').filter({hasText:'Estado comercial atualizado.'})).toBeVisible();
}
async function restaurar(page:Page,token:string):Promise<void>{
  const headers={Authorization:'Bearer '+token};const r=await page.request.get(url,{headers});expect(r.status()).toBe(200);
  const atual=await r.json() as {estado:string;versao:number};if(atual.estado==='ATIVO')return;
  expect((await page.request.post('/api/v1/plataforma/auth/reautenticar',{headers,data:{senha:fixture.senha}})).status()).toBe(204);
  expect((await page.request.put(url+'/estado',{headers,data:{versao:atual.versao,estado:'ATIVO',motivo:'Finalização do ensaio fictício'}})).status()).toBe(200);
}
async function localizarCartao(page:Page):Promise<void>{
  for(let pagina=0;pagina<100;pagina++){
    if(await page.getByRole('article').filter({hasText:empresa.id}).count())return;
    const proxima=page.getByRole('button',{name:'Próxima página',exact:true});expect(await proxima.isEnabled()).toBe(true);
    const response=page.waitForResponse(r=>r.url().includes('/plataforma/empresas?pagina=')&&r.request().method()==='GET');
    await proxima.click();expect((await response).status()).toBe(200);await expect(proxima).toBeEnabled().catch(async()=>{expect(await page.getByRole('article').filter({hasText:empresa.id}).count()).toBe(1);});
  }
  throw new Error('Empresa fictícia não encontrada nas páginas consultadas.');
}

test('S01-UI26: suspensão e reativação exigem confirmação sem bloquear consultas empresariais',async({page})=>{
  const token=await entrar(page);
  try{
    await consultar(page);await expect(page.getByTestId('empresa-estado')).toContainText('ATIVO');
    await alterar(page,403);await expect(page.getByRole('alert')).toContainText('Confirme sua senha');await expect(page.getByRole('alert')).toBeFocused();
    await consultar(page);await confirmar(page,'incorreta',422);await expect(page.getByRole('alert')).toContainText('Senha de confirmação inválida');await expect(page.getByLabel('Senha de confirmação do operador')).toHaveValue('');
    await confirmar(page);await alterar(page);await expect(page.getByTestId('empresa-estado')).toContainText('SUSPENSO');
    const business=new URL(page.url());business.hostname='c4.localhost';business.pathname='/api/v1/unidades';business.search='';
    expect((await page.request.get(business.toString())).status()).toBe(200);
    await alterar(page);await expect(page.getByTestId('empresa-estado')).toContainText('ATIVO');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:test.info().outputPath('estado-comercial-mobile.png'),fullPage:true});
  }finally{await restaurar(page,token);}
});
test('S01-UI27: resposta perdida reconcilia detalhe e cartão sem repetir a escrita',async({page})=>{
  const token=await entrar(page);
  try{
    await localizarCartao(page);await consultar(page);await confirmar(page);
    const antes=await page.request.get(url,{headers:{Authorization:'Bearer '+token}});const original=await antes.json() as {versao:number};
    let escritas=0;await page.route('**'+url+'/estado',async route=>{escritas++;const r=await route.fetch();expect(r.status()).toBe(200);await route.fulfill({status:502,contentType:'text/html',body:'Resposta perdida no intermediário de teste'});},{times:1});
    await alterar(page,502);await expect(page.getByRole('alert')).toContainText('A alteração pode ter sido aplicada');await expect(page.getByRole('button',{name:'Aplicar estado comercial',exact:true})).toBeDisabled();
    await consultar(page);await expect(page.getByTestId('empresa-estado')).toContainText('SUSPENSO');
    await expect(page.getByRole('article').filter({hasText:empresa.id})).toContainText('Estado: SUSPENSO');expect(escritas).toBe(1);
    expect((await page.request.put(url+'/estado',{headers:{Authorization:'Bearer '+token},data:{versao:original.versao,estado:'SUSPENSO',motivo:'Reenvio da versão antiga'}})).status()).toBe(409);
    await alterar(page);await expect(page.getByTestId('empresa-estado')).toContainText('ATIVO');
  }finally{await restaurar(page,token);}
});
test('S01-UI28: versão concorrente e consulta offline exigem reconciliação explícita',async({page,context})=>{
  const token=await entrar(page);
  try{
    await consultar(page);await confirmar(page);const atual=await (await page.request.get(url,{headers:{Authorization:'Bearer '+token}})).json() as {versao:number};
    expect((await page.request.put(url+'/estado',{headers:{Authorization:'Bearer '+token},data:{versao:atual.versao,estado:'SUSPENSO',motivo:'Outro operador fictício'}})).status()).toBe(200);
    await alterar(page,409);await expect(page.getByRole('alert')).toContainText('Estado ou versão alterados');
    await context.setOffline(true);await page.getByRole('button',{name:'Consultar estado comercial',exact:true}).focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toContainText('Sem conexão');await expect(page.getByRole('button',{name:'Aplicar estado comercial',exact:true})).toBeDisabled();
    await context.setOffline(false);await consultar(page);await expect(page.getByTestId('empresa-estado')).toContainText('SUSPENSO');
    await alterar(page);await expect(page.getByTestId('empresa-estado')).toContainText('ATIVO');
    expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
  }finally{await context.setOffline(false);await restaurar(page,token);}
});

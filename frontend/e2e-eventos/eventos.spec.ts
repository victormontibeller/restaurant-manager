import {test,expect,Page,APIRequestContext} from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
interface Conta {id:string;email:string;senha:string;}
interface Massa {admin:Conta;cozinha:Conta;cliente:Conta;}
const arquivo=process.env['RM_EVENT_FIXTURE'];
const massas=arquivo?JSON.parse(fs.readFileSync(arquivo,'utf8')) as Record<string,Massa>:null;
function massa():Massa{if(!massas)throw new Error('Massa privada de eventos obrigatória.');return massas[test.info().project.name];}
async function entrar(page:Page,conta:Conta):Promise<string>{
  await page.goto('/');await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeEnabled();
  await page.getByLabel('E-mail',{exact:true}).fill(conta.email);await page.getByLabel('Senha',{exact:true}).fill(conta.senha);
  const login=page.waitForResponse(r=>r.url().endsWith('/api/v1/auth/login')&&r.request().method()==='POST',{timeout:20000});
  await page.getByRole('button',{name:'Entrar',exact:true}).click();const response=await login;expect(response.status()).toBe(200);
  await expect(page.getByRole('button',{name:'Sair da conta'})).toBeVisible();return (await response.json()).accessToken;
}
async function administrador(request:APIRequestContext):Promise<string>{
  const conta=massa().admin;const csrf=await (await request.get('/api/v1/auth/csrf')).json();
  const login=await request.post('/api/v1/auth/login',{headers:{[csrf.headerName]:csrf.token},data:{email:conta.email,senha:conta.senha}});expect(login.status()).toBe(200);
  const token=(await login.json()).accessToken;
  expect((await request.post('/api/v1/auth/reautenticar',{headers:{Authorization:'Bearer '+token},data:{senha:conta.senha}})).status()).toBe(204);return token;
}
async function criar(request:APIRequestContext,token:string,nome:string):Promise<string>{
  const id=crypto.randomUUID();expect((await request.post('/api/v1/configuracoes/unidades',{headers:{Authorization:'Bearer '+token},data:{id,nome,fuso:'UTC',ativa:true}})).status()).toBe(200);return id;
}
async function acompanhar(page:Page,id:string):Promise<void>{
  await page.getByRole('button',{name:'Acompanhar atualizações da unidade'}).click();
  await expect(page.getByLabel('Unidade acompanhada',{exact:true})).toContainText('Selecione uma unidade');
  await expect(page.getByLabel('Unidade acompanhada',{exact:true}).locator('option[value="'+id+'"]')).toHaveCount(1);
  await page.getByLabel('Unidade acompanhada',{exact:true}).selectOption(id);
  await expect(page.getByText('Acompanhamento conectado.',{exact:true})).toBeVisible();
}
test('S01-UI32: atualização durável, reconexão e leitura acessível sem duplicação',async({page,request,context})=>{
  const token=await administrador(request);const id=await criar(request,token,'Unidade acompanhada '+crypto.randomUUID());
  await entrar(page,massa().admin);await acompanhar(page,id);
  const nome='Unidade atualizada '+crypto.randomUUID();
  expect((await request.put('/api/v1/configuracoes/unidades/'+id,{headers:{Authorization:'Bearer '+token},data:{versao:0,nome,fuso:'America/Manaus',ativa:true}})).status()).toBe(200);
  await expect(page.getByTestId('unidade-atual')).toContainText(nome,{timeout:15000});
  await expect(page.getByRole('list',{name:'Alterações cadastrais recebidas'}).getByRole('listitem')).toHaveCount(2);
  await context.setOffline(true);await expect(page.getByText('Sem conexão confirmada. Tentando recuperar o acompanhamento…')).toBeVisible({timeout:20000});
  await expect(page.getByTestId('unidade-atual')).toHaveCount(0);
  await context.setOffline(false);await expect(page.getByTestId('unidade-atual')).toContainText(nome,{timeout:20000});
  await expect(page.getByRole('list',{name:'Alterações cadastrais recebidas'}).getByRole('listitem')).toHaveCount(2);
  await page.getByLabel('Unidade acompanhada',{exact:true}).focus();await expect(page.getByLabel('Unidade acompanhada',{exact:true})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
  await page.screenshot({path:test.info().outputPath('eventos-unidade.png'),fullPage:true});
});
test('S01-UI33: Cozinha perde evento por ação e vínculo com o mesmo JWT',async({page,request})=>{
  const admin=await administrador(request);const headers={Authorization:'Bearer '+admin};const id=await criar(request,admin,'Unidade da cozinha');const outra=await criar(request,admin,'Filial proibida');
  const funcionarios=await (await request.get('/api/v1/equipe',{headers})).json();const funcionario=funcionarios.find((x:{id:string})=>x.id===massa().cozinha.id);expect(funcionario).toBeTruthy();
  expect((await request.put('/api/v1/equipe/'+funcionario.id,{headers,data:{versao:funcionario.versao,perfil:'COZINHA',ativo:true,unidades:[id]}})).status()).toBe(200);
  const token=await entrar(page,massa().cozinha);await acompanhar(page,id);
  expect((await request.get('/api/v1/operacao/unidades/'+outra+'/eventos',{headers:{Authorization:'Bearer '+token}})).status()).toBe(404);
  await expect(page.getByLabel('Unidade acompanhada',{exact:true})).not.toContainText('Filial proibida');
  const matriz=await (await request.get('/api/v1/configuracoes/acessos',{headers})).json();
  const negadas=matriz.perfis.COZINHA.filter((a:string)=>a!=='unidade.acompanhar');
  expect((await request.put('/api/v1/configuracoes/acessos',{headers,data:{versao:matriz.versao,perfil:'COZINHA',acoes:negadas}})).status()).toBe(200);
  await expect(page.getByText('Acesso à unidade removido ou sessão encerrada. Recarregue as unidades permitidas.')).toBeVisible({timeout:15000});
  await expect(page.getByTestId('unidade-atual')).toHaveCount(0);
  expect((await request.get('/api/v1/operacao/unidades/'+id+'/eventos',{headers:{Authorization:'Bearer '+token}})).status()).toBe(403);
  expect((await request.put('/api/v1/configuracoes/acessos',{headers,data:{versao:matriz.versao+1,perfil:'COZINHA',acoes:matriz.perfis.COZINHA}})).status()).toBe(200);
  await page.getByRole('button',{name:'Recarregar unidades permitidas'}).click();await expect(page.getByLabel('Unidade acompanhada',{exact:true}).locator('option[value="'+id+'"]')).toHaveCount(1);
  await page.getByLabel('Unidade acompanhada',{exact:true}).selectOption(id);await expect(page.getByTestId('unidade-atual')).toBeVisible();
  expect((await request.put('/api/v1/equipe/'+funcionario.id,{headers,data:{versao:funcionario.versao+1,perfil:'COZINHA',ativo:true,unidades:[]}})).status()).toBe(200);
  await expect(page.getByText('Acompanhamento encerrado.',{exact:true})).toBeVisible({timeout:15000});
  expect((await request.get('/api/v1/operacao/unidades/'+id+'/eventos',{headers:{Authorization:'Bearer '+token}})).status()).toBe(404);
});
test('S01-UI34: Cliente não recebe acompanhamento nem eventos de outra empresa',async({page,request})=>{
  const token=await entrar(page,massa().cliente);
  await expect(page.getByRole('button',{name:'Acompanhar atualizações da unidade'})).toHaveCount(0);
  const url='/api/v1/operacao/unidades/11111111-1111-1111-1111-111111111111/eventos';
  const denied=await request.get(url,{headers:{Authorization:'Bearer '+token}});expect(denied.status()).toBe(403);expect(await denied.text()).not.toContain('eventos');
  const foreign=await request.get('https://b.localhost:8089'+url,{headers:{Authorization:'Bearer '+token}});expect(foreign.status()).toBe(401);
  await page.getByRole('button',{name:'Sair da conta'}).click();await expect(page.getByRole('heading',{name:'Acessar minha conta'})).toBeVisible();
  expect((await request.get(url,{headers:{Authorization:'Bearer '+token}})).status()).toBe(401);
});

import {test,expect,Page} from '@playwright/test';
import fs from 'node:fs';
const fixture=JSON.parse(fs.readFileSync(process.env['RM_AUTH_FIXTURE']!,'utf8')) as {email:string;senha:string};
async function entrar(page:Page):Promise<void>{
  await page.getByLabel('E-mail',{exact:true}).fill(fixture.email);
  await page.getByLabel('Senha',{exact:true}).fill(fixture.senha);
  const response=page.waitForResponse(r=>r.url().endsWith('/auth/login')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();expect((await response).status()).toBe(200);
  await expect(page.getByText('Perfil: ADMINISTRADOR')).toBeVisible();
}
async function confirmar(page:Page):Promise<void>{
  await page.getByLabel('Confirme sua senha').fill(fixture.senha);
  const response=page.waitForResponse(r=>r.url().endsWith('/auth/reautenticar')&&r.request().method()==='POST',{timeout:12000});
  await page.getByRole('button',{name:'Confirmar identidade'}).click();expect((await response).status()).toBe(204);
}
test('S01-UI07: logout e retry sem reautenticação não descartam intenção incerta',async({page})=>{
  await page.goto('/');await entrar(page);
  await page.getByRole('button',{name:'Gerenciar unidades',exact:true}).click();await confirmar(page);
  const nome='Pendente '+crypto.randomUUID().slice(0,8);
  await page.getByLabel('Nome da nova unidade').fill(nome);
  await page.getByLabel('Fuso da nova unidade').fill('America/Manaus');
  let id='';
  await page.route('**/api/v1/configuracoes/unidades',async route=>{
    if(route.request().method()!=='POST'){await route.continue();return;}
    const response=await route.fetch();expect(response.status()).toBe(200);id=(await response.json()).id;await route.abort('failed');
  },{times:1});
  await page.getByRole('button',{name:'Criar unidade',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Conexão interrompida');
  await page.getByRole('button',{name:'Sair da conta'}).click();
  await expect(page.getByText('Sessão encerrada no servidor.')).toBeVisible();
  await entrar(page);
  await expect(page.getByRole('button',{name:'Reconciliar criação'})).toBeVisible();
  await expect(page.getByLabel('Intenção preservada')).toHaveText(nome+' · America/Manaus');
  await expect(page.getByRole('button',{name:'Gerenciar acessos',exact:true})).toBeDisabled();
  const retry=page.waitForResponse(r=>r.url().endsWith('/configuracoes/unidades')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Reenviar criação'}).click();
  const denied=await retry;expect(denied.status()).toBe(403);expect(denied.request().postDataJSON().id).toBe(id);
  await expect(page.getByRole('button',{name:'Reconciliar criação'})).toBeVisible();
  await expect(page.getByLabel('Nome da nova unidade')).toBeDisabled();
  await page.getByRole('button',{name:'Reconciliar criação'}).click();
  await expect(page.getByRole('heading',{name:nome,exact:true})).toHaveCount(1);
  await expect(page.getByText('Unidade criada no servidor. Recarregue para ordenar a lista.')).toBeVisible();
  await page.getByRole('button',{name:'Sair da conta'}).click();
});

test('S01-UI08: gravação de acessos bloqueia navegação até resposta real',async({page})=>{
  await page.goto('/');await entrar(page);await confirmar(page);
  let liberar!:()=>void;const gate=new Promise<void>(resolve=>{liberar=resolve;});
  let gravou!:()=>void;const gravada=new Promise<void>(resolve=>{gravou=resolve;});
  await page.route('**/api/v1/configuracoes/acessos',async route=>{
    if(route.request().method()!=='PUT'){await route.continue();return;}
    const response=await route.fetch();expect(response.status()).toBe(200);gravou();await gate;await route.fulfill({response});
  },{times:1});
  const recebida=page.waitForResponse(r=>r.url().endsWith('/api/v1/configuracoes/acessos')&&r.request().method()==='PUT');
  await page.getByRole('button',{name:'Salvar permissões'}).click();await gravada;
  try{await expect(page.getByRole('button',{name:'Gerenciar unidades',exact:true})).toBeDisabled();}finally{liberar();}
  const response=await recebida;expect(response.status()).toBe(200);await response.finished();
  // A massa persistente gera milhares de controles de vínculos. O trace mostrou
  // resposta entregue antes da reconciliação visual; esperar o estado de fim
  // da operação, sem retry da escrita ou pausa fixa.
  await expect(page.getByRole('region',{name:'Configurações de acessos'})).toHaveAttribute('aria-busy','false',{timeout:15000});
  await expect(page.getByText('Permissões salvas no servidor.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Gerenciar unidades',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Sair da conta'}).click();
});

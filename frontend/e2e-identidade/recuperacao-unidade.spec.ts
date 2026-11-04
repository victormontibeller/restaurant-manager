import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const fixture=JSON.parse(fs.readFileSync(process.env['RM_AUTH_FIXTURE']!,'utf8')) as {email:string;senha:string};

test('S01-UI06: resposta perdida preserva intenção e reconcilia criação real',async({page})=>{
  await page.goto('/');
  await page.getByLabel('E-mail',{exact:true}).fill(fixture.email);
  await page.getByLabel('Senha',{exact:true}).fill(fixture.senha);
  const login=page.waitForResponse(r=>r.url().endsWith('/auth/login')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();expect((await login).status()).toBe(200);
  await page.getByRole('button',{name:'Gerenciar unidades',exact:true}).click();
  await page.getByLabel('Confirme sua senha').fill(fixture.senha);
  const reauth=page.waitForResponse(r=>r.url().endsWith('/auth/reautenticar')&&r.request().method()==='POST',{timeout:12000});
  await page.getByRole('button',{name:'Confirmar identidade'}).click();expect((await reauth).status()).toBe(204);
  await expect(page.getByText('Identidade confirmada por cinco minutos.')).toBeVisible();
  const nome='Recuperada '+crypto.randomUUID().slice(0,8);
  await page.getByLabel('Nome da nova unidade').fill(nome);
  let liberar!:()=>void;
  const gate=new Promise<void>(resolve=>{liberar=resolve;});
  let criada!:()=>void;
  const persistida=new Promise<void>(resolve=>{criada=resolve;});
  await page.route('**/api/v1/configuracoes/unidades',async route=>{
    if(route.request().method()!=='POST'){await route.continue();return;}
    // Executa a API real e perde SOMENTE a resposta, depois do commit confirmado.
    const response=await route.fetch();expect(response.status()).toBe(200);criada();
    await gate;await route.abort('failed');
  },{times:1});
  await page.getByRole('button',{name:'Criar unidade',exact:true}).click();
  await persistida;
  try {await expect(page.getByRole('button',{name:'Gerenciar acessos',exact:true})).toBeDisabled();}
  finally {liberar();}
  await expect(page.getByRole('alert')).toContainText('Conexão interrompida');
  await expect(page.getByLabel('Nome da nova unidade')).toBeDisabled();
  await expect(page.getByRole('button',{name:'Gerenciar acessos',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Reconciliar criação'}).click();
  await expect(page.getByText('Unidade criada no servidor. Recarregue para ordenar a lista.')).toBeVisible();
  await expect(page.getByRole('heading',{name:nome,exact:true})).toHaveCount(1);
  await expect(page.getByLabel('Nome da nova unidade')).toBeEnabled();
  await expect(page.getByRole('button',{name:'Gerenciar acessos',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Gerenciar acessos',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Configurações de acessos'})).toBeVisible();
  await page.getByRole('button',{name:'Sair da conta'}).click();
});

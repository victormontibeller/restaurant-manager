import {test,expect,Page} from '@playwright/test';
import fs from 'node:fs';
const file=process.env['RM_AUTH_FIXTURE'];
if(!file) throw new Error('Massa privada obrigatória.');
const fixture=JSON.parse(fs.readFileSync(file,'utf8')) as {email:string;senha:string};

async function confirmarResposta(page:Page,rota:string,metodo:string,status:number,acao:()=>Promise<void>):Promise<void>{
  const resposta=page.waitForResponse(r=>r.url().endsWith(rota)&&r.request().method()===metodo,{timeout:15000});
  await acao();expect((await resposta).status()).toBe(status);
}

test('S01-UI04: matriz, reautenticação, persistência e último administrador',async({page})=>{
  // Trace medido: Firefox gasta 16s no setup e WebKit chega ao último
  // comando após 60s. Prazo da jornada, não retry nem relaxamento de assertivas.
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByLabel('E-mail',{exact:true}).fill(fixture.email);
  await page.getByLabel('Senha',{exact:true}).fill(fixture.senha);
  const login=page.waitForResponse(r=>r.url().endsWith('/auth/login')&&r.request().method()==='POST',{timeout:12000});
  const loaded=Promise.all(['/auth/me','/configuracoes/acessos','/equipe?pagina=0','/operacao/unidades'].map(path=>
    page.waitForResponse(r=>r.url().endsWith(path)&&r.request().method()==='GET')));
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  expect((await login).status()).toBe(200);
  for(const response of await loaded){expect(response.status()).toBe(200);await response.finished();}
  await expect(page.getByRole('heading',{name:'Configurações de acessos'})).toBeVisible();
  await expect(page.getByLabel('Perfil operacional')).toBeEnabled();
  await page.getByLabel('Perfil operacional').selectOption('COZINHA');
  const kitchen=page.getByLabel('Iniciar preparo',{exact:true});
  await expect(kitchen).toBeChecked();
  await kitchen.uncheck();
  await confirmarResposta(page,'/configuracoes/acessos','PUT',403,()=>page.getByRole('button',{name:'Salvar permissões'}).click());
  await expect(page.getByRole('alert')).toHaveText('Confirme sua senha antes de alterar acessos.');
  await page.getByLabel('Confirme sua senha').fill('senha-incorreta');
  await confirmarResposta(page,'/auth/reautenticar','POST',422,()=>page.getByRole('button',{name:'Confirmar identidade'}).click());
  await expect(page.getByRole('alert')).toHaveText('Senha de confirmação inválida.');
  await expect(kitchen).not.toBeChecked();
  await page.getByLabel('Confirme sua senha').fill(fixture.senha);
  await confirmarResposta(page,'/auth/reautenticar','POST',204,()=>page.getByRole('button',{name:'Confirmar identidade'}).click());
  await expect(page.getByText('Identidade confirmada por cinco minutos.')).toBeVisible();
  await confirmarResposta(page,'/configuracoes/acessos','PUT',200,()=>page.getByRole('button',{name:'Salvar permissões'}).click());
  await expect(page.getByText('Permissões salvas no servidor.')).toBeVisible();
  const reload=Promise.all(['/configuracoes/acessos','/equipe?pagina=0','/operacao/unidades'].map(path=>
    page.waitForResponse(r=>r.url().endsWith(path)&&r.request().method()==='GET')));
  await page.getByRole('button',{name:'Recarregar acessos'}).click();
  for(const response of await reload){expect(response.status()).toBe(200);await response.finished();}
  await expect(page.getByLabel('Perfil operacional')).toBeEnabled();
  await expect(kitchen).not.toBeChecked();
  await kitchen.check();
  await confirmarResposta(page,'/configuracoes/acessos','PUT',200,()=>page.getByRole('button',{name:'Salvar permissões'}).click());
  await expect(page.getByText('Permissões salvas no servidor.')).toBeVisible();
  const employee=page.getByRole('article').filter({hasText:fixture.email});
  // Convites de execuções anteriores permanecem no PostgreSQL. O Administrador
  // não é necessariamente um dos primeiros cinquenta funcionários ordenados.
  const pages=page.getByRole('navigation',{name:'Páginas de funcionários'});
  let pagina=0;
  while(await employee.count()===0){
    await expect(pages.getByRole('button',{name:'Próxima página',exact:true})).toBeEnabled();
    pagina++;
    const loaded=Promise.all(['/configuracoes/acessos','/equipe?pagina='+pagina,'/operacao/unidades'].map(path=>
      page.waitForResponse(r=>r.url().endsWith(path)&&r.request().method()==='GET')));
    await pages.getByRole('button',{name:'Próxima página',exact:true}).click();
    for(const response of await loaded){expect(response.status()).toBe(200);await response.finished();}
    await expect(pages.getByText('Página '+(pagina+1),{exact:true})).toBeVisible();
    await expect(page.getByLabel('Perfil operacional')).toBeEnabled();
  }
  await expect(employee).toHaveCount(1);
  await employee.getByLabel('Ativo').uncheck();
  const protectedResponse=page.waitForResponse(r=>r.url().includes('/api/v1/equipe/')&&r.request().method()==='PUT',{timeout:15000});
  await employee.getByRole('button',{name:'Salvar funcionário'}).click();
  expect((await protectedResponse).status()).toBe(409);
  await expect(page.getByRole('alert')).toHaveText('Mantenha pelo menos um Administrador ativo.');
  await employee.getByLabel('Ativo').check();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  // Capturas por superfície, sem recortar controles abaixo do viewport nem
  // gerar um bitmap de toda a lista persistente de funcionários/unidades.
  await page.getByRole('group',{name:/^Permissões de COZINHA/}).screenshot({path:test.info().outputPath('acessos.png')});
  await page.locator('app-acessos form').screenshot({path:test.info().outputPath('reautenticacao-acessos.png')});
  await page.getByRole('alert').screenshot({path:test.info().outputPath('protecao-administrador.png')});
  await page.getByRole('button',{name:'Salvar permissões',exact:true}).screenshot({path:test.info().outputPath('salvar-acessos.png')});
  await employee.screenshot({path:test.info().outputPath('administrador-protegido.png')});
  await page.getByRole('button',{name:'Sair da conta'}).click();
  await expect(page.getByRole('heading',{name:'Configurações de acessos'})).toHaveCount(0);
});

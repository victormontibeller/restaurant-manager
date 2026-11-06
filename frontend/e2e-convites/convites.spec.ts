import {test,expect,Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const authFile=process.env['RM_AUTH_FIXTURE'],captureFile=process.env['RM_RECOVERY_FIXTURE'];
if(!authFile||!captureFile)throw new Error('Fixtures privadas de identidade/captura obrigatórias.');
const auth=JSON.parse(fs.readFileSync(authFile,'utf8')) as {email:string;senha:string};
const fixture=JSON.parse(fs.readFileSync(captureFile,'utf8')) as {captureDirectory:string};
async function entrar(page:Page,email=auth.email,senha=auth.senha):Promise<void>{
  await page.goto('/');await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeEnabled();
  await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(senha);
  const r=page.waitForResponse(r=>r.url().endsWith('/auth/login')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();expect((await r).status()).toBe(200);
  await expect(page.getByRole('heading',{name:'Minha conta',exact:true})).toBeVisible();
}
async function admin(page:Page):Promise<void>{
  await entrar(page);await page.getByRole('button',{name:'Gerenciar convites',exact:true}).click();
  await confirmarIdentidade(page);
}
async function confirmarIdentidade(page:Page):Promise<void>{
  await page.getByLabel('Confirme sua senha para convidar',{exact:true}).fill(auth.senha);
  const resposta=page.waitForResponse(r=>r.url().endsWith('/auth/reautenticar')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Confirmar identidade para convites',exact:true}).click();
  expect((await resposta).status()).toBe(204);
  await expect(page.getByRole('status').filter({hasText:'Identidade confirmada'})).toBeVisible();
}
async function capturar(email:string):Promise<string>{
  let codigo='';await expect.poll(()=>{
    if(!fs.existsSync(fixture.captureDirectory))return false;
    for(const file of fs.readdirSync(fixture.captureDirectory).filter(f=>f.endsWith('.txt'))){
      const text=fs.readFileSync(path.join(fixture.captureDirectory,file),'utf8');
      if(text.startsWith('Para: '+email+'\n')&&text.includes('Assunto: Convite de funcionário'))codigo=text.split('\n').find(l=>l.startsWith('Código: '))!.slice(8);
    }
    return codigo.length===43;
  },{timeout:30000,intervals:[500,1000]}).toBe(true);return codigo;
}
async function criar(page:Page,email:string):Promise<{id:string;codigo:string}>{
  await page.getByLabel('E-mail do funcionário convidado').fill(email);
  const resposta=page.waitForResponse(r=>r.url().endsWith('/equipe/convites')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Criar convite',exact:true}).click();const r=await resposta;expect(r.status()).toBe(200);
  const c=await r.json() as {id:string};expect(JSON.stringify(c)).not.toMatch(/codigo|hash|senha/i);
  return {id:c.id,codigo:await capturar(email)};
}
async function abrirAceite(page:Page):Promise<void>{
  await page.getByRole('button',{name:'Aceitar convite de funcionário',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'Aceitar convite de funcionário',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Aceitar convite de funcionário',exact:true})).toBeFocused();
}
async function preencher(page:Page,codigo:string,senha:string):Promise<void>{
  await page.getByLabel('Código do convite',{exact:true}).fill(codigo);await page.getByLabel('Senha da conta de funcionário',{exact:true}).fill(senha);
  await page.getByLabel('Confirmar senha de funcionário',{exact:true}).fill(senha);
}
test('S01-UI17: administrador convida, funcionário verifica e entra sem privilégios administrativos',async({page})=>{
  await admin(page);const email=crypto.randomUUID()+'@example.invalid',senha=crypto.randomUUID();const {codigo}=await criar(page,email);
  await page.getByRole('button',{name:'Sair da conta',exact:true}).click();await abrirAceite(page);await preencher(page,codigo,senha);
  const r=page.waitForResponse(r=>r.url().endsWith('/convites/aceitar'));await page.getByRole('button',{name:'Verificar e aceitar convite',exact:true}).click();expect((await r).status()).toBe(204);
  await expect(page.getByRole('status').filter({hasText:'Convite aceito e e-mail verificado'})).toBeVisible();await expect(page.getByLabel('Senha da conta de funcionário',{exact:true})).toHaveValue('');
  await page.getByRole('button',{name:'Voltar ao login',exact:true}).click();await entrar(page,email,senha);
  await expect(page.getByText('Perfil: COZINHA',{exact:true})).toBeVisible();await expect(page.getByText('E-mail verificado.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Gerenciar convites',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);expect(page.url()).not.toContain(codigo);
  await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
});
test('S01-UI41: seleção do perfil de convite persiste até aceite e login',async({page})=>{
  await admin(page);
  await expect(page.getByLabel('Perfil do convite')).toHaveValue('COZINHA');
  await page.getByLabel('Perfil do convite').selectOption('EXPEDICAO');
  const email=crypto.randomUUID()+'@example.invalid',senha=crypto.randomUUID();const {id,codigo}=await criar(page,email);
  await page.getByLabel('Identificador do convite').fill(id);
  const consultation=page.waitForResponse(r=>r.url().endsWith('/equipe/convites/'+id)&&r.request().method()==='GET');
  await page.getByRole('button',{name:'Consultar convite',exact:true}).click();
  const consulted=await consultation;expect(consulted.status()).toBe(200);expect((await consulted.json()).perfil).toBe('EXPEDICAO');
  await page.getByRole('button',{name:'Sair da conta',exact:true}).click();await abrirAceite(page);await preencher(page,codigo,senha);
  const r=page.waitForResponse(r=>r.url().endsWith('/convites/aceitar'));await page.getByRole('button',{name:'Verificar e aceitar convite',exact:true}).click();expect((await r).status()).toBe(204);
  await expect(page.getByRole('status').filter({hasText:'Convite aceito e e-mail verificado'})).toBeVisible();await expect(page.getByLabel('Senha da conta de funcionário',{exact:true})).toHaveValue('');
  await page.getByRole('button',{name:'Voltar ao login',exact:true}).click();await entrar(page,email,senha);
  await expect(page.getByText('Perfil: EXPEDICAO',{exact:true})).toBeVisible();await expect(page.getByText('E-mail verificado.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Gerenciar convites',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);expect(page.url()).not.toContain(codigo);
  await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
});
test('S01-UI18: criação incerta preserva UUID após logout e reenvia sem duplicação',async({page})=>{
  await admin(page);const email=crypto.randomUUID()+'@example.invalid';await page.getByLabel('E-mail do funcionário convidado').fill(email);
  let id='';await page.route('**/api/v1/equipe/convites',async route=>{
    if(route.request().method()!=='POST'){await route.continue();return;}
    const real=await route.fetch();expect(real.status()).toBe(200);id=(await real.json()).id;
    await route.fulfill({status:502,contentType:'text/html',body:'<html>Falha após commit real</html>'});
  },{times:1});
  const falha=page.waitForResponse(r=>r.url().endsWith('/equipe/convites')&&r.status()===502);
  await page.getByRole('button',{name:'Criar convite',exact:true}).click();await falha;
  await expect(page.getByRole('alert')).toContainText('Resultado incerto.');await expect(page.getByRole('button',{name:'Gerenciar acessos',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
  // Mantém a mesma página: pendência é memória segregada por conta, não storage.
  await page.getByLabel('E-mail',{exact:true}).fill(auth.email);await page.getByLabel('Senha',{exact:true}).fill(auth.senha);
  const login=page.waitForResponse(r=>r.url().endsWith('/auth/login')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();expect((await login).status()).toBe(200);
  await expect(page.getByRole('heading',{name:'Convites de funcionários',exact:true})).toBeVisible();await expect(page.getByRole('status').filter({hasText:'Convite com resultado pendente'})).toContainText(id);
  await confirmarIdentidade(page);
  const retry=page.waitForResponse(r=>r.url().endsWith('/equipe/convites')&&r.request().method()==='POST');await page.getByRole('button',{name:'Reenviar mesma intenção',exact:true}).click();const response=await retry;
  expect(response.status()).toBe(200);expect((await response.json()).id).toBe(id);await expect(page.getByRole('button',{name:'Reenviar mesma intenção',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Recarregar convites',exact:true}).click();await expect(page.getByRole('heading',{name:email,exact:true})).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  // A massa acumulada alonga unidades e convites. Preservar os controles e o
  // resultado desta intenção em capturas distintas, não em um PNG ilimitado.
  const convites=page.locator('app-convites');
  await page.getByRole('heading',{name:'Convites de funcionários',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath('convites-contexto.png'),fullPage:false});
  await convites.locator('form').first().screenshot({path:test.info().outputPath('convites-reautenticacao.png')});
  // Mesmo já visível, centralizar o campo inclui perfil/início das unidades no desktop.
  await page.getByLabel('E-mail do funcionário convidado').evaluate(element=>element.scrollIntoView({block:'center'}));
  await page.screenshot({path:test.info().outputPath('convites-cadastro-viewport.png'),fullPage:false});
  await page.getByRole('button',{name:'Criar convite',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath('convites-criar-viewport.png'),fullPage:false});
  await convites.locator('form').filter({has:page.getByLabel('Identificador do convite')}).screenshot({path:test.info().outputPath('convites-consulta.png')});
  await convites.getByRole('article').filter({has:page.getByRole('heading',{name:email,exact:true})}).screenshot({path:test.info().outputPath('convites.png')});
  await page.getByRole('navigation',{name:'Páginas de convites',exact:true}).screenshot({path:test.info().outputPath('convites-paginacao.png')});
  await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
});
test('S01-UI19: revogação nega aceite, valida senha e mantém foco no erro',async({page})=>{
  await admin(page);
  await page.getByLabel('Confirme sua senha para convidar',{exact:true}).fill('incorreta');
  const invalid=page.waitForResponse(r=>r.url().endsWith('/auth/reautenticar')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Confirmar identidade para convites',exact:true}).click();expect((await invalid).status()).toBe(422);
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Confirme sua senha para convidar',{exact:true})).toHaveAttribute('aria-invalid','true');
  await expect(page.getByLabel('Confirme sua senha para convidar',{exact:true})).toHaveAccessibleDescription('Senha de confirmação inválida.');
  await confirmarIdentidade(page);await expect(page.getByLabel('Confirme sua senha para convidar',{exact:true})).not.toHaveAttribute('aria-invalid','true');
  const email=crypto.randomUUID()+'@example.invalid';const {codigo}=await criar(page,email);
  await page.getByRole('button',{name:'Recarregar convites',exact:true}).click();await page.getByRole('button',{name:'Revogar convite de '+email,exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Revogação confirmada'})).toBeVisible();await page.getByRole('button',{name:'Sair da conta',exact:true}).click();await abrirAceite(page);
  await preencher(page,codigo,crypto.randomUUID());await page.getByLabel('Confirmar senha de funcionário').fill(crypto.randomUUID());await page.getByRole('button',{name:'Verificar e aceitar convite',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveText('As senhas devem ser iguais.');await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Confirmar senha de funcionário',{exact:true})).toHaveAttribute('aria-invalid','true');
  await expect(page.getByLabel('Confirmar senha de funcionário',{exact:true})).toHaveAccessibleDescription('As senhas devem ser iguais.');
  await preencher(page,codigo,' '.repeat(12));await page.getByRole('button',{name:'Verificar e aceitar convite',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveText('A senha não pode conter somente espaços em branco.');await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Senha da conta de funcionário',{exact:true})).toHaveAttribute('aria-invalid','true');
  await expect(page.getByLabel('Senha da conta de funcionário',{exact:true})).toHaveAccessibleDescription(/A senha não pode conter somente espaços em branco\./);
  await preencher(page,codigo,'á'.repeat(37));await page.getByRole('button',{name:'Verificar e aceitar convite',exact:true}).click();
  await expect(page.getByLabel('Senha da conta de funcionário',{exact:true})).toHaveAttribute('aria-invalid','true');
  await expect(page.getByLabel('Senha da conta de funcionário',{exact:true})).toHaveAccessibleDescription(/A senha deve ter no máximo 72 bytes\./);
  await preencher(page,codigo,crypto.randomUUID());const r=page.waitForResponse(r=>r.url().endsWith('/convites/aceitar'));await page.getByRole('button',{name:'Verificar e aceitar convite',exact:true}).click();expect((await r).status()).toBe(422);
  await expect(page.getByRole('alert')).toContainText('Convite inválido, expirado, revogado ou já utilizado.');await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Senha da conta de funcionário',{exact:true})).not.toHaveAttribute('aria-invalid','true');
  await expect(page.getByLabel('Confirmar senha de funcionário',{exact:true})).not.toHaveAttribute('aria-invalid','true');
  await expect(page.getByLabel('Código do convite',{exact:true})).toHaveAttribute('aria-invalid','true');
  await expect(page.getByLabel('Código do convite',{exact:true})).toHaveAccessibleDescription(/Convite inválido, expirado, revogado ou já utilizado\./);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);await page.getByLabel('Código do convite').fill('');
  await page.screenshot({path:test.info().outputPath('aceite-negado.png'),fullPage:true});await page.getByRole('button',{name:'Voltar ao login',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByLabel('E-mail',{exact:true})).toBeFocused();
});

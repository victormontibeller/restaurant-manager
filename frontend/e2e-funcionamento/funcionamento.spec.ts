import { expect, test, APIRequestContext, Locator, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const file = process.env['RM_SCHEDULE_FIXTURE'];
if (!file || !path.isAbsolute(file)) throw new Error('Massa privada de funcionamento obrigatória.');
const fixture = JSON.parse(fs.readFileSync(file, 'utf8')) as { email: string; senha: string };
if (!fixture.email || !fixture.senha) throw new Error('Massa de funcionamento incompleta.');

interface Horario {
  canal: 'DELIVERY' | 'RETIRADA' | 'MESA';
  diaSemana: number;
  inicio: string;
  fim: string;
}

interface Funcionamento {
  unidadeId: string;
  fuso: string;
  versaoUnidade: number;
  versao: number;
  canais: string[];
  horarios: Horario[];
}

const rota = (id: string) => '/api/v1/configuracoes/unidades/' + id + '/funcionamento';
const publica = (id: string) => '/api/v1/unidades/' + id + '/funcionamento';

function resposta(page: Page, pathname: string, method: string) {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === pathname && response.request().method() === method,
  );
}

async function autenticarUi(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.senha);
  const login = resposta(page, '/api/v1/auth/login', 'POST');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const result = await login;
  expect(result.status()).toBe(200);
  await expect(page.getByText('Perfil: ADMINISTRADOR', { exact: true })).toBeVisible();
  return (await result.json()).accessToken;
}

async function autenticarApi(request: APIRequestContext): Promise<string> {
  const csrf = await request.get('/api/v1/auth/csrf');
  expect(csrf.status()).toBe(200);
  const protection = await csrf.json();
  const login = await request.post('/api/v1/auth/login', {
    headers: { [protection.headerName]: protection.token },
    data: fixture,
  });
  expect(login.status()).toBe(200);
  const token = (await login.json()).accessToken;
  expect(
    (
      await request.post('/api/v1/auth/reautenticar', {
        headers: { Authorization: 'Bearer ' + token },
        data: { senha: fixture.senha },
      })
    ).status(),
  ).toBe(204);
  return token;
}

async function sairApi(request: APIRequestContext): Promise<void> {
  const csrf = await request.get('/api/v1/auth/csrf');
  expect(csrf.status()).toBe(200);
  const protection = await csrf.json();
  expect(
    (
      await request.post('/api/v1/auth/logout', {
        headers: { [protection.headerName]: protection.token },
      })
    ).status(),
  ).toBe(204);
}

async function consultarEditor(page: Page, editor: Locator, id: string): Promise<Funcionamento> {
  const pending = resposta(page, rota(id), 'GET');
  await editor
    .getByRole('button', { name: 'Consultar funcionamento no servidor', exact: true })
    .click();
  const result = await pending;
  expect(result.status()).toBe(200);
  await expect(editor).toHaveAttribute('aria-busy', 'false');
  return result.json();
}

async function salvarEditor(page: Page, editor: Locator, id: string, status = 200) {
  const pending = resposta(page, rota(id), 'PUT');
  await editor.getByRole('button', { name: 'Salvar funcionamento', exact: true }).click();
  const result = await pending;
  expect(result.status()).toBe(status);
  await expect(editor).toHaveAttribute('aria-busy', 'false');
  return result;
}

async function semOverflow(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
}

test('S02-UI01: horários por UI persistem, rejeitam sobreposição e reconciliam conflito', async ({
  page,
  request,
}) => {
  const access = await autenticarUi(page);
  const headers = { Authorization: 'Bearer ' + access };
  await page.getByRole('button', { name: 'Gerenciar unidades', exact: true }).click();
  const admin = page.getByRole('region', { name: 'Configurações de unidades', exact: true });
  await expect(admin).toBeVisible();
  await admin.getByLabel('Confirme sua senha', { exact: true }).fill(fixture.senha);
  const reauth = resposta(page, '/api/v1/auth/reautenticar', 'POST');
  await admin.getByRole('button', { name: 'Confirmar identidade', exact: true }).click();
  expect((await reauth).status()).toBe(204);

  // Cadastro pelo formulário real, sem fixture que substitua a API de unidades.
  const nome = '02 Funcionamento ' + crypto.randomUUID().slice(0, 8);
  await admin.getByLabel('Nome da nova unidade', { exact: true }).fill(nome);
  await admin.getByLabel('Fuso da nova unidade', { exact: true }).fill('UTC');
  const criacao = resposta(page, '/api/v1/configuracoes/unidades', 'POST');
  await admin.getByRole('button', { name: 'Criar unidade', exact: true }).click();
  const criada = await criacao;
  expect(criada.status()).toBe(200);
  const unidade = (await criada.json()) as { id: string; versao: number };
  const editor = page.getByRole('region', { name: 'Horários e canais de ' + nome, exact: true });
  const consulta = resposta(page, rota(unidade.id), 'GET');
  await editor.getByRole('button', { name: 'Configurar horários e canais', exact: true }).click();
  expect((await consulta).status()).toBe(200);
  await expect(editor.getByText('Versão do funcionamento: 0.', { exact: true })).toBeVisible();

  await editor.getByLabel('Delivery', { exact: true }).check();
  await editor.getByLabel('Retirada', { exact: true }).check();
  await editor.getByRole('button', { name: 'Adicionar horário', exact: true }).click();
  const primeiro = editor.getByRole('group', { name: 'Horário 1', exact: true });
  await primeiro.getByLabel('Dia de início', { exact: true }).selectOption('1');
  await primeiro.getByLabel('Início (HH:mm)', { exact: true }).fill('18:00');
  await primeiro.getByLabel('Fim (HH:mm ou 24:00)', { exact: true }).fill('02:00');
  await expect(
    primeiro.getByText('Este horário termina no dia seguinte ao selecionado.'),
  ).toBeVisible();
  const salva = (await (await salvarEditor(page, editor, unidade.id)).json()) as Funcionamento;
  expect(salva.versao).toBe(1);
  expect(salva.versaoUnidade).toBe(unidade.versao);
  expect(salva.fuso).toBe('UTC');
  expect(salva.horarios).toEqual([
    { canal: 'DELIVERY', diaSemana: 1, inicio: '18:00', fim: '02:00' },
  ]);
  await expect(editor.getByText('Funcionamento salvo no servidor.', { exact: true })).toBeVisible();

  // Sobreposição válida estruturalmente chega ao backend e não altera o estado persistido.
  await editor.getByRole('button', { name: 'Adicionar horário', exact: true }).click();
  const segundo = editor.getByRole('group', { name: 'Horário 2', exact: true });
  await segundo.getByLabel('Início (HH:mm)', { exact: true }).fill('19:00');
  await segundo.getByLabel('Fim (HH:mm ou 24:00)', { exact: true }).fill('23:00');
  await salvarEditor(page, editor, unidade.id, 422);
  await expect(editor.getByRole('alert')).toContainText('não podem se sobrepor');
  await expect(editor.getByRole('alert')).toBeFocused();
  const persistida = await page.request.get(rota(unidade.id), { headers });
  expect(persistida.status()).toBe(200);
  expect(await persistida.json()).toEqual(salva);
  await segundo.getByRole('button', { name: 'Remover horário 2', exact: true }).click();

  // Escritor concorrente usa a API real; a tela deve recusar a versão que ficou antiga.
  const concorrente = await page.request.put(rota(unidade.id), {
    headers,
    data: {
      versao: salva.versao,
      versaoUnidade: salva.versaoUnidade,
      canais: salva.canais,
      horarios: [{ ...salva.horarios[0], inicio: '19:00' }],
    },
  });
  expect(concorrente.status()).toBe(200);
  await salvarEditor(page, editor, unidade.id, 409);
  await expect(editor.getByRole('alert')).toContainText('Recarregue antes de salvar');
  await expect(
    editor.getByRole('button', { name: 'Salvar funcionamento', exact: true }),
  ).toBeDisabled();
  const reconciliada = await consultarEditor(page, editor, unidade.id);
  expect(reconciliada.versao).toBe(2);
  await expect(primeiro.getByLabel('Início (HH:mm)', { exact: true })).toHaveValue('19:00');

  // Mudar o fuso no cadastro também invalida a edição, mesmo sem alterar os horários.
  const novoFuso = await page.request.put('/api/v1/configuracoes/unidades/' + unidade.id, {
    headers,
    data: { versao: unidade.versao, nome, fuso: 'America/Manaus', ativa: true },
  });
  expect(novoFuso.status()).toBe(200);
  const cadastroAtual = await novoFuso.json();
  await salvarEditor(page, editor, unidade.id, 409);
  await expect(
    editor.getByRole('button', { name: 'Salvar funcionamento', exact: true }),
  ).toBeDisabled();
  const revalidada = await consultarEditor(page, editor, unidade.id);
  expect(revalidada.versaoUnidade).toBe(cadastroAtual.versao);
  expect(revalidada.fuso).toBe('America/Manaus');
  expect(revalidada.horarios).toEqual(reconciliada.horarios);
  expect(revalidada.versao).toBe(reconciliada.versao);
  await expect(editor.getByText(/^Horários no fuso America\/Manaus\./)).toBeVisible();
  expect(await (await salvarEditor(page, editor, unidade.id)).json()).toEqual(revalidada);

  // Tentativas diretas sem sessão e com entrada adulterada não passam pelas guardas da UI.
  expect((await request.get(rota(unidade.id))).status()).toBe(401);
  const adulterada = await page.request.put(rota(unidade.id), {
    headers,
    data: {
      versao: revalidada.versao,
      versaoUnidade: revalidada.versaoUnidade,
      canais: ['DELIVERY'],
      horarios: [{ canal: 'DELIVERY', diaSemana: 0, inicio: '09:00', fim: '18:00' }],
    },
  });
  expect(adulterada.status()).toBe(400);
  expect(await (await page.request.get(rota(unidade.id), { headers })).json()).toEqual(revalidada);

  // Recarregar a página restaura a sessão, consulta o cadastro e preserva o funcionamento.
  await page.reload();
  await expect(page.getByText('Perfil: ADMINISTRADOR', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gerenciar unidades', exact: true }).click();
  const reabertura = resposta(page, rota(unidade.id), 'GET');
  await editor.getByRole('button', { name: 'Configurar horários e canais', exact: true }).click();
  expect((await reabertura).status()).toBe(200);
  await expect(editor.getByLabel('Delivery', { exact: true })).toBeChecked();
  await expect(primeiro.getByLabel('Início (HH:mm)', { exact: true })).toHaveValue('19:00');
  await expect(primeiro.getByLabel('Fim (HH:mm ou 24:00)', { exact: true })).toHaveValue('02:00');
  await editor.screenshot({ path: test.info().outputPath('funcionamento-administrativo.png') });

  const painel = page.getByRole('region', { name: 'Unidades e horários', exact: true });
  const consultaPublica = resposta(page, publica(unidade.id), 'GET');
  await painel.getByLabel('Unidade', { exact: true }).selectOption(unidade.id);
  const result = await consultaPublica;
  expect(result.status()).toBe(200);
  const dadosPublicos = await result.json();
  expect(dadosPublicos.fuso).toBe('America/Manaus');
  const delivery = painel
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Delivery', exact: true }) });
  const aberta = dadosPublicos.canais.find(
    (canal: { canal: string }) => canal.canal === 'DELIVERY',
  ).aberto;
  await expect(
    delivery.getByText(aberta ? 'Aberto no horário consultado' : 'Fechado no horário consultado', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    delivery.getByText('Segunda-feira: 19:00 às 02:00 do dia seguinte', { exact: true }),
  ).toBeVisible();
  await expect(painel.getByText('Canal desabilitado', { exact: true })).toHaveCount(1);
  await painel.getByLabel('Unidade', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(
    painel.getByRole('button', { name: 'Atualizar horários', exact: true }),
  ).toBeFocused();
  await semOverflow(page);
  await painel.screenshot({ path: test.info().outputPath('funcionamento-publico.png') });

  const logout = resposta(page, '/api/v1/auth/logout', 'POST');
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  expect((await logout).status()).toBe(204);
  await expect(editor).toHaveCount(0);
});

test('S02-UI02: consulta pública limpa disponibilidade offline e revalida após reconexão', async ({
  page,
  context,
  request,
}) => {
  // Preparação pela API da aplicação, com autenticação, reautenticação e PostgreSQL reais.
  const access = await autenticarApi(request);
  const headers = { Authorization: 'Bearer ' + access };
  const id = crypto.randomUUID();
  const nome = '02 Público ' + id.slice(0, 8);
  const criacao = await request.post('/api/v1/configuracoes/unidades', {
    headers,
    data: { id, nome, fuso: 'UTC', ativa: true },
  });
  expect(criacao.status()).toBe(200);
  const unidade = await criacao.json();
  const horarios = Array.from({ length: 7 }, (_, i) => ({
    canal: 'DELIVERY',
    diaSemana: i + 1,
    inicio: '00:00',
    fim: '24:00',
  }));
  expect(
    (
      await request.put(rota(id), {
        headers,
        data: { versao: 0, versaoUnidade: unidade.versao, canais: ['DELIVERY'], horarios },
      })
    ).status(),
  ).toBe(200);
  await sairApi(request);
  expect((await request.get(rota(id), { headers })).status()).toBe(401);

  await page.goto('/');
  const painel = page.getByRole('region', { name: 'Unidades e horários', exact: true });
  await expect(
    painel.getByLabel('Unidade', { exact: true }).locator('option[value="' + id + '"]'),
  ).toHaveCount(1);
  const consulta = resposta(page, publica(id), 'GET');
  await painel.getByLabel('Unidade', { exact: true }).selectOption(id);
  expect((await consulta).status()).toBe(200);
  await expect(painel.getByText('Aberto no horário consultado', { exact: true })).toBeVisible();
  await expect(painel.getByText('Canal desabilitado', { exact: true })).toHaveCount(2);
  const orientacao = painel.getByText(
    'A situação corresponde ao horário consultado. A disponibilidade é conferida novamente ao enviar o pedido.',
    { exact: true },
  );
  await expect(orientacao).toBeVisible();
  await orientacao.screenshot({ path: test.info().outputPath('s03-texto-disponibilidade.png') });
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);

  await context.setOffline(true);
  await expect(painel.getByRole('status')).toHaveText(
    'Sem conexão. Atualize os horários quando a conexão voltar.',
  );
  await expect(painel.getByText('Aberto no horário consultado', { exact: true })).toHaveCount(0);
  await painel.screenshot({ path: test.info().outputPath('funcionamento-offline.png') });

  await context.setOffline(false);
  await expect(painel.getByText('Aberto no horário consultado', { exact: true })).toHaveCount(0);
  const retomada = resposta(page, publica(id), 'GET');
  await painel.getByRole('button', { name: 'Atualizar horários', exact: true }).click();
  expect((await retomada).status()).toBe(200);
  await expect(painel.getByText('Aberto no horário consultado', { exact: true })).toBeVisible();
  await semOverflow(page);
  await painel.screenshot({ path: test.info().outputPath('funcionamento-reconectado.png') });

  // A navegação pública não criou uma sessão empresarial implicitamente.
  expect((await page.request.get(rota(id))).status()).toBe(401);
  await expect(
    page.getByRole('heading', { name: 'Acessar minha conta', exact: true }),
  ).toBeVisible();
});

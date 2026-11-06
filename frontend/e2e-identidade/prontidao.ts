import { request } from '@playwright/test';

export default async function prontidao(): Promise<void> {
  const context = await request.newContext({
    baseURL: process.env['RM_BASE_URL'],
    ignoreHTTPSErrors: true,
  });
  try {
    const response = await context.get('/actuator/health', { timeout: 10000 });
    if (!response.ok() || (await response.json()).status !== 'UP')
      throw new Error('Candidato não está pronto. Inicie e verifique o processo antes da suíte.');
  } finally {
    await context.dispose();
  }
}

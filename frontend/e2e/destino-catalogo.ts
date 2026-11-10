import fs from 'node:fs';
import path from 'node:path';

export function destinoCatalogo(): string {
  const target = process.env['RM_BASE_URL'];
  if (!target) throw new Error('RM_BASE_URL é obrigatório para a matriz local.');
  const url = new URL(target);
  const novoHost = /^sprint05-catalog-[a-f0-9]{12}\.localhost$/.test(url.hostname);
  if (
    (url.hostname !== 'sprint02.localhost' && !novoHost) ||
    url.protocol !== 'https:' ||
    url.port !== '8089' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Matriz exige HTTPS local na porta 8089 e massa própria em rm_test.');
  }
  if (novoHost) {
    const fixture = process.env['RM_CATALOG_FIXTURE'];
    if (!fixture || !path.isAbsolute(fixture))
      throw new Error('Novo tenant exige fixture privada absoluta de catálogo.');
    if (JSON.parse(fs.readFileSync(fixture, 'utf8')).host !== url.hostname)
      throw new Error('O host da matriz diverge da fixture de catálogo.');
  }
  return target;
}

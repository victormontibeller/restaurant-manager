// Exercita agrupamento de ações e deduplicação com os módulos TypeScript reais.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(root + '/frontend/node_modules/typescript');
class ApiFailure extends Error {
  constructor(status) {
    super('Falha');
    this.status = status;
  }
}
function carregar(nome) {
  const ctx = { exports: {}, Date, Set, require: () => ({ ApiFailure }) };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(root + '/frontend/src/app/cozinha/' + nome + '.ts', 'utf8'),
      {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      },
    ).outputText,
    ctx,
  );
  return ctx.exports;
}
(async () => {
  const { elegiveis, decorrido } = carregar('modelos');
  const pedido = {
    estado: 'EM_PREPARO',
    unidades: [
      { id: 'a', estado: 'NA_FILA' },
      { id: 'b', estado: 'EM_PREPARO' },
      { id: 'c', estado: 'PRONTO' },
      { id: 'd', estado: 'CANCELADO' },
    ],
  };
  assert.deepEqual([...elegiveis(pedido, 'iniciar')], ['a']);
  assert.deepEqual([...elegiveis(pedido, 'concluir')], ['b']);
  assert.equal(elegiveis({ ...pedido, estado: 'CANCELADO' }, 'iniciar').length, 0);
  assert.equal(decorrido(null, Date.now()), 'não informado');
  assert.equal(decorrido('2026-11-10T10:00:00Z', Date.parse('2026-11-10T10:05:00Z')), '5 min');
  const { NovosPedidosCozinha } = carregar('novos-pedidos');
  const avisos = new NovosPedidosCozinha();
  const pagina = (eventos) => ({ eventos, proximo: 'cursor', temMais: false });
  const evento = (id, pedidoId, tipo = 'PEDIDO_ACEITO') => ({ id, pedidoId, tipo });
  let chamadas = 0;
  const consulta = async (id) => {
    chamadas++;
    return { id, estado: id === 'aguardando' ? 'AGUARDANDO_ACEITE' : 'NA_FILA' };
  };
  const lote = pagina([
    evento('1', 'fora-da-pagina'),
    evento('2', 'fora-da-pagina'),
    evento('3', 'aguardando', 'PEDIDO_ENVIADO'),
  ]);
  assert.deepEqual([...(await avisos.receber(lote, consulta))], ['fora-da-pagina']);
  assert.equal(chamadas, 2);
  assert.equal((await avisos.receber(lote, consulta)).length, 0);
  assert.equal(chamadas, 2);
  assert.equal((await avisos.receber(pagina([evento('4', 'fora-da-pagina')]), consulta)).length, 0);
  assert.deepEqual(
    [
      ...(await avisos.receber(pagina([evento('5', 'aguardando')]), async () => ({
        estado: 'NA_FILA',
      }))),
    ],
    ['aguardando'],
  );
  const falha = pagina([evento('6', 'nova-entrada')]);
  await assert.rejects(
    avisos.receber(falha, async () => {
      throw new Error('Rede');
    }),
  );
  assert.deepEqual([...(await avisos.receber(falha, consulta))], ['nova-entrada']);
  assert.equal(
    (
      await avisos.receber(pagina([evento('7', 'cancelado')]), async () => {
        throw new ApiFailure(404);
      })
    ).length,
    0,
  );
  avisos.limpar();
  assert.deepEqual([...(await avisos.receber(falha, consulta))], ['nova-entrada']);
  console.log(
    'Cozinha: ações por estado, tempos, eventos fora da página, deduplicação, recuperação e troca de contexto aprovados.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

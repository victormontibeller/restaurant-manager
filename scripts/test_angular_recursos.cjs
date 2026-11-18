// Os probes JIT usam o mesmo template e os mesmos estilos do componente compilado.
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
  name: 'recursos-angular',
  setup(builder) {
    builder.onLoad({ filter: /\.component\.ts$/ }, ({ path: arquivo }) => {
      const ler = (nome) => fs.readFileSync(path.resolve(path.dirname(arquivo), nome), 'utf8');
      const contents = fs
        .readFileSync(arquivo, 'utf8')
        .replace(/templateUrl:\s*'([^']+)'/, (_, nome) => 'template: ' + JSON.stringify(ler(nome)))
        .replace(/styleUrls:\s*\[([^\]]+)\]/, (_, lista) => {
          const folhas = [...lista.matchAll(/['"]([^'"]+)['"]/g)].map((url) => ler(url[1]));
          return 'styles: ' + JSON.stringify(folhas);
        });
      return { contents, loader: 'ts' };
    });
  },
};

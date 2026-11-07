# ADR 0002 — Mídia pública transacional no PostgreSQL

**Status:** aceito tecnicamente para a implementação local da Sprint 2 em
2026-11-06. Validação de homologação e restore no Linux continuam pendentes;
resultados ficam no [checkpoint](../25_EXECUTION_STATUS.md).

## Contexto

O catálogo precisa publicar imagens pequenas, isoladas por empresa, com
retomada de upload e recuperação consistente. A topologia inicial previa
mídia em diretório persistente, mas isso exigiria coordenar escrita de arquivo,
registro no banco, arquivos órfãos e ponto de backup. Ainda não há objetos
privados, documentos de cliente nem provedor de mídia neste escopo.

## Decisão

O domínio `midia` valida PNG/JPEG por conteúdo, decodifica com limites e gera
uma imagem nova, sem metadados, de até 1280 pixels por lado. A orientação EXIF
válida, incluindo espelhos, é aplicada aos pixels antes de descartar metadados;
leitura inválida não segue offsets externos nem dados após o fim da imagem.
O resultado
imutável fica em `bytea` no schema da empresa. Bytes, tamanho, hash, cota e
auditoria são publicados na mesma transação; a FK do produto aponta para a
mídia do mesmo schema. O upload tem UUID estável, autor e hash para recuperação
idempotente. Nomes/caminhos recebidos não viram caminhos de armazenamento.

Limites de entrada: 5 MiB, 4096 pixels por lado e 12 milhões de pixels.
Limites por empresa: 200 imagens e 100 MiB. A decodificação ocorre fora dos
locks do banco; a autorização atual é conferida novamente antes do commit.
Somente bytes normalizados são públicos pelo domínio empresarial, com
`no-store` e `nosniff`. Não existe endpoint genérico de arquivos privados.

O filesystem externo permanece alternativa para uma etapa com maior volume.
Object storage poderá ser introduzido por adaptador e migração própria quando
houver necessidade medida, preservando os IDs públicos e a recuperação.

## Consequências

O backup consistente do PostgreSQL inclui as imagens deste catálogo e suas
referências; não depende de copiar uma pasta de mídia depois do dump.
Isso aumenta o tamanho do banco e limita explicitamente a capacidade inicial.
Imagens publicadas não são excluídas pelo runtime; substituir a imagem de um
produto não altera o conteúdo anterior. Retenção e coleta de mídia exigirão
uma política própria antes de ampliar esse escopo.

Um dump incluir bytes não comprova restore: o ensaio deve conferir duas
empresas, referências, hashes, conteúdo e isolamento após a restauração.
Chaves/configuração seguem recuperação separada. Arquivos privados futuros
precisarão de autorização e armazenamento próprios, sem reutilizar esta rota
pública. Ver [contrato](../api/midias.yaml), [banco](../05_DATABASE.md) e
[runbook](../22_PRODUCTION_RUNBOOK.md#backups-e-continuidade).

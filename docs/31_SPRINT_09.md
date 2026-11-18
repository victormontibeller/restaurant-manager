# Sprint 09 — Catálogo e ofertas por unidade

A gestão do catálogo reúne o cadastro empresarial e as ofertas de uma unidade autorizada. A consulta filtra no servidor por nome ou descrição, categoria, tipo de produto, situação do cadastro e disponibilidade configurada da oferta. A paginação ocorre depois dos filtros. A disponibilidade para efetivar um pedido continua sendo calculada na jornada comercial.

## Dados e ações na gestão

| Superfície | Dados visíveis | Ações |
| --- | --- | --- |
| Produtos e combos | Foto cadastrada, nome, categoria e sua situação, tipo, situação do produto e sugestão da casa | Buscar, filtrar, paginar, abrir detalhe. Com edição empresarial, cadastrar ou editar |
| Detalhe | Descrição completa. Adicionais com preço, máximo e situação. Grupos de combo com mínimo, máximo, opções identificadas pelo nome, acréscimo, limite e adicionais permitidos. Versão para o editor | Expandir em linha por teclado ou toque |
| Ofertas da unidade | Preço em reais, habilitação e canais de cada oferta. Indicação explícita de produto sem oferta | Abrir a oferta com a unidade da consulta selecionada, consultar outra unidade autorizada ou salvar se houver permissão |
| Categorias | Nome e situação das categorias empresariais | Editar categoria ou abrir a lista inteira de produtos filtrada por categoria |

A equipe com permissão de consulta local visualiza produtos e categorias ativos e os adicionais ativos aplicáveis. O editor empresarial vê cadastros inativos e pode optar por consultar somente o cadastro compartilhado. Troca de unidade, consulta de oferta e edição usam os vínculos e a versão conferidos pelo backend.

## Implementação e verificação

A projeção documentada no [contrato do catálogo](api/catalogo.yaml) consulta os produtos e ofertas da página juntos. Uma consulta adicional recupera os componentes dos combos da página. As regras de alteração e de recuperação de resultado continuam nos serviços de catálogo e de oferta.

Os testes de API em PostgreSQL cobrem busca com mais de 50 produtos, filtros combinados, preços distintos por filial, composição do combo e negativas de perfil, unidade e tenant. O cenário de interface `S02-UI-PERFIL-ADMINISTRADOR` verifica filtros e detalhes junto à alteração das ofertas nas duas unidades. Critérios gerais e cobertura da operação ficam na [estratégia de testes](26_TEST_STRATEGY.md).

Na validação local de 18/11/2026, os dois testes de `ListagemCatalogoGestaoTest` passaram no PostgreSQL `rm_test`, sem falhas, erros ou ignorados. A base já estava na V29 da Sprint 06, incluída no classpath de teste. Passaram a compilação Java, a checagem de tipos Angular/E2E, a suíte de lógica, a formatação e o build da PWA `90fe3e371a8d30f22a79`. Na primeira rodada integrada, o navegador não conseguia localizar o filtro Categoria pelo rótulo exato. O commit `d6fb229` associou explicitamente cada campo ao seu rótulo e foi publicado automaticamente na demo. As reexecuções com o JAR publicado e a situação da homologação ficam no [checkpoint](25_EXECUTION_STATUS.md).

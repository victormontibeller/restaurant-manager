# Sprint 01 — retomada ciclo 27

## Escopo e estado

Retomada em 2026-11-05 local; resultados abaixo observados em 2026-11-06 UTC.
Sprint 01 permanece aberta, com PR #3 draft; Sprints 02–05 não iniciadas. Não houve
merge, promoção ou deploy no estado inicial deste registro.

## Artefato e regressão preservados

Build 97d75b0 reutilizado, sem reconstrução: SHA completo
`97d75b09b5b783b18104812cf67fb2e18afdf76a`, SHA-256 do JAR
`34e207ff6f877d050ef2c9c485c6fb7ff32a2297abb8f2834cf852286ce91f47`.
Gate, resultado, fonte compatível e hash conferidos. Os 23 XML contêm 174 testes
backend, sem falha, erro ou skip. Isso não aprova E2E/visual automaticamente.

Às 02:31Z, o worker 26 havia concluído 150 pares únicos: 25 focos, 45 identidade,
45 eventos, 15 verificação e 20 cadastro. Cada recibo/JSON foi reaberto, seu hash,
estatísticas e cobertura conferidos; zero falha/skip/flaky/retry nessas parcelas.
Recuperação e demais famílias ainda executavam. Não inferir matriz concluída.

Fonte imutável do worker 26: 7c8982f. Reteste finito 27 em fonte imutável d1dc30b
aguarda o término aprovado da matriz e reexecuta somente UI18 nos cinco projetos,
no MESMO JAR. D1dc30b muda o enquadramento de captura, não produto nem assertivas.
Não somar a parcela antiga à nova. Recusa de reentrada foi exercitada de verdade:
claim/progresso permaneceram inalterados, sem lançar outro candidato. Locks de
E2E/deploy, unidade/PID e limite de quatro horas foram conferidos.

## Revisão e documentação

Duas revisões independentes somente leitura: scripts de manutenção/substituição/
provisionamento/aceitação e reteste UI18/caminhos de prova da Sprint. Nenhum novo
bloqueador identificado; não houve execução operacional pelos revisores.

A tabela da Sprint passa a apontar também AcessosTest para login simultâneo;
o método existente foi localizado. Segurança, tenancy e acessos deixam de tratar
como ausentes funcionalidades documentadas nos seus próprios incrementos
posteriores. Estado de execução continua no checkpoint, sem transferir aprovação
entre artefatos ou declarar Sprint concluída. Estratégia de testes distingue plano
normativo de suítes já implementadas. Nenhuma regra funcional ou gate foi removido.
A alteração solicitada de AGENTS.md foi bloqueada pelo executor; não contornada.

## Visual e limites

Às 02:31Z, registro privado materializado continha 48 imagens com origem/hash:
22 principais, 20 complementos e 6 adicionais de vínculos. Inspeções novas de eventos,
verificação e cadastro abrangeram mobile/desktop, com recortes ampliados dos
formulários. Notas identificam componente versus página, campos longos com
rolagem interna e emulação, sem alegar aparelho físico. Um complemento desktop
de convites continua reprovado até reexecução e inspeção; revisão global pendente.

Homologação 3cd4eeb UP/PID399982 foi conferida; baseline 449ce3c preservado.
Dev/test/hml e roles distintos foram relidos em loopback; original hml bloqueado
e clone ativo conservados. Fixture de manutenção corresponde estruturalmente às
chaves do candidato; essa checagem não executou login nem aprovou o ensaio.
Manutenção, troca, assistido, smokes e aceitação do JAR 97 seguem pendentes neste
snapshot. Resultados posteriores devem constar no [checkpoint](../25_EXECUTION_STATUS.md).

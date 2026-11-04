# Sprint 01 — ciclo 7: recuperação de intenções

[Checkpoint](../25_EXECUTION_STATUS.md) · [Cobertura](cobertura.md)

## Estado inicial e regressões reproduzidas

Base `2b12729e8493a7245a024087cc758c6844752c10`, PR #3 aberto/draft. Homologação segue na fundação `449ce3ccf941c73b34ac15a4754183c147f91aaa`, health UP e hash conferidos. Nenhuma migration/deploy de homologação neste incremento.

O artefato anterior foi copiado para área privada, conferido contra o hash do build-gate e executado somente sobre rm_test com identidade SQL verificada. A primeira invocação E2E encontrou conexão recusada antes da prontidão; é falha de preparação, não vermelho funcional. Depois de health UP, quatro cenários Chromium desktop falharam pelas asserções pertinentes:

- S01-UI03: login permanecia habilitado com logout ainda não confirmado.
- S01-UI06: navegação de seção permanecia habilitada durante POST real confirmado cuja resposta foi retida/perdida.
- S01-UI07: logout/novo login perdiam a intenção incerta e a reconciliação.
- S01-UI08: navegação permanecia habilitada durante gravação real de permissões.

S01-UI09 teve vermelho separado: falha do GET da página seguinte mudava o número da página sem mudar os registros. Massa criada pela API real, não mockada.

## Correções em validação

Revisão independente read-only apontou perda de intenção em retry rejeitado após expiração da reautenticação, perda por encerramento de sessão, navegação durante gravação de acessos e login durante logout incerto. Correções preservam a intenção por conta na memória da página; erro definitivo só libera a primeira tentativa, nunca uma intenção anteriormente incerta. Logout seguro continua permitido. Não há persistência de payload/tokens em localStorage/sessionStorage; fechar/recarregar ainda perde a intenção, com aviso de saída.

Paginação só confirma conjunto/página após sucesso. Teste de reautenticação aguarda a resposta HTTP antes da asserção DOM. Typecheck inclui agora os testes E2E, usando tipos Node fixados no lockfile. Typecheck da aplicação/E2E, build Angular e checks de repositório passaram antes do commit; gate integrado e verdes do novo artefato ainda pendentes neste registro inicial.

## Limites

## Resultado ao interromper

Commit `740d1edf5c63e2f59479a9821cd4f9436e900087` publicado e lido de volta no PR #3 draft, base main. CI runs 41798438867 e 41798432411 aprovados. Build identificado exit 0: 56 testes backend sem falhas/erros/skip, 19 testes Python, typechecks aplicação/E2E, build e auditorias aprovados.

Candidato 740d1ed: nove cenários S01-UI01–UI09 em Chromium desktop aprovados, zero falhas/ignorados/instáveis. A suíte de 45 casos nos cinco projetos foi INTERROMPIDA por aviso efetivo de orçamento; resultados finais não agregados e suíte NÃO aprovada. Fundação sobre esse candidato não foi reexecutada. Capturas desktop/mobile e recortes legíveis de unidades/matriz foram inspecionados, sem sobreposição observada; isso não é auditoria WCAG completa.

Após o build, começou incremento local de rotação JWT. Seis testes contra implementação anterior produziram três falhas e um erro pertinente; dois passaram. Implementação posterior e oito testes finais foram escritos, mas não compilados/executados. Revisão independente adicional recusada pelo limite efetivo de subagentes; código JWT não publicado e não pertence ao JAR testado no navegador. Detalhes e próxima ação no checkpoint.

Servidor candidato e suíte próprios encerrados após o aviso; hml/PostgreSQL/supervisor preservados. Nenhuma verificação adicional do serviço foi feita após o aviso final.

## Pendências

Não é encerramento da Sprint 01. SaaS separado, cadastro/verificação/recuperação/convites, suspensão, eventos, demais projeções/ações e manutenção/restore continuam pendentes. Sprints 02–05 não iniciadas. Nenhum cenário obrigatório ausente é aprovado por estes testes.

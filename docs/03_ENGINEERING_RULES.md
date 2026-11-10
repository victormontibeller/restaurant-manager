# Regras de engenharia

> **Escopo:** responsabilidades das camadas, autoridade do backend, transações e recuperação.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

## Diretrizes de implementação

- A referência principal é a loja-virtual: **Controller → Service → Repository**, com DTOs de entrada e saída e tratamento centralizado de exceções. Organize o monólito por módulos de negócio, mantendo as camadas reconhecíveis dentro deles.
- Controllers traduzem HTTP; services executam casos de uso, autorização contextual, regras e transações; repositories persistem e consultam. Mappers não consultam banco nem executam regras.
- Reutilize conceitos de tenancy e acessos do Schools; adapte-os a Java/Spring. Não copie dependências Django, heranças genéricas ou regras próprias do domínio escolar.
- Prefira composição, métodos pequenos e abstrações justificadas. Não introduza microserviços, filas externas ou frameworks adicionais sem necessidade demonstrada.

## Backend como autoridade

- Valide formato, tamanho e campos permitidos na entrada; valide invariantes no service e integridade no banco. Validação no frontend é apoio à usabilidade.
- Recalcule preços, adicionais, taxas, totais e saldo no backend. Não aceite preço ou estado final escolhido pelo cliente.
- Autorize cada ação sobre o recurso, considerando tenant, unidade, vínculo do usuário e estado atual. Negue por padrão. Esconder botões não é autorização.
- Permissões financeiras e transições operacionais têm ações explícitas; uma permissão CRUD genérica não as concede.
- Use constraints, versões e locks quando houver invariantes concorrentes. Revalide autorização e estado na operação protegida. Não mantenha lock de banco durante chamadas externas.
- Operações repetíveis de criação, cobrança, cancelamento e devolução exigem idempotência com contexto, payload e resultado persistidos.
- Use registro durável de eventos recebidos, tentativas externas e notificações. Jobs devem sobreviver a reinício e permitir reconciliação; não trate timeout como falha financeira definitiva.

<a id="transacoes-e-recuperacao"></a>
## Transações, concorrência e recuperação

Use locks/versões apenas onde uma invariante exige. Exemplos: iniciar preparo versus cancelar; confirmar rodada versus iniciar fechamento; aplicar pagamento versus saldo; reservar devolução versus saldo devolvível; editar matriz versus alteração concorrente. Defina ordem de locks consistente e retry limitado para conflito recuperável.

Auditoria e eventos de saída são gravados na mesma transação da mudança local. Chamadas externas ocorrem fora de locks longos: persistir intenção/tentativa, executar SDK e confirmar resultado em nova transação com revalidação. Um timeout não prova que o provedor não executou a ação.

Jobs usam claim com lease/expiração, retry com intervalo e limite, última falha sanitizada e encaminhamento para intervenção. Devem ser seguros mesmo com execução duplicada ou dois processos durante deploy. O efeito pretendido é único por idempotência, não por promessa de entrega de mensagem exatamente uma vez.

O agendamento dos prazos dos pedidos tem uma thread dedicada, separada da
thread de pagamentos/comunicações/manutenção. HTTP externo lento não pode ocupar
o scheduler de alerta e expiração. Essa separação preserva os leases e o
contexto empresarial; não autoriza aumentar automaticamente o pool PostgreSQL.

No frontend, duplo clique é evitado por UX, mas o backend é quem deduplica. Mesma chave de idempotência + mesmo ator/contexto/payload retorna o mesmo resultado; payload diferente conflita. Após timeout, o cliente consulta/reenvia a mesma intenção. A janela de retenção das chaves deve cobrir retries e reconciliação e será fixada no contrato, não descartada a cada reinício.

## Evolução da documentação

Atualize a fonte responsável pelo assunto junto da mudança. Decisões arquiteturais relevantes podem ser registradas em [ADR](adr/README.md), preservando seu status proposto ou aceito. Resultado de sprint e evidência de teste não substituem a regra vigente.

## Documentos relacionados

- [Arquitetura](02_ARCHITECTURE.md)
- [Padrões de código](10_CODING_STANDARDS.md)
- [Critérios de entrega](12_DEFINITION_OF_DONE.md)

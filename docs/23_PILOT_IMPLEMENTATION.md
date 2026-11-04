# Implantação e condições do piloto

> **Escopo:** dependências E01–E12, responsáveis, validações e condições para iniciar ou interromper o piloto.
> **Situação:** especificação para implementação. Decisões confirmadas e premissas propostas seguem o [registro central](00_PROJECT_VISION.md); não representam funcionalidades já disponíveis.

[Índice da documentação](README.md)

<a id="registro-externo"></a>
## Registro externo

Todos os itens abaixo começam **pendentes**. “Responsável” indica a função que precisa assumir o item, não uma pessoa já designada.

| ID | Dependência / decisão necessária | Evidência para encerrar | Responsável a designar | Bloqueia |
| --- | --- | --- | --- | --- |
| E01 | Domínio e DNS | Domínio sob controle do projeto, registros e tenant resolvidos corretamente | Proprietário da plataforma | HTTPS e publicação pública |
| E02 | Conectividade, IP público/CGNAT e ingresso | Acesso externo estável, callbacks e alternativa acordada para quedas | Infraestrutura | Integrações reais e piloto |
| E03 | Inventário Linux, recursos e TLS | Distribuição suportada, serviços/portas, disco, RAM disponível, certificado e renovação verificados | Infraestrutura | Implantação e capacidade do piloto |
| E04 | Mercado Pago real por restaurante | Conta habilitada, aplicação/autorização, checkout, webhook e devolução controlados validados | Restaurante + responsável técnico | Pagamento online real |
| E05 | Provedor real de e-mail | Domínio remetente, autenticação, entrega e falhas verificadas | Plataforma | Convites/recuperação/e-mails reais |
| E06 | Processo fiscal e operação de pagamentos presenciais | Processo atual definido com responsáveis, emissão/registro e tratamento de cancelamento/devolução acordados | Restaurante + apoio contábil/fiscal | Uso comercial do piloto |
| E07 | Backup externo, retenção, RPO e RTO | Destino fora do servidor, execução monitorada e ensaio de restauração documentado | Infraestrutura | Dados reais |
| E08 | Restaurante, unidade, pessoas e horários do piloto | Responsáveis nomeados, aparelhos, disponibilidade, treinamento e contingência aceitos | Proprietário do restaurante | Início do piloto |
| E09 | Catálogo e operação reais | Produtos/preços/mídias autorizadas, horários, área/taxas e política operacional revisados | Restaurante | Pedidos reais |
| E10 | Privacidade, termos e retenção | Finalidades, contatos, acesso/retenção e procedimento de solicitações definidos | Plataforma + restaurante | Coleta real de dados |
| E11 | Suporte, alertas e limites de carga | Quem atende incidentes, canais, horários, metas e critérios de pausa acordados | Plataforma + restaurante | Operação acompanhada |
| E12 | Política comercial SaaS e exceções operacionais | Provisionamento/cobrança manual do piloto, suspensão, falha de entrega e devolução pós-despacho acordados | Plataforma + restaurante | Regras dependentes e piloto |

## Decisões de implementação ainda a validar

As propostas P01–P13 devem receber status e justificativa ao serem confirmadas ou substituídas. Permanecem para suas etapas: versões/pacote-base, método de login e tempos de sessão, detalhes da matriz, política de catálogo compartilhado, checkout e métodos de pagamento, prazo para pagamento, política de ocorrências pós-despacho, mecanismo de eventos e topologia pública.

Ambiente de execução, fluxo Hermes/Codex, continuidade autônoma, branches/push e deploy de homologação, combos e validação final foram definidos em D12 e D15–D18. Não reabrir essas escolhas como se ainda estivessem sem decisão. Versões técnicas e valores de configuração reais devem ser verificados na sprint correspondente, sem inventar evidência de ambiente/provedor.

Não é necessário resolver nome comercial, integrações futuras ou app nativo para iniciar a fundação. Domínio/conectividade e provedores devem ser encaminhados cedo para não bloquear as sprints finais. Operação fiscal, backup e responsáveis não podem ser deixados como “ajustes depois do lançamento”.

## Condições para início e interrupção

Iniciar o piloto somente após concluir o escopo acordado, registrar evidências da Sprint 5 e obter aceite dos responsáveis nomeados. Cada dependência deve ser encerrada ou ter uma restrição explícita aceita que remova o recurso correspondente do piloto; não marcar um item como validado por ter código simulado.

Homologação técnica pode ser publicada e validada autonomamente antes do piloto, em ambiente próprio e com dados fictícios/sandbox. E01–E12 não bloqueiam desenvolvimento e testes independentes, mas continuam obrigatórios para os cenários externos/operacionais a que se referem. Relatório técnico aprovado não equivale a produção autorizada nem a piloto real concluído.

Pausar novos pedidos se houver vazamento entre tenants/unidades, cobrança duplicada sem controle, perda de pedidos/recebimentos, impossibilidade de reconciliar dinheiro ou indisponibilidade sem contingência. Preservar atendimento de pedidos existentes, devoluções e evidências; não apagar dados para “limpar” a operação. Responsáveis devem definir quem pode pausar/retomar e comunicar o restaurante/clientes.

## Documentos relacionados

- [Decisões e premissas P01–P13](00_PROJECT_VISION.md)
- [Escopo e jornadas](01_PRD.md)
- [Sprint de homologação](19_SPRINT_05.md)
- [Runbook](22_PRODUCTION_RUNBOOK.md)

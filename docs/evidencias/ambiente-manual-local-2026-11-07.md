# Ambiente manual local — 2026-11-07

> Registro histórico da preparação de 07/11/2026. Artefato, massa e verificações
> abaixo descrevem aquela sessão. A demonstração recebeu depois o
> [redesenho de 08/11](redesenho-frontend-2026-11-08.md); consulte o
> [checkpoint vigente](../25_EXECUTION_STATUS.md) para o estado atual.

Preparado por solicitação do proprietário para experimentar o sistema com dados
fictícios. Esta entrega não modifica a aplicação nem aprova a matriz da Sprint 3.

## Isolamento e operação

- Origem própria `https://demo.localhost:8095`, somente loopback neste Mac.
- Banco novo `rm_dev`, owner `rm_dev_owner` e runtime `rm_dev_app`, com credenciais
  aleatórias próprias. Runtime sem credenciais de migração. Acesso de
  `rm_dev_app` ao banco `rm_test` conferido como negado.
- O processo PostgreSQL em `127.0.0.1:55432` é compartilhado com a validação da
  Sprint 3, pois o migrador e o runtime exigem esse destino. Banco, empresa,
  usuários, sessões, captura de e-mail e API são separados. Não encerrar o
  PostgreSQL enquanto a demonstração estiver em uso; a aplicação manual depende
  dele. O controle privado não reinicia nem encerra o serviço compartilhado.
- Cópia privada e fixa do JAR SHA-256
  `13a9cfe3c24abcf87e9e2dcbcd1e990ae2adba397fbc03c15598fdf29dee1496`, sem rebuild
  ou alteração do artefato utilizado pela matriz automática.
- Diretório local privado `~/.local/share/restaurant-manager-manual`, fora do
  checkout e da sincronização, com permissões 0700/0600. Contém controles,
  configuração, credenciais, logs, captura fictícia e backup inicial de `rm_dev`.
  Os acessos ficam somente no arquivo privado `ACESSOS.txt` e na entrega ao dono.
- HTTPS com CA local limitada por name constraints ao domínio de demonstração
  e ao loopback. Cadeia validada com a CA explícita e pelo verificador do macOS.

O controle é `python3 ~/.local/share/restaurant-manager-manual/control.py
start|stop|status`. `stop` atua somente na aplicação manual. Acesso externo,
inicialização automática após reinício do Mac e disponibilidade permanente
não fazem parte desta preparação.

## Dados fictícios e verificações

Empresa Bistrô de Demonstração, unidades Centro e Jardins com funcionamento
integral, cinco categorias, nove produtos incluindo um combo, adicionais e
quatro mesas fechadas em cada unidade. Contas de Administrador, Gerente,
Atendimento, Caixa, Cozinha, Expedição e Cliente com senhas distintas.
Convites e cadastro usam captura local; nenhum e-mail externo foi enviado.

Migrations e provisionamento executados no banco novo. Cadastro das demais
contas, catálogo e mesas feitos pelas APIs da aplicação. Logins e perfis
conferidos; catálogo público confirmado nas duas unidades.

O smoke real registrou **30 verificações aprovadas**: duas retiradas percorreram
carrinho → envio pelo Cliente → aceite pelo Atendimento → preparo e conclusão
pela Cozinha → acompanhamento pelo Cliente e consulta pela Expedição. Os dois
pedidos ficaram `PRONTO`, sem recebimento e com saldo pendente. Cliente sem
acesso à configuração e Cozinha sem acesso à gestão do catálogo retornaram 403.
Esse smoke não equivale à matriz completa de telas, perfis e unidades.

O Chrome inicialmente exibiu aviso de autoridade não reconhecida após a
configuração do certificado, embora o macOS validasse a cadeia. Após o
proprietário reabrir o navegador, a página carregou em HTTPS sem esse aviso.
Pela UI foram confirmados sistema conectado, unidades Centro/Jardins e login
como Administrador, com painel de acessos e funcionários da demonstração.
Essa verificação dirigida não substitui a matriz visual completa. O Administrador
provisionado mantém o indicador inicial de e-mail não verificado; o login e os
recursos administrativos verificados não dependem dessa confirmação.

Sem pagamentos reais, operação comercial, deploy Linux, homologação ou merge.
O [checkpoint](../25_EXECUTION_STATUS.md) conserva a execução independente da
Sprint 3 e seus limites.

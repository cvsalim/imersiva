# IMERSIVA

Site institucional estático com cinco páginas principais, três páginas de temas, política de privacidade e envio de propostas por PHP/SMTP, sem banco de dados.

## Desenvolvimento

Requisitos: Node.js 20+, PHP 8.2+ com OpenSSL e Composer.

```powershell
composer install --no-dev --prefer-dist
npm run build
php -S 127.0.0.1:8080 -t dist
```

Abra `http://127.0.0.1:8080`. `npm run dev` também gera o site e inicia essa prévia. O gerador e os testes de integração usam apenas módulos nativos do Node. A dependência de desenvolvimento Playwright é utilizada somente nos testes de navegador, não no site publicado.

- [src/pages.mjs](./src/pages.mjs): textos e estrutura das páginas.
- [src/layout.mjs](./src/layout.mjs): cabeçalho, rodapé e metadados.
- [src/contact.mjs](./src/contact.mjs): formulários de contato simples e orçamento.
- [src/topics.mjs](./src/topics.mjs): cards e páginas de Astronomia, Nosso planeta e Ciência.
- [public/assets/site.css](./public/assets/site.css): identidade e responsividade.
- [public/assets/site.js](./public/assets/site.js): menu móvel e melhoria progressiva do formulário.
- [app/contact.php](./app/contact.php): validação, limitação de requisições e envio SMTP.
- [PLANO-DO-SITE.md](./PLANO-DO-SITE.md): planejamento e critérios.

Execute `npm run build` após alterar textos, estilos, imagens ou o endpoint público. A pasta `dist` é gerada; não edite seus arquivos diretamente.

### Identidade e contato

A paleta institucional usa roxo `#3B0A69`, lilás vívido `#9B33EE`, cinza escuro `#231F20`, azul escuro `#111827` e azul claro `#38B6FF`. Os tokens CSS concentram essas cores: azul escuro nos fundos, lilás nos botões com texto branco, azul claro em links e foco e roxo nos efeitos de profundidade. Os degradês usam transparência para preservar a leitura. Textos neutros, cores de estado e cores naturais das imagens são mantidos.

Os símbolos de WhatsApp e Instagram são SVGs locais embutidos, acompanhados por texto e sem requisições externas.

Na página inicial, o cabeçalho fica transparente e sobreposto ao cenário espacial, sem linha divisória. No celular, somente o menu expandido ganha um painel para manter os links legíveis. Sem JavaScript, o cabeçalho permanece no fluxo normal para não sobrepor a navegação ao conteúdo.

Em `/contato/`, a aba padrão **Fale conosco** pede nome, e-mail e mensagem; o telefone é opcional. **Já peça orçamento** mantém os dados da escola e da visita. Botões de proposta apontam para `/contato/#orcamento`. As abas suportam setas, Home e End, preservam os rascunhos independentemente e mostram ambos os formulários como seções navegáveis quando não há JavaScript.

O campo `type` distingue `contact` e `quote` na validação, no assunto e no corpo do e-mail. Escola e cidade são obrigatórias apenas no orçamento. Requisições sem esse campo preservam a validação de orçamento da primeira versão; tipos desconhecidos são rejeitados. Ambos os formulários compartilham as proteções e a configuração SMTP.

## Validação

```powershell
npm test
php -l app\contact.php
php -l public\contato\enviar.php
node --check public\assets\site.js
```

Os testes iniciam servidores PHP e SMTP em portas locais temporárias. Verificam links internos, metadados, recursos, validação, entrega SMTP simulada, retorno sem JavaScript, bloqueio de abuso e falhas explícitas. Nenhuma mensagem é enviada para endereços reais.

Para executar os testes de navegador:

```powershell
npm ci
npx playwright install chromium
npm run test:browser
```

O Playwright utiliza a porta local 8082 e testa todas as nove páginas em 360, 390, 768 e 1440 pixels, além de menu, foco, formulário, perguntas frequentes, erros de rede e navegação sem JavaScript. Verifica os destinos de links internos e âncoras, incluindo a página 404, e a navegação dos cards por teclado até as páginas de temas e o orçamento. Links externos são conferidos quanto ao endereço configurado, sem enviar mensagens ou verificar a disponibilidade das plataformas. A porta deve estar livre. Os testes de formulário esperam configuração SMTP ausente nesse ambiente; não use credenciais reais ao executar os testes.

## Publicação na Hostinger

O Node só é utilizado na preparação local. A hospedagem executa arquivos estáticos e PHP.

### 1. Preparar o pacote

```powershell
composer install --no-dev --prefer-dist --optimize-autoloader
npm run build
```

Estrutura no servidor, dentro da pasta do domínio:

```text
app/
  contact.php
config/
  mail.php
vendor/
var/
  contact/
public_html/
  index.html
  assets/
  contato/
  experiencia/
  para-escolas/
  sobre/
  privacidade/
  .htaccess
  ...
```

Envie **o conteúdo de `dist`** para `public_html`. As pastas `app`, `config`, `vendor` e `var` devem ser irmãs de `public_html`, nunca ficar dentro dela. O endpoint procura o código privado dois níveis acima da pasta `contato`. Se o plano contratado não permitir essa estrutura, confirme uma localização privada e ajuste os caminhos antes de publicar; não exponha configurações ou dependências na raiz pública.

Não publique o repositório inteiro, os PDFs, os originais de imagem, testes ou arquivos de configuração de exemplo na pasta pública.

### 2. Configurar o e-mail

Copie [config/mail.example.php](./config/mail.example.php) para `config/mail.php` no ambiente privado. Preencha host, porta, criptografia e credenciais fornecidas pelo serviço de e-mail. A caixa de contato é `contato@imersivabr.com`.

Gere uma chave exclusiva para a proteção de envios:

```powershell
php -r "echo bin2hex(random_bytes(32));"
```

Coloque o resultado em `rate_key`. Nunca envie credenciais pelo chat ou inclua `mail.php` no Git. As configurações também podem ser fornecidas pelas variáveis `SMTP_HOST`, `SMTP_PORT`, `SMTP_ENCRYPTION`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, `CONTACT_RATE_KEY`, `CONTACT_STORAGE` e `CONTACT_ORIGIN`. A configuração privada, quando presente, tem precedência.

- `smtps`: TLS implícito, normalmente porta 465.
- `tls`: STARTTLS, normalmente porta 587.
- TLS não é desativado em servidores remotos. O modo sem criptografia existe apenas para os testes em loopback.
- O remetente deve ser autorizado pelo provedor. O e-mail do visitante aparece em `Reply-To`, não no remetente.
- A aplicação precisa poder gravar em `var/contact`, fora da área pública.
- Ajuste o PHP para registrar erros no servidor sem exibi-los publicamente (`display_errors=Off`, `log_errors=On`).

Sem configuração válida, o formulário retorna indisponibilidade e oferece e-mail e WhatsApp. Não simula sucesso. O JavaScript mantém os campos preenchidos em caso de falha.

São permitidas cinco tentativas válidas por IP em uma janela de 15 minutos. Os arquivos temporários usam identificadores HMAC, não armazenam o conteúdo do formulário e têm a janela expirada limpa no uso subsequente. Arquivos vazios podem permanecer no disco; configure uma tarefa periódica para remover apenas os registros antigos de `var/contact` durante uma janela sem tráfego, se necessário. Não utilize cabeçalhos de proxy como IP sem configurar uma cadeia de proxies confiável.

### 3. Domínio e verificações de produção

- Apontar `imersivabr.com` para a hospedagem e ativar HTTPS.
- Configurar `www` e confirmar o redirecionamento para `https://imersivabr.com`.
- Verificar se o Apache/LiteSpeed aplica `.htaccess`, cabeçalhos e a página 404.
- Confirmar criação da caixa, autenticação SMTP e registros SPF, DKIM e DMARC conforme o provedor.
- Enviar uma solicitação real e conferir a caixa de entrada e o spam; testar a resposta ao solicitante.
- Confirmar os links de WhatsApp e Instagram.
- Submeter o sitemap aos buscadores, se desejado.

A aceitação pelo SMTP não garante a chegada à caixa de entrada. Essa entrega precisa ser verificada no ambiente real antes de divulgar o site.

## Conteúdo e imagens

Os recursos locais foram preparados a partir dos arquivos fornecidos pela empresa:

- Logo claro extraído da apresentação comercial, sem a assinatura para manter leitura no cabeçalho.
- Terra extraída da mesma apresentação, espelhada e comprimida para a abertura e os cards.
- Foto do domo da apresentação, identificada no site como referência de estrutura, não como foto de atendimento próprio.
- Fundo de estrelas, ilustrações CSS, ícone e capa de compartilhamento preparados para este site.

Não há imagens carregadas de bancos externos, rastreadores, fontes externas ou feeds incorporados. A tipografia usa a pilha de fontes do sistema para evitar dependência de rede.

Antes do lançamento, confirmar os direitos de uso dos recursos presentes na apresentação, validar os dados comerciais de capacidade e duração, requisitos de espaço, adaptações de acesso e a política de privacidade. Não foram publicadas fotos de crianças, depoimentos, nomes de escolas, alegações de pioneirismo, garantias sanitárias ou certificações.

O responsável da empresa deve validar a política, incluindo identificação institucional, fornecedores de e-mail e prazo operacional de retenção. A política atual descreve o atendimento por e-mail; alterações na operação exigem atualização.

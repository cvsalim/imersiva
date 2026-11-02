export const arrow = '<span aria-hidden="true">↗</span>';
export const cta = (label = 'Solicitar proposta') => `<a class="button" href="/contato/#orcamento">${label} ${arrow}</a>`;
export const socialIcon = (name) => `<svg class="social-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${name === 'instagram' ? '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>' : '<path d="M20.5 11.6a8.6 8.6 0 0 1-12.7 7.6L3 20.5l1.3-4.7A8.6 8.6 0 1 1 20.5 11.6Z"/><path d="M8.2 7.4c-.5.2-.8.8-.8 1.4 0 2.8 3.8 6.6 6.6 6.6.7 0 1.3-.4 1.5-.9l.3-1-2.4-1.1-.8 1c-1.5-.5-2.7-1.7-3.2-3.2l1-.8-1.1-2.3Z"/>'}</svg>`;
export const closing = `<section class="closing container"><div><p class="eyebrow">A próxima descoberta começa aqui</p><h2>Um universo de possibilidades.<br>Dentro da sua escola.</h2><p>Vamos planejar uma experiência para os seus alunos?</p><a class="button" href="/contato/">Vamos conversar ${arrow}</a></div><div class="closing-orbit" aria-hidden="true"><span></span></div></section>`;

export function layout({ slug, title, description, content }) {
  const nav = [['experiencia', 'A experiência'], ['para-escolas', 'Para escolas'], ['sobre', 'Sobre nós']];
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111827">
  <title>${title} | IMERSIVA</title>
  <meta name="description" content="${description}">
  ${slug === '404' ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="https://imersivabr.com/${slug ? `${slug}/` : ''}">`}
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="IMERSIVA">
  <meta property="og:title" content="${title} | IMERSIVA">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="https://imersivabr.com/${slug ? `${slug}/` : ''}">
  <meta property="og:image" content="https://imersivabr.com/assets/share.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="IMERSIVA — experiências que transformam">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  ${slug === '' ? '<link rel="preload" href="/assets/earth.webp" as="image">' : ''}
  <script src="/assets/site.js" defer></script>
</head>
<body class="${slug === '' ? 'home' : 'inner-page'}">
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <header class="site-header container">
    <a class="brand" href="/" aria-label="IMERSIVA — início"><img src="/assets/logo-light.png" alt="IMERSIVA" width="220" height="90"></a>
    <button class="menu-toggle" type="button" aria-controls="main-nav" aria-expanded="false" hidden><span>Menu</span><span class="menu-lines" aria-hidden="true"></span></button>
    <nav id="main-nav" aria-label="Menu principal">
      ${nav.map(([url, text]) => `<a href="/${url}/"${slug === url ? ' aria-current="page"' : ['astronomia', 'nosso-planeta', 'ciencia'].includes(slug) && url === 'experiencia' ? ' aria-current="location"' : ''}>${text}</a>`).join('')}
      <a class="button button-small" href="/contato/#orcamento"${slug === 'contato' ? ' aria-current="page"' : ''}>Solicitar proposta ${arrow}</a>
    </nav>
  </header>
  <main id="conteudo">${content}</main>
  <footer class="site-footer container">
    <div class="footer-top"><div><a class="brand footer-brand" href="/" aria-label="IMERSIVA — início"><img src="/assets/logo-light.png" alt="IMERSIVA" width="220" height="90" loading="lazy"></a><p>Experiências que transformam.</p><span class="footer-region">São José dos Campos · Vale do Paraíba, SP</span></div>
    <div><h2>Explore</h2><a href="/experiencia/">A experiência</a><a href="/para-escolas/">Para escolas</a><a href="/sobre/">Sobre a IMERSIVA</a></div>
    <div><h2>Vamos conversar</h2><a href="/contato/">Fale conosco</a><a href="mailto:contato@imersivabr.com">contato@imersivabr.com</a><a class="social-link" href="https://wa.me/5512991788438">${socialIcon('whatsapp')} WhatsApp · (12) 99178-8438</a><a class="social-link" href="https://www.instagram.com/somos.imersiva/">${socialIcon('instagram')} Instagram · @somos.imersiva ${arrow}</a></div></div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} IMERSIVA. Todos os direitos reservados.</span><a href="/privacidade/">Privacidade</a><span>Feito para despertar descobertas <span class="tiny-star" aria-hidden="true">✦</span></span></div>
  </footer>
</body>
</html>`;
}

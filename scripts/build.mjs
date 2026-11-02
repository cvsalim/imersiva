import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pages } from '../src/pages.mjs';
import { layout } from '../src/layout.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
await cp(path.join(root, 'public'), output, { recursive: true });
if (process.env.VERCEL === '1') {
  await rm(path.join(output, 'contato', 'enviar.php'), { force: true });
}
for (const page of pages) {
  const directory = path.join(output, page.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'index.html'), layout(page));
}
await writeFile(path.join(output, '404.html'), layout({
  slug: '404', title: 'Página não encontrada', description: 'Encontre seu caminho de volta à IMERSIVA.',
  content: `<section class="page-hero container error-page"><p class="eyebrow">404 · Fora de órbita</p><h1>Vamos encontrar<br>outro caminho?</h1><p>Esta página não existe ou mudou de endereço.</p><a class="button" href="/">Voltar ao início <span aria-hidden="true">↗</span></a></section>`,
}));
const urls = pages.map(({ slug }) => `<url><loc>https://imersivabr.com/${slug ? `${slug}/` : ''}</loc></url>`).join('');
await writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
// Fail the build rather than publish a site without its primary artwork.
await readFile(path.join(output, 'assets', 'logo-light.png'));
console.log(`IMERSIVA: ${pages.length} páginas + 404 geradas em dist.`);

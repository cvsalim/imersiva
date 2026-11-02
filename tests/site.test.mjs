import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pages } from '../src/pages.mjs';

const root = path.resolve('dist');

test('all pages have unique metadata, local links and usable form labels', async () => {
  const titles = new Set();
  for (const { slug } of pages) {
    const file = path.join(root, slug, 'index.html');
    const html = await readFile(file, 'utf8');
    assert.match(html, /<html lang="pt-BR">/);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, file);
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    assert.ok(!titles.has(title), `Duplicated title: ${title}`);
    titles.add(title);
    assert.match(html, /<meta name="description" content="[^"]+">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/imersivabr\.com\//);
    assert.match(html, /href="#conteudo"/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `Duplicated id in ${file}`);
    for (const [, url] of html.matchAll(/(?:href|src|action)="(\/[^"]*)"/g)) {
      const target = url.split('#')[0].split('?')[0];
      const resolved = path.join(root, target.endsWith('/') ? `${target}index.html` : target);
      assert.ok((await stat(resolved)).isFile(), `Missing ${target} in ${file}`);
      const fragment = url.split('#')[1];
      if (fragment) {
        const destination = await readFile(resolved, 'utf8');
        assert.ok(destination.includes(`id="${fragment}"`), `Missing #${fragment} in ${target}`);
      }
    }
    for (const [, fragment] of html.matchAll(/href="#([^"]*)"/g)) {
      assert.ok(fragment && ids.includes(fragment), `Missing local anchor #${fragment} in ${file}`);
    }
    for (const [, id] of html.matchAll(/<(?:input|select|textarea)\b[^>]*id="([^"]+)"/g)) {
      assert.ok(html.includes(`for="${id}"`), `Missing label: ${id}`);
    }
    assert.ok(!/<(?:iframe|script)[^>]+src="https?:/.test(html), 'No external embed or script');
  }
});

test('sitemap, robots and deployment configuration agree', async () => {
  const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
  assert.equal((sitemap.match(/<loc>/g) || []).length, pages.length);
  for (const { slug } of pages) {
    assert.ok(sitemap.includes(`https://imersivabr.com/${slug ? `${slug}/` : ''}`));
  }
  assert.ok(!sitemap.includes('404'));
  const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
  assert.ok(robots.includes('https://imersivabr.com/sitemap.xml'));
  const htaccess = await readFile(path.join(root, '.htaccess'), 'utf8');
  assert.ok(htaccess.includes('ErrorDocument 404 /404.html'));
  const notFound = await readFile(path.join(root, '404.html'), 'utf8');
  assert.ok(notFound.includes('name="robots" content="noindex"'));
});

test('artwork budget stays small and all form fields have server equivalents', async () => {
  for (const asset of ['logo-light.png', 'earth.webp', 'stars.webp', 'dome-reference.webp', 'imersiva-dome.webp', 'share.jpg']) {
    assert.ok((await stat(path.join(root, 'assets', asset))).size < 200_000, `${asset} is too heavy`);
  }
  const html = await readFile(path.join(root, 'contato', 'index.html'), 'utf8');
  const php = await readFile(path.resolve('app', 'contact.php'), 'utf8');
  for (const [, field] of html.matchAll(/<(?:input|select|textarea)\b[^>]*name="([^"]+)"/g)) {
    assert.ok(php.includes(`'${field}' =>`), `Unvalidated field ${field}`);
  }
  assert.match(html, /action="\/contato\/enviar.php" method="post"/);
});

test('brand colors preserve readable text contrast', async () => {
  const css = await readFile(path.join(root, 'assets', 'site.css'), 'utf8');
  const token = (name) => {
    const value = css.match(new RegExp(`--${name}: (#[a-f0-9]{6});`));
    assert.ok(value, `Missing brand token ${name}`);
    return value[1];
  };
  assert.equal(token('purple'), '#3b0a69');
  assert.equal(token('lilac'), '#9b33ee');
  assert.equal(token('charcoal'), '#231f20');
  assert.equal(token('bg'), '#111827');
  assert.equal(token('accent'), '#38b6ff');
  const luminance = (hex) => {
    const channels = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
      .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  for (const [foreground, background] of [
    ['#ffffff', token('lilac')], [token('accent'), token('bg')],
    [token('text'), token('bg')], [token('muted'), token('charcoal')],
  ]) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    const contrast = (values[0] + .05) / (values[1] + .05);
    assert.ok(contrast >= 4.5, `${foreground} on ${background}: ${contrast.toFixed(2)}:1`);
  }
});

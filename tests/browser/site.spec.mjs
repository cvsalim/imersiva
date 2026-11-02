import { test, expect } from '@playwright/test';
import { pages } from '../../src/pages.mjs';
import { topics } from '../../src/topics.mjs';

const routes = pages.map(({ slug }) => `/${slug ? `${slug}/` : ''}`);

test('every internal link and anchor reaches a real destination', async ({ page, request }) => {
  const destinations = new Set();
  for (const route of [...routes, '/404.html']) {
    await page.goto(route);
    const links = await page.locator('a').evaluateAll((anchors) => anchors.map((anchor) => ({
      href: anchor.getAttribute('href'), resolved: anchor.href,
    })));
    for (const link of links) {
      expect(link.href).toBeTruthy();
      expect(link.href).not.toBe('#');
      expect(link.href).not.toMatch(/^javascript:/i);
      if (link.resolved.startsWith('http://127.0.0.1:8082/')) destinations.add(link.resolved);
      else expect(link.resolved).toMatch(/^(https:\/\/(wa\.me|www\.instagram\.com)\/|mailto:contato@imersivabr\.com)/);
    }
  }
  for (const destination of destinations) {
    const url = new URL(destination);
    expect((await request.get(url.pathname)).status()).toBe(200);
    if (url.hash) {
      await page.goto(destination);
      await expect(page.locator(`[id="${url.hash.slice(1)}"]`)).toBeVisible();
    }
  }
});

for (const topic of topics) {
  test(`${topic.slug} card opens its detail page and quote tab`, async ({ page }) => {
    for (const start of ['/', '/experiencia/']) {
      await page.goto(start);
      const card = page.locator('.topic-card').getByRole('link', { name: topic.title, exact: true });
      await card.focus();
      await expect(card).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/${topic.slug}/$`));
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: 'A experiência' })).toHaveAttribute('aria-current', 'location');
      await page.getByRole('link', { name: 'Pedir orçamento para minha escola' }).click();
      await expect(page).toHaveURL(/\/contato\/#orcamento$/);
      await expect(page.getByRole('tab', { name: 'Já peça orçamento' })).toHaveAttribute('aria-selected', 'true');
    }
  });
}

for (const width of [390, 1440]) {
  test(`home header overlays the continuous space scene at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const scene = await page.evaluate(() => {
      const header = document.querySelector('.site-header');
      const hero = document.querySelector('.hero');
      const stars = document.querySelector('.hero-stars');
      const title = document.querySelector('h1');
      return {
        headerBottom: header.getBoundingClientRect().bottom,
        heroTop: hero.getBoundingClientRect().top,
        starsTop: stars.getBoundingClientRect().top,
        titleTop: title.getBoundingClientRect().top,
        background: getComputedStyle(header).backgroundColor,
        border: getComputedStyle(header).borderBottomWidth,
      };
    });
    expect(scene.heroTop).toBe(0);
    expect(scene.starsTop).toBe(0);
    expect(scene.background).toBe('rgba(0, 0, 0, 0)');
    expect(scene.border).toBe('0px');
    expect(scene.titleTop).toBeGreaterThan(scene.headerBottom);
  });
}

for (const width of [360, 390, 768, 1440]) {
  test(`all pages fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        content: document.documentElement.scrollWidth,
        broken: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
      }));
      expect(dimensions.viewport).toBe(width);
      expect(dimensions.content).toBeLessThanOrEqual(width);
      expect(dimensions.broken).toBe(0);
      if (width <= 760) await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
      else await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeHidden();
    }
    expect(errors).toEqual([]);
  });
}

test('mobile menu, keyboard and FAQ work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole('navigation').getByRole('link', { name: 'Para escolas', exact: true }).click();
  await expect(page).toHaveURL(/para-escolas/);
  const question = page.getByText('Quanto tempo dura uma sessão?', { exact: true });
  await question.click();
  await expect(page.getByText(/As sessões variam de 15 a 35 minutos/)).toBeVisible();
});

async function fillForm(page) {
  const form = page.locator('#orcamento form');
  await form.getByLabel('Seu nome').fill('Maria Teste');
  await form.getByLabel('Escola ou instituição').fill('Escola Teste');
  await form.getByLabel('E-mail', { exact: false }).fill('professora@example.test');
  await form.getByLabel('Cidade').fill('São José dos Campos');
  await form.getByLabel('Sua mensagem').fill('Gostaria de conhecer a proposta para nossas turmas.');
}

test('form retains values on real configuration error and resets only on confirmed success', async ({ page }) => {
  await page.goto('/contato/#orcamento');
  await fillForm(page);
  const responsePromise = page.waitForResponse('**/contato/enviar.php');
  await page.getByRole('button', { name: 'Solicitar orçamento' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(503);
  await expect(page.locator('#orcamento .form-status')).toContainText('temporariamente indisponível');
  await expect(page.locator('#orcamento').getByLabel('Seu nome')).toHaveValue('Maria Teste');
  await expect(page.getByRole('button', { name: 'Solicitar orçamento' })).toBeEnabled();
  await page.route('**/contato/enviar.php', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, message: 'Solicitação enviada! Teste de interface.' }),
  }));
  await page.getByRole('button', { name: 'Solicitar orçamento' }).click();
  await expect(page.locator('#orcamento .form-status')).toContainText('Solicitação enviada!');
  await expect(page.locator('#orcamento').getByLabel('Seu nome')).toHaveValue('');
});

test('network failure is visible and never clears the request', async ({ page }) => {
  await page.goto('/contato/#orcamento');
  await fillForm(page);
  await page.route('**/contato/enviar.php', (route) => route.abort());
  await page.getByRole('button', { name: 'Solicitar orçamento' }).click();
  await expect(page.locator('#orcamento .form-status')).toContainText('Não foi possível confirmar o envio');
  await expect(page.locator('#orcamento').getByLabel('Seu nome')).toHaveValue('Maria Teste');
});

test('content and native form remain usable with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:8082/contato/');
    await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeVisible();
    await fillForm(page);
    await page.getByRole('button', { name: 'Solicitar orçamento' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Não foi possível enviar');
    await expect(page.getByText(/temporariamente indisponível/)).toBeVisible();
  } finally {
    await context.close();
  }
});

test('simple contact also submits without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:8082/contato/');
    const form = page.locator('#fale-conosco form');
    await form.getByLabel('Seu nome').fill('Maria Contato');
    await form.getByLabel('E-mail').fill('maria@example.test');
    await form.getByLabel('Sua mensagem').fill('Gostaria de conversar com a equipe.');
    await form.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Não foi possível enviar');
    await expect(page.getByText(/temporariamente indisponível/)).toBeVisible();
  } finally {
    await context.close();
  }
});

test('contact tabs support keyboard, deep links and independent drafts', async ({ page }) => {
  await page.goto('/contato/');
  const contact = page.locator('#fale-conosco');
  await expect(page.getByRole('tab', { name: 'Fale conosco' })).toHaveAttribute('aria-selected', 'true');
  await expect(contact.locator('input:not([type="hidden"]):not([name="website"]), textarea')).toHaveCount(4);
  await contact.getByLabel('Seu nome').fill('Rascunho');
  await page.getByRole('tab', { name: 'Fale conosco' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Já peça orçamento' })).toBeFocused();
  await expect(page.locator('#orcamento')).toBeVisible();
  await expect(contact).toBeHidden();
  await expect(page).toHaveURL(/#orcamento$/);
  await page.keyboard.press('Home');
  await expect(contact.getByLabel('Seu nome')).toHaveValue('Rascunho');
  await page.goto('/');
  await page.getByRole('navigation').getByRole('link', { name: 'Solicitar proposta' }).click();
  await expect(page.getByRole('tab', { name: 'Já peça orçamento' })).toHaveAttribute('aria-selected', 'true');
});

test('simple contact sends only its fields and has its own success state', async ({ page }) => {
  await page.goto('/contato/');
  const form = page.locator('#fale-conosco form');
  await form.getByLabel('Seu nome').fill('Maria Contato');
  await form.getByLabel('E-mail').fill('maria@example.test');
  await form.getByLabel('Sua mensagem').fill('Tenho uma dúvida sobre o atendimento.');
  let submitted;
  await page.route('**/contato/enviar.php', async (route) => {
    submitted = route.request().postData();
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, message: 'Mensagem enviada!' }) });
  });
  await form.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(form.locator('.form-status')).toContainText('Mensagem enviada!');
  expect(submitted).toContain('name="type"');
  expect(submitted).toContain('contact');
  expect(submitted).not.toContain('name="school"');
  expect(submitted).not.toContain('name="city"');
  await expect(form.getByLabel('Seu nome')).toHaveValue('');
});

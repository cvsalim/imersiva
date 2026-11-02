import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, unlink, rmdir, readFile, writeFile, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const payload = {
  type: 'quote', name: 'Maria Teste', school: 'Escola Teste', email: 'professora@example.test',
  phone: '(12) 99999-9999', city: 'São José dos Campos', audience: 'Educação Infantil',
  students: '150', period: 'A definir', message: 'Gostaria de conhecer a proposta para as nossas turmas.', website: '',
};

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

async function preview(env = {}) {
  const probe = net.createServer();
  const port = await listen(probe);
  await new Promise((resolve) => probe.close(resolve));
  const child = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'dist'], {
    env: { ...process.env, ...env, CONTACT_ORIGIN: `http://127.0.0.1:${port}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stderr.on('data', (data) => { logs += data; });
  const url = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) { ready = true; break; }
    } catch { /* The server has not bound the port yet. */ }
    await delay(50);
  }
  assert.ok(ready, `PHP preview failed to start: ${logs}`);
  return {
    url, logs: () => logs,
    close: async () => {
      if (child.exitCode === null) {
        const closed = new Promise((resolve) => child.once('exit', resolve));
        child.kill();
        await closed;
      }
    },
  };
}

function fakeSmtp() {
  const messages = [];
  const sockets = new Set();
  const state = { reject: false };
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.setEncoding('utf8');
    socket.write('220 localhost Test SMTP\r\n');
    let buffer = '';
    let mode = '';
    let message = '';
    socket.on('data', (chunk) => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (mode === 'data') {
          if (line === '.') {
            if (state.reject) socket.write('554 Message rejected for test\r\n');
            else { messages.push(message); socket.write('250 Message accepted\r\n'); }
            message = '';
            mode = '';
          } else message += `${line}\r\n`;
        } else if (mode === 'username') {
          mode = 'password'; socket.write('334 UGFzc3dvcmQ6\r\n');
        } else if (mode === 'password') {
          mode = ''; socket.write('235 Authentication successful\r\n');
        } else if (line.startsWith('EHLO')) {
          socket.write('250-localhost\r\n250 AUTH LOGIN\r\n');
        } else if (line.startsWith('AUTH LOGIN')) {
          mode = 'username'; socket.write('334 VXNlcm5hbWU6\r\n');
        } else if (line.startsWith('DATA')) {
          mode = 'data'; socket.write('354 End with dot\r\n');
        } else if (line.startsWith('QUIT')) {
          socket.end('221 Bye\r\n');
        } else socket.write('250 OK\r\n');
      }
    });
  });
  return {
    server, messages, state,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test('contact endpoint validates, sends through SMTP and fails explicitly', async (t) => {
  const smtp = fakeSmtp();
  const smtpPort = await listen(smtp.server);
  const storage = await mkdtemp(path.join(tmpdir(), 'imersiva-contact-test-'));
  const app = await preview({
    SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtpPort), SMTP_ENCRYPTION: 'none',
    SMTP_USERNAME: 'test', SMTP_PASSWORD: 'local-test-only',
    SMTP_FROM: 'contato@imersivabr.com', CONTACT_RATE_KEY: 'test-key-not-a-production-secret-123456789',
    CONTACT_STORAGE: storage,
  });
  const reset = async () => {
    for (const file of await readdir(storage)) await unlink(path.join(storage, file));
  };
  const post = (values = payload, headers = {}) => fetch(`${app.url}/contato/enviar.php`, {
    method: 'POST', headers: { Accept: 'application/json', Origin: app.url, ...headers },
    body: new URLSearchParams(values),
  });
  try {
    await t.test('rejects GET and malformed, oversized, cross-origin and bot submissions', async () => {
      assert.equal((await fetch(`${app.url}/contato/enviar.php`)).status, 405);
      for (const invalid of [
        { ...payload, email: 'invalid' }, { ...payload, message: 'short' },
        { ...payload, name: 'a'.repeat(121) }, { ...payload, students: '100001' },
        { ...payload, students: '-1' }, { ...payload, audience: 'invented' },
        { ...payload, website: 'bot.example' }, { ...payload, email: 'a@b.test\r\nBcc: other@b.test' },
        { ...payload, type: 'invalid' }, { ...payload, school: '', city: '' },
      ]) assert.equal((await post(invalid)).status, 422);
      const arrayPayload = new URLSearchParams(payload);
      arrayPayload.delete('name'); arrayPayload.set('name[]', 'unexpected');
      const invalidArray = await fetch(`${app.url}/contato/enviar.php`, { method: 'POST', body: arrayPayload });
      assert.equal(invalidArray.status, 422);
      assert.equal((await post({ ...payload, message: 'a'.repeat(40000) })).status, 413);
      assert.equal((await post(payload, { Origin: 'https://other.example' })).status, 403);
      assert.equal(smtp.messages.length, 0);
    });
    await t.test('accepts a real local SMTP transaction and sets Reply-To', async () => {
      const response = await post();
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.ok, true);
      assert.match(result.message, /Solicitação enviada/);
      assert.equal(smtp.messages.length, 1);
      assert.match(smtp.messages[0], /Reply-To: Maria Teste <professora@example.test>/);
      assert.match(smtp.messages[0], /To: contato@imersivabr.com/);
      assert.match(smtp.messages[0], /Escola Teste/);
      assert.match(smtp.messages[0], /Tipo: Pedido de or/);
      const record = JSON.parse(await readFile(path.join(storage, (await readdir(storage))[0]), 'utf8'));
      assert.deepEqual(Object.keys(record).sort(), ['count', 'start']);
    });
    await t.test('works without JavaScript and permits unknown optional values', async () => {
      const values = { ...payload, phone: '', students: '', period: '', audience: 'A definir' };
      const response = await post(values, { Accept: 'text/html' });
      assert.equal(response.status, 200);
      assert.match(await response.text(), /<h1>Solicitação enviada<\/h1>/);
    });
    await t.test('rejects SMTP failure without pretending success', async () => {
      smtp.state.reject = true;
      const response = await post();
      assert.equal(response.status, 503);
      assert.equal((await response.json()).ok, false);
      smtp.state.reject = false;
      assert.match(app.logs(), /SMTP delivery failed/);
      assert.ok(!app.logs().includes(payload.email), 'No form PII in application error logs');
    });
    await t.test('simple contact requires no school or city and identifies the message in email', async () => {
      await reset();
      const simple = { type: 'contact', name: payload.name, email: payload.email, message: payload.message, website: '' };
      const before = smtp.messages.length;
      const response = await post(simple);
      assert.equal(response.status, 200);
      assert.match((await response.json()).message, /Mensagem enviada/);
      assert.equal(smtp.messages.length, before + 1);
      const mail = smtp.messages.at(-1);
      assert.match(mail, /Tipo: Fale conosco/);
      assert.ok(!mail.includes('Escola:'));
      assert.ok(!mail.includes('Cidade:'));
      for (const invalid of [{ ...simple, email: 'invalid' }, { ...simple, name: '' }, { ...simple, message: '' }]) {
        assert.equal((await post(invalid)).status, 422);
      }
      assert.equal((await post(simple, { Accept: 'text/html' })).status, 200);
      await reset();
      const legacy = { ...payload };
      delete legacy.type;
      assert.equal((await post(legacy)).status, 200);
    });
    await t.test('limits attempts and can renew an expired window', async () => {
      await reset();
      for (let i = 0; i < 5; i++) assert.equal((await post()).status, 200);
      const denied = await post();
      assert.equal(denied.status, 429);
      assert.equal(denied.headers.get('retry-after'), '900');
      assert.equal((await denied.json()).ok, false);
      const recordFile = path.join(storage, (await readdir(storage))[0]);
      const expired = Math.floor(Date.now() / 1000) - 1000;
      await writeFile(recordFile, JSON.stringify({ start: expired, count: 5 }));
      await utimes(recordFile, expired, expired);
      assert.equal((await post()).status, 200);
      const renewed = JSON.parse(await readFile(recordFile, 'utf8'));
      assert.equal(renewed.count, 1);
      assert.ok(renewed.start > expired);
    });
  } finally {
    await app.close();
    await smtp.close();
    await reset();
    await rmdir(storage);
  }
});

test('unconfigured deployment reports unavailable rather than success', async () => {
  const app = await preview({ SMTP_HOST: '', SMTP_USERNAME: '', SMTP_PASSWORD: '', CONTACT_RATE_KEY: '' });
  try {
    const response = await fetch(`${app.url}/contato/enviar.php`, {
      method: 'POST', headers: { Accept: 'application/json' }, body: new URLSearchParams(payload),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
    assert.match(app.logs(), /Service unavailable/);
  } finally {
    await app.close();
  }
});

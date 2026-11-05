import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

// A disposable Compose project uses inert live configuration, never invokes provider routes, and owns its volume.
const root = mkdtempSync(join(tmpdir(), 'rehearse-docker-'));
const project = `rehearse-smoke-${Date.now()}`;
const image = process.argv[2] ?? 'rehearse-v4-test';
const password = 'local-smoke-password';
const authorization = `Basic ${Buffer.from(`rehearse:${password}`).toString('base64')}`;
writeFileSync(join(root, 'compose.yml'), readFileSync('docker-compose.yml'));
writeFileSync(
  join(root, 'override.yml'),
  `services:\n  rehearse:\n    image: ${image}\n    ports: !override\n      - "127.0.0.1:3350:3000"\n`,
);
writeFileSync(
  join(root, '.env'),
  `APP_EDITION=full\nLLM_MODE=live\nOPENAI_API_KEY=smoke-placeholder-not-a-key\nCHAT_MODEL=smoke-placeholder\nPRICE_INPUT_PER_MTOK=0\nPRICE_OUTPUT_PER_MTOK=0\nRATE_LIMIT_BACKEND=memory\nSESSION_SECRET=smoke-session-secret-000000000000000000\nIP_HASH_SECRET=smoke-ip-hash-secret-000000000000000000\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\nAPP_PASSWORD=${password}\nLOG_LEVEL=silent\n`,
);
const compose = (...args) =>
  execFileSync(
    'docker',
    [
      'compose',
      '-p',
      project,
      '-f',
      join(root, 'compose.yml'),
      '-f',
      join(root, 'override.yml'),
      ...args,
    ],
    { encoding: 'utf8' },
  ).trim();
let base;
async function ready() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      if (
        (
          await fetch(`${base}/api/health`, {
            headers: { authorization },
            signal: AbortSignal.timeout(2000),
          })
        ).ok
      )
        return;
    } catch {
      /* Startup only. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Container did not become ready');
}
async function post(path, body, headers = {}) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      authorization,
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 200, `${path} status`);
  return response.json();
}
try {
  compose('up', '-d', '--no-build');
  base = 'http://127.0.0.1:3350';
  await ready();
  const id = compose('ps', '-q', 'rehearse');
  assert.equal(
    execFileSync('docker', ['inspect', '--format', '{{.Config.User}}', id], {
      encoding: 'utf8',
    }).trim(),
    'node',
  );
  for (const route of [
    '/',
    '/setup',
    '/api/health',
    '/api/data',
    '/api/budget',
    '/_next/static/test.js',
    '/favicon.ico',
  ]) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 401, route);
    assert.match(response.headers.get('www-authenticate'), /Basic/);
  }
  assert.equal((await fetch(base, { headers: { authorization } })).status, 200);
  const text = readFileSync('tests/fixtures/export-v1.json', 'utf8');
  const sessionId = JSON.parse(text).sessions[0].session.id;
  assert.equal((await post('/api/data', { operation: 'importAll', text })).imported, 1);
  const before = await post('/api/data', { operation: 'getSession', id: sessionId });
  compose('restart');
  await ready();
  assert.deepEqual(await post('/api/data', { operation: 'getSession', id: sessionId }), before);
  console.log(
    'TC-165 PASS: Compose, non-root, all-route authentication, SQLite restart persistence. Signed feedback with Basic auth is covered by unit tests. No paid calls.',
  );
} finally {
  try {
    compose('down', '--volumes');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

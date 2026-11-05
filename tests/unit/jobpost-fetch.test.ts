import { createServer, type Server } from 'node:http';
import dns from 'node:dns';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { fetchJobPost } from '@/lib/jobpost/fetch';
import { requestPage, type PageTransport } from '@/lib/jobpost/fetch-page';
import { isPublicAddress, resolvePublicAddress, jobUrl } from '@/lib/jobpost/ssrf';
import { JOBPOST } from '@/lib/config';
import { jobText } from '../fixtures/jobpost';
const html = `<!doctype html><html><head><title>Fictional engineer vacancy</title></head><body><nav>Navigation to ignore</nav><article><h1>Fictional engineer</h1>${jobText
  .split('\n')
  .map((line) => `<p>${line}</p>`)
  .join(
    '\n',
  )}<script>globalThis.__jobScriptRan=true</script><img src="https://external.invalid/pixel"></article></body></html>`;
let server: Server;
let base: string;
let requests: {
  url: string;
  agent: string | undefined;
  authorization: string | undefined;
  cookie: string | undefined;
  host: string | undefined;
}[] = [];
beforeAll(async () => {
  server = createServer((request, response) => {
    const path = request.url ?? '/';
    requests.push({
      url: path,
      agent: request.headers['user-agent'],
      authorization: request.headers.authorization,
      cookie: request.headers.cookie,
      host: request.headers.host,
    });
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (path === '/private') {
      response.writeHead(302, { Location: 'http://127.0.0.1/private' });
      response.end();
      return;
    }
    if (path === '/change') {
      response.writeHead(302, { Location: '/article' });
      response.end();
      return;
    }
    if (path === '/loop') {
      response.writeHead(302, { Location: '/loop' });
      response.end();
      return;
    }
    if (path.startsWith('/redirect/')) {
      const n = Number(path.split('/').at(-1));
      if (n < 3) {
        response.writeHead(302, { Location: `/redirect/${n + 1}` });
        response.end();
        return;
      }
    }
    if (path === '/large') {
      response.setHeader('Content-Length', JOBPOST.FETCH_MAX_BYTES + 1);
      response.end(Buffer.alloc(JOBPOST.FETCH_MAX_BYTES + 1, 97));
      return;
    }
    if (path === '/chunked') {
      response.write(Buffer.alloc(JOBPOST.FETCH_MAX_BYTES, 97));
      response.end('x');
      return;
    }
    if (path === '/slow') {
      const timer = setTimeout(() => {
        response.end(html);
      }, 200);
      response.on('close', () => {
        clearTimeout(timer);
      });
      return;
    }
    if (path === '/login') {
      response.end(
        '<html><head><title>Sign in</title></head><body><input type="password"></body></html>',
      );
      return;
    }
    if (path === '/json') {
      response.setHeader('Content-Type', 'application/json');
      response.end('{}');
      return;
    }
    if (path === '/compressed') {
      response.setHeader('Content-Encoding', 'gzip');
      response.end(html);
      return;
    }
    response.end(html);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  base = `http://public.example:${address.port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});
beforeEach(() => {
  requests = [];
  // Every socket is pinned to the local server. Fail before any accidental external DNS lookup.
  vi.spyOn(dns, 'lookup').mockImplementation(() => {
    throw new Error('Unexpected system DNS in local-only test');
  });
});
const resolve = async () => {
  await Promise.resolve();
  return [{ address: '8.8.8.8', family: 4 }];
};
const transport: PageTransport = (url, address, signal) => {
  expect(address).toEqual({ address: '8.8.8.8', family: 4 });
  return requestPage(url, { address: '127.0.0.1', family: 4 }, signal);
};
it.each([
  '0.0.0.0',
  '10.1.2.3',
  '127.0.0.1',
  '169.254.169.254',
  '172.16.0.1',
  '172.31.255.255',
  '192.168.0.1',
  '100.100.100.200',
  '192.0.2.1',
  '198.18.0.1',
  '198.51.100.1',
  '203.0.113.1',
  '224.0.0.1',
  '255.255.255.255',
  '::',
  '::1',
  '::ffff:127.0.0.1',
  '::ffff:8.8.8.8',
  'fc00::1',
  'fd00:ec2::254',
  'fe80::1',
  'ff02::1',
  '64:ff9b::7f00:1',
  '2001:db8::1',
  '2002:7f00:1::',
  '2001::1',
  '3fff::1',
])('TC-180 rejects non-public/transition address %s', (address) => {
  expect(isPublicAddress(address)).toBe(false);
});
it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '2001:4860:4860::8888', '2606:4700:4700::1111'])(
  'TC-180 recognises global address %s',
  (address) => {
    expect(isPublicAddress(address)).toBe(true);
  },
);
it('TC-180 blocks schemes, credentials, obfuscated loopback and mixed DNS before HTTP', async () => {
  const never = vi.fn<PageTransport>();
  for (const url of [
    'file:///etc/passwd',
    'ftp://public.example/job',
    'http://user:pass@public.example/job',
    'http://2130706433/',
    'http://0x7f000001/',
    'http://[::1]/',
    'http://localhost/',
  ])
    await expect(fetchJobPost(url, { resolve, transport: never })).rejects.toMatchObject({
      code: 'JOBPOST_FETCH_FAILED',
    });
  await expect(
    resolvePublicAddress(jobUrl(base), () =>
      Promise.resolve([
        { address: '8.8.8.8', family: 4 },
        { address: '10.0.0.1', family: 4 },
      ]),
    ),
  ).rejects.toMatchObject({ code: 'JOBPOST_FETCH_FAILED' });
  expect(never).not.toHaveBeenCalled();
  expect(requests).toEqual([]);
});
it('TC-181 local HTML extraction retains post text, strips markup and fetches no embedded resources', async () => {
  const result = await fetchJobPost(`${base}/article`, { resolve, transport });
  expect(result.text).toContain(
    'Build an accessible dashboard for operators working across three shifts.',
  );
  expect(result.text).not.toContain('<');
  expect(result.text).not.toContain('__jobScriptRan');
  expect('__jobScriptRan' in globalThis).toBe(false);
  expect(result.sourceUrl).toBe(`${base}/article`);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    agent: JOBPOST.FETCH_USER_AGENT,
    authorization: undefined,
    cookie: undefined,
    host: new URL(base).host,
  });
  expect(dns.lookup).not.toHaveBeenCalled();
});
it('TC-180 validates each redirect and rejects DNS rebinding before a second socket', async () => {
  await expect(fetchJobPost(`${base}/private`, { resolve, transport })).rejects.toMatchObject({
    code: 'JOBPOST_FETCH_FAILED',
  });
  expect(requests).toHaveLength(1);
  requests = [];
  const changing = vi
    .fn()
    .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
    .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
  await expect(
    fetchJobPost(`${base}/change`, { resolve: changing, transport }),
  ).rejects.toMatchObject({ code: 'JOBPOST_FETCH_FAILED' });
  expect(changing).toHaveBeenCalledTimes(2);
  expect(requests).toHaveLength(1);
});
it('TC-180 permits three redirects and rejects a fourth', async () => {
  await expect(fetchJobPost(`${base}/redirect/0`, { resolve, transport })).resolves.toMatchObject({
    sourceUrl: `${base}/redirect/3`,
  });
  expect(requests).toHaveLength(4);
  requests = [];
  await expect(fetchJobPost(`${base}/loop`, { resolve, transport })).rejects.toMatchObject({
    code: 'JOBPOST_FETCH_FAILED',
  });
  expect(requests).toHaveLength(4);
});
it.each(['/large', '/chunked', '/login', '/json', '/compressed'])(
  'TC-180 TC-181 bounded fetch rejects %s',
  async (path) => {
    await expect(fetchJobPost(`${base}${path}`, { resolve, transport })).rejects.toMatchObject({
      code: 'JOBPOST_FETCH_FAILED',
    });
  },
);
it('TC-180 deadline bounds both a slow local response and an unresolved fake DNS request', async () => {
  await expect(
    fetchJobPost(`${base}/slow`, { resolve, transport, signal: AbortSignal.timeout(25) }),
  ).rejects.toMatchObject({ code: 'JOBPOST_FETCH_FAILED' });
  const never = vi.fn<PageTransport>();
  await expect(
    fetchJobPost(base, {
      resolve: () => new Promise(() => {}),
      transport: never,
      signal: AbortSignal.timeout(25),
    }),
  ).rejects.toMatchObject({ code: 'JOBPOST_FETCH_FAILED' });
  expect(never).not.toHaveBeenCalled();
});
it('TC-180 production deadline rejects at ten seconds without waiting for DNS', async () => {
  vi.useFakeTimers();
  const never = vi.fn<PageTransport>();
  // AbortSignal.timeout uses native timers; observe its duration without waiting ten real seconds.
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) => {
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, milliseconds);
    return controller.signal;
  });
  const result = fetchJobPost(base, { resolve: () => new Promise(() => {}), transport: never });
  const rejected = expect(result).rejects.toMatchObject({ code: 'JOBPOST_FETCH_FAILED' });
  expect(timeout).toHaveBeenCalledWith(10_000);
  await vi.advanceTimersByTimeAsync(10_000);
  await rejected;
  expect(never).not.toHaveBeenCalled();
  vi.useRealTimers();
});

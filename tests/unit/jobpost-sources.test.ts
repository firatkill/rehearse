import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { fetchJobPost } from '@/lib/jobpost/fetch';
import type { PageTransport } from '@/lib/jobpost/fetch-page';
import { extractJobText } from '@/lib/jobpost/extract';
import { JOBPOST } from '@/lib/config';
const log = vi.hoisted(() => vi.fn());
vi.mock('@/lib/logger', () => ({ getLogger: () => ({ info: log }) }));
const resolve = () => Promise.resolve([{ address: '8.8.8.8', family: 4 }]);
const description =
  '<p>Build accessible payment interfaces.</p><p>Maintain reliable tests and document operational runbooks.</p>';
const fixture = (name: string) => readFileSync(`tests/fixtures/${name}.html`, 'utf8');
const guest = fixture('linkedin-guest');
function expectPlainText(text: string) {
  expect(text).not.toMatch(/<[^>]+>|&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/i);
}
function response(body: string, contentType = 'text/html') {
  return { status: 200, location: null, encoding: 'identity', body, contentType };
}
it.each([
  'https://www.linkedin.com/jobs/collections/recommended/?currentJobId=12345&tracking=secret',
  'https://www.linkedin.com/jobs/search/?currentJobId=12345',
  'https://tr.linkedin.com/jobs/view/frontend-engineer-12345',
  'https://www.linkedin.com/jobs/view/12345',
])('TC-221 normalises %s to the guest endpoint without login navigation', async (source) => {
  const transport = vi.fn<PageTransport>().mockResolvedValue(response(guest));
  const result = await fetchJobPost(source, { resolve, transport });
  expectPlainText(result.text);
  expect(transport).toHaveBeenCalledTimes(1);
  expect(transport.mock.calls[0]?.[0].href).toBe(
    'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/12345',
  );
  expect(result.text).toBe(
    'Frontend Engineer — Example & Company\n\nBuild accessible payment interfaces. Maintain reliable tests and document operational runbooks.',
  );
});
it.each([
  [
    'https://job-boards.greenhouse.io/example/jobs/123',
    'https://boards-api.greenhouse.io/v1/boards/example/jobs/123',
    {
      title: 'Engineer',
      content:
        '&lt;div class=&quot;content-intro&quot;&gt;&lt;h2&gt;Engineering &amp;amp; payments&lt;/h2&gt;' +
        description.replaceAll('<', '&lt;').replaceAll('>', '&gt;') +
        '&lt;/div&gt;',
    },
  ],
  [
    'https://jobs.lever.co/example/abc-123',
    'https://api.lever.co/v0/postings/example/abc-123?mode=json',
    {
      text: 'Engineer',
      description,
      lists: [{ text: 'Requirements', content: '<li>TypeScript</li>' }],
    },
  ],
  [
    'https://jobs.ashbyhq.com/example/abc-123',
    'https://api.ashbyhq.com/posting-api/job-board/example',
    {
      jobs: [
        {
          title: 'Wrong job',
          descriptionHtml: 'Wrong text',
          jobUrl: 'https://jobs.ashbyhq.com/example/wrong',
        },
        {
          title: 'Engineer',
          descriptionHtml: description,
          jobUrl: 'https://jobs.ashbyhq.com/example/abc-123',
        },
      ],
    },
  ],
  [
    'https://apply.workable.com/example/j/ABC123/',
    'https://www.workable.com/api/accounts/example?details=true',
    {
      name: 'Example',
      jobs: [
        { shortcode: 'wrong', title: 'Wrong job', description: 'Wrong text' },
        { shortcode: 'ABC123', title: 'Engineer', description },
      ],
    },
  ],
  [
    'https://jobs.smartrecruiters.com/Example/123-engineer',
    'https://api.smartrecruiters.com/v1/companies/Example/postings/123',
    { name: 'Engineer', jobAd: { sections: { jobDescription: { text: description } } } },
  ],
])(
  'TC-221 public adapter selects only the requested posting: %s',
  async (source, endpoint, fixture) => {
    const transport = vi
      .fn<PageTransport>()
      .mockResolvedValue(response(JSON.stringify(fixture), 'application/json'));
    const result = await fetchJobPost(source, { resolve, transport });
    expect(transport.mock.calls[0]?.[0].href).toBe(endpoint);
    expect(result.text).toContain('Build accessible payment interfaces.');
    expect(result.text).not.toMatch(/Wrong|<p>/);
    expectPlainText(result.text);
  },
);
it('TC-221 prefers JobPosting JSON-LD over unrelated visible page text', () => {
  const metadata = {
    '@graph': [
      { '@type': 'WebPage' },
      {
        '@type': ['JobPosting'],
        title: 'Engineer',
        hiringOrganization: { name: 'Example' },
        description,
      },
    ],
  };
  const text = extractJobText(
    `<html><head><script type="application/ld+json">${JSON.stringify(metadata)}</script></head><body><article>Unrelated navigation</article></body></html>`,
  );
  expectPlainText(text);
  expect(text).toBe(
    'Engineer Example Build accessible payment interfaces. Maintain reliable tests and document operational runbooks.',
  );
});
it('TC-221 reports only host and category, including login redirects and actual byte overflow', async () => {
  const transport = vi
    .fn<PageTransport>()
    .mockResolvedValue({ ...response(''), status: 302, location: '/uas/login?secret=private' });
  await expect(
    fetchJobPost('https://example.com/job/private?token=secret', { resolve, transport }),
  ).rejects.toMatchObject({ code: 'JOBPOST_FETCH_FAILED' });
  expect(log).toHaveBeenLastCalledWith({
    event: 'jobpost.fetch_failed',
    host: 'example.com',
    reason: 'redirect_login',
  });
  expect(transport).toHaveBeenCalledTimes(1);
  transport.mockResolvedValue(response('ü'.repeat(JOBPOST.FETCH_MAX_BYTES / 2 + 1)));
  await expect(
    fetchJobPost('https://example.com/private', { resolve, transport }),
  ).rejects.toThrow();
  expect(log).toHaveBeenLastCalledWith({
    event: 'jobpost.fetch_failed',
    host: 'example.com',
    reason: 'oversize',
  });
  expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
});
it('TC-221 API destinations still require globally routable DNS', async () => {
  const transport = vi.fn<PageTransport>();
  await expect(
    fetchJobPost('https://www.linkedin.com/jobs/view/12345', {
      resolve: () => Promise.resolve([{ address: '127.0.0.1', family: 4 }]),
      transport,
    }),
  ).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
  expect(log).toHaveBeenLastCalledWith({
    event: 'jobpost.fetch_failed',
    host: 'www.linkedin.com',
    reason: 'blocked_address',
  });
});

it.each([429, 999])('TC-221 LinkedIn status %s logs rate_limited without retry', async (status) => {
  const transport = vi
    .fn<PageTransport>()
    .mockResolvedValue({ ...response(fixture('linkedin-rate-limited')), status });
  await expect(
    fetchJobPost('https://www.linkedin.com/jobs/view/12345?private=secret', { resolve, transport }),
  ).rejects.toMatchObject({ code: 'JOBPOST_FETCH_FAILED' });
  expect(transport).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenLastCalledWith({
    event: 'jobpost.fetch_failed',
    host: 'www.linkedin.com',
    reason: 'rate_limited',
  });
});
it('TC-221 a true LinkedIn login wall still fails; generic pages retain the password heuristic', async () => {
  const transport = vi.fn<PageTransport>().mockResolvedValue(response(fixture('linkedin-login')));
  await expect(
    fetchJobPost('https://www.linkedin.com/jobs/view/12345', { resolve, transport }),
  ).rejects.toMatchObject({ code: 'JOBPOST_FETCH_FAILED' });
  expect(log).toHaveBeenLastCalledWith({
    event: 'jobpost.fetch_failed',
    host: 'www.linkedin.com',
    reason: 'redirect_login',
  });
  expect(() => extractJobText(guest)).toThrow('FETCH_LOGIN');
});

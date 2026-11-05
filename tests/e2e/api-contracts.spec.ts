import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { HTTP, ANSWER } from '@/lib/config';
import { HealthResponseSchema } from '@/lib/api/contracts';
import { apiStart, feedbackBody, expectError, startBody } from './api-helpers';
import { scenarios, serverUrl, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
test('TC-117 E2E-28 API status, scope and response contracts', async ({ page }, info) => {
  const origin = serverUrl(info);
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  const start = `${origin}/api/sessions/start`;
  await expectError(
    await page.request.post(start, {
      headers: { 'x-real-ip': uniqueIp(info), Origin: origin, 'Content-Type': 'text/plain' },
      data: '{}',
    }),
    415,
    'UNSUPPORTED_MEDIA_TYPE',
  );
  await expectError(
    await page.request.post(start, {
      headers: { 'x-real-ip': uniqueIp(info), Origin: origin, 'Content-Type': 'application/json' },
      data: ' '.repeat(HTTP.BODY_MAX_BYTES + 1),
    }),
    413,
    'BODY_TOO_LARGE',
  );
  await expectError(
    await page.request.post(start, {
      headers: { 'x-real-ip': uniqueIp(info), Origin: origin },
      data: { ...startBody, role: 'unknown' },
    }),
    400,
    'VALIDATION_FAILED',
  );
  await expectError(
    await page.request.post(start, {
      headers: { 'x-real-ip': uniqueIp(info), Origin: 'https://untrusted.invalid' },
      data: startBody,
    }),
    403,
    'ORIGIN_FORBIDDEN',
  );
  const session = await apiStart(page, info);
  const data = feedbackBody(session),
    url = `${origin}/api/feedback`;
  await expectError(
    await page.request.post(url, {
      headers: { 'x-real-ip': uniqueIp(info), Origin: origin },
      data,
    }),
    401,
    'TOKEN_MISSING',
  );
  await expectError(
    await page.request.post(url, {
      headers: { 'x-real-ip': uniqueIp(info), Origin: origin, Authorization: 'Bearer invalid' },
      data,
    }),
    401,
    'TOKEN_INVALID',
  );
  const headers = {
    'x-real-ip': uniqueIp(info),
    Origin: origin,
    Authorization: `Bearer ${session.token ?? ''}`,
  };
  await expectError(
    await page.request.post(url, { headers, data: { ...data, sessionId: randomUUID() } }),
    403,
    'TOKEN_SCOPE',
  );
  await expectError(
    await page.request.post(url, { headers, data: { ...data, transcript: '' } }),
    400,
    'TRANSCRIPT_EMPTY',
  );
  await expectError(
    await page.request.post(url, {
      headers,
      data: { ...data, transcript: 'a'.repeat(ANSWER.MAX_CHARS + 1) },
    }),
    400,
    'TRANSCRIPT_TOO_LONG',
  );
  const health = await page.request.get(`${origin}/api/health`, {
    headers: { 'x-real-ip': uniqueIp(info) },
  });
  expect(health.status()).toBe(200);
  expect(HealthResponseSchema.parse(await health.json()).status).toBe('ok');
});

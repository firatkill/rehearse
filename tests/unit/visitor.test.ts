import { expect, it } from 'vitest';
import { clientIp, visitorId } from '@/lib/ratelimit/visitor';

it('TC-022 UT-09 honours header precedence and unknown fallback', () => {
  expect(
    clientIp(new Headers({ 'x-real-ip': ' 10.0.0.1 ', 'x-forwarded-for': '10.0.0.2, 10.0.0.3' })),
  ).toBe('10.0.0.1');
  expect(clientIp(new Headers({ 'x-real-ip': '', 'x-forwarded-for': ' 10.0.0.2, 10.0.0.3' }))).toBe(
    '10.0.0.2',
  );
  expect(clientIp(new Headers())).toBe('unknown');
});
it('TC-022 UT-09 rotates the 32-character hash across UTC days and secrets', () => {
  const first = visitorId('10.0.0.1', 'secret-one', new Date('2026-10-21T00:00:00Z'));
  expect(first).toMatch(/^[a-f0-9]{32}$/);
  expect(visitorId('10.0.0.1', 'secret-one', new Date('2026-10-21T23:59:59Z'))).toBe(first);
  expect(visitorId('10.0.0.1', 'secret-one', new Date('2026-10-22T00:00:00Z'))).not.toBe(first);
  expect(visitorId('10.0.0.1', 'secret-two', new Date('2026-10-21T00:00:00Z'))).not.toBe(first);
});

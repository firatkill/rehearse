import { expect, it } from 'vitest';
import { errorLogLevel, type ErrorCode } from '@/lib/errors';
const cases: [ErrorCode, 'info' | 'warn' | 'error'][] = [
  ['VALIDATION_FAILED', 'info'],
  ['TRANSCRIPT_EMPTY', 'info'],
  ['TRANSCRIPT_TOO_LONG', 'info'],
  ['TOKEN_MISSING', 'info'],
  ['TOKEN_INVALID', 'warn'],
  ['TOKEN_EXPIRED', 'info'],
  ['ORIGIN_FORBIDDEN', 'warn'],
  ['TOKEN_SCOPE', 'warn'],
  ['BODY_TOO_LARGE', 'info'],
  ['UNSUPPORTED_MEDIA_TYPE', 'info'],
  ['SESSION_QUOTA_EXCEEDED', 'info'],
  ['FEEDBACK_QUOTA_EXCEEDED', 'info'],
  ['SESSION_FEEDBACK_EXHAUSTED', 'info'],
  ['SESSION_SUMMARY_EXHAUSTED', 'info'],
  ['GLOBAL_CAP_REACHED', 'warn'],
  ['INTERNAL_ERROR', 'error'],
  ['PROVIDER_ERROR', 'error'],
  ['FEEDBACK_INVALID', 'error'],
  ['DEMO_OFF', 'info'],
  ['DEMO_READONLY', 'info'],
  ['LIMITER_UNAVAILABLE', 'error'],
  ['PROVIDER_TIMEOUT', 'warn'],
];
it.each(cases)('TC-076 TC-083 TRD §20 %s logs at %s', (code, level) => {
  expect(errorLogLevel(code)).toBe(level);
});

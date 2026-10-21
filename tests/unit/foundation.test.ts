import { describe, expect, it } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import { base64url, hmacSha256Hex, sha256Hex } from '@/lib/hash';
import { formatMmSs, nextUtcMidnight, utcDate } from '@/lib/time';
import { AppError, ERROR_CODES, httpStatus } from '@/lib/errors';
import {
  ROLE_LABELS,
  SENIORITY_LABELS,
  ANSWER_MODE_LABELS,
  DIMENSION_LABELS,
  QUESTION_TYPE_LABELS,
} from '@/lib/labels';
import { APP_VERSION } from '@/lib/version';
import pkg from '@/package.json';

describe('T-02 foundation — TRD §5, §20; PRD §9; NFR-13', () => {
  it('TC-003: UTC dates and next midnight are independent of local offset', () => {
    const date = new Date('2026-12-31T23:50:00Z');
    expect(utcDate(date)).toBe('2026-12-31');
    expect(nextUtcMidnight(date).toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(formatMmSs(0)).toBe('0:00');
    expect(formatMmSs(72999)).toBe('1:12');
  });
  it('TC-005: hashing and base64url follow the token primitives', () => {
    expect(sha256Hex('abc')).toBe(createHash('sha256').update('abc').digest('hex'));
    expect(hmacSha256Hex('key', 'value')).toBe(
      createHmac('sha256', 'key').update('value').digest('hex'),
    );
    expect(base64url('hello?')).toBe('aGVsbG8_');
  });
  it('TC-003: error codes have statuses from the error matrix', () => {
    expect(ERROR_CODES).toHaveLength(22);
    expect(httpStatus('TOKEN_EXPIRED')).toBe(401);
    expect(httpStatus('DEMO_READONLY')).toBe(503);
    expect(httpStatus('PROVIDER_TIMEOUT')).toBe(504);
    const error = new AppError('VALIDATION_FAILED');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('VALIDATION_FAILED');
  });
  it('TC-003: public labels and version match the specification', () => {
    expect(ROLE_LABELS['full-stack']).toBe('Full-stack');
    expect(SENIORITY_LABELS.mid).toBe('Mid-level');
    expect(QUESTION_TYPE_LABELS.behavioral).toBe('Behavioral');
    expect(ANSWER_MODE_LABELS.voice).toBe('Voice');
    expect(DIMENSION_LABELS.specificity).toBe('Specificity');
    expect(APP_VERSION).toBe(pkg.version);
  });
});

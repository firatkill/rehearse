import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnv, resetEnvForTests } from '@/lib/env';
import { ENV_NAMES } from '../fixtures/env';

const exampleText = readFileSync('.env.example', 'utf8');
const example = parseEnv(exampleText);
beforeEach(() => {
  for (const name of ENV_NAMES) vi.stubEnv(name, example[name]);
  resetEnvForTests();
});

describe('UT-30 — TRD §5, FR-44, FR-51, NFR-13', () => {
  it('TC-006: example inventory exactly matches the TRD and works without a key', () => {
    const names = [...exampleText.matchAll(/^\s*(?:#\s*)?([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]);
    expect(names.sort()).toEqual([...ENV_NAMES].sort());
    expect(getEnv()).toMatchObject({
      LLM_MODE: 'mock',
      RATE_LIMIT_BACKEND: 'memory',
      CHAT_MODEL: 'mock',
    });
  });
  it('TC-003: uses documented defaults and memoizes only successful parses', () => {
    for (const name of [
      'DEMO_MODE',
      'MAX_OUTPUT_TOKENS_FEEDBACK',
      'MAX_OUTPUT_TOKENS_SUMMARY',
      'RATE_LIMIT_SESSIONS_PER_IP_DAILY',
      'RATE_LIMIT_FEEDBACK_PER_IP_DAILY',
      'RATE_LIMIT_GLOBAL_LLM_DAILY',
      'CHAT_MODEL_SUPPORTS_TEMPERATURE',
      'EVAL_REPEATS',
      'MOCK_LLM_DELAY_MS',
    ] as const)
      vi.stubEnv(name, undefined);
    const env = getEnv();
    expect(env).toMatchObject({
      DEMO_MODE: 'on',
      MAX_OUTPUT_TOKENS_FEEDBACK: 900,
      MAX_OUTPUT_TOKENS_SUMMARY: 400,
      RATE_LIMIT_SESSIONS_PER_IP_DAILY: 3,
      RATE_LIMIT_FEEDBACK_PER_IP_DAILY: 20,
      RATE_LIMIT_GLOBAL_LLM_DAILY: 150,
      CHAT_MODEL_SUPPORTS_TEMPERATURE: true,
      EVAL_REPEATS: 2,
      MOCK_LLM_DELAY_MS: 300,
    });
    expect(getEnv()).toBe(env);
  });
  it('TC-003: live and Upstash require their conditional variables', () => {
    vi.stubEnv('LLM_MODE', undefined);
    vi.stubEnv('CHAT_MODEL', undefined);
    vi.stubEnv('PRICE_CACHED_INPUT_PER_MTOK', undefined);
    vi.stubEnv('RATE_LIMIT_BACKEND', undefined);
    vi.stubEnv('PRICE_INPUT_PER_MTOK', undefined);
    vi.stubEnv('PRICE_OUTPUT_PER_MTOK', undefined);
    expect(getEnv).toThrow(
      /OPENAI_API_KEY.*CHAT_MODEL.*PRICE_INPUT_PER_MTOK.*PRICE_OUTPUT_PER_MTOK.*UPSTASH_REDIS_REST_URL.*UPSTASH_REDIS_REST_TOKEN/,
    );
    vi.stubEnv('OPENAI_API_KEY', 'fictional-provider-key');
    vi.stubEnv('CHAT_MODEL', 'fixture-model');
    vi.stubEnv('PRICE_INPUT_PER_MTOK', '0.5');
    vi.stubEnv('PRICE_OUTPUT_PER_MTOK', '1.5');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fixture.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fictional-rest-token');
    expect(getEnv()).toMatchObject({
      LLM_MODE: 'live',
      RATE_LIMIT_BACKEND: 'upstash',
      PRICE_CACHED_INPUT_PER_MTOK: 0.5,
    });
  });
  it('TC-004: production rejects both development backends', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(getEnv).toThrow(/LLM_MODE.*RATE_LIMIT_BACKEND/);
  });
  it('TC-005: rejects equal secrets and never exposes their values', () => {
    vi.stubEnv('IP_HASH_SECRET', example.SESSION_SECRET);
    expect(getEnv).toThrow('IP_HASH_SECRET');
    try {
      getEnv();
    } catch (error) {
      expect(String(error)).not.toContain(example.SESSION_SECRET);
    }
    vi.stubEnv('SESSION_SECRET', 'sensitive-short-value');
    expect(getEnv).toThrow('SESSION_SECRET');
    try {
      getEnv();
    } catch (error) {
      expect(String(error)).not.toContain('sensitive-short-value');
    }
  });
  it.each([
    ['MAX_OUTPUT_TOKENS_FEEDBACK', '299'],
    ['MAX_OUTPUT_TOKENS_FEEDBACK', '4001'],
    ['MAX_OUTPUT_TOKENS_SUMMARY', '149'],
    ['MAX_OUTPUT_TOKENS_SUMMARY', '2001'],
    ['RATE_LIMIT_SESSIONS_PER_IP_DAILY', '0'],
    ['RATE_LIMIT_FEEDBACK_PER_IP_DAILY', '1.5'],
    ['PRICE_INPUT_PER_MTOK', '-1'],
    ['CHAT_MODEL_SUPPORTS_TEMPERATURE', 'yes'],
    ['NEXT_PUBLIC_SITE_URL', 'not-a-url'],
    ['SESSION_SECRET_PREVIOUS', 'short'],
  ])('TC-003: rejects invalid %s', (name, value) => {
    vi.stubEnv(name, value);
    expect(getEnv).toThrow(name);
  });
  it('TC-003: accepts readonly/off and converts false explicitly', () => {
    vi.stubEnv('DEMO_MODE', 'readonly');
    vi.stubEnv('CHAT_MODEL_SUPPORTS_TEMPERATURE', 'false');
    expect(getEnv()).toMatchObject({
      DEMO_MODE: 'readonly',
      CHAT_MODEL_SUPPORTS_TEMPERATURE: false,
    });
    resetEnvForTests();
    vi.stubEnv('DEMO_MODE', 'off');
    expect(getEnv().DEMO_MODE).toBe('off');
  });
  it('TC-003: external fetch is blocked by test setup', async () => {
    await expect(fetch('https://example.invalid')).rejects.toThrow(
      'Tests must not access external services',
    );
  });
});

import 'server-only';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { EVAL } from '@/lib/config';

const optionalText = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());
const price = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.coerce.number().nonnegative().optional(),
);
const boolean = z.enum(['true', 'false']).transform((v) => v === 'true');
const schema = z
  .object({
    APP_EDITION: z.enum(['demo', 'full']).default('full'),
    DATA_DIR: z.string().min(1).default('./.data'),
    MONTHLY_BUDGET_USD: z.coerce.number().positive().default(5),
    APP_PASSWORD: optionalText,
    LLM_MODE: z.enum(['live', 'mock']).default('live'),
    OPENAI_API_KEY: optionalText,
    CHAT_MODEL: optionalText,
    CHAT_MODEL_SUPPORTS_TEMPERATURE: boolean.default(true),
    CHAT_REASONING_EFFORT: optionalText,
    MAX_OUTPUT_TOKENS_FEEDBACK: z.coerce.number().int().min(300).max(4000).default(900),
    MAX_OUTPUT_TOKENS_FEEDBACK_TR: z.coerce.number().int().min(300).max(4000).default(1400),
    MAX_OUTPUT_TOKENS_SUMMARY: z.coerce.number().int().min(150).max(2000).default(400),
    PRICE_INPUT_PER_MTOK: price,
    PRICE_OUTPUT_PER_MTOK: price,
    PRICE_CACHED_INPUT_PER_MTOK: price,
    DEMO_MODE: z.enum(['on', 'readonly', 'off']).default('on'),
    SESSION_SECRET: z.string().min(32),
    SESSION_SECRET_PREVIOUS: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.string().min(32).optional(),
    ),
    IP_HASH_SECRET: z.string().min(32),
    RATE_LIMIT_BACKEND: z.enum(['upstash', 'memory']).default('memory'),
    UPSTASH_REDIS_REST_URL: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
    UPSTASH_REDIS_REST_TOKEN: optionalText,
    RATE_LIMIT_SESSIONS_PER_IP_DAILY: z.coerce.number().int().positive().default(3),
    RATE_LIMIT_FEEDBACK_PER_IP_DAILY: z.coerce.number().int().positive().default(20),
    RATE_LIMIT_GLOBAL_LLM_DAILY: z.coerce.number().int().positive().default(150),
    NEXT_PUBLIC_SITE_URL: z.url(),
    ALLOWED_ORIGINS: z.string().default(''),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    MOCK_LLM_DELAY_MS: z.coerce.number().int().nonnegative().default(300),
    EVAL_MAX_COST_USD: z.coerce.number().positive().default(EVAL.DEFAULT_MAX_COST_USD),
    EVAL_REPEATS: z.coerce.number().int().positive().default(2),
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
    VERCEL_URL: optionalText,
    VERCEL_BRANCH_URL: optionalText,
    VERCEL_PROJECT_PRODUCTION_URL: optionalText,
    VERCEL_GIT_COMMIT_SHA: optionalText,
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
    GITHUB_STEP_SUMMARY: optionalText,
  })
  .superRefine((env, ctx) => {
    const invalid = (name: keyof typeof env) => {
      ctx.addIssue({ code: 'custom', path: [name], message: 'Invalid configuration' });
    };
    if (env.LLM_MODE === 'live') {
      for (const name of [
        'OPENAI_API_KEY',
        'CHAT_MODEL',
        'PRICE_INPUT_PER_MTOK',
        'PRICE_OUTPUT_PER_MTOK',
      ] as const) {
        if (env[name] === undefined) invalid(name);
      }
    }
    if (env.RATE_LIMIT_BACKEND === 'upstash') {
      for (const name of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const) {
        if (env[name] === undefined) invalid(name);
      }
    }
    if (env.APP_EDITION === 'full' && env.NODE_ENV === 'production' && env.LLM_MODE === 'mock')
      invalid('LLM_MODE');
    if (env.SESSION_SECRET === env.IP_HASH_SECRET) invalid('IP_HASH_SECRET');
  })
  .transform((env) => ({
    ...env,
    CHAT_MODEL: env.LLM_MODE === 'mock' ? 'mock' : env.CHAT_MODEL,
    PRICE_INPUT_PER_MTOK: env.PRICE_INPUT_PER_MTOK ?? 0,
    PRICE_OUTPUT_PER_MTOK: env.PRICE_OUTPUT_PER_MTOK ?? 0,
    PRICE_CACHED_INPUT_PER_MTOK: env.PRICE_CACHED_INPUT_PER_MTOK ?? env.PRICE_INPUT_PER_MTOK ?? 0,
  }));

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;
export function getEnv(): Env {
  if (cached) return cached;
  const source = { ...process.env };
  if (source.APP_EDITION === 'demo') {
    // Demo has no provider or remote limiter; even invalid unused values are ignored.
    for (const name of [
      'OPENAI_API_KEY',
      'CHAT_MODEL',
      'CHAT_MODEL_SUPPORTS_TEMPERATURE',
      'CHAT_REASONING_EFFORT',
      'PRICE_INPUT_PER_MTOK',
      'PRICE_OUTPUT_PER_MTOK',
      'PRICE_CACHED_INPUT_PER_MTOK',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
    ])
      source[name] = undefined;
    source.LLM_MODE = 'mock';
    source.RATE_LIMIT_BACKEND = 'memory';
    if (source.VERCEL_ENV === undefined) {
      source.SESSION_SECRET ||= randomBytes(32).toString('hex');
      source.IP_HASH_SECRET ||= randomBytes(32).toString('hex');
    }
    source.NEXT_PUBLIC_SITE_URL ||= 'http://localhost:3000';
  }
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid environment variables: ${names.join(', ')}`);
  }
  cached = result.data;
  return cached;
}

/** Test isolation only; production code must not reset configuration. */
export function resetEnvForTests(): void {
  cached = undefined;
}

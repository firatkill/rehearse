export const ROLES = [
  'frontend',
  'backend',
  'full-stack',
  'product-engineer',
  'ai-product-engineer',
] as const;
export const SENIORITIES = ['junior', 'mid', 'senior'] as const;
export const QUESTION_TYPES = ['behavioral', 'technical-concepts', 'system-design-lite'] as const;
export const ANSWER_MODES = ['voice', 'text'] as const;
export const DIMENSIONS = [
  'structure',
  'specificity',
  'ownership',
  'impact',
  'relevance',
  'clarity',
] as const;

export const SETUP_DEFAULTS = {
  role: 'full-stack',
  seniority: 'mid',
  types: ['behavioral', 'technical-concepts'],
  length: 3,
  mode: 'voice', // becomes 'text' when recognition is unsupported
  readAloud: true,
  rate: 1.0,
} as const;

export const SESSION = {
  LENGTHS: [3, 5] as const,
  THINK_SECONDS: 15,
  TIMER_INTERVAL_MS: 250,
  TOKEN_TTL_S: 7_200,
  FEEDBACK_RETRY_ALLOWANCE: 2,
  SUMMARY_CALLS_PER_SESSION: 2,
  SEED_PATTERN: /^[0-9a-f]{8}$/,
} as const;

export const QUESTION_BANK = {
  MIN_PER_CELL: 5,
  TARGET_ACTIVE: 120,
  MAX_PER_TOPIC: 4,
  PROMPT_MAX_WORDS: 45,
  TIME_LIMIT_MIN_S: 60,
  TIME_LIMIT_MAX_S: 240,
  DEFAULT_TIME_LIMIT_S: { behavioral: 120, 'technical-concepts': 90, 'system-design-lite': 180 },
  TYPE_ORDER: ['behavioral', 'technical-concepts', 'system-design-lite'],
} as const;

export const ANSWER = {
  MAX_CHARS: 4_000,
  WARN_CHARS: 3_600,
  TEXTAREA_MIN_ROWS: 8,
  TEXTAREA_MAX_ROWS: 20,
  SHORT_WORDS: 40,
  DRAFT_SAVE_INTERVAL_MS: 2_000,
  EDIT_SAVE_DEBOUNCE_MS: 500,
} as const;

export const SPEECH = {
  LANG: 'en-US',
  MAX_RESTARTS: 6,
  NO_SPEECH_AUTO_RESTARTS: 2,
  RESTART_DELAY_MS: 250,
  STOP_GRACE_MS: 1_500,
  LONG_PAUSE_MS: 3_000,
  MIN_PACE_SPEAKING_MS: 10_000,
  VOICES_WAIT_MS: 1_500,
  RESULT_OFFSETS_MAX: 4_000,
} as const;

export const TTS = {
  RATE_MIN: 0.8,
  RATE_MAX: 1.3,
  RATE_STEP: 0.1,
  CHUNK_MAX_CHARS: 160,
  PREVIEW_TEXT: 'Tell me about a project you are proud of.',
} as const;

export const PACE = { COMFORT_MIN_WPM: 120, COMFORT_MAX_WPM: 160 } as const;

export const FILLERS = [
  { phrase: 'um', rule: 'hesitation' },
  { phrase: 'uh', rule: 'hesitation' },
  { phrase: 'like', rule: 'like' },
  { phrase: 'you know', rule: 'you-know' },
  { phrase: 'basically', rule: 'any' },
  { phrase: 'actually', rule: 'any' },
  { phrase: 'so', rule: 'clause-initial' },
] as const;

export const LLM = {
  ATTEMPT_TIMEOUT_MS: 20_000,
  FEEDBACK_DEADLINE_MS: 45_000,
  SUMMARY_TIMEOUT_MS: 15_000,
  FEEDBACK_MAX_ATTEMPTS: 2,
  RETRY_BACKOFF_MS: 500,
  MIN_TIME_FOR_RETRY_MS: 8_000,
  TEMPERATURE: 0,
} as const;

export const FEEDBACK_LIMITS = {
  STRENGTHS_MAX: 3,
  IMPROVEMENTS_MAX: 3,
  OUTLINE_MIN: 3,
  OUTLINE_MAX: 6,
  RATIONALE_MAX_CHARS: 240,
  POINT_MAX_CHARS: 160,
  WHY_MAX_CHARS: 200,
  REWRITE_MAX_CHARS: 400,
  EVIDENCE_MAX_CHARS: 200,
  EVIDENCE_MIN_WORDS: 3,
  FOLLOW_UP_MAX_CHARS: 240,
  OUTLINE_ITEM_MAX_CHARS: 160,
  CAPPED_MAX_SCORE: 2,
} as const;

export const SUMMARY_LIMITS = {
  HEADLINE_MAX_CHARS: 140,
  PARAGRAPH_MAX_CHARS: 700,
  NOTE_MAX_CHARS: 240,
  NEXT_PRACTICE_MAX_CHARS: 240,
  INPUT_POINT_MAX_CHARS: 160,
} as const;

export const HTTP = {
  FEEDBACK_CLIENT_TIMEOUT_MS: 55_000,
  BODY_MAX_BYTES: 32_768,
  IMPORT_MAX_BYTES: 5_000_000,
  LIMITER_TIMEOUT_MS: 1_500,
} as const;

export const PROGRESS_COPY_AT_MS = [0, 2_000, 5_000, 9_000] as const;

export const ANNOUNCE = {
  RECORDING_REMAINING_S: [60, 30, 10],
  MIN_INTERVAL_MS: 1_000,
} as const;

export const STORAGE = {
  DB_NAME: 'rehearse',
  DB_VERSION: 1,
  RECORD_SCHEMA_VERSION: 1, // equals the z.literal in SessionRecordSchema and AnswerRecordSchema
  OPEN_TIMEOUT_MS: 3_000,
  EXPORT_FORMAT_VERSION: 1,
  LOCAL_KEYS: { theme: 'rehearse-theme', setup: 'rehearse-setup' },
} as const;

export const TOKEN = { PREFIX: 'rh1' } as const;

export const RATE_LIMIT = {
  PREFIX: 'rehearse',
  TOKEN_COUNTER_TTL_S: 10_800,
} as const;

export const EVAL = { CONCURRENCY: 4, DEFAULT_MAX_COST_USD: 0.5 } as const;

export type Role = (typeof ROLES)[number];
export type Seniority = (typeof SENIORITIES)[number];
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type AnswerMode = (typeof ANSWER_MODES)[number];
export type Dimension = (typeof DIMENSIONS)[number];

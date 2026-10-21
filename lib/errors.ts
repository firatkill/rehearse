export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'TRANSCRIPT_EMPTY',
  'TRANSCRIPT_TOO_LONG',
  'TOKEN_MISSING',
  'TOKEN_INVALID',
  'TOKEN_EXPIRED',
  'ORIGIN_FORBIDDEN',
  'TOKEN_SCOPE',
  'BODY_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'SESSION_QUOTA_EXCEEDED',
  'FEEDBACK_QUOTA_EXCEEDED',
  'SESSION_FEEDBACK_EXHAUSTED',
  'SESSION_SUMMARY_EXHAUSTED',
  'GLOBAL_CAP_REACHED',
  'INTERNAL_ERROR',
  'PROVIDER_ERROR',
  'FEEDBACK_INVALID',
  'DEMO_OFF',
  'DEMO_READONLY',
  'LIMITER_UNAVAILABLE',
  'PROVIDER_TIMEOUT',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
const statuses: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  TRANSCRIPT_EMPTY: 400,
  TRANSCRIPT_TOO_LONG: 400,
  TOKEN_MISSING: 401,
  TOKEN_INVALID: 401,
  TOKEN_EXPIRED: 401,
  ORIGIN_FORBIDDEN: 403,
  TOKEN_SCOPE: 403,
  BODY_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  SESSION_QUOTA_EXCEEDED: 429,
  FEEDBACK_QUOTA_EXCEEDED: 429,
  SESSION_FEEDBACK_EXHAUSTED: 429,
  SESSION_SUMMARY_EXHAUSTED: 429,
  GLOBAL_CAP_REACHED: 429,
  INTERNAL_ERROR: 500,
  PROVIDER_ERROR: 502,
  FEEDBACK_INVALID: 502,
  DEMO_OFF: 503,
  DEMO_READONLY: 503,
  LIMITER_UNAVAILABLE: 503,
  PROVIDER_TIMEOUT: 504,
};
export function httpStatus(code: ErrorCode): number {
  return statuses[code];
}
export function errorLogLevel(code: ErrorCode): 'info' | 'warn' | 'error' {
  switch (code) {
    case 'INTERNAL_ERROR':
    case 'PROVIDER_ERROR':
    case 'FEEDBACK_INVALID':
    case 'LIMITER_UNAVAILABLE':
      return 'error';
    case 'TOKEN_INVALID':
    case 'ORIGIN_FORBIDDEN':
    case 'TOKEN_SCOPE':
    case 'GLOBAL_CAP_REACHED':
    case 'PROVIDER_TIMEOUT':
      return 'warn';
    case 'VALIDATION_FAILED':
    case 'TRANSCRIPT_EMPTY':
    case 'TRANSCRIPT_TOO_LONG':
    case 'TOKEN_MISSING':
    case 'TOKEN_EXPIRED':
    case 'BODY_TOO_LARGE':
    case 'UNSUPPORTED_MEDIA_TYPE':
    case 'SESSION_QUOTA_EXCEEDED':
    case 'FEEDBACK_QUOTA_EXCEEDED':
    case 'SESSION_FEEDBACK_EXHAUSTED':
    case 'SESSION_SUMMARY_EXHAUSTED':
    case 'DEMO_OFF':
    case 'DEMO_READONLY':
      return 'info';
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

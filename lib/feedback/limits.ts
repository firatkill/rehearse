import 'server-only';
import type { Env } from '@/lib/env';
import type { Language } from '@/lib/config';
/** App and eval reserve the same language-specific output allowance. */
export function feedbackOutputLimit(env: Env, language: Language = 'en'): number {
  return language === 'tr' ? env.MAX_OUTPUT_TOKENS_FEEDBACK_TR : env.MAX_OUTPUT_TOKENS_FEEDBACK;
}

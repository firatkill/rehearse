import type { StartResponse } from '@/lib/api/contracts';
import { STORAGE } from '@/lib/config';
import { SessionRecordSchema, type Setup, type SessionRecord } from './schema';
/** Build the same validated local record for setup and one-click dimension practice. */
export function newSessionRecord(
  data: StartResponse,
  setup: Setup,
  now: string,
  reason?: 'quota' | 'limiter_unavailable',
): SessionRecord {
  return SessionRecordSchema.parse({
    schemaVersion: STORAGE.RECORD_SCHEMA_VERSION,
    id: data.sessionId,
    origin: 'live',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    status: 'in_progress',
    setup,
    currentMode: setup.mode,
    seed: data.seed,
    bankVersion: data.bankVersion,
    questions: data.questions,
    feedback: { ...data.feedback, reason: reason ?? data.feedback.reason },
    token: data.token,
    tokenExpiresAt: data.tokenExpiresAt,
    checkpoint: { index: 0, phase: 'intro', at: now },
    summary: null,
    summaryStatus: 'none',
  });
}

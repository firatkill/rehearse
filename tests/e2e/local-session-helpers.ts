import { seedBundle } from './storage-helpers';
import { migrateRecord } from '@/lib/storage/migrations';
import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import sample from '../../content/sample/session.json';
import { SessionRecordSchema, AnswerRecordSchema } from '@/lib/storage/schema';
const parseSession = (value: unknown) => SessionRecordSchema.parse(migrateRecord(value));
const parseAnswer = (value: unknown) => AnswerRecordSchema.parse(migrateRecord(value));

export async function seedLocalSession(page: Page, active = false): Promise<string> {
  const id = randomUUID();
  const session = parseSession({
    ...sample.session,
    id,
    origin: 'import',
    status: active ? 'in_progress' : 'completed',
    completedAt: active ? null : sample.session.completedAt,
    feedback: { enabled: false, reason: 'practice' },
    setup: { ...sample.session.setup, mode: 'text', readAloud: false },
    currentMode: 'text',
    checkpoint: { index: 0, phase: 'intro', at: sample.session.createdAt },
  });
  const answers = sample.answers.map((answer) => parseAnswer({ ...answer, sessionId: id }));
  await seedBundle(page, { session, answers });
  return id;
}

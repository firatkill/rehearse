import { getBank } from '@/lib/questions/bank';
import { toSnapshot } from '@/lib/questions/schema';
import type { SessionRecord, AnswerRecord } from '@/lib/storage/schema';
import { sessionId } from './api';

export const record: SessionRecord = {
  schemaVersion: 1,
  id: sessionId,
  origin: 'live',
  createdAt: '2026-10-21T12:00:00.000Z',
  updatedAt: '2026-10-21T12:00:00.000Z',
  completedAt: null,
  status: 'in_progress',
  setup: {
    role: 'backend',
    seniority: 'mid',
    types: ['behavioral'],
    length: 3,
    mode: 'text',
    readAloud: false,
    voiceURI: null,
    rate: 1,
  },
  currentMode: 'text',
  seed: '1234abcd',
  bankVersion: '1.0.0',
  questions: getBank().questions.slice(0, 3).map(toSnapshot),
  feedback: { enabled: true, reason: null },
  token: 'rh1.test.signature',
  tokenExpiresAt: '2026-10-21T14:00:00.000Z',
  checkpoint: { index: 0, phase: 'intro', at: '2026-10-21T12:00:00.000Z' },
  summary: null,
  summaryStatus: 'none',
};
export const answer: AnswerRecord = {
  schemaVersion: 1,
  sessionId,
  index: 0,
  questionId: 'beh-001',
  mode: 'text',
  status: 'saved',
  rawTranscript: 'I built a queue.',
  transcript: 'I built a queue.',
  timing: { recordingMs: null, firstResultOffsetMs: null, resultOffsetsMs: [] },
  metrics: {
    words: 4,
    speakingMs: null,
    wpm: null,
    fillers: { total: 0, byPhrase: {} },
    longestPauseMs: null,
    longPauses: null,
  },
  feedback: null,
  feedbackMeta: null,
  attempts: 0,
  notice: null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
};

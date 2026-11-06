import { z } from 'zod';
import { JobDataSchema, migrateJobRecord, type JobData } from './jobpost-schema';
import { HTTP, STORAGE } from '@/lib/config';
import { AppError } from '@/lib/errors';
import { migrateRecord } from './migrations';
import { ExportFileSchema, type ExportFile, type AnswerRecord } from './schema';
import type { SessionRepository } from './repository';
const errorCopy = {
  size: 'That file is larger than 5 MB.',
  format: 'That file isn’t a Rehearse export.',
  newer: 'That export is from a newer version of Rehearse. Update the page and try again.',
} as const;
export class ImportFileError extends AppError {
  constructor(readonly kind: keyof typeof errorCopy) {
    super('VALIDATION_FAILED', errorCopy[kind]);
  }
}
export const EXPORT_MIGRATIONS: Readonly<Record<number, (file: unknown) => unknown>> = {
  1: (file) => ({ ...EnvelopeSchema.parse(file), formatVersion: 2 }),
  2: (file) => ({ ...EnvelopeSchema.parse(file), formatVersion: 3 }),
  3: (file) => ({ ...EnvelopeSchema.parse(file), formatVersion: 4 }),
  4: (file) => ({ ...EnvelopeSchema.parse(file), formatVersion: 5 }),
  5: (file) => ({
    ...EnvelopeSchema.parse(file),
    formatVersion: 6,
    jobPosts: [],
    generatedQuestions: [],
  }),
  6: (file) => {
    const legacy = EnvelopeSchema.extend({ jobPosts: z.array(z.unknown()) }).parse(file);
    return {
      ...legacy,
      formatVersion: 7,
      jobPosts: legacy.jobPosts.map((post) => {
        const migrated = migrateJobRecord(post);
        if (!migrated) throw new ImportFileError('format');
        return migrated;
      }),
    };
  },
  7: (file) => ({ ...EnvelopeSchema.parse(file), formatVersion: 8 }),
  8: (file) => {
    const legacy = EnvelopeSchema.extend({ jobPosts: z.array(z.unknown()) }).parse(file);
    return {
      ...legacy,
      formatVersion: 9,
      jobPosts: legacy.jobPosts.map((post) => {
        const migrated = migrateJobRecord(post);
        if (!migrated) throw new ImportFileError('format');
        return migrated;
      }),
    };
  },
};
const PrefixSchema = ExportFileSchema.pick({ format: true, formatVersion: true });
const EnvelopeSchema = ExportFileSchema.omit({ sessions: true }).extend({
  sessions: z.array(z.unknown()).max(1_000),
  jobPosts: z.array(z.unknown()).default([]),
});
const RawBundleSchema = z.object({ session: z.unknown(), answers: z.array(z.unknown()).max(5) });
const BundleSchema = ExportFileSchema.shape.sessions.element;
export function migrateExport(
  input: unknown,
  target: number = STORAGE.EXPORT_FORMAT_VERSION,
  migrations = EXPORT_MIGRATIONS,
): unknown {
  let value = input;
  let parsed = PrefixSchema.safeParse(value);
  if (!parsed.success) throw new ImportFileError('format');
  while (parsed.data.formatVersion < target) {
    const previous = parsed.data.formatVersion;
    const migrate = migrations[previous];
    if (!migrate) throw new ImportFileError('format');
    try {
      value = migrate(value);
    } catch {
      throw new ImportFileError('format');
    }
    parsed = PrefixSchema.safeParse(value);
    if (!parsed.success || parsed.data.formatVersion !== previous + 1)
      throw new ImportFileError('format');
  }
  if (parsed.data.formatVersion > target) throw new ImportFileError('newer');
  return value;
}
function withoutProofs(answer: AnswerRecord): AnswerRecord {
  const cleanMeta = (meta: AnswerRecord['feedbackMeta']) =>
    meta ? { ...meta, ...(meta.followUpToken === undefined ? {} : { followUpToken: null }) } : null;
  return {
    ...answer,
    followUp: answer.followUp ? { ...answer.followUp, token: null } : null,
    feedbackMeta: cleanMeta(answer.feedbackMeta),
    attemptRecords: answer.attemptRecords.map((item) => ({
      ...item,
      feedbackMeta: cleanMeta(item.feedbackMeta),
    })),
    followUpRecords: answer.followUpRecords.map((item) => ({
      ...item,
      feedbackMeta: cleanMeta(item.feedbackMeta),
    })),
  };
}
export async function readImport(file: File) {
  if (file.size > HTTP.IMPORT_MAX_BYTES) throw new ImportFileError('size');
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text()) as unknown;
  } catch {
    throw new ImportFileError('format');
  }
  const envelope = EnvelopeSchema.safeParse(migrateExport(raw));
  if (!envelope.success) throw new ImportFileError('format');
  const bundles: ExportFile['sessions'] = [];
  let invalid = 0;
  for (const value of envelope.data.sessions) {
    const rawBundle = RawBundleSchema.safeParse(value);
    if (!rawBundle.success) {
      invalid++;
      continue;
    }
    const parsed = BundleSchema.safeParse({
      session: migrateRecord(rawBundle.data.session),
      answers: rawBundle.data.answers.map((answer) => migrateRecord(answer)),
    });
    if (!parsed.success) {
      invalid++;
      continue;
    }
    const { session, answers } = parsed.data;
    const indexes = new Set(answers.map((answer) => answer.index));
    if (
      indexes.size !== answers.length ||
      answers.some(
        (answer) =>
          answer.sessionId !== session.id ||
          answer.questionId !== session.questions[answer.index]?.id,
      )
    ) {
      invalid++;
      continue;
    }
    bundles.push({
      session: {
        ...session,
        origin: 'import',
        token: null,
        tokenExpiresAt: null,
        ...(session.status === 'in_progress'
          ? { feedback: { enabled: false, reason: 'practice' as const } }
          : {}),
      },
      answers: answers.map(withoutProofs),
    });
  }
  const jobData = JobDataSchema.parse(envelope.data);
  jobData.generatedQuestions = jobData.generatedQuestions.map((question) => ({
    ...question,
    origin: 'import',
  }));
  return { bundles, invalid, jobData };
}
export async function buildExport(
  repo: SessionRepository,
  appVersion: string,
  clock: () => Date,
  jobData: JobData = { jobPosts: [], generatedQuestions: [] },
): Promise<ExportFile> {
  const { sessions } = await repo.listSessions();
  return ExportFileSchema.parse({
    ...jobData,
    format: 'rehearse-export',
    formatVersion: STORAGE.EXPORT_FORMAT_VERSION,
    exportedAt: clock().toISOString(),
    appVersion,
    sessions: await Promise.all(
      sessions.map(async (session) => ({
        session: { ...session, token: null, tokenExpiresAt: null },
        answers: (await repo.getAnswers(session.id)).map(withoutProofs),
      })),
    ),
  });
}
export function downloadExport(file: ExportFile) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `rehearse-export-${file.exportedAt.slice(0, 10)}.json`;
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

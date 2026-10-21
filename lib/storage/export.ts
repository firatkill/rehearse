import { z } from 'zod';
import { HTTP, STORAGE } from '@/lib/config';
import { AppError } from '@/lib/errors';
import { migrateRecord } from './migrations';
import { ExportFileSchema, type ExportFile } from './schema';
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
export const EXPORT_MIGRATIONS: Readonly<Record<number, (file: unknown) => unknown>> = {};
const PrefixSchema = ExportFileSchema.pick({ format: true, formatVersion: true });
const EnvelopeSchema = ExportFileSchema.omit({ sessions: true }).extend({
  sessions: z.array(z.unknown()).max(1_000),
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
      answers,
    });
  }
  return { bundles, invalid };
}
export async function buildExport(
  repo: SessionRepository,
  appVersion: string,
  clock: () => Date,
): Promise<ExportFile> {
  const { sessions } = await repo.listSessions();
  return ExportFileSchema.parse({
    format: 'rehearse-export',
    formatVersion: STORAGE.EXPORT_FORMAT_VERSION,
    exportedAt: clock().toISOString(),
    appVersion,
    sessions: await Promise.all(
      sessions.map(async (session) => ({
        session: { ...session, token: null, tokenExpiresAt: null },
        answers: await repo.getAnswers(session.id),
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

import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { clearPreferences } from './idb';
import { readImport } from './export';
import { SessionRecordSchema, AnswerRecordSchema, ExportFileSchema } from './schema';
import {
  DataRequestSchema,
  ListSessionsSchema,
  ImportResultSchema,
  type DataRequest,
} from './data-contracts';
import type { SessionRepository } from './repository';
export function createHttpRepository(): SessionRepository {
  const call = async <T>(input: DataRequest, schema: z.ZodType<T>): Promise<T> => {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DataRequestSchema.parse(input)),
      cache: 'no-store',
    });
    if (!response.ok) throw new AppError('INTERNAL_ERROR');
    return schema.parse(await response.json());
  };
  const repo: SessionRepository = {
    persistent: true,
    createSession: async (session) => {
      await call({ operation: 'createSession', session }, z.null());
    },
    getSession: (id) => call({ operation: 'getSession', id }, SessionRecordSchema.nullable()),
    updateSession: (id, patch) =>
      call(
        {
          operation: 'updateSession',
          id,
          patch: SessionRecordSchema.omit({ id: true, schemaVersion: true })
            .partial()
            .strip()
            .parse(patch),
        },
        SessionRecordSchema,
      ),
    listSessions: () => call({ operation: 'listSessions' }, ListSessionsSchema),
    deleteSession: async (id) => {
      await call({ operation: 'deleteSession', id }, z.null());
    },
    putAnswer: async (answer) => {
      await call({ operation: 'putAnswer', answer }, z.null());
    },
    getAnswers: (id) => call({ operation: 'getAnswers', id }, z.array(AnswerRecordSchema)),
    exportAll: (version) => call({ operation: 'exportAll', appVersion: version }, ExportFileSchema),
    importAll: async (file) => {
      await readImport(file);
      return call({ operation: 'importAll', text: await file.text() }, ImportResultSchema);
    },
    deleteAll: async () => {
      await call({ operation: 'deleteAll' }, z.null());
      clearPreferences();
    },
  };
  return repo;
}

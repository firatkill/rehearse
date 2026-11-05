import { z } from 'zod';
import { SessionRecordSchema, AnswerRecordSchema } from './schema';
export const DataRequestSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('createSession'), session: SessionRecordSchema }).strict(),
  z.object({ operation: z.literal('getSession'), id: z.uuid() }).strict(),
  z
    .object({
      operation: z.literal('updateSession'),
      id: z.uuid(),
      patch: SessionRecordSchema.omit({ id: true, schemaVersion: true }).partial(),
    })
    .strict(),
  z.object({ operation: z.literal('listSessions') }).strict(),
  z.object({ operation: z.literal('deleteSession'), id: z.uuid() }).strict(),
  z.object({ operation: z.literal('putAnswer'), answer: AnswerRecordSchema }).strict(),
  z.object({ operation: z.literal('getAnswers'), id: z.uuid() }).strict(),
  z.object({ operation: z.literal('deleteAll') }).strict(),
  z.object({ operation: z.literal('importAll'), text: z.string() }).strict(),
]);
export type DataRequest = z.infer<typeof DataRequestSchema>;
export const ListSessionsSchema = z.object({
  sessions: z.array(SessionRecordSchema),
  skipped: z.number().int().nonnegative(),
});
export const ImportResultSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  invalid: z.number().int().nonnegative(),
});

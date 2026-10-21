import type { SessionRecord, AnswerRecord, ExportFile } from './schema';
export interface SessionRepository {
  readonly persistent: boolean;
  createSession(session: SessionRecord): Promise<void>;
  getSession(id: string): Promise<SessionRecord | null>;
  updateSession(
    id: string,
    patch: Partial<Omit<SessionRecord, 'id' | 'schemaVersion'>>,
  ): Promise<SessionRecord>;
  listSessions(): Promise<{ sessions: SessionRecord[]; skipped: number }>; // newest first by createdAt
  deleteSession(id: string): Promise<void>;
  putAnswer(answer: AnswerRecord): Promise<void>;
  getAnswers(sessionId: string): Promise<AnswerRecord[]>; // ordered by index
  exportAll(appVersion: string): Promise<ExportFile>;
  importAll(file: File): Promise<{ imported: number; skipped: number; invalid: number }>;
  deleteAll(): Promise<void>;
}

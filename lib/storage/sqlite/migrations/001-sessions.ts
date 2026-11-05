import 'server-only';
export const initialMigration = `
CREATE TABLE sessions (id TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE answers (session_id TEXT NOT NULL, slot INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY(session_id, slot));
`;

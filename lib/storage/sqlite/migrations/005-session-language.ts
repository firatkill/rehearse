import 'server-only';
/** V5 records predate language selection; retain their English interpretation. */
export const sessionLanguageMigration = `
UPDATE sessions SET value = json_set(value, '$.schemaVersion', 6, '$.setup.language', 'en')
WHERE json_extract(value, '$.schemaVersion') = 5;
UPDATE answers SET value = json_set(value, '$.schemaVersion', 6)
WHERE json_extract(value, '$.schemaVersion') = 5;
`;

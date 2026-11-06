import 'server-only';
export const jobLanguageMigration = `
UPDATE job_posts SET value = json_set(value, '$.schemaVersion', 3, '$.language', 'en')
WHERE json_extract(value, '$.schemaVersion') = 2;
`;

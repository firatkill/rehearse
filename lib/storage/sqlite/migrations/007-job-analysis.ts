import 'server-only';
export const jobAnalysisMigration = `
UPDATE job_posts SET value = json_set(value, '$.schemaVersion', 4, '$.analysis', NULL)
WHERE json_extract(value, '$.schemaVersion') = 3;
`;

export const interviewDateMigration = `
UPDATE job_posts SET value = json_set(value, '$.schemaVersion', 2, '$.interviewDate', NULL)
WHERE json_extract(value, '$.schemaVersion') = 1;
`;

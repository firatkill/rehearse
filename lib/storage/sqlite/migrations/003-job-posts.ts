export const jobPostsMigration = `
CREATE TABLE job_posts (id TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE generated_questions (id TEXT PRIMARY KEY, job_post_id TEXT NOT NULL, value TEXT NOT NULL);
CREATE INDEX generated_questions_by_post ON generated_questions(job_post_id);
`;

import 'server-only';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import {
  JobDataSchema,
  JobPostRecordSchema,
  GeneratedQuestionRecordSchema,
  type JobData,
} from '../jobpost-schema';
export function readJobData(db: Database.Database): JobData {
  const values = (table: 'job_posts' | 'generated_questions') =>
    db
      .prepare(`SELECT value FROM ${table}`)
      .all()
      .map((row): unknown => {
        try {
          return JSON.parse(z.object({ value: z.string() }).parse(row).value) as unknown;
        } catch {
          return null;
        }
      });
  return JobDataSchema.parse({
    jobPosts: values('job_posts').flatMap((value) => {
      const parsed = JobPostRecordSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    }),
    generatedQuestions: values('generated_questions').flatMap((value) => {
      const parsed = GeneratedQuestionRecordSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    }),
  });
}
export function importJobData(db: Database.Database, input: JobData) {
  const data = JobDataSchema.parse(input);
  for (const post of data.jobPosts)
    db.prepare('INSERT OR IGNORE INTO job_posts(id,value) VALUES (?,?)').run(
      post.id,
      JSON.stringify(post),
    );
  for (const question of data.generatedQuestions) {
    if (!db.prepare('SELECT id FROM job_posts WHERE id = ?').get(question.jobPostId)) continue;
    db.prepare(
      'INSERT OR IGNORE INTO generated_questions(id,job_post_id,value) VALUES (?,?,?)',
    ).run(question.id, question.jobPostId, JSON.stringify({ ...question, origin: 'import' }));
  }
}

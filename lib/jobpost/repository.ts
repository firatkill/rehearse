import 'server-only';
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { getSqliteConnection } from '@/lib/storage/sqlite/repository';
import {
  JobPostRecordSchema,
  GeneratedQuestionRecordSchema,
  JobTextSchema,
  InterviewDateSchema,
  type JobPostRecord,
  type GeneratedQuestionRecord,
} from '@/lib/storage/jobpost-schema';
import type { JobGeneration } from './schema';
import { JOBPOST_PROMPT_VERSION } from '@/lib/prompts/version';
import { validateJobQuestions } from './validate';
import { JOBPOST, type Role } from '@/lib/config';
const row = z.object({ value: z.string() });
export function practiceRole(title: string): Role {
  const value = title.toLowerCase();
  if (/\bai\b|machine learning/.test(value)) return 'ai-product-engineer';
  if (/front.?end/.test(value)) return 'frontend';
  if (/back.?end/.test(value)) return 'backend';
  if (/product/.test(value)) return 'product-engineer';
  return 'full-stack';
}
export function createJobRepository(db: Database.Database, clock: () => Date = () => new Date()) {
  const get = (id: string): JobPostRecord | null => {
    const found = db.prepare('SELECT value FROM job_posts WHERE id = ?').get(id);
    if (!found) return null;
    return JobPostRecordSchema.parse(JSON.parse(row.parse(found).value));
  };
  const questions = (id: string) =>
    db
      .prepare('SELECT value FROM generated_questions WHERE job_post_id = ? ORDER BY rowid')
      .all(id)
      .map((value) => GeneratedQuestionRecordSchema.parse(JSON.parse(row.parse(value).value)));
  const save = (post: JobPostRecord) => {
    const parsed = JobPostRecordSchema.parse(post);
    db.prepare(
      'INSERT INTO job_posts(id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value',
    ).run(parsed.id, JSON.stringify(parsed));
    return parsed;
  };
  const create = (text: string, sourceUrl: string | null = null) => {
    const total = z
      .object({ count: z.number() })
      .parse(db.prepare('SELECT count(*) AS count FROM job_posts').get()).count;
    if (total >= JOBPOST.MAX_POSTS) throw new AppError('VALIDATION_FAILED');
    return save({
      schemaVersion: 2,
      interviewDate: null,
      id: randomUUID(),
      text: JobTextSchema.parse(text),
      sourceUrl,
      createdAt: clock().toISOString(),
      updatedAt: clock().toISOString(),
      status: 'draft',
      role: '',
      company: '',
      location: '',
      requirements: [],
      about: '',
      practiceRole: 'full-stack',
    });
  };
  return {
    get,
    questions,
    create,
    list: () =>
      db
        .prepare('SELECT value FROM job_posts ORDER BY rowid DESC')
        .all()
        .map((value) => JobPostRecordSchema.parse(JSON.parse(row.parse(value).value))),
    setInterviewDate(id: string, interviewDate: string | null) {
      const post = get(id);
      if (!post) throw new AppError('JOBPOST_NOT_FOUND');
      return save({
        ...post,
        interviewDate: InterviewDateSchema.nullable().parse(interviewDate),
        updatedAt: clock().toISOString(),
      });
    },
    updateText(id: string, text: string) {
      const post = get(id);
      if (!post) throw new AppError('JOBPOST_NOT_FOUND');
      // Editing a generated post creates a revision, preserving questions referenced by signed sessions.
      if (post.status !== 'ready')
        return save({ ...post, text: JobTextSchema.parse(text), updatedAt: clock().toISOString() });
      return db.transaction(() => {
        const revised = create(text, post.sourceUrl);
        // The upcoming interview follows the new revision; historical questions remain intact.
        save({ ...post, interviewDate: null, updatedAt: clock().toISOString() });
        return save({ ...revised, interviewDate: post.interviewDate });
      })();
    },
    generatedQuestion(id: string): GeneratedQuestionRecord | null {
      const found = db.prepare('SELECT value FROM generated_questions WHERE id = ?').get(id);
      if (!found) return null;
      const parsed = GeneratedQuestionRecordSchema.parse(JSON.parse(row.parse(found).value));
      return parsed.origin === 'generated' ? parsed : null;
    },
    commitGeneration(
      id: string,
      summary: JobGeneration,
      accepted: JobGeneration['questions'],
      model: string,
    ) {
      return db.transaction(() => {
        const post = get(id);
        if (!post) throw new AppError('JOBPOST_NOT_FOUND');
        const stored = questions(id);
        const existing = stored.filter((item) => item.origin === 'generated');
        if (stored.length + accepted.length > JOBPOST.MAX_STORED_QUESTIONS)
          throw new AppError('VALIDATION_FAILED');
        if (
          validateJobQuestions(
            accepted,
            post.text,
            existing.map((item) => item.text),
          ).questions.length !== accepted.length
        )
          throw new AppError('JOBPOST_INVALID');
        const now = clock().toISOString();
        const updated = save({
          ...post,
          status: 'ready',
          role: existing.length ? post.role : summary.role,
          company: existing.length ? post.company : summary.company,
          location: existing.length ? post.location : summary.location,
          requirements: existing.length ? post.requirements : summary.requirements,
          about: existing.length ? post.about : summary.about,
          practiceRole: existing.length ? post.practiceRole : practiceRole(summary.role),
          updatedAt: now,
        });
        for (const item of accepted) {
          const question = GeneratedQuestionRecordSchema.parse({
            ...item,
            schemaVersion: 1,
            id: `gen-${randomUUID()}`,
            jobPostId: id,
            createdAt: now,
            model,
            promptVersion: JOBPOST_PROMPT_VERSION,
            origin: 'generated',
          });
          db.prepare('INSERT INTO generated_questions(id,job_post_id,value) VALUES (?,?,?)').run(
            question.id,
            id,
            JSON.stringify(question),
          );
        }
        return { post: updated, questions: questions(id) };
      })();
    },
  };
}
export function getJobRepository() {
  return createJobRepository(getSqliteConnection());
}

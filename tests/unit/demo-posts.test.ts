import { expect, it } from 'vitest';
import { demoJobs } from '@/lib/demo/content';
it.each(demoJobs)(
  'TC-166 $slug is a substantial fictional post with eight grounded questions',
  (job) => {
    const words = job.text.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(250);
    expect(words).toBeLessThanOrEqual(400);
    expect(job.text).toMatch(/fictional/i);
    expect(job.text).toMatch(/Nice-to-haves/);
    expect(job.requirements.length).toBeGreaterThanOrEqual(3);
    expect(job.questions).toHaveLength(8);
    expect(new Set(job.questions.map((q) => q.prompt)).size).toBe(8);
    expect(new Set(job.questions.map((q) => q.groundingQuote)).size).toBe(8);
    for (const question of job.questions) expect(job.text).toContain(question.groundingQuote);
  },
);

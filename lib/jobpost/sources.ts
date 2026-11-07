import 'server-only';
import { z } from 'zod';
import { htmlText } from './extract';
import { JobTextSchema } from '@/lib/storage/jobpost-schema';

export type JobSource = {
  url: URL;
  kind: 'html' | 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'smartrecruiters';
  id?: string;
};
/** Only recognised hosts and identifier segments can select a public API. */
export function jobSource(url: URL): JobSource {
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  const segment = (value: string | undefined) =>
    value && /^[a-zA-Z0-9_-]+$/.test(value) ? value : undefined;
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
    const id =
      url.searchParams.get('currentJobId') ??
      (parts[0] === 'jobs' && parts[1] === 'view'
        ? parts[2]?.match(/(?:^|-)(\d+)$/)?.[1]
        : undefined);
    if (id && /^\d+$/.test(id))
      return {
        kind: 'html',
        url: new URL(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`),
      };
  }
  const board = segment(parts[0]);
  if (['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(host) && board) {
    const id =
      parts[1] === 'jobs'
        ? segment(parts[2])
        : segment(url.searchParams.get('gh_jid') ?? undefined);
    if (id)
      return {
        kind: 'greenhouse',
        url: new URL(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}`),
      };
  }
  const id = segment(parts[1]);
  if (['jobs.lever.co', 'jobs.eu.lever.co'].includes(host) && board && id)
    return {
      kind: 'lever',
      url: new URL(
        `https://${host === 'jobs.eu.lever.co' ? 'api.eu.lever.co' : 'api.lever.co'}/v0/postings/${board}/${id}?mode=json`,
      ),
    };
  if (host === 'jobs.ashbyhq.com' && board && id)
    return {
      kind: 'ashby',
      id,
      url: new URL(`https://api.ashbyhq.com/posting-api/job-board/${board}`),
    };
  if (host === 'apply.workable.com' && board && parts[1] === 'j' && parts[2] && segment(parts[2]))
    return {
      kind: 'workable',
      id: parts[2],
      url: new URL(`https://www.workable.com/api/accounts/${board}?details=true`),
    };
  if (host === 'jobs.smartrecruiters.com' && board && id) {
    const posting = id.match(/^\d+/)?.[0];
    if (posting)
      return {
        kind: 'smartrecruiters',
        url: new URL(`https://api.smartrecruiters.com/v1/companies/${board}/postings/${posting}`),
      };
  }
  return { url, kind: 'html' };
}
const object = z.record(z.string(), z.unknown());
const string = (value: unknown) => (typeof value === 'string' ? value : '');
const description = (value: unknown) => z.string().trim().min(1).parse(value);
export function extractApiJob(body: string, source: JobSource): string {
  const data = object.parse(JSON.parse(body));
  let fields: string[] = [];
  switch (source.kind) {
    case 'greenhouse':
      fields = [string(data.title), htmlText(description(data.content))];
      break;
    case 'lever': {
      const lists = z.array(object).optional().parse(data.lists) ?? [];
      fields = [
        string(data.text),
        description(data.description),
        ...lists.flatMap((item) => [string(item.text), string(item.content)]),
        string(data.additional),
      ];
      break;
    }
    case 'ashby': {
      const job = z
        .array(object)
        .parse(data.jobs)
        .find((item) => {
          try {
            return (
              new URL(string(item.jobUrl)).pathname.split('/').filter(Boolean).at(-1) === source.id
            );
          } catch {
            return false;
          }
        });
      if (job)
        fields = [string(job.title), description(job.descriptionHtml || job.descriptionPlain)];
      break;
    }
    case 'workable': {
      const job = z
        .array(object)
        .parse(data.jobs)
        .find((item) => item.shortcode === source.id);
      if (job) fields = [string(job.title), string(data.name), description(job.description)];
      break;
    }
    case 'smartrecruiters': {
      const sections = object.parse(object.parse(data.jobAd).sections);
      fields = [
        string(data.name),
        ...Object.values(sections).map((section) => string(object.parse(section).text)),
      ];
      break;
    }
    case 'html':
      break;
  }
  const text = htmlText(fields.join('\n'));
  return JobTextSchema.parse(text);
}

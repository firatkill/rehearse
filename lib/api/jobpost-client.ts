import { ErrorBodySchema } from './contracts';
import {
  JobRequestSchema,
  JobResponseSchema,
  JOBPOST_ERROR_COPY,
  type JobRequest,
} from './jobpost-contracts';
export async function requestJob(input: JobRequest) {
  try {
    const response = await fetch('/api/job-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(JobRequestSchema.parse(input)),
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      const parsed = ErrorBodySchema.safeParse(body);
      const code = parsed.success ? parsed.data.error.code : 'INTERNAL_ERROR';
      const message =
        code in JOBPOST_ERROR_COPY
          ? JOBPOST_ERROR_COPY[code as keyof typeof JOBPOST_ERROR_COPY]
          : JOBPOST_ERROR_COPY.NETWORK;
      return { ok: false as const, message };
    }
    return { ok: true as const, data: JobResponseSchema.parse(body) };
  } catch {
    return { ok: false as const, message: JOBPOST_ERROR_COPY.NETWORK };
  }
}

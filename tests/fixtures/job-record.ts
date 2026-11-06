import type { JobResponse } from '@/lib/api/jobpost-contracts';
import { jobText } from './jobpost';
export const jobRecord: JobResponse = {
  post: {
    schemaVersion: 3,
    language: 'en',
    id: 'cfa89a6e-9e68-44f9-a6c7-0b742a20c013',
    createdAt: '2026-11-05T12:00:00.000Z',
    updatedAt: '2026-11-05T12:00:00.000Z',
    text: jobText,
    sourceUrl: null,
    status: 'draft',
    role: '',
    company: '',
    location: '',
    requirements: [],
    about: '',
    practiceRole: 'full-stack',
    interviewDate: null,
  },
  questions: [],
};

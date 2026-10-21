import type { Feedback } from '@/lib/feedback/schema';
import type { Summary } from '@/lib/summary/schema';
import type { StartRequest } from '@/lib/api/contracts';

export const sessionId = 'b1557bb8-eaa6-4d58-8d4c-7128c3a1454c';
export const startBody: StartRequest = {
  role: 'backend',
  seniority: 'mid',
  types: ['behavioral'],
  length: 3,
  mode: 'text',
  seed: '1234abcd',
  feedback: true,
};
export const feedback: Feedback = {
  scores: {
    structure: { score: 3, rationale: 'You describe the problem and result.' },
    specificity: { score: 3, rationale: 'You give a concrete example.' },
    ownership: { score: 3, rationale: 'Your own actions are clear.' },
    impact: { score: 3, rationale: 'You state the result.' },
    relevance: { score: 3, rationale: 'You address the question.' },
    clarity: { score: 3, rationale: 'Your explanation is easy to follow.' },
  },
  overall: 3,
  strengths: [{ point: 'Clear personal ownership', evidence: 'I rebuilt the queue' }],
  improvements: [
    {
      point: 'Quantify the result',
      why: 'It makes the impact concrete.',
      rewrite: 'I reduced retries by [percentage].',
    },
  ],
  follow_up_question: 'How did you measure the result?',
  model_answer_outline: ['Describe the problem.', 'Explain your action.', 'State the outcome.'],
  flags: { off_topic: false, too_short: false, injection_suspected: false },
};
export const summary: Summary = {
  headline: 'Make your results concrete',
  paragraph: 'You explain your actions clearly. Add measurements to show their impact.',
  focus_notes: [{ dimension: 'impact', note: null }],
  next_practice: 'Practise one example with a measurable result.',
  generated_at: '2026-10-21T12:00:00.000Z',
  model: 'mock',
  prompt_version: 'summary-v1',
};

import type { FeedbackLlm } from '@/lib/feedback/schema';
export function feedbackLlm(): FeedbackLlm {
  return {
    scores: {
      structure: { score: 4, rationale: 'You explain the situation, action and result.' },
      specificity: { score: 4, rationale: 'You give concrete numbers.' },
      ownership: { score: 4, rationale: 'You distinguish your contribution.' },
      impact: { score: 4, rationale: 'You quantify the result.' },
      relevance: { score: 4, rationale: 'You address the question.' },
      clarity: { score: 4, rationale: 'You use clear sentences.' },
    },
    strengths: [{ point: 'You explain your contribution.', evidence: 'I delivered the project' }],
    improvements: [
      {
        point: 'Name the constraint.',
        why: 'It explains your choice.',
        rewrite: 'I chose this because [constraint].',
      },
    ],
    follow_up_question: 'What would you change next time?',
    model_answer_outline: [
      'Explain the context.',
      'Describe your actions.',
      'Quantify the result.',
    ],
    flags: { off_topic: false, too_short: false, injection_suspected: false },
  };
}

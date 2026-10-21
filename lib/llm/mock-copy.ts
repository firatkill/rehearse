import 'server-only';
import type { Dimension, QuestionType } from '@/lib/config';
export const MOCK_OUTLINES: Record<QuestionType, string[]> = {
  behavioral: [
    'Set the scene and explain your responsibility.',
    'Describe the actions you took and why.',
    'Close with the result and what you learnt.',
  ],
  'technical-concepts': [
    'Define the concept and explain how it works.',
    'Give a concrete example of when to use it.',
    'Discuss trade-offs and limitations.',
  ],
  'system-design-lite': [
    'Clarify requirements and expected scale.',
    'Describe components and the flow of data.',
    'Discuss trade-offs and failure modes.',
  ],
};
export const MOCK_RATIONALES: Record<Dimension, string> = {
  structure: 'Your answer is assessed for context, action and result markers.',
  specificity: 'Your answer is assessed for concrete numbers.',
  ownership: 'Your answer is assessed for personal and team contributions.',
  impact: 'Your answer is assessed for results and their measurement.',
  relevance: 'Your answer is assessed for overlap with the question.',
  clarity: 'Your answer is assessed for length and sentence structure.',
};
export const MOCK_SUMMARY_PARAGRAPH =
  'You have completed a practice session and have a baseline for your next attempt. Use the focus areas below to make your next answers more concrete.';
export const MOCK_FOCUS_TIPS: Record<Dimension, string> = {
  structure:
    'Open with one sentence of context, spend most of the answer on what you did, and end with the result.',
  specificity:
    'Name the system, the number and the constraint. One concrete detail beats three adjectives.',
  ownership:
    'Say ‘I’ for what you did and ‘the team’ for the rest. The interviewer is hiring you, not the team.',
  impact: 'End with a result you can measure or check, and what changed because of it.',
  relevance: 'Repeat the question to yourself before answering, and cut parts that don’t serve it.',
  clarity: 'Use short sentences and signpost: ‘There were two problems. First…’.',
};

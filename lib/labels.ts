import type { AnswerMode, Dimension, QuestionType, Role, Seniority } from '@/lib/config';
export const ROLE_LABELS: Record<Role, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  'full-stack': 'Full-stack',
  'product-engineer': 'Product engineer',
  'ai-product-engineer': 'AI product engineer',
};
export const SENIORITY_LABELS: Record<Seniority, string> = {
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
};
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  behavioral: 'Behavioral',
  'technical-concepts': 'Technical concepts',
  'system-design-lite': 'System design lite',
};
export const ANSWER_MODE_LABELS: Record<AnswerMode, string> = { voice: 'Voice', text: 'Text' };
export const DIMENSION_LABELS: Record<Dimension, string> = {
  structure: 'Structure',
  specificity: 'Specificity',
  ownership: 'Ownership',
  impact: 'Impact',
  relevance: 'Relevance',
  clarity: 'Clarity',
};

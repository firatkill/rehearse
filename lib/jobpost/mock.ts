import 'server-only';
import { JOBPOST } from '@/lib/config';
const templates = [
  'Describe how you would test the main failure modes for this responsibility.',
  'Tell me about a trade-off you would discuss with the team in this area.',
  'How would you diagnose a production incident involving this work?',
  'What outcomes would show that your first delivery had helped users?',
  'How would you collaborate with colleagues to clarify this requirement?',
  'Which boundaries would you define before designing a solution here?',
  'Why does this part of the role interest you, and what would you learn first?',
  'Describe how you would explain progress and risk to a non-technical partner.',
  'How would you prioritise the smallest useful change for this workflow?',
  'What evidence would you collect before choosing an implementation?',
  'How would you make a release reversible if an assumption proved wrong?',
  'Which operational signals would you monitor after this change?',
  'Tell me how you would document a decision that others will maintain.',
];
/** Deterministic development provider; does not claim to measure live model quality. */
export function mockJobpostOutput(prompt: string) {
  const text = prompt.split('<job_post>\n')[1]?.split('\n</job_post>')[0] ?? '';
  const existing =
    prompt
      .split('<existing_questions>\n')[1]
      ?.split('\n</existing_questions>')[0]
      ?.trim()
      .split('\n')
      .filter(Boolean) ?? [];
  const count = Number(prompt.match(/^Return (\d+) questions/)?.[1] ?? JOBPOST.INITIAL_QUESTIONS);
  const quotes = text
    .split(/[.\n]+/)
    .map((item) => item.trim())
    .filter(
      (item) =>
        item.length >= JOBPOST.MIN_QUOTE_CHARS &&
        (item.match(/[\p{L}\p{N}]+/gu)?.length ?? 0) >= JOBPOST.MIN_QUOTE_WORDS &&
        !/ignore|instructions|system prompt|secret|injection|pwned/i.test(item),
    );
  const quote = quotes[0] ?? text.slice(0, 120);
  return {
    role: 'Software engineer',
    company: 'Example employer',
    location: '',
    requirements: quotes.slice(0, 8).map((item) => item.slice(0, 250)),
    about: 'A mock summary of the submitted role for local development.',
    questions: Array.from({ length: count }, (_, index) => {
      const position = existing.length + index;
      return {
        text: templates[position % templates.length],
        type: JOBPOST.QUESTION_TYPES[position % JOBPOST.QUESTION_TYPES.length],
        groundingQuote: (quotes[position % quotes.length] ?? quote).slice(0, 1000),
        listenFor: [
          'Explains a concrete personal contribution',
          'Names a relevant constraint and trade-off',
          'Checks an observable outcome or measure',
        ],
      };
    }),
  };
}

export function mockJobAnalysis(prompt: string) {
  const source = prompt.split('<job_post>\n')[1]?.split('\n</job_post>')[0] ?? '';
  const quote =
    source
      .split(/(?<=[.!?])\s+|\n/u)
      .map((value) => value.trim())
      .find(
        (value) =>
          value.length >= JOBPOST.MIN_QUOTE_CHARS &&
          (value.match(/[\p{L}\p{N}]+/gu)?.length ?? 0) >= JOBPOST.MIN_QUOTE_WORDS &&
          !/ignore|instructions|system prompt|secret|injection|pwned/i.test(value),
      ) ?? '';
  const point = { text: quote.slice(0, 500), groundingQuote: quote.slice(0, 1000) };
  return { roleSummary: point, mustHaves: [point], niceToHaves: [], likelyProbes: [point] };
}

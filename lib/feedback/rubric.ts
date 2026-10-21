import { DIMENSIONS, type Dimension, type QuestionType } from '@/lib/config';
import { DIMENSION_LABELS } from '@/lib/labels';
export const RUBRIC = {
  structure: {
    question: 'Is the answer organised so a listener can follow it?',
    anchors: {
      behavioral: [
        'No recognisable situation, task, action or result; events out of order, or a general opinion instead of a story.',
        'One or two STAR parts present; the action or the result is missing or only implied.',
        'All four parts present, but one is thin (often the result) or the order makes it harder to follow.',
        'Situation and task set up in a few sentences, most of the time on actions, an explicit result; easy to follow.',
      ],
      'technical-concepts': [
        'No clear definition or explanation; scattered statements.',
        'Defines the concept but does not explain how it works or when to use it.',
        'Defines it, explains the mechanism and gives a use case; trade-offs or an example missing.',
        'Defines it, explains the mechanism, gives a concrete example and names trade-offs or limits, in a logical order.',
      ],
      'system-design-lite': [
        'Jumps to technologies without requirements or components.',
        'Lists components without clarifying requirements or how data flows.',
        'States key requirements, the main components and the data flow; trade-offs thin.',
        'Clarifies requirements and scale, outlines components and data flow, and discusses at least two trade-offs or failure modes.',
      ],
    },
  },
  specificity: {
    question: 'Are the claims concrete and checkable?',
    anchors: {
      behavioral: [
        'Generic statements only; could describe anyone or any system.',
        'Some concrete details, but key facts are vague ("a big project", "it was slow").',
        'Concrete details for most claims: named systems, tools, constraints or numbers.',
        'Precise details throughout (numbers, systems, constraints, scale) without padding.',
      ],
      'technical-concepts': [
        'Generic statements only; could describe anyone or any system.',
        'Some concrete details, but key facts are vague ("a big project", "it was slow").',
        'Concrete details for most claims: named systems, tools, constraints or numbers.',
        'Precise details throughout (numbers, systems, constraints, scale) without padding.',
      ],
      'system-design-lite': [
        'Generic statements only; could describe anyone or any system.',
        'Some concrete details, but key facts are vague ("a big project", "it was slow").',
        'Concrete details for most claims: named systems, tools, constraints or numbers.',
        'Precise details throughout (numbers, systems, constraints, scale) without padding.',
      ],
    },
  },
  ownership: {
    question: 'Is it clear what the candidate did and decided?',
    anchors: {
      behavioral: [
        'Only "we" or passive voice; the candidate\'s own role is unclear.',
        'Mostly "we"; the personal contribution is mentioned once or vaguely.',
        'Clear personal actions with "I", with some team actions blurred.',
        'Clear split between what the candidate did and what others did; owns decisions, including mistakes.',
      ],
      'technical-concepts': [
        'Recites definitions or hedges everything without taking a position.',
        'Takes a position but does not justify it or connect it to their own work.',
        'Takes and justifies positions and refers to their own experience at least once.',
        'Commits to a recommendation with reasons, says when they would choose differently, and draws on their own experience.',
      ],
      'system-design-lite': [
        'Recites definitions or hedges everything without taking a position.',
        'Takes a position but does not justify it or connect it to their own work.',
        'Takes and justifies positions and refers to their own experience at least once.',
        'Commits to a recommendation with reasons, says when they would choose differently, and draws on their own experience.',
      ],
    },
  },
  impact: {
    question: 'Does the answer show results and consequences?',
    anchors: {
      behavioral: [
        'No result stated.',
        'A vague result ("it went well", "users liked it").',
        'A concrete result, partly quantified or with a clear qualitative outcome.',
        'A quantified or verifiable result tied to the actions, plus what was learned or changed afterwards.',
      ],
      'technical-concepts': [
        'No consequences of choices discussed.',
        'Benefits or costs mentioned in general terms.',
        'Concrete consequences of choices (performance, cost, user experience, maintenance) explained.',
        'Consequences quantified or bounded and linked to users or the business.',
      ],
      'system-design-lite': [
        'No consequences of choices discussed.',
        'Benefits or costs mentioned in general terms.',
        'Concrete consequences of choices (performance, cost, user experience, maintenance) explained.',
        'Consequences quantified or bounded and linked to users or the business.',
      ],
    },
  },
  relevance: {
    question: 'Does it answer the question that was asked, at this level?',
    anchors: {
      behavioral: [
        'Does not answer the question asked.',
        'Partly answers it; a large part is off the point.',
        'Answers the question, with some detours.',
        'Answers exactly the question, pitched at the role and seniority.',
      ],
      'technical-concepts': [
        'Does not answer the question asked.',
        'Partly answers it; a large part is off the point.',
        'Answers the question, with some detours.',
        'Answers exactly the question, pitched at the role and seniority.',
      ],
      'system-design-lite': [
        'Does not answer the question asked.',
        'Partly answers it; a large part is off the point.',
        'Answers the question, with some detours.',
        'Answers exactly the question, pitched at the role and seniority.',
      ],
    },
  },
  clarity: {
    question: 'Can a listener follow it the first time?',
    anchors: {
      behavioral: [
        'Hard to follow: rambling, fragmented or contradictory.',
        'Understandable with effort; repetition or filler hides the point.',
        'Clear, with minor rambling or one confusing passage.',
        'Concise, ordered and easy to follow on first hearing; no needless repetition.',
      ],
      'technical-concepts': [
        'Hard to follow: rambling, fragmented or contradictory.',
        'Understandable with effort; repetition or filler hides the point.',
        'Clear, with minor rambling or one confusing passage.',
        'Concise, ordered and easy to follow on first hearing; no needless repetition.',
      ],
      'system-design-lite': [
        'Hard to follow: rambling, fragmented or contradictory.',
        'Understandable with effort; repetition or filler hides the point.',
        'Clear, with minor rambling or one confusing passage.',
        'Concise, ordered and easy to follow on first hearing; no needless repetition.',
      ],
    },
  },
} as const;
export const RUBRIC_SENIORITY_NOTE =
  'Seniority: for senior candidates expect wider scope, trade-offs and influence on others; for junior candidates a smaller scope is fine when the reasoning is clear. Score against the stated seniority.';
export const DIMENSION_TIPS: Record<Dimension, string> = {
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
export function renderRubric(type: QuestionType): string {
  return (
    DIMENSIONS.map(
      (dimension) =>
        `${dimension} (${DIMENSION_LABELS[dimension]}): ${RUBRIC[dimension].question}\n${RUBRIC[dimension].anchors[type].map((anchor, index) => ` ${index + 1}: ${anchor}`).join('\n')}`,
    ).join('\n\n') +
    '\n\n' +
    RUBRIC_SENIORITY_NOTE
  );
}

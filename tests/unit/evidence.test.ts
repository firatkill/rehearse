import { expect, it } from 'vitest';
import { verifyEvidence } from '@/lib/feedback/evidence';
import { normalizeFeedback } from '@/lib/feedback/normalize';
import { feedbackLlm } from '../fixtures/feedback';
it.each([
  ['I delivered the project', 'I delivered the project successfully.', true],
  ['i delivered the project', 'I delivered, the project!', true],
  ["we didn't give up", 'We didn’t give up.', true],
  ['delivered the pro', 'I delivered the project.', false],
  ['the project', 'I delivered the project.', false],
  ['words never said', 'I delivered the project.', false],
  ['', 'I delivered the project.', false],
])('TC-074 UT-24 validates whole-word evidence %j', (evidence, transcript, expected) => {
  expect(verifyEvidence(evidence, transcript)).toBe(expected);
});
it.each([
  '"I delivered the project"',
  "'I delivered the project'",
  '“I delivered the project”',
  '‘I delivered the project’',
])('TC-074 UT-24 strips one surrounding quote pair: %s', (evidence) => {
  const raw = feedbackLlm();
  raw.strengths[0]!.evidence = evidence;
  const result = normalizeFeedback(raw, { transcript: 'I delivered the project.', words: 40 });
  expect(result.feedback.strengths[0]?.evidence).toBe('I delivered the project');
  expect(result.evidenceRemoved).toBe(0);
});

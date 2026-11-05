import { demoFeedback, demoJobs } from '@/lib/demo/content';
import { getBank } from '@/lib/questions/bank';
import { DEMO } from '@/lib/config';
import { verifyEvidence } from '@/lib/feedback/evidence';
const ids = new Set(
  [...getBank().questions, ...demoJobs.flatMap((job) => job.questions)].map((q) => q.id),
);
if (demoFeedback.length < DEMO.MIN_QUESTIONS || demoJobs.length !== 3)
  throw new Error('Incomplete demo corpus');
if (new Set(demoFeedback.map((item) => item.questionId)).size !== demoFeedback.length)
  throw new Error('Duplicate demo id');
for (const item of demoFeedback) {
  if (!ids.has(item.questionId) || new Set(item.variants.map((v) => v.level)).size !== 3)
    throw new Error('Invalid demo variants');
  if (item.provenance === 'live' && (!item.generatedAt || !item.model || item.model === 'mock'))
    throw new Error('Missing live provenance');
  for (const variant of item.variants)
    for (const strength of variant.feedback.strengths)
      if (strength.evidence && !verifyEvidence(strength.evidence, variant.answer))
        throw new Error('Invalid sample evidence');
}
for (const job of demoJobs)
  for (const q of job.questions) {
    if (!job.text.toLowerCase().includes(q.groundingQuote.toLowerCase()))
      throw new Error('Ungrounded demo question');
    if (!demoFeedback.some((item) => item.questionId === q.id))
      throw new Error('Missing job feedback');
  }
const pending =
  demoFeedback.filter((item) => item.provenance !== 'live').length +
  demoJobs.filter((job) => job.provenance !== 'live').length;
if (process.argv.includes('--require-live') && pending)
  throw new Error(`${pending} files await owner generation`);
console.log(
  `Demo schema/evidence: ${demoFeedback.length} questions, three variants each, ${demoJobs.length} posts. ${pending} files await owner live generation.`,
);

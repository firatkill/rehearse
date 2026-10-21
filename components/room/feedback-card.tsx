import { DIMENSIONS } from '@/lib/config';
import { DIMENSION_LABELS } from '@/lib/labels';
import type { AnswerRecord, SessionRecord } from '@/lib/storage/schema';
import { SafeText } from '@/components/common/safe-text';
import { DeliveryMetrics } from './delivery-metrics';

export function FeedbackCard({
  answer,
  question,
  focus = true,
}: {
  answer: AnswerRecord;
  question: SessionRecord['questions'][number];
  focus?: boolean;
}) {
  const feedback = answer.feedback;
  if (!feedback) return null;
  const titleId = `feedback-title-${answer.index}`;
  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <h2 id={titleId} tabIndex={-1} data-phase-focus={focus || undefined}>
        Feedback on question {answer.index + 1}
      </h2>
      <p className="font-mono">Overall {feedback.overall.toFixed(1)} / 4</p>
      {feedback.flags.injection_suspected && (
        <p>
          Part of this answer looked like instructions to the grader. It was ignored for scoring.
        </p>
      )}
      {feedback.flags.off_topic && (
        <p>This answer doesn’t seem to address the question, so most scores are capped at 2.</p>
      )}
      {feedback.flags.too_short && (
        <p>This answer is very short, so structure, specificity and impact are capped at 2.</p>
      )}
      <h3>Scores</h3>
      <ul className="space-y-3">
        {DIMENSIONS.map((dimension) => {
          const result = feedback.scores[dimension];
          return (
            <li key={dimension}>
              <span className="sr-only">
                {DIMENSION_LABELS[dimension]}: {result.score} out of 4
              </span>
              <span aria-hidden="true">
                {DIMENSION_LABELS[dimension]} <span className="font-mono">{result.score} / 4</span>
              </span>
              <span data-score-bar aria-hidden="true" className="flex gap-0.5 py-1">
                {[1, 2, 3, 4].map((segment) => (
                  <span
                    key={segment}
                    data-score-segment
                    className={`h-1.5 w-3 ${segment <= result.score ? 'bg-[var(--accent)]' : 'bg-[var(--rule-strong)]'}`}
                  />
                ))}
              </span>
              <p>
                <SafeText text={result.rationale} />
              </p>
            </li>
          );
        })}
      </ul>
      <h3>What worked</h3>
      <ul className="space-y-3">
        {feedback.strengths.map((item, i) => (
          <li key={i}>
            <SafeText text={item.point} />
            {item.evidence !== null && (
              <>
                <p>You said:</p>
                <blockquote className="border-l border-[var(--rule)] pl-4">
                  <SafeText text={item.evidence} />
                </blockquote>
              </>
            )}
          </li>
        ))}
      </ul>
      <h3>What to improve</h3>
      <ol className="list-decimal space-y-3 pl-5">
        {feedback.improvements.map((item, i) => (
          <li key={i}>
            <strong>
              <SafeText text={item.point} />
            </strong>
            <p>
              <SafeText text={item.why} />
            </p>
            <p>Try saying:</p>
            <blockquote className="border-l border-[var(--rule)] pl-4">
              <SafeText text={item.rewrite} />
            </blockquote>
          </li>
        ))}
      </ol>
      <h3>A likely follow-up question</h3>
      <p>
        <SafeText text={feedback.follow_up_question} />
      </p>
      <h3>Outline of a strong answer</h3>
      <ul className="list-disc pl-5">
        {feedback.model_answer_outline.map((text, i) => (
          <li key={i}>
            <SafeText text={text} />
          </li>
        ))}
      </ul>
      <h3>What interviewers listen for</h3>
      <ul className="list-disc pl-5">
        {question.what_good_looks_like.map((text, i) => (
          <li key={i}>
            <SafeText text={text} />
          </li>
        ))}
      </ul>
      <DeliveryMetrics metrics={answer.metrics} mode={answer.mode} />
      <details>
        <summary>Your answer</summary>
        <p className="whitespace-pre-wrap">
          <SafeText text={answer.transcript} />
        </p>
      </details>
      {answer.feedbackMeta && (
        <p className="font-mono text-sm">
          Scored by <SafeText text={answer.feedbackMeta.model} /> · rubric{' '}
          <SafeText text={answer.feedbackMeta.promptVersion} /> ·{' '}
          {(answer.feedbackMeta.latencyMs / 1000).toFixed(1)} s
        </p>
      )}
      <p className="text-sm">
        Scores are a coaching aid from a language model, not a prediction of how an interviewer will
        judge you.
      </p>
    </section>
  );
}

import { DIMENSIONS } from '@/lib/config';
import { DIMENSION_LABELS } from '@/lib/labels';
import type { AnswerRecord, SessionRecord } from '@/lib/storage/schema';
import { SafeText } from '@/components/common/safe-text';
import { ChangeOneThing } from './change-one-thing';
import { Button } from '@/components/ui/button';
import { DeltaBadge } from '@/components/ui/delta-badge';
import { MarkedTranscript } from '@/components/ui/marked-transcript';
import { answerMarks, lowestDimension } from '@/lib/report/feedback-view';
import { DeliveryMetrics } from './delivery-metrics';

export function FeedbackCard({
  answer,
  question,
  focus = true,
  previous,
  onRetry,
  onFollowUp,
  idSuffix = '',
}: {
  answer: AnswerRecord;
  question: SessionRecord['questions'][number];
  focus?: boolean;
  previous?: AnswerRecord['feedback'];
  onRetry?: () => void;
  onFollowUp?: () => void;
  idSuffix?: string;
}) {
  const feedback = answer.feedback;
  if (!feedback) return null;
  const titleId = `feedback-title-${answer.index}${idSuffix}`;
  const lowest = lowestDimension(feedback);
  return (
    <section aria-labelledby={titleId} className="feedback-layout">
      <div className="feedback-main">
        <header className="feedback-verdict">
          <h2 id={titleId} tabIndex={-1} data-phase-focus={focus || undefined} className="sr-only">
            Feedback on question {answer.index + 1}
          </h2>
          <p className="feedback-verdict-text">
            <SafeText text={feedback.scores[lowest].rationale} />
          </p>
          <div className="feedback-overall">
            <p>Overall {feedback.overall.toFixed(1)} / 4</p>
            {previous && <DeltaBadge value={feedback.overall - previous.overall} />}
          </div>
        </header>
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
        <ChangeOneThing feedback={feedback} {...(onRetry ? { onRetry } : {})} />
        <section className="feedback-answer" aria-label="Your answer, marked up">
          <h3>Your answer, marked up</h3>
          <MarkedTranscript
            text={answer.transcript}
            marks={answerMarks(answer.transcript, feedback)}
          />
          <p className="feedback-note">
            The dashed parts are where the score dropped. Replace them with what you actually
            changed and what happened next.
          </p>
        </section>
        <section className="feedback-follow-up" aria-label="Follow-up question">
          <h3>They’ll probably ask next</h3>
          <p>
            <SafeText text={feedback.follow_up_question} />
          </p>
          {onFollowUp && (
            <Button variant="text" onClick={onFollowUp}>
              Answer follow-up
            </Button>
          )}
        </section>
        <div className="feedback-details">
          <details>
            <summary>Why these scores</summary>
            <ul>
              {DIMENSIONS.map((dimension) => (
                <li key={dimension}>
                  <strong>
                    {DIMENSION_LABELS[dimension]}: {feedback.scores[dimension].score} / 4
                  </strong>
                  <p>
                    <SafeText text={feedback.scores[dimension].rationale} />
                  </p>
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>What worked</summary>
            <ul>
              {feedback.strengths.map((item, i) => (
                <li key={i}>
                  <SafeText text={item.point} />
                  {item.evidence && (
                    <blockquote>
                      <SafeText text={item.evidence} />
                    </blockquote>
                  )}
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>What to improve</summary>
            <ol>
              {feedback.improvements.map((item, i) => (
                <li key={i}>
                  <strong>
                    <SafeText text={item.point} />
                  </strong>
                  <p>
                    <SafeText text={item.why} />
                  </p>
                  <p>Try saying:</p>
                  <blockquote>
                    <SafeText text={item.rewrite} />
                  </blockquote>
                </li>
              ))}
            </ol>
          </details>
          <details>
            <summary>Outline of a strong answer</summary>
            <ul>
              {feedback.model_answer_outline.map((text, i) => (
                <li key={i}>
                  <SafeText text={text} />
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>What interviewers listen for</summary>
            <ul>
              {question.what_good_looks_like.map((text, i) => (
                <li key={i}>
                  <SafeText text={text} />
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>How this was scored</summary>
            {answer.feedbackMeta && (
              <p>
                Scored by <SafeText text={answer.feedbackMeta.model} /> · rubric{' '}
                <SafeText text={answer.feedbackMeta.promptVersion} /> ·{' '}
                {(answer.feedbackMeta.latencyMs / 1000).toFixed(1)} s
              </p>
            )}
            <p>
              One language-model call with a fixed six-part rubric, checked against your transcript.
              Delivery numbers are counted in your browser.
            </p>
            <p>
              Scores are a coaching aid from a language model, not a prediction of how an
              interviewer will judge you.
            </p>
          </details>
        </div>
      </div>
      <aside className="feedback-side">
        <section className="feedback-scores" aria-label="Scores">
          <h3>Scores</h3>
          {previous && <p>Change from previous attempt</p>}
          <ul>
            {DIMENSIONS.map((dimension) => {
              const result = feedback.scores[dimension];
              return (
                <li key={dimension} data-lowest={dimension === lowest || undefined}>
                  <span>
                    {DIMENSION_LABELS[dimension]}: {result.score} out of 4
                  </span>
                  <span data-score-bar aria-hidden="true" className="feedback-score-bar">
                    {[1, 2, 3, 4].map((segment) => (
                      <span
                        key={segment}
                        data-score-segment
                        data-filled={segment <= result.score || undefined}
                      />
                    ))}
                  </span>
                  {previous && (
                    <DeltaBadge value={result.score - previous.scores[dimension].score} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <div className="feedback-delivery">
          <DeliveryMetrics
            metrics={answer.metrics}
            mode={answer.mode}
            recordingMs={answer.timing.recordingMs}
          />
        </div>
      </aside>
    </section>
  );
}

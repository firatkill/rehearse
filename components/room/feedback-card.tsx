'use client';
import { useNumbers } from '@/lib/i18n/use-numbers';
import { useLabels } from '@/lib/i18n/use-labels';
import { T, useT, useI18n } from '@/lib/i18n/context';
import { APP_EDITION } from '@/lib/edition';
import { DIMENSIONS } from '@/lib/config';
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
  const { DIMENSION_LABELS } = useLabels();

  const t = useT();
  const { number } = useNumbers();
  const { language } = useI18n();

  const feedback = answer.feedback;
  if (!feedback) return null;
  const titleId = `feedback-title-${answer.index}${idSuffix}`;
  const lowest = lowestDimension(feedback);
  return (
    <section aria-labelledby={titleId} className="feedback-layout">
      <div className="feedback-main">
        <header className="feedback-verdict">
          <h2 id={titleId} tabIndex={-1} data-phase-focus={focus || undefined} className="sr-only">
            <T id="components.room.feedback.card.1" />
            {answer.index + 1}
            {APP_EDITION === 'demo' && (
              <span className="block text-sm">
                <T id="components.room.feedback.card.2" />
              </span>
            )}
          </h2>
          <p className="feedback-verdict-text">
            <SafeText text={feedback.scores[lowest].rationale} />
          </p>
          <div className="feedback-overall">
            <p>
              <T id="components.room.feedback.card.3" />
              {number(feedback.overall, 1)} / 4
            </p>
            {previous && <DeltaBadge value={feedback.overall - previous.overall} />}
          </div>
        </header>
        {feedback.flags.injection_suspected && (
          <p>
            <T id="components.room.feedback.card.4" />
          </p>
        )}
        {feedback.flags.off_topic && (
          <p>
            <T id="components.room.feedback.card.5" />
          </p>
        )}
        {feedback.flags.too_short && (
          <p>
            <T id="components.room.feedback.card.6" />
          </p>
        )}
        <ChangeOneThing feedback={feedback} {...(onRetry ? { onRetry } : {})} />
        <section className="feedback-answer" aria-label={t('components.room.feedback.card.7')}>
          <h3>
            <T id="components.room.feedback.card.7" />
          </h3>
          <MarkedTranscript
            text={answer.transcript}
            marks={answerMarks(answer.transcript, feedback, language)}
          />
          <p className="feedback-note">
            <T id="components.room.feedback.card.8" />
          </p>
        </section>
        <section className="feedback-follow-up" aria-label={t('ui.dynamic.52')}>
          <h3>
            <T id="components.room.feedback.card.9" />
          </h3>
          <p>
            <SafeText text={feedback.follow_up_question} />
          </p>
          {onFollowUp && (
            <Button variant="secondary" onClick={onFollowUp}>
              <T id="components.room.feedback.card.10" />
            </Button>
          )}
        </section>
        <div className="feedback-details">
          <details>
            <summary>
              <T id="components.room.feedback.card.11" />
            </summary>
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
            <summary>
              <T id="components.room.feedback.card.12" />
            </summary>
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
            <summary>
              <T id="components.room.feedback.card.13" />
            </summary>
            <ol>
              {feedback.improvements.map((item, i) => (
                <li key={i}>
                  <strong>
                    <SafeText text={item.point} />
                  </strong>
                  <p>
                    <SafeText text={item.why} />
                  </p>
                  <p>
                    <T id="components.room.change.one.thing.2" />
                  </p>
                  <blockquote>
                    <SafeText text={item.rewrite} />
                  </blockquote>
                </li>
              ))}
            </ol>
          </details>
          <details>
            <summary>
              <T id="components.room.feedback.card.15" />
            </summary>
            <ul>
              {feedback.model_answer_outline.map((text, i) => (
                <li key={i}>
                  <SafeText text={text} />
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>
              <T id="components.room.feedback.card.16" />
            </summary>
            <ul>
              {question.what_good_looks_like.map((text, i) => (
                <li key={i}>
                  <SafeText text={text} />
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>
              <T id="components.room.feedback.card.17" />
            </summary>
            {answer.feedbackMeta && (
              <p>
                <T id="components.room.feedback.card.18" />
                <SafeText text={answer.feedbackMeta.model} />
                <T id="components.room.feedback.card.19" />{' '}
                <SafeText text={answer.feedbackMeta.promptVersion} /> ·{' '}
                {number(answer.feedbackMeta.latencyMs / 1000, 1)} s
              </p>
            )}
            <p>
              <T id="components.room.feedback.card.20" />
            </p>
            <p>
              <T id="components.room.feedback.card.21" />
            </p>
          </details>
        </div>
      </div>
      <aside className="feedback-side">
        <section className="feedback-scores" aria-label={t('components.room.feedback.card.22')}>
          <h3>
            <T id="components.room.feedback.card.22" />
          </h3>
          {previous && (
            <p>
              <T id="components.room.feedback.card.23" />
            </p>
          )}
          <ul>
            {DIMENSIONS.map((dimension) => {
              const result = feedback.scores[dimension];
              return (
                <li key={dimension} data-lowest={dimension === lowest || undefined}>
                  <span>
                    {DIMENSION_LABELS[dimension]}: {result.score}
                    <T id="components.room.feedback.card.24" />
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

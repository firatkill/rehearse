'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DIMENSIONS, type Dimension } from '@/lib/config';
import { requestSummary } from '@/lib/api/client';
import type { SummaryRequest } from '@/lib/api/contracts';
import type { SessionRecord, AnswerRecord } from '@/lib/storage/schema';
import { useRepository, switchToMemoryRepository } from './use-repository';
import { useOnline } from './use-online';

type ReportData = { session: SessionRecord; answers: AnswerRecord[] };
function validToken(session: SessionRecord) {
  return (
    session.token !== null &&
    session.tokenExpiresAt !== null &&
    new Date(session.tokenExpiresAt).getTime() > Date.now()
  );
}
export function useReport(id: string) {
  const repository = useRepository();
  const online = useOnline();
  const [data, setData] = useState<ReportData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const attempted = useRef(new Set<string>());
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([repository.getSession(id), repository.getAnswers(id)]).then(
      ([session, answers]) => {
        if (alive) {
          setData(session ? { session, answers } : null);
          setLoaded(true);
        }
      },
    );
    return () => {
      alive = false;
      controller.current?.abort();
    };
  }, [id, repository]);
  const persist = useCallback(
    async (current: ReportData, patch: Partial<SessionRecord>) => {
      let repo = repository;
      try {
        return await repo.updateSession(id, patch);
      } catch {
        repo = await switchToMemoryRepository(current.session, current.answers);
        return repo.updateSession(id, patch);
      }
    },
    [id, repository],
  );
  const generate = useCallback(async () => {
    if (
      !data ||
      inFlight.current ||
      !online ||
      !validToken(data.session) ||
      !data.session.feedback.enabled
    )
      return;
    const token = data.session.token;
    if (!token) return;
    const items: SummaryRequest['items'] = data.answers
      .filter((a) => a.feedback !== null)
      .flatMap((a) => {
        if (!a.feedback) return [];
        return [
          {
            answerIndex: a.index,
            questionId: a.questionId,
            scores: Object.fromEntries(
              DIMENSIONS.map((d) => [d, a.feedback?.scores[d].score]),
            ) as Record<Dimension, number>,
            improvementPoints: a.feedback.improvements.map((v) => v.point),
            flags: a.feedback.flags,
          },
        ];
      });
    if (!items.length) return;
    inFlight.current = true;
    attempted.current.add(id);
    setPending(true);
    const abort = new AbortController();
    const isAborted = () => abort.signal.aborted;
    controller.current = abort;
    const result = await requestSummary(token, { sessionId: id, items }, abort.signal);
    if (isAborted()) {
      inFlight.current = false;
      return;
    }
    const retryable =
      !result.ok &&
      (result.kind !== 'http' ||
        [
          'PROVIDER_ERROR',
          'PROVIDER_TIMEOUT',
          'FEEDBACK_INVALID',
          'LIMITER_UNAVAILABLE',
          'INTERNAL_ERROR',
        ].includes(result.error.code));
    const session = await persist(
      data,
      result.ok
        ? { summary: result.data.summary, summaryStatus: 'done' }
        : { summaryStatus: retryable ? 'failed' : 'unavailable' },
    );
    if (!isAborted()) {
      setData({ ...data, session });
      setPending(false);
    }
    inFlight.current = false;
  }, [data, id, online, persist]);
  useEffect(() => {
    if (data?.session.summaryStatus === 'none' && !attempted.current.has(id)) void generate();
  }, [data, id, generate]);
  const canRetry =
    data?.session.summaryStatus === 'failed' &&
    validToken(data.session) &&
    data.session.feedback.enabled &&
    data.answers.some((a) => a.feedback !== null);
  return {
    data,
    loaded,
    pending,
    online,
    canRetry,
    retry: () => {
      void generate();
    },
  };
}

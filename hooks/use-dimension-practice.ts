'use client';
import { useT } from '@/lib/i18n/context';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTION_TYPES, SESSION, type Dimension } from '@/lib/config';
import type { Setup } from '@/lib/storage/schema';
import { newSessionRecord } from '@/lib/storage/new-session';
import { startSession } from '@/lib/api/client';
import { useRepository } from './use-repository';
export function useDimensionPractice(setup: Setup) {
  const t = useT();

  const router = useRouter();
  const repository = useRepository();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start(dimension: Dimension) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const selected: Setup = {
        ...setup,
        dimension,
        length: SESSION.LENGTHS[0],
        types: [...QUESTION_TYPES],
      };
      const response = await startSession({
        language: selected.language ?? 'en',
        role: selected.role,
        seniority: selected.seniority,
        types: selected.types,
        length: selected.length,
        mode: selected.mode,
        dimension,
        feedback: true,
      });
      if (!response.ok) {
        setError(
          response.kind === 'http' && response.error.code === 'SESSION_QUOTA_EXCEEDED'
            ? t('ui.dynamic.138')
            : t('ui.dynamic.139'),
        );
        return;
      }
      const session = newSessionRecord(response.data, selected, new Date().toISOString());
      await repository.createSession(session);
      router.push(`/session/${session.id}`);
    } catch {
      setError(t('ui.dynamic.139'));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return { start, pending, error };
}

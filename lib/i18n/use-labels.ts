'use client';
import { useMemo } from 'react';
import { useT } from './context';
import { translatedLabels } from './labels';
export function useLabels() {
  const t = useT();
  return useMemo(() => translatedLabels(t), [t]);
}

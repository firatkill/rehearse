'use client';
import { useI18n } from './context';
import { formatCount, formatNumber } from './numbers';
export function useNumbers() {
  const { language } = useI18n();
  return {
    number: (value: number, digits?: number) => formatNumber(value, language, digits),
    count: (value: number) => formatCount(value, language),
  };
}

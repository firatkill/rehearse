'use client';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useI18n } from './context';
import { languageHref } from './language';
export function LanguageLink({ href, ...props }: ComponentProps<typeof Link>) {
  const { language } = useI18n();
  return <Link {...props} href={typeof href === 'string' ? languageHref(href, language) : href} />;
}

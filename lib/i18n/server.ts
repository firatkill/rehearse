import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { getEnv } from '@/lib/env';
import { languageOf } from './language';
import { formatMessage, loadMessages, type MessageKey, type MessageValues } from './messages';
/** Proxy overwrites these headers; saved sessions take precedence over URL preferences. */
export const requestLanguage = cache(async () => {
  if (getEnv().APP_EDITION === 'demo') return 'en' as const;
  const requestHeaders = await headers();
  const sessionId = /^\/session\/([a-f0-9-]+)(?:\/report)?$/.exec(
    requestHeaders.get('x-rehearse-path') ?? '',
  )?.[1];
  if (sessionId) {
    const { getSqliteRepository } = await import('@/lib/storage/sqlite/repository');
    const session = await getSqliteRepository().getSession(sessionId);
    if (session) return session.setup.language;
  }
  return languageOf(requestHeaders.get('x-rehearse-language'));
});
export async function serverTranslator() {
  const messages = await loadMessages(await requestLanguage());
  return (key: MessageKey, values?: MessageValues) => formatMessage(messages, key, values);
}

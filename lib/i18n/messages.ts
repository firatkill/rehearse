import type { messages } from '@/messages/en';
import type { Language } from '@/lib/config';
export type MessageKey = keyof typeof messages;
export type Messages = { readonly [K in MessageKey]: string };
export type MessageValues = Readonly<Record<string, string | number>>;
/** Dynamic imports keep the other language out of a selected-language request. */
export async function loadMessages(language: Language): Promise<Messages> {
  return language === 'tr'
    ? (await import('@/messages/tr')).messages
    : (await import('@/messages/en')).messages;
}
export function formatMessage(messages: Messages, key: MessageKey, values: MessageValues = {}) {
  return messages[key].replace(/\{(\w+)\}/g, (match: string, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}

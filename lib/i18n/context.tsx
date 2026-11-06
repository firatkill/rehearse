'use client';
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { APP_EDITION } from '@/lib/edition';
import type { Language } from '@/lib/config';
import {
  loadMessages,
  formatMessage,
  type Messages,
  type MessageKey,
  type MessageValues,
} from './messages';
import { formatNumber } from './numbers';
import { languageOf } from './language';
type I18n = {
  language: Language;
  t: (key: MessageKey, values?: MessageValues) => string;
  selectLanguage: (language: Language, persist?: boolean) => Promise<void>;
};
const Context = createContext<I18n | null>(null);
export function I18nProvider({
  children,
  initialLanguage,
  initialMessages,
}: {
  children: ReactNode;
  initialLanguage: Language;
  initialMessages: Messages;
}) {
  const [state, setState] = useState({ language: initialLanguage, messages: initialMessages });
  const selection = useRef(0);
  const selectLanguage = useCallback(async (requested: Language, persist = true) => {
    const language = APP_EDITION === 'demo' ? 'en' : requested;
    const id = ++selection.current;
    const messages = await loadMessages(language);
    if (id !== selection.current) return;
    setState({ language, messages });
    try {
      if (persist) localStorage.setItem('rehearse-language', language);
    } catch {
      /* Choice still works for this page. */
    }
  }, []);
  useEffect(() => {
    if (
      APP_EDITION === 'demo' ||
      initialLanguage !== 'en' ||
      new URL(location.href).searchParams.has('language') ||
      location.pathname.startsWith('/session/')
    )
      return;
    try {
      const saved = languageOf(localStorage.getItem('rehearse-language'));
      if (saved !== initialLanguage) void selectLanguage(saved);
    } catch {
      /* Storage can be unavailable. */
    }
  }, [initialLanguage, selectLanguage]);
  useEffect(() => {
    document.documentElement.lang = state.language;
    const path = location.pathname;
    const key =
      path === '/setup'
        ? 'title.setup'
        : path === '/progress'
          ? 'title.progress'
          : /^\/session\/[^/]+\/report$/.test(path)
            ? 'title.report'
            : null;
    if (key) document.title = formatMessage(state.messages, key);
  }, [state.language, state.messages]);
  const t = useCallback(
    (key: MessageKey, values?: MessageValues) =>
      formatMessage(
        state.messages,
        key,
        values &&
          Object.fromEntries(
            Object.entries(values).map(([name, value]) => [
              name,
              typeof value === 'number' ? formatNumber(value, state.language) : value,
            ]),
          ),
      ),
    [state.messages, state.language],
  );
  const value = useMemo(
    () => ({ language: state.language, t, selectLanguage }),
    [state.language, t, selectLanguage],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error('I18nProvider is required.');
  return value;
}
export function useT() {
  return useI18n().t;
}
export function T({ id, values }: { id: MessageKey; values?: MessageValues }) {
  return useT()(id, values);
}

/** A saved session owns its language, including after a reload or a resume. */
export function useSessionLanguage(language: Language | undefined) {
  const { language: active, selectLanguage } = useI18n();
  useEffect(() => {
    if (language && language !== active) void selectLanguage(language, false);
  }, [language, active, selectLanguage]);
}

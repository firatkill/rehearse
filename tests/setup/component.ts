import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('speechSynthesis', {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
    pending: false,
    paused: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// Components run under the same required message context as the application shell.
vi.mock('@testing-library/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@testing-library/react')>();
  const { createElement } = await import('react');
  const { I18nProvider } = await import('@/lib/i18n/context');
  const { messages } = await import('@/messages/en');
  function wrap(
    Wrapper?: import('react').JSXElementConstructor<{ children: import('react').ReactNode }>,
  ) {
    return function TestProvider({ children }: { children: import('react').ReactNode }) {
      return createElement(I18nProvider, {
        initialLanguage: 'en',
        initialMessages: messages,
        children: Wrapper ? createElement(Wrapper, { children }) : children,
      });
    };
  }
  return {
    ...actual,
    render: (
      ui: Parameters<typeof actual.render>[0],
      options?: Parameters<typeof actual.render>[1],
    ) => actual.render(ui, { ...options, wrapper: wrap(options?.wrapper) }),
    renderHook: <Result, Props>(
      render: (props: Props) => Result,
      options?: import('@testing-library/react').RenderHookOptions<Props>,
    ) => actual.renderHook(render, { ...options, wrapper: wrap(options?.wrapper) }),
  };
});

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(new Headers()) }));

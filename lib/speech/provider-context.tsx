'use client';
import { createContext, useContext, type ReactNode } from 'react';
const Context = createContext(false);
export function SpeechProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <Context.Provider value={enabled}>{children}</Context.Provider>;
}
export function useProviderSpeech() {
  return useContext(Context);
}

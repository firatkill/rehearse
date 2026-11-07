'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
const Context = createContext<{ enabled: boolean; setEnabled: (enabled: boolean) => void }>({
  enabled: false,
  setEnabled: () => undefined,
});
/** In-memory choice only: never persisted in a session, export or browser storage. */
export function CameraProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  return <Context.Provider value={{ enabled, setEnabled }}>{children}</Context.Provider>;
}
export function useCameraChoice() {
  return useContext(Context);
}

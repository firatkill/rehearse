'use client';
import { useEffect, useState } from 'react';
import { detectCapabilities, type Capabilities } from '@/lib/speech/detect';
export function useCapabilities() {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  useEffect(() => {
    // TRD 9.1 requires browser detection after mount, never during server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCapabilities(detectCapabilities());
  }, []);
  return capabilities;
}

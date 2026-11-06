'use client';

import { useT } from '@/lib/i18n/context';
import { capabilityNotice, type Capabilities } from '@/lib/speech/detect';

export function CapabilityNotice({ capabilities }: { capabilities: Capabilities | null }) {
  const t = useT();

  const notices = {
    voice: t('ui.dynamic.108'),
    'synthesis-only': t('ui.dynamic.109'),
    'recognition-only': t('ui.dynamic.110'),
    none: t('ui.dynamic.111'),
    insecure: t('ui.dynamic.112'),
  };
  return (
    <p className="setup-capability">
      {capabilities ? notices[capabilityNotice(capabilities)] : t('ui.dynamic.113')}
    </p>
  );
}

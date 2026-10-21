import { capabilityNotice, type Capabilities } from '@/lib/speech/detect';
const notices = {
  voice: 'Voice answers are available in this browser.',
  'synthesis-only':
    'This browser can read questions aloud but can’t transcribe speech, so you’ll type your answers. For voice answers, use Chrome or Edge.',
  'recognition-only':
    'This browser can transcribe your answers but can’t read questions aloud. Questions will appear as text.',
  none: 'This browser can’t read questions aloud or transcribe speech. You can still practise by reading the questions and typing your answers.',
  insecure: 'Voice needs a secure (https) connection. You can type your answers.',
};
export function CapabilityNotice({ capabilities }: { capabilities: Capabilities | null }) {
  return (
    <p>
      {capabilities
        ? notices[capabilityNotice(capabilities)]
        : 'Checking what this browser supports…'}
    </p>
  );
}

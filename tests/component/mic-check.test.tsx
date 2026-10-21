import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MicCheck } from '@/components/setup/mic-check';
import { checkMicrophone, type MicCheck as Result } from '@/lib/speech/microphone';
vi.mock('@/lib/speech/microphone', () => ({ checkMicrophone: vi.fn() }));
it.each([
  ['granted', 'Microphone ready.'],
  [
    'denied',
    'Microphone access is blocked. Allow it in your browser’s site settings, or choose Text.',
  ],
  ['no-device', 'No microphone found. Connect one, or choose Text.'],
  ['error', 'Couldn’t open the microphone. Choose Text, or try again.'],
] as const)('TC-047 CT-01 microphone shows %s result', async (result, copy) => {
  let finish: ((result: Result) => void) | undefined;
  vi.mocked(checkMicrophone).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(<MicCheck />);
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  fireEvent.click(screen.getByRole('button', { name: 'Check microphone' }));
  expect(screen.getByRole('status')).toHaveTextContent('Waiting for permission…');
  expect(screen.getByRole('button')).toBeDisabled();
  await act(async () => {
    finish?.(result);
    await Promise.resolve();
  });
  expect(screen.getByRole('status')).toHaveTextContent(copy);
  expect(screen.getByRole('button')).toBeEnabled();
});

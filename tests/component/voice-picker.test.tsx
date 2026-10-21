/* eslint-disable @typescript-eslint/unbound-method -- Speech methods are vi.fn mocks, not detached browser calls. */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { VoicePicker } from '@/components/setup/voice-picker';
import { useVoices } from '@/hooks/use-voices';
import { Captions } from '@/components/room/captions';
import { SETUP_DEFAULTS, TTS } from '@/lib/config';
import type { Setup } from '@/lib/storage/schema';
const setup: Setup = { ...SETUP_DEFAULTS, types: [...SETUP_DEFAULTS.types], voiceURI: null };
const local: SpeechSynthesisVoice = {
  name: 'Local',
  lang: 'en-US',
  localService: true,
  default: true,
  voiceURI: 'local',
};
const online: SpeechSynthesisVoice = {
  lang: 'en-US',
  voiceURI: 'remote',
  name: 'Remote',
  localService: false,
  default: false,
};
test('TC-055 CT-02 FR-04 FR-06 loading, online suffix, fallback and rate controls', () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <VoicePicker setup={setup} voices={[]} loading onChange={onChange} />,
  );
  expect(screen.getByRole('option', { name: 'Loading voices…' })).toBeDisabled();
  rerender(
    <VoicePicker
      setup={{ ...setup, voiceURI: 'gone' }}
      voices={[local, online]}
      loading={false}
      onChange={onChange}
    />,
  );
  expect(screen.getByRole('option', { name: 'Remote (en-US) (online voice)' })).toBeVisible();
  expect(
    screen.getByText('Your saved voice isn’t available here, so the default voice is used.'),
  ).toBeVisible();
  expect(screen.getByLabelText('Voice')).toHaveValue('local');
  expect(screen.getByText('1.0×')).toHaveClass('font-mono');
  fireEvent.change(screen.getByLabelText('Speaking rate'), { target: { value: '1.2' } });
  expect(onChange).toHaveBeenCalledWith({ rate: 1.2 });
  fireEvent.change(screen.getByLabelText('Voice'), { target: { value: 'remote' } });
  expect(onChange).toHaveBeenCalledWith({ voiceURI: 'remote' });
  fireEvent.click(screen.getByLabelText('Read questions aloud'));
  expect(onChange).toHaveBeenCalledWith({ readAloud: false });
});
test('TC-055 CT-02 FR-06 no English voices disables and unchecks read-aloud', () => {
  render(<VoicePicker setup={setup} voices={[]} loading={false} onChange={vi.fn()} />);
  expect(screen.getByLabelText('Read questions aloud')).toBeDisabled();
  expect(screen.getByLabelText('Read questions aloud')).not.toBeChecked();
  expect(screen.getByRole('option', { name: 'No English voices found' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Preview voice' })).toBeDisabled();
});
test('TC-055 CT-02 FR-06 preview primes in the click and stops on request/unmount', async () => {
  class Utterance {
    constructor(public text: string) {}
    volume = 1;
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  const { unmount } = render(
    <VoicePicker setup={setup} voices={[local]} loading={false} onChange={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Preview voice' }));
  expect(vi.mocked(window.speechSynthesis.speak).mock.calls[0]?.[0]).toMatchObject({
    text: ' ',
    volume: 0,
  });
  expect(vi.mocked(window.speechSynthesis.speak).mock.calls[1]?.[0]).toMatchObject({
    text: TTS.PREVIEW_TEXT,
  });
  await act(async () => {
    await Promise.resolve();
    fireEvent.click(screen.getByRole('button', { name: 'Stop preview' }));
  });
  expect(screen.getByRole('button', { name: 'Preview voice' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Preview voice' }));
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
test('TC-053 UT-19 FR-06 hook refreshes late voices and removes its listener', async () => {
  const events = new EventTarget();
  vi.mocked(window.speechSynthesis.addEventListener).mockImplementation(
    events.addEventListener.bind(events),
  );
  vi.mocked(window.speechSynthesis.removeEventListener).mockImplementation(
    events.removeEventListener.bind(events),
  );
  function Harness() {
    const { loading, voices } = useVoices();
    return <p>{loading ? 'Loading' : voices.map((v) => v.name).join(',')}</p>;
  }
  const { unmount } = render(<Harness />);
  expect(screen.getByText('Loading')).toBeVisible();
  vi.mocked(window.speechSynthesis.getVoices).mockReturnValue([local]);
  await act(async () => {
    await Promise.resolve();
    events.dispatchEvent(new Event('voiceschanged'));
  });
  expect(screen.getByText('Local')).toBeVisible();
  vi.mocked(window.speechSynthesis.getVoices).mockReturnValue([online]);
  await act(async () => {
    await Promise.resolve();
    events.dispatchEvent(new Event('voiceschanged'));
  });
  expect(screen.getByText('Remote')).toBeVisible();
  unmount();
  expect(window.speechSynthesis.removeEventListener).toHaveBeenCalled();
});
test('TC-054 FR-09 captions keep the full question readable while highlighting one chunk', () => {
  const { container } = render(
    <h1>
      <Captions chunks={['First sentence.', 'Second sentence.']} activeChunk={1} />
    </h1>,
  );
  expect(screen.getByRole('heading')).toHaveTextContent('First sentence. Second sentence.');
  expect(container.querySelectorAll('h1 > span')[1]).toHaveClass('underline');
});

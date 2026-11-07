import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { CameraPreview } from '@/components/common/camera-preview';
import { CameraProvider } from '@/lib/camera/context';
const makeStream = () => {
  const track = Object.assign(new EventTarget(), { stop: vi.fn() });
  return { track, stream: { getTracks: () => [track] } as unknown as MediaStream };
};
beforeEach(() => {
  vi.useRealTimers();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
});
const renderCamera = () =>
  render(
    <CameraProvider>
      <CameraPreview />
    </CameraProvider>,
  );
it('TC-225 off by default; requests video only after consent and mirrors a local video', async () => {
  const { stream, track } = makeStream();
  const get = vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(stream);
  renderCamera();
  expect(get).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Show my camera'));
  await waitFor(() => {
    expect(screen.getByLabelText('Your mirrored camera preview')).toHaveProperty(
      'srcObject',
      stream,
    );
  });
  expect(get).toHaveBeenCalledWith({ video: true });
  expect(screen.getByLabelText('Your mirrored camera preview')).toHaveAttribute('playsinline');
  fireEvent.click(screen.getByLabelText('Show my camera'));
  expect(track.stop).toHaveBeenCalledOnce();
  expect(screen.queryByLabelText('Your mirrored camera preview')).toBeNull();
});
it.each(['unmount', 'pagehide', 'hidden', 'video-error', 'track-ended', 'session-end'] as const)(
  'TC-225 %s stops every track and releases the preview',
  async (exit) => {
    const first = makeStream(),
      second = makeStream();
    const stream = { getTracks: () => [first.track, second.track] } as unknown as MediaStream;
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(stream);
    const view = renderCamera();
    fireEvent.click(screen.getByLabelText('Show my camera'));
    const video = await screen.findByLabelText('Your mirrored camera preview');
    await waitFor(() => {
      expect(video).toHaveProperty('srcObject', stream);
    });
    act(() => {
      if (exit === 'unmount') view.unmount();
      else if (exit === 'session-end')
        view.rerender(
          <CameraProvider>
            <CameraPreview ended />
          </CameraProvider>,
        );
      else if (exit === 'pagehide') window.dispatchEvent(new Event('pagehide'));
      else if (exit === 'hidden') {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
      } else if (exit === 'track-ended') first.track.dispatchEvent(new Event('ended'));
      else video.dispatchEvent(new Event('error'));
    });
    expect(first.track.stop).toHaveBeenCalledOnce();
    expect(second.track.stop).toHaveBeenCalledOnce();
    expect(video).toHaveProperty('srcObject', null);
  },
);
it('TC-225 a late permission result is stopped after unmount', async () => {
  const { stream, track } = makeStream();
  let resolve: ((stream: MediaStream) => void) | undefined;
  vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const view = renderCamera();
  fireEvent.click(screen.getByLabelText('Show my camera'));
  view.unmount();
  await act(async () => {
    resolve?.(stream);
    await Promise.resolve();
  });
  expect(track.stop).toHaveBeenCalledOnce();
});
it.each(['denied', 'unavailable'])(
  'TC-225 %s leaves the toggle off and explains that practice can continue',
  async (kind) => {
    if (kind === 'denied')
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(
        new DOMException('denied', 'NotAllowedError'),
      );
    else vi.stubGlobal('navigator', {});
    renderCamera();
    fireEvent.click(screen.getByLabelText('Show my camera'));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your camera is unavailable. You can keep practising without it.',
    );
    expect(screen.getByLabelText('Show my camera')).not.toBeChecked();
  },
);

export function installCameraMock(denied: boolean) {
  const previous = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  const control = {
    requested: [] as MediaStreamConstraints[],
    stopped: 0,
    tracks: [] as { stop(): void; readyState: string }[],
  };
  Object.defineProperty(window, '__camera', { value: control });
  Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
    configurable: true,
    value: async (constraints: MediaStreamConstraints) => {
      if (!constraints.video) return previous(constraints);
      control.requested.push(constraints);
      await Promise.resolve();
      if (denied) throw new DOMException('Denied', 'NotAllowedError');
      const stream = new MediaStream();
      const track = Object.assign(new EventTarget(), {
        readyState: 'live',
        stop() {
          if (this.readyState !== 'ended') control.stopped++;
          this.readyState = 'ended';
        },
      });
      control.tracks.push(track);
      Object.defineProperty(stream, 'getTracks', { value: () => [track] });
      return stream;
    },
  });
}

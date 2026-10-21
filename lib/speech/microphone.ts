export type MicCheck = 'granted' | 'denied' | 'no-device' | 'error';

export async function checkMicrophone(
  md: MediaDevices = navigator.mediaDevices,
): Promise<MicCheck> {
  try {
    const stream = await md.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop(); // never keep the stream open
    return 'granted';
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-device';
    return 'error';
  }
}

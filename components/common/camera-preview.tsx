'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useCameraChoice } from '@/lib/camera/context';
import { T, useT } from '@/lib/i18n/context';
export function CameraPreview({ ended = false }: { ended?: boolean }) {
  const { enabled, setEnabled } = useCameraChoice();
  const t = useT();
  const helpId = useId();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (ended) {
      setEnabled(false);
      return;
    }
    if (!enabled) return;
    const controller = new AbortController();
    let stream: MediaStream | null = null;
    const element = video.current;
    const stop = () => {
      const current = stream;
      stream = null;
      for (const track of current?.getTracks() ?? []) {
        track.removeEventListener('ended', fail);
        track.stop();
      }
      if (element) element.srcObject = null;
    };
    const fail = () => {
      if (controller.signal.aborted) return;
      controller.abort();
      stop();
      setError(true);
      setEnabled(false);
    };
    const hide = () => {
      controller.abort();
      stop();
      setEnabled(false);
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') hide();
    };
    element?.addEventListener('error', fail);
    window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', visibility);
    void (async () => {
      try {
        if (
          !('mediaDevices' in navigator) ||
          typeof navigator.mediaDevices.getUserMedia !== 'function'
        ) {
          fail();
          return;
        }
        const acquired = await navigator.mediaDevices.getUserMedia({ video: true });
        if (controller.signal.aborted) {
          acquired.getTracks().forEach((track) => {
            track.stop();
          });
          return;
        }
        stream = acquired;
        for (const track of stream.getTracks()) track.addEventListener('ended', fail);
        if (element) element.srcObject = stream;
      } catch {
        fail();
      }
    })();
    return () => {
      controller.abort();
      for (const track of stream?.getTracks() ?? []) track.removeEventListener('ended', fail);
      stop();
      element?.removeEventListener('error', fail);
      window.removeEventListener('pagehide', hide);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [enabled, ended, setEnabled]);
  return (
    <section className="camera-panel" aria-label={t('camera.title')}>
      <label className="camera-toggle">
        <input
          type="checkbox"
          checked={enabled && !ended}
          disabled={ended}
          aria-describedby={helpId}
          onChange={(event) => {
            setError(false);
            setEnabled(event.target.checked);
          }}
        />
        <T id="camera.toggle" />
      </label>
      <p id={helpId} className="camera-note">
        <T id="camera.local" />
      </p>
      {enabled && !ended && (
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          className="camera-video"
          aria-label={t('camera.preview')}
        />
      )}
      {error && (
        <p role="status" className="camera-note">
          <T id="camera.unavailable" />
        </p>
      )}
    </section>
  );
}

export type MockStep =
  | { after: number; text: string; final: boolean }
  | { after: number; error: string }
  | { after: number; end: true };

export type SpeechScenario = {
  recognition: boolean; // false: no SpeechRecognition / webkitSpeechRecognition
  synthesis: boolean; // false: no speechSynthesis
  mic: 'granted' | 'denied' | 'no-device';
  runs: MockStep[][]; // script per recognition run; the last entry repeats for later runs
  ttsMsPerChar: number; // e.g. 2 for fast tests
  voices: {
    name: string;
    lang: string;
    localService: boolean;
    voiceURI: string;
    default: boolean;
  }[];
};

export function installSpeechMock(s: SpeechScenario): void {
  type R = { transcript: string; isFinal: boolean };
  const w = window as unknown as Record<string, unknown>;
  const ctl = {
    runs: 0,
    overlaps: 0,
    spoken: [] as string[],
    active: null as null | {
      emit(t: string, f: boolean): void;
      fail(c: string): void;
      end(): void;
    },
  };
  w.__speech = ctl;

  if (s.recognition) {
    class MockRecognition extends EventTarget {
      lang = 'en-US';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onstart: ((e: Event) => void) | null = null;
      onresult: ((e: Event) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      onend: ((e: Event) => void) | null = null;
      private results: R[] = [];
      private timers: number[] = [];
      private done = false;
      private run = 0;
      start(): void {
        if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending || ctl.active)
          ctl.overlaps += 1;
        ctl.runs += 1;
        this.run = ctl.runs;
        ctl.active = {
          emit: (t, f) => this.emit(t, f),
          fail: (c) => this.fail(c),
          end: () => this.finish(),
        };
        const script = s.runs[Math.min(ctl.runs - 1, s.runs.length - 1)] ?? [];
        window.setTimeout(() => this.fire('start'), 5);
        for (const step of script) {
          this.timers.push(
            window.setTimeout(() => {
              if ('text' in step) this.emit(step.text, step.final);
              else if ('error' in step) this.fail(step.error);
              else this.finish();
            }, step.after),
          );
        }
      }
      stop(): void {
        this.clear();
        window.setTimeout(() => {
          this.finalizeInterim();
          this.finish();
        }, 20);
      }
      abort(): void {
        if (ctl.runs === this.run) ctl.active = null;
        this.clear();
        window.setTimeout(() => {
          this.fail('aborted');
          this.finish();
        }, 0);
      }
      private clear(): void {
        for (const t of this.timers) window.clearTimeout(t);
        this.timers = [];
      }
      private finalizeInterim(): void {
        const last = this.results[this.results.length - 1];
        if (last && !last.isFinal) this.emit(last.transcript, true);
      }
      private emit(text: string, isFinal: boolean): void {
        if (this.done) return;
        const last = this.results[this.results.length - 1];
        if (last && !last.isFinal)
          this.results[this.results.length - 1] = { transcript: text, isFinal };
        else this.results.push({ transcript: text, isFinal });
        const list = this.results.map((r) =>
          Object.assign([{ transcript: r.transcript, confidence: 0.9 }], { isFinal: r.isFinal }),
        );
        this.fire('result', { resultIndex: 0, results: list });
      }
      private fail(code: string): void {
        if (!this.done) this.fire('error', { error: code, message: '' });
      }
      private finish(): void {
        if (this.done) return;
        this.done = true;
        if (ctl.runs === this.run) ctl.active = null;
        this.clear();
        this.fire('end');
      }
      private fire(type: string, extra: Record<string, unknown> = {}): void {
        const ev = Object.assign(new Event(type), extra);
        const handler = (this as unknown as Record<string, unknown>)[`on${type}`];
        if (typeof handler === 'function') (handler as (e: Event) => void).call(this, ev);
        this.dispatchEvent(ev);
      }
    }
    w.SpeechRecognition = MockRecognition;
    w.webkitSpeechRecognition = MockRecognition;
  } else {
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
  }

  if (s.synthesis) {
    const voices = s.voices.map((v) => ({ ...v }));
    let current: null | { cancelled: boolean; u: Record<string, unknown> } = null;
    const synth = Object.assign(new EventTarget(), {
      speaking: false,
      pending: false,
      paused: false,
      getVoices: () => voices,
      speak(u: Record<string, unknown> & { text: string }) {
        if (ctl.active) ctl.overlaps += 1;
        const job = { cancelled: false, u };
        current = job;
        if (u.text.trim()) ctl.spoken.push(u.text); // primeSynthesis(' ') is not recorded
        const call = (name: string, extra: Record<string, unknown> = {}) => {
          const fn = u[name];
          if (typeof fn === 'function')
            (fn as (e: Event) => void)(Object.assign(new Event(name.slice(2)), extra));
        };
        window.setTimeout(() => {
          if (!job.cancelled) {
            synth.speaking = true;
            call('onstart');
          }
        }, 5);
        window.setTimeout(
          () => {
            if (!job.cancelled) {
              synth.speaking = false;
              call('onend');
            }
          },
          5 + u.text.length * s.ttsMsPerChar,
        );
      },
      cancel() {
        if (current && !current.cancelled) {
          current.cancelled = true;
          const fn = current.u.onerror;
          if (typeof fn === 'function')
            (fn as (e: Event) => void)(Object.assign(new Event('error'), { error: 'interrupted' }));
        }
        synth.speaking = false;
      },
      pause() {},
      resume() {},
    });
    class MockUtterance {
      text: string;
      voice: unknown = null;
      lang = 'en-US';
      rate = 1;
      pitch = 1;
      volume = 1;
      onstart: unknown = null;
      onend: unknown = null;
      onerror: unknown = null;
      onboundary: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    w.SpeechSynthesisUtterance = MockUtterance;
    window.setTimeout(() => synth.dispatchEvent(new Event('voiceschanged')), 10);
  } else {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    delete w.SpeechSynthesisUtterance;
  }

  const md = navigator.mediaDevices ?? ({} as MediaDevices);
  Object.defineProperty(md, 'getUserMedia', {
    configurable: true,
    value: async () => {
      if (s.mic === 'denied') throw new DOMException('denied', 'NotAllowedError');
      if (s.mic === 'no-device') throw new DOMException('none', 'NotFoundError');
      return { getTracks: () => [{ stop() {} }] } as unknown as MediaStream;
    },
  });
  if (!navigator.mediaDevices)
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: md });
}

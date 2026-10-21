export function TimerDisplay({ ms }: { ms: number }) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return (
    <span aria-hidden="true" className="font-mono tabular-nums">
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
    </span>
  );
}
